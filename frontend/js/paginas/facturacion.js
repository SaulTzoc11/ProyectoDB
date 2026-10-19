import * as carrito from "../carrito.js";
import { facturarVenta, solicitar } from "../api.js";
import { iniciarPagina } from "../sesion.js";
import { clonarPlantilla, formatearQuetzales, mostrarAviso } from "../ui.js";

const origen = document.querySelector("#origenFactura");
const bloqueDirecta = document.querySelector("#ventaDirecta");
const selectCliente = document.querySelector("#clienteFactura");
const observaciones = document.querySelector("#observacionesFactura");
const resumenCarrito = document.querySelector("#resumenCarrito");
const listaPagos = document.querySelector("#listaPagos");
const mensaje = document.querySelector("#mensajeFactura");
const botonFacturar = document.querySelector("#facturar");
const panelEmitida = document.querySelector("#facturaEmitida");

let pendientes = [];
let tiposPago = [];

const esDirecta = () => origen.value === "directa";

function totalAPagar() {
  if (esDirecta()) return carrito.totales().total;
  const cotizacion = pendientes.find((c) => String(c.id) === origen.value);
  return cotizacion ? Number(cotizacion.total) : 0;
}

function totalPagado() {
  return [...listaPagos.querySelectorAll('[data-campo="monto"]')]
    .reduce((suma, input) => suma + (Number(input.value) || 0), 0);
}

function refrescarTotales() {
  const total = totalAPagar();
  const pagado = totalPagado();
  document.querySelector("#totalFactura").textContent = formatearQuetzales(total);
  document.querySelector("#totalPagado").textContent = formatearQuetzales(pagado);
  document.querySelector("#diferenciaPago").textContent = formatearQuetzales(total - pagado);
}

function agregarPago(monto = "") {
  const fila = clonarPlantilla("plantillaPago");
  const tipo = fila.querySelector('[data-campo="tipo"]');
  tiposPago.forEach((t) => tipo.append(new Option(t.nombre, t.id)));

  const inputMonto = fila.querySelector('[data-campo="monto"]');
  inputMonto.value = monto;
  inputMonto.addEventListener("input", refrescarTotales);
  fila.querySelector('[data-accion="quitarPago"]').addEventListener("click", () => {
    fila.remove();
    refrescarTotales();
  });
  listaPagos.append(fila);
  refrescarTotales();
}

function reiniciarPagos() {
  listaPagos.replaceChildren();
  const total = totalAPagar();
  agregarPago(total > 0 ? total.toFixed(2) : "");
}

function dibujarOrigen() {
  bloqueDirecta.hidden = !esDirecta();
  resumenCarrito.textContent = esDirecta()
    ? `${carrito.cantidadTotal()} artículo(s) en el carrito. El total final lo calcula el sistema con el precio vigente del cliente.`
    : "";
  reiniciarPagos();
}

function llenarOrigen() {
  origen.replaceChildren(new Option("Venta directa (carrito actual)", "directa"));
  for (const c of pendientes) {
    origen.append(new Option(`${c.codigo} — ${c.cliente} — ${formatearQuetzales(c.total)}`, c.id));
  }
  origen.value = carrito.cantidadTotal() || !pendientes.length ? "directa" : String(pendientes[0].id);
}

async function cargarDatos() {
  try {
    const [tipos, porFacturar, clientes] = await Promise.all([
      solicitar("/api/facturas/tipos-pago/"),
      solicitar("/api/facturas/pendientes/"),
      solicitar("/api/cotizaciones/clientes/"),
    ]);
    tiposPago = tipos;
    pendientes = porFacturar;
    selectCliente.replaceChildren(new Option("-- Seleccione un cliente --", ""));
    clientes.forEach((c) => selectCliente.append(new Option(`${c.nombre} — NIT: ${c.nit} (${c.tipo})`, c.id)));
    llenarOrigen();
    dibujarOrigen();
  } catch (error) {
    mensaje.textContent = error.message;
  }
}

function leerPagos() {
  return [...listaPagos.children].map((fila) => ({
    idTipoPago: Number(fila.querySelector('[data-campo="tipo"]').value),
    monto: fila.querySelector('[data-campo="monto"]').value,
    observaciones: fila.querySelector('[data-campo="observaciones"]').value.trim() || null,
  }));
}

origen.addEventListener("change", dibujarOrigen);
document.querySelector("#agregarPago").addEventListener("click", () => {
  const falta = totalAPagar() - totalPagado();
  agregarPago(falta > 0 ? falta.toFixed(2) : "");
});

botonFacturar.addEventListener("click", async () => {
  mensaje.textContent = "";
  const pagos = leerPagos();
  if (!pagos.length || pagos.some((p) => !Number(p.monto))) {
    mensaje.textContent = "Indique el monto de cada medio de pago.";
    return;
  }

  let cuerpo;
  if (esDirecta()) {
    const idCliente = Number(selectCliente.value);
    const { lineas, tokensDescuento } = carrito.lineasParaGuardar();
    if (!idCliente) { mensaje.textContent = "Seleccione un cliente."; return; }
    if (!lineas.length) { mensaje.textContent = "El carrito está vacío."; return; }
    cuerpo = { idCliente, observaciones: observaciones.value.trim() || null, detalle: lineas, tokensDescuento, pagos };
  } else {
    cuerpo = { idCotizacion: Number(origen.value), pagos };
  }

  botonFacturar.disabled = true;
  try {
    const respuesta = await facturarVenta(cuerpo);
    if (esDirecta()) carrito.vaciar();
    document.querySelector("#noFacturaEmitida").textContent = respuesta.noFactura;
    panelEmitida.hidden = false;
    mostrarAviso(`Factura ${respuesta.noFactura} emitida.`);
    await cargarDatos();
  } catch (error) {
    mensaje.textContent = error.message;
  } finally {
    botonFacturar.disabled = false;
  }
});

document.querySelector("#nuevaFactura").addEventListener("click", () => {
  panelEmitida.hidden = true;
});

await iniciarPagina();
cargarDatos();