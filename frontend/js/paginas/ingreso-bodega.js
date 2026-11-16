
import { solicitar } from "../api.js";
import { iniciarPagina } from "../sesion.js";

const orden = document.querySelector("#orden");
const tabla = document.querySelector("#productosPendientes");
const mensaje = document.querySelector("#mensajeIngreso");
const formulario = document.querySelector("#formIngreso");
const boton = document.querySelector("#guardarIngreso");

let pendientes = [];
let estantes = [];

function mostrarMensaje(texto, error = false) {
  mensaje.textContent = texto;
  mensaje.style.color = error ? "#b00020" : "green";
}

async function cargarDatos() {
  try {
    [pendientes, estantes] = await Promise.all([
      solicitar("/api/ingresos-bodega/pendientes/"),
      solicitar("/api/ingresos-bodega/estantes/")
    ]);

    orden.replaceChildren(new Option("Selecciona una orden", ""));

    const ordenes = new Map();

    pendientes.forEach(p => {
      ordenes.set(p.idCompra, p);
    });

    ordenes.forEach(p => {
      orden.add(new Option(
        `${p.codigoCompra} - ${p.proveedor}`,
        p.idCompra
      ));
    });

    mostrarProductos();
  } catch (error) {
    mostrarMensaje("Error al cargar datos: " + error.message, true);
  }
}

function mostrarProductos() {
  tabla.replaceChildren();

  const seleccionados = pendientes.filter(
    p => String(p.idCompra) === orden.value
  );

  seleccionados.forEach(p => {
    const fila = tabla.insertRow();
    fila.dataset.detalle = p.idDetalleCompra;

    fila.insertCell().textContent = `Producto #${p.idProducto}`;
    fila.insertCell().textContent = p.pendiente;

    const celdaCantidad = fila.insertCell();
    const cantidad = document.createElement("input");
    cantidad.type = "number";
    cantidad.min = "0";
    cantidad.max = String(p.pendiente);
    cantidad.step = "1";
    cantidad.value = "0";
    cantidad.className = "cantidad-recibida";
    cantidad.style.width = "85px";
    celdaCantidad.append(cantidad);

    const celdaCosto = fila.insertCell();
    const costo = document.createElement("input");
    costo.type = "number";
    costo.min = "0.01";
    costo.step = "0.01";
    costo.placeholder = "0.00";
    costo.className = "costo-real";
    costo.style.width = "110px";
    celdaCosto.append(costo);

    const celdaEstante = fila.insertCell();
    const selector = document.createElement("select");
    selector.className = "estante";
    selector.add(new Option("Selecciona", ""));

    estantes.forEach(e => {
      selector.add(new Option(e.nombre, e.idEstante));
    });

    celdaEstante.append(selector);
  });
}

orden.addEventListener("change", mostrarProductos);

formulario.addEventListener("submit", async evento => {
  evento.preventDefault();

  const filas = [...tabla.querySelectorAll("tr")];
  const detalle = [];

  for (const fila of filas) {
    const cantidad = Number(
      fila.querySelector(".cantidad-recibida").value
    );

    if (!Number.isInteger(cantidad) || cantidad < 0) {
      mostrarMensaje("Cantidad inválida.", true);
      return;
    }

    if (cantidad === 0) continue;

    const pendiente = pendientes.find(
      p => p.idDetalleCompra === Number(fila.dataset.detalle)
    );

    const costo = fila.querySelector(".costo-real").value;
    const estante = fila.querySelector(".estante").value;

    if (cantidad > pendiente.pendiente) {
      mostrarMensaje("No puedes recibir más de lo pendiente.", true);
      return;
    }

    if (!estante || !costo ||
        !Number.isFinite(Number(costo)) ||
        Number(costo) <= 0 ||
        !/^\d+(\.\d{1,2})?$/.test(costo)) {
      mostrarMensaje("Revisa costo y estante.", true);
      return;
    }

    detalle.push({
      idDetalleCompra: Number(fila.dataset.detalle),
      idEstante: Number(estante),
      cantidad,
      costoUnitarioReal: Number(costo).toFixed(2)
    });
  }

  if (!orden.value || !detalle.length) {
    mostrarMensaje("Selecciona una orden y recibe algún producto.", true);
    return;
  }

  boton.disabled = true;
  try {
    const resultado = await solicitar("/api/ingresos-bodega/", {
      metodo: "POST",
      cuerpo: {
        idCompra: Number(orden.value),
        observaciones:
          document.querySelector("#observaciones").value.trim(),
        detalle
      }
    });

    mostrarMensaje(
      `Ingreso ${resultado.codigoEntrega} registrado. ` +
      `Orden: ${resultado.estadoOrden}`
    );

    await cargarDatos();

  } catch (error) {
    mostrarMensaje("No se pudo registrar: " + error.message, true);
  } finally {
    boton.disabled = false;
  }
});

await iniciarPagina();
await cargarDatos();
