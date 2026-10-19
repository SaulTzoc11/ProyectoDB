import { ErrorApi, solicitar } from "../api.js";
import { formatearQuetzales } from "../ui.js";
import { iniciarPagina } from "../sesion.js";

await iniciarPagina({ roles: ["Gerente"] });

const formatoFecha = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" });
const formatoFechaHora = new Intl.DateTimeFormat("es-GT", { dateStyle: "short", timeStyle: "short" });

const FORMATOS = {
  texto: (v) => v ?? "",
  entero: (v) => String(Number(v) || 0),
  moneda: (v) => formatearQuetzales(v),
  fecha: (v) => (v ? formatoFecha.format(new Date(v)) : "—"),
  fechaHora: (v) => (v ? formatoFechaHora.format(new Date(v)) : "—"),
};

const REPORTES = [
  {
    id: "total-facturado",
    titulo: "Total facturado",
    descripcion: "Monto facturado entre dos fechas, con el desglose por medio de pago.",
    filtros: ["desde", "hasta"],
    ruta: "/api/reportes/total-facturado/",
    totales: true,
    columnas: [
      { campo: "concepto", titulo: "Concepto" },
      { campo: "monto", titulo: "Monto", tipo: "moneda" },
    ],
  },
  {
    id: "mas-ingresos",
    titulo: "Productos que más generan",
    descripcion: "Productos que más dinero generan entre dos fechas (ingreso neto de devoluciones).",
    filtros: ["desde", "hasta", "top"],
    ruta: "/api/reportes/productos-mas-ingresos/",
    columnas: [
      { campo: "posicion", titulo: "#", tipo: "entero" },
      { campo: "producto", titulo: "Producto" },
      { campo: "ingresoBruto", titulo: "Ingreso bruto", tipo: "moneda" },
      { campo: "devuelto", titulo: "Devuelto", tipo: "moneda" },
      { campo: "ingresoNeto", titulo: "Ingreso neto", tipo: "moneda" },
    ],
  },
  {
    id: "mas-vendidos",
    titulo: "Productos más vendidos",
    descripcion: "Productos con más unidades vendidas entre dos fechas.",
    filtros: ["desde", "hasta", "top"],
    ruta: "/api/reportes/productos-mas-vendidos/",
    columnas: [
      { campo: "posicion", titulo: "#", tipo: "entero" },
      { campo: "producto", titulo: "Producto" },
      { campo: "cantidadVendida", titulo: "Vendido", tipo: "entero" },
      { campo: "cantidadDevuelta", titulo: "Devuelto", tipo: "entero" },
      { campo: "cantidadTexto", titulo: "Cantidad neta" },
    ],
  },
  {
    id: "inventario",
    titulo: "Inventario actual",
    descripcion: "Existencias por lote. 'Orden de salida' 1 es el lote más antiguo, el primero que debe venderse (PEPS).",
    filtros: [],
    ruta: "/api/reportes/inventario/",
    columnas: [
      { campo: "producto", titulo: "Producto" },
      { campo: "codigoLote", titulo: "Lote" },
      { campo: "bodega", titulo: "Bodega" },
      { campo: "estante", titulo: "Estante" },
      { campo: "fechaIngreso", titulo: "Ingreso", tipo: "fecha" },
      { campo: "diasEnBodega", titulo: "Días", tipo: "entero" },
      { campo: "cantidadDisponible", titulo: "Disponible", tipo: "entero" },
      { campo: "costoUnitario", titulo: "Costo unit.", tipo: "moneda" },
      { campo: "valorInventario", titulo: "Valor", tipo: "moneda" },
      { campo: "ordenSalida", titulo: "Orden de salida", tipo: "entero" },
    ],
  },
  {
    id: "menos-vendidos",
    titulo: "Productos con menos ventas",
    descripcion: "Productos que menos se venden, incluidos los que nunca se han vendido. Sin fechas se usa todo el historial.",
    filtros: ["desde", "hasta", "top"],
    ruta: "/api/reportes/productos-menos-vendidos/",
    columnas: [
      { campo: "posicion", titulo: "#", tipo: "entero" },
      { campo: "producto", titulo: "Producto" },
      { campo: "cantidadNeta", titulo: "Cantidad neta", tipo: "entero" },
      { campo: "ingresoNeto", titulo: "Ingreso neto", tipo: "moneda" },
      { campo: "ultimaVenta", titulo: "Última venta", tipo: "fecha" },
    ],
  },
  {
    id: "sin-stock",
    titulo: "Productos sin stock",
    descripcion: "Productos activos sin existencia que hay que comprar a los proveedores.",
    filtros: [],
    ruta: "/api/reportes/productos-sin-stock/",
    columnas: [
      { campo: "producto", titulo: "Producto" },
      { campo: "categoria", titulo: "Categoría" },
      { campo: "pendienteDeRecibir", titulo: "Pendiente de recibir", tipo: "entero" },
      { campo: "ultimoProveedor", titulo: "Último proveedor" },
      { campo: "ultimaCompra", titulo: "Última compra", tipo: "fecha" },
    ],
  },
  {
    id: "factura",
    titulo: "Buscar factura",
    descripcion: "Detalle de una factura, sus medios de pago y el empleado que la emitió.",
    filtros: ["noFactura"],
    ruta: (valores) => `/api/reportes/factura/${encodeURIComponent(valores.noFactura)}/`,
    factura: true,
  },
];

