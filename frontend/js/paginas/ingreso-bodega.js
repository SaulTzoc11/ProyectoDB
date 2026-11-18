import { solicitar } from "../api.js";
import { iniciarPagina } from "../sesion.js";
import { formatearQuetzales, llenar, mostrarAviso } from "../ui.js";

const orden = document.querySelector("#orden");
const estanteGeneral = document.querySelector("#estanteGeneral");
const tabla = document.querySelector("#productosPendientes");
const resumen = document.querySelector("#resumenOrden");
const sinOrden = document.querySelector("#sinOrden");
const bloqueProductos = document.querySelector("#bloqueProductos");
const observaciones = document.querySelector("#observaciones");
const mensaje = document.querySelector("#mensajeIngreso");
const formulario = document.querySelector("#formIngreso");
const boton = document.querySelector("#guardarIngreso");

const formatoFecha = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" });

let pendientes = [];
let estantes = [];

function mostrarMensaje(texto, exito = false) {
  mensaje.textContent = texto;
  mensaje.classList.toggle("mensaje-exito", exito);
}

function llenarEstantes(selector, valor) {
  selector.replaceChildren(...estantes.map((e) => new Option(e.nombre, e.idEstante)));
  if (!estantes.length) selector.add(new Option("No hay estantes activos", ""));
  if (valor) selector.value = valor;
}

function lineasDeOrden() {
  return pendientes.filter((p) => String(p.idCompra) === orden.value);
}

function actualizarValor() {
  const total = [...tabla.rows].reduce((suma, fila) => {
    const cantidad = Number(fila.querySelector(".cantidad-recibida").value) || 0;
    const costo = Number(fila.querySelector(".costo-real").value) || 0;
    fila.classList.toggle("sin-recibir", cantidad === 0);
    return suma + cantidad * costo;
  }, 0);
  llenar(resumen, { valor: formatearQuetzales(total) });
}

function crearInput(clase, valores) {
  const input = document.createElement("input");
  input.type = "number";
  input.className = clase;
  Object.assign(input, valores);
  input.addEventListener("input", actualizarValor);
  return input;
}

function mostrarProductos() {
  mostrarMensaje("");
  tabla.replaceChildren();
  const lineas = lineasDeOrden();
  const hayOrden = lineas.length > 0;

  sinOrden.hidden = hayOrden;
  bloqueProductos.hidden = !hayOrden;
  resumen.hidden = !hayOrden;
  boton.disabled = !hayOrden;
  if (!hayOrden) return;

  const primera = lineas[0];
  llenar(resumen, {
    proveedor: primera.proveedor,
    fecha: primera.fechaCompra ? formatoFecha.format(new Date(primera.fechaCompra)) : "—",
    lineas: String(lineas.length),
  });

  lineas.forEach((p) => {
    const fila = tabla.insertRow();
    fila.dataset.detalle = p.idDetalleCompra;

    const celdaProducto = fila.insertCell();
    const nombre = document.createElement("strong");
    nombre.textContent = p.producto || `Producto #${p.idProducto}`;
    const detalle = document.createElement("small");
    detalle.textContent = [p.marca, p.codigoProducto && `Código ${p.codigoProducto}`].filter(Boolean).join(" · ");
    celdaProducto.append(nombre, detalle);

    const celdaPendiente = fila.insertCell();
    celdaPendiente.className = "num";
    celdaPendiente.textContent = `${p.pendiente} de ${p.solicitado}`;

    // Se llena con lo pendiente y con el costo pactado en la orden.
    fila.insertCell().append(crearInput("cantidad-recibida", {
      min: "0", max: String(p.pendiente), step: "1", value: String(p.pendiente),
    }));
    fila.insertCell().append(crearInput("costo-real", {
      min: "0.01", step: "0.01", value: Number(p.costoUnitario).toFixed(2),
    }));

    const selector = document.createElement("select");
    selector.className = "estante";
    llenarEstantes(selector, estanteGeneral.value);
    fila.insertCell().append(selector);
  });

  actualizarValor();
}

async function cargarDatos(idSeleccion = "") {
  try {
    [pendientes, estantes] = await Promise.all([
      solicitar("/api/ingresos-bodega/pendientes/"),
      solicitar("/api/ingresos-bodega/estantes/"),
    ]);

    const ordenes = new Map();
    pendientes.forEach((p) => ordenes.set(p.idCompra, p));

    orden.replaceChildren(new Option(
      ordenes.size ? "Seleccione una orden" : "No hay órdenes pendientes de recibir", ""));
    ordenes.forEach((p) => orden.add(new Option(`${p.codigoCompra} — ${p.proveedor}`, p.idCompra)));
    llenarEstantes(estanteGeneral, estanteGeneral.value);

    // Si solo hay una orden pendiente, se selecciona sola.
    if (idSeleccion && ordenes.has(Number(idSeleccion))) orden.value = idSeleccion;
    else if (ordenes.size === 1) orden.value = String([...ordenes.keys()][0]);

    mostrarProductos();
  } catch (error) {
    mostrarMensaje(`Error al cargar datos: ${error.message}`);
  }
}

orden.addEventListener("change", mostrarProductos);

// El estante de destino se aplica a todos los productos; cada fila se puede cambiar.
estanteGeneral.addEventListener("change", () => {
  tabla.querySelectorAll(".estante").forEach((s) => { s.value = estanteGeneral.value; });
});

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mostrarMensaje("");

  const detalle = [];
  for (const fila of tabla.rows) {
    const nombre = fila.querySelector("strong").textContent;
    const cantidad = Number(fila.querySelector(".cantidad-recibida").value);
    const pendiente = pendientes.find((p) => p.idDetalleCompra === Number(fila.dataset.detalle));
    const costo = fila.querySelector(".costo-real").value;
    const estante = fila.querySelector(".estante").value;

    if (!Number.isInteger(cantidad) || cantidad < 0) {
      mostrarMensaje(`Cantidad inválida en ${nombre}.`);
      return;
    }
    if (cantidad === 0) continue;
    if (cantidad > pendiente.pendiente) {
      mostrarMensaje(`${nombre}: no puede recibir más de ${pendiente.pendiente}.`);
      return;
    }
    if (!(Number(costo) > 0) || !/^\d+(\.\d{1,2})?$/.test(costo)) {
      mostrarMensaje(`${nombre}: escriba un costo mayor a 0 con hasta 2 decimales.`);
      return;
    }
    if (!estante) {
      mostrarMensaje(`${nombre}: seleccione un estante.`);
      return;
    }

    detalle.push({
      idDetalleCompra: Number(fila.dataset.detalle),
      idEstante: Number(estante),
      cantidad,
      costoUnitarioReal: Number(costo).toFixed(2),
    });
  }

  if (!orden.value || !detalle.length) {
    mostrarMensaje("Seleccione una orden y reciba al menos un producto.");
    return;
  }

  boton.disabled = true;
  try {
    const idOrden = orden.value;
    const resultado = await solicitar("/api/ingresos-bodega/", {
      metodo: "POST",
      cuerpo: { idCompra: Number(idOrden), observaciones: observaciones.value.trim(), detalle },
    });
    observaciones.value = "";
    mostrarAviso(`Ingreso ${resultado.codigoEntrega} registrado.`);
    await cargarDatos(idOrden);
    mostrarMensaje(`Ingreso ${resultado.codigoEntrega} registrado. Estado de la orden: ${resultado.estadoOrden}.`, true);
  } catch (error) {
    mostrarMensaje(`No se pudo registrar: ${error.message}`);
    boton.disabled = false;
  }
});

await iniciarPagina();
await cargarDatos();
