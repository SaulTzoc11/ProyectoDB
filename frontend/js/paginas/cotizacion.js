import { guardarCotizacion, solicitar } from "../api.js";
import * as carrito from "../carrito.js";
import { iniciarPagina } from "../sesion.js";
import {
  clonarPlantilla,
  formatearQuetzales,
  llenar,
  mostrarAviso,
  mostrarEstadoVacio,
  vaciar,
} from "../ui.js";

const lista = document.querySelector("#listaCotizacion");
const resumen = document.querySelector("#resumen");
const acciones = document.querySelector("#acciones");
const dialogo = document.querySelector("#dialogoDescuento");
const formularioDescuento = document.querySelector("#formularioDescuento");
const errorDescuento = document.querySelector("#errorDescuento");

const selectCliente = document.querySelector("#clienteCotizacion");
const observaciones = document.querySelector("#observacionesCotizacion");
const botonGuardar = document.querySelector("#guardar");
const mensajeGuardado = document.querySelector("#mensajeGuardado");


const panelGuardada = document.querySelector("#cotizacionGuardada");
const textoCodigoGuardada = document.querySelector("#codigoGuardada");
const estadoGuardada = document.querySelector("#estadoGuardada");
const botonConfirmar = document.querySelector("#confirmarGuardada");

let usuario = null;
let itemEnDescuento = null;

let cotizacionGuardada = null;

function actualizarContador() {
  document.querySelectorAll('[data-carrito="cantidad"]').forEach((n) => {
    n.textContent = carrito.cantidadTotal();
  });
}

function crearItem(item) {
  const nodo = clonarPlantilla("plantillaItem");
  const original = item.precio * item.cantidad;
  const final = original * (1 - (item.descuento || 0) / 100);

  llenar(nodo, {
    nombre: item.nombre,
    detalle: `${item.marca} · ${item.detalle}`,
    cantidad: item.cantidad,
    importe: formatearQuetzales(final),
  });

  nodo.querySelector('[data-elemento="detalle"]').href = `/pages/producto.html?id=${item.id}`;

  if (item.descuento) {
    const etiqueta = nodo.querySelector('[data-elemento="etiquetaDescuento"]');
    etiqueta.textContent = `Descuento aplicado: ${item.descuento}%`;
    etiqueta.hidden = false;
    const tachado = nodo.querySelector('[data-campo="importeOriginal"]');
    tachado.textContent = formatearQuetzales(original);
    tachado.hidden = false;
    nodo.querySelector('[data-accion="descuento"]').textContent = "Cambiar descuento";
  }

  nodo.querySelector('[data-accion="quitar"]').addEventListener("click", () => {
    carrito.quitar(item.id);
    dibujar();
  });
  nodo.querySelector('[data-accion="menos"]').addEventListener("click", () => {
    carrito.cambiarCantidad(item.id, -1);
    dibujar();
  });
  nodo.querySelector('[data-accion="mas"]').addEventListener("click", () => {
    carrito.cambiarCantidad(item.id, 1);
    dibujar();
  });
  nodo.querySelector('[data-accion="descuento"]').addEventListener("click", () => {
    itemEnDescuento = item;
    errorDescuento.textContent = "";
    formularioDescuento.reset();
    llenar(dialogo, { producto: item.nombre });
    dialogo.showModal();
  });

  return nodo;
}

function dibujar() {
  const items = carrito.obtenerItems();
  vaciar(lista);
  actualizarContador();

  botonGuardar.disabled = false;
  mensajeGuardado.textContent = "";

  if (!items.length) {
    mostrarEstadoVacio(lista, "La cotización está vacía", "Agregue productos desde el catálogo.");
    resumen.hidden = true;
    acciones.hidden = true;
    return;
  }

  lista.append(...items.map(crearItem));

  const { subtotal, descuento, total } = carrito.totales();
  document.querySelector("#resumenSubtotal").textContent = formatearQuetzales(subtotal);
  document.querySelector("#resumenDescuento").textContent = `− ${formatearQuetzales(descuento)}`;
  document.querySelector("#resumenTotal").textContent = formatearQuetzales(total);
  resumen.hidden = false;
  acciones.hidden = false;
}


async function cargarClientes() {
  try {
    const clientes = await solicitar("/api/cotizaciones/clientes/");
    selectCliente.replaceChildren(new Option("-- Seleccione un cliente --", ""));
    for (const c of clientes) {
      
      selectCliente.append(new Option(`${c.nombre} — NIT: ${c.nit} (${c.tipo})`, c.id));
    }
    if (!clientes.length) {
      mensajeGuardado.textContent = "No hay clientes activos registrados.";
    }
  } catch (error) {
    mensajeGuardado.textContent = error.message;
  }
}

function asignar(raiz, campo, valor) {
  const nodo = raiz.querySelector(`[data-campo="${campo}"]`);
  if (nodo) nodo.textContent = valor ?? "";
}