const COLUMNAS_DETALLE = [
  { campo: "codigoProducto", titulo: "Código" },
  { campo: "producto", titulo: "Producto" },
  { campo: "cantidad", titulo: "Cantidad", tipo: "entero" },
  { campo: "precioUnitario", titulo: "Precio unit.", tipo: "moneda" },
  { campo: "descuento", titulo: "Desc. %", tipo: "entero" },
  { campo: "subtotal", titulo: "Subtotal", tipo: "moneda" },
];

const COLUMNAS_PAGOS = [
  { campo: "medioPago", titulo: "Medio de pago" },
  { campo: "monto", titulo: "Monto", tipo: "moneda" },
  { campo: "fecha", titulo: "Fecha", tipo: "fechaHora" },
  { campo: "cobradoPor", titulo: "Cobrado por" },
];

const pestanas = document.querySelector("#pestanas");
const formulario = document.querySelector("#filtros");
const resultado = document.querySelector("#resultado");
const errorReporte = document.querySelector("#errorReporte");

let reporteActual = REPORTES[0];

function fechaIso(fecha) {
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function elemento(etiqueta, texto, clase) {
  const nodo = document.createElement(etiqueta);
  if (texto !== undefined) nodo.textContent = texto;
  if (clase) nodo.className = clase;
  return nodo;
}

function construirTabla(columnas, filas, { totales = false } = {}) {
  const contenedor = elemento("div", undefined, "table-wrap");
  const tabla = elemento("table", undefined, "data-table");

  const cabecera = tabla.createTHead().insertRow();
  columnas.forEach((col) => {
    const th = elemento("th", col.titulo);
    if (col.tipo === "moneda" || col.tipo === "entero") th.className = "num";
    cabecera.append(th);
  });

  const cuerpo = tabla.createTBody();
  filas.forEach((fila, indice) => {
    const tr = cuerpo.insertRow();
    if (totales && indice === 0) tr.className = "total-row";
    columnas.forEach((col) => {
      const formato = FORMATOS[col.tipo || "texto"];
      const td = elemento("td", formato(fila[col.campo]));
      if (col.tipo === "moneda" || col.tipo === "entero") td.className = "num";
      tr.append(td);
    });
  });

  contenedor.append(tabla);
  return contenedor;
}

function mostrarVacio(texto) {
  resultado.replaceChildren(elemento("p", texto, "muted"));
}

function bloque(titulo, contenido) {
  const seccion = elemento("section", undefined, "report-block");
  seccion.append(elemento("h4", titulo), contenido);
  return seccion;
}

function mostrarFactura(datos) {
  const f = datos.factura;
  const resumen = elemento("dl", undefined, "invoice-summary");
  const campos = [
    ["Factura", f.noFactura],
    ["Fecha", FORMATOS.fechaHora(f.fecha)],
    ["Estado", f.estado],
    ["Cliente", `${f.cliente} (NIT ${f.nit})`],
    ["Emitida por", f.empleado],
    ["Cotización", f.codigoCotizacion || "—"],
    ["Subtotal", formatearQuetzales(f.subtotal)],
    ["Total", formatearQuetzales(f.total)],
    ["Total pagado", formatearQuetzales(f.totalPagado)],
    ["Saldo", formatearQuetzales(f.saldo)],
  ];
  campos.forEach(([titulo, valor]) => {
    const grupo = elemento("div");
    const dd = elemento("dd", valor);
    if (titulo === "Estado" && /^anulad/i.test(String(valor))) dd.className = "invoice-void";
    grupo.append(elemento("dt", titulo), dd);
    resumen.append(grupo);
  });

  const piezas = [bloque("Datos de la factura", resumen)];
  piezas.push(bloque("Detalle", datos.detalle.length
    ? construirTabla(COLUMNAS_DETALLE, datos.detalle)
    : elemento("p", "La factura no tiene líneas.", "muted")));
  piezas.push(bloque("Medios de pago", datos.pagos.length
    ? construirTabla(COLUMNAS_PAGOS, datos.pagos)
    : elemento("p", "La factura no tiene pagos registrados.", "muted")));
  resultado.replaceChildren(...piezas);
}

function leerValores() {
  const datos = new FormData(formulario);
  return Object.fromEntries(datos.entries());
}

function construirUrl(reporte, valores) {
  if (typeof reporte.ruta === "function") return reporte.ruta(valores);
  const parametros = new URLSearchParams();
  reporte.filtros.forEach((filtro) => {
    if (valores[filtro]) parametros.set(filtro, valores[filtro]);
  });
  const texto = parametros.toString();
  return texto ? `${reporte.ruta}?${texto}` : reporte.ruta;
}

function validar(reporte, valores) {
  if (reporte.filtros.includes("noFactura") && !valores.noFactura?.trim()) {
    return "Escriba el número de factura.";
  }
  const exigeFechas = reporte.filtros.includes("desde") && reporte.id !== "menos-vendidos";
  if (exigeFechas && (!valores.desde || !valores.hasta)) return "Seleccione las fechas desde y hasta.";
  if (reporte.id === "menos-vendidos" && Boolean(valores.desde) !== Boolean(valores.hasta)) {
    return "Indique ambas fechas o ninguna.";
  }
  if (valores.desde && valores.hasta && valores.desde > valores.hasta) {
    return "La fecha 'desde' no puede ser mayor que 'hasta'.";
  }
  return "";
}

async function consultar() {
  errorReporte.textContent = "";
  const valores = leerValores();
  valores.noFactura = valores.noFactura?.trim();

  const problema = validar(reporteActual, valores);
  if (problema) {
    errorReporte.textContent = problema;
    return;
  }

  mostrarVacio("Consultando…");
  const reporte = reporteActual;

  try {
    const datos = await solicitar(construirUrl(reporte, valores));
    if (reporte !== reporteActual) return; // el usuario cambió de reporte mientras cargaba

    if (reporte.factura) {
      mostrarFactura(datos);
    } else if (!datos.length) {
      mostrarVacio("No hay datos para los filtros seleccionados.");
    } else {
      resultado.replaceChildren(construirTabla(reporte.columnas, datos, { totales: reporte.totales }));
    }
  } catch (error) {
    if (reporte !== reporteActual) return;
    resultado.replaceChildren();
    errorReporte.textContent = error instanceof ErrorApi ? error.message : "No se pudo consultar el reporte.";
  }
}

function seleccionar(reporte) {
  reporteActual = reporte;
  document.querySelector("#tituloReporte").textContent = reporte.titulo;
  document.querySelector("#descripcionReporte").textContent = reporte.descripcion;
  errorReporte.textContent = "";
  resultado.replaceChildren();

  pestanas.querySelectorAll(".report-tab").forEach((boton) => {
    boton.setAttribute("aria-selected", String(boton.dataset.id === reporte.id));
  });
  formulario.querySelectorAll("[data-filtro]").forEach((campo) => {
    campo.hidden = !reporte.filtros.includes(campo.dataset.filtro);
  });

  // Los reportes sin filtros se muestran de inmediato.
  if (!reporte.filtros.length) consultar();
}

REPORTES.forEach((reporte) => {
  const boton = elemento("button", reporte.titulo, "report-tab");
  boton.type = "button";
  boton.dataset.id = reporte.id;
  boton.setAttribute("role", "tab");
  boton.addEventListener("click", () => seleccionar(reporte));
  pestanas.append(boton);
});

const hoy = new Date();
const haceUnMes = new Date(hoy.getFullYear(), hoy.getMonth() - 1, hoy.getDate());
formulario.elements.hasta.value = fechaIso(hoy);
formulario.elements.desde.value = fechaIso(haceUnMes);

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  consultar();
});
document.querySelector("#imprimir").addEventListener("click", () => window.print());

seleccionar(REPORTES[0]);