function imprimirDocumento({ cabecera, detalle }) {
  const documento = clonarPlantilla("plantillaDocumento");

  llenar(documento, {
    fecha: new Date(cabecera.fecha).toLocaleDateString("es-GT"),
    empleado: cabecera.empleado,
    rol: cabecera.rol,
    subtotal: formatearQuetzales(Number(cabecera.subtotal)),
    descuento: `− ${formatearQuetzales(Number(cabecera.descuento))}`,
    total: formatearQuetzales(Number(cabecera.total)),
  });
  asignar(documento, "codigo", cabecera.codigoCotizacion);
  asignar(documento, "cliente", cabecera.nombreCliente);
  asignar(documento, "nit", cabecera.nit ? `NIT: ${cabecera.nit}` : "");

  documento.querySelector('[data-elemento="filas"]').append(
    ...detalle.map((linea) =>
      llenar(clonarPlantilla("plantillaFilaDocumento"), {
        nombre: linea.producto,
        detalle: [linea.marca, linea.presentacion, linea.color].filter(Boolean).join(" · "),
        cantidad: linea.cantidad,
        precio: formatearQuetzales(Number(linea.precioUnitario)),
        descuento: `${Number(linea.descuento)}%`,
        importe: formatearQuetzales(Number(linea.subtotal)),
      })
    )
  );

  document.querySelector("#areaImpresion").replaceChildren(documento);
  document.body.classList.add("printing-document");
  window.print();
  setTimeout(() => document.body.classList.remove("printing-document"), 500);
}

formularioDescuento.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  errorDescuento.textContent = "";

  try {
    const respuesta = await solicitar("/api/cotizaciones/autorizar-descuento/", {
      metodo: "POST",
      cuerpo: {
        clave: document.querySelector("#claveDescuento").value,
        porcentaje: document.querySelector("#porcentajeDescuento").value,
      },
    });
    
    carrito.fijarDescuento(itemEnDescuento.id, respuesta.porcentaje, respuesta.token);
    dialogo.close();
    dibujar();
    mostrarAviso("Descuento autorizado y aplicado.");
  } catch (error) {
    errorDescuento.textContent = error.message;
  }
});

document.querySelector("#cancelarDescuento").addEventListener("click", () => dialogo.close());

document.querySelector("#vaciar").addEventListener("click", () => {
  carrito.vaciar();
  dibujar();
});


botonGuardar.addEventListener("click", async () => {
  const idCliente = Number(selectCliente.value);
  const { lineas, tokensDescuento } = carrito.lineasParaGuardar();

  if (!idCliente) {
    mensajeGuardado.textContent = "Seleccione un cliente.";
    return;
  }
  if (!lineas.length) {
    mensajeGuardado.textContent = "La cotización no tiene productos.";
    return;
  }

  botonGuardar.disabled = true; 
  mensajeGuardado.textContent = "Guardando...";

  try {
    const respuesta = await guardarCotizacion({
      idCliente,
      observaciones: observaciones.value.trim() || null,
      lineas,
      tokensDescuento,
    });

    
    cotizacionGuardada = {
      id: respuesta.idCotizacion,
      codigo: respuesta.codigoCotizacion,
    };
    carrito.vaciar();
    selectCliente.value = "";
    observaciones.value = "";
    textoCodigoGuardada.textContent = cotizacionGuardada.codigo;
    panelGuardada.hidden = false;
    estadoGuardada.textContent = "Estado: Pendiente. Confírmela cuando el cliente la acepte.";
    botonConfirmar.disabled = false;
    dibujar();
    mostrarAviso(`Cotización ${cotizacionGuardada.codigo} guardada.`);
  } catch (error) {
    mensajeGuardado.textContent = error.message; 
    botonGuardar.disabled = false;
  }
});

document.querySelector("#imprimirGuardada").addEventListener("click", async (evento) => {
  if (!cotizacionGuardada) return;
  const boton = evento.currentTarget;
  boton.disabled = true;
  try {
    const datos = await solicitar(`/api/cotizaciones/${cotizacionGuardada.id}/impresion/`);
    imprimirDocumento(datos);
  } catch (error) {
    mostrarAviso(error.message);
  } finally {
    boton.disabled = false;
  }
});


botonConfirmar.addEventListener("click", async () => {
  if (!cotizacionGuardada) return;
  if (!window.confirm(`¿Confirmar la cotización ${cotizacionGuardada.codigo}?`)) return;

  botonConfirmar.disabled = true;
  try {
    await solicitar(`/api/cotizaciones/${cotizacionGuardada.id}/confirmar/`, { metodo: "POST" });
    estadoGuardada.textContent = "Estado: Confirmada. Lista para facturar.";
    mostrarAviso(`Cotización ${cotizacionGuardada.codigo} confirmada.`);
  } catch (error) {
    estadoGuardada.textContent = error.message;
    botonConfirmar.disabled = false;
  }
});


document.querySelector("#nuevaCotizacion").addEventListener("click", () => {
  cotizacionGuardada = null;
  panelGuardada.hidden = true;
  selectCliente.focus();
});

usuario = await iniciarPagina();
dibujar();
cargarClientes();