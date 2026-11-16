
import { solicitar, obtenerLista } from "../api.js";
import { iniciarPagina } from "../sesion.js";
import { formatearQuetzales } from "../ui.js";

const formulario = document.querySelector("#formularioOrden");
const proveedor = document.querySelector("#proveedor");
const producto = document.querySelector("#producto");
const detalle = document.querySelector("#detalleOrden");
const totalOrden = document.querySelector("#totalOrden");
const mensaje = document.querySelector("#mensajeOrden");
const guardar = document.querySelector("#guardarOrden");

let productos = [];
let lineas = [];

// Mostrar el día actual
document.querySelector("#fechaOrden").value =
  new Date().toLocaleDateString("en-CA");

// Cargar los proveedores y productos desde Django
async function cargarDatos() {
  try {
    const [datosProveedores, datosProductos] = await Promise.all([
      solicitar("/api/proveedores/"),
      solicitar("/api/productos/")
    ]);

    const proveedores = obtenerLista(datosProveedores)
      .filter(p => p.activo);

    productos = obtenerLista(datosProductos)
      .filter(p => p.activo);

    proveedor.replaceChildren(
      new Option("Seleccione un proveedor", "")
    );

    proveedores.forEach(p => {
      proveedor.add(
        new Option(p.nombreproveedor, p.idproveedor)
      );
    });

    producto.replaceChildren(
      new Option("Seleccione un producto", "")
    );

    productos.forEach(p => {
      const nombre = [
        p.producto_general_nombre,
        p.marca_nombre,
        p.presentacion_nombre,
        p.color_nombre
      ].filter(Boolean).join(" - ");

      producto.add(new Option(nombre, p.idproducto));
    });

  } catch (error) {
    mensaje.textContent = "Error al cargar datos: " + error.message;
  }
}

// Agregar un producto a la orden
document.querySelector("#agregarProducto")
  .addEventListener("click", () => {

    const id = Number(producto.value);

    if (!id) {
      mensaje.textContent = "Seleccione un producto.";
      return;
    }

    if (lineas.some(p => p.idProducto === id)) {
      mensaje.textContent = "Ese producto ya fue agregado.";
      return;
    }

    const seleccionado = productos.find(
      p => Number(p.idproducto) === id
    );

    if (!seleccionado) return;

    lineas.push({
      idProducto: id,
      nombre: producto.selectedOptions[0].textContent,
      cantidad: 1,
      costoUnitario: 0
    });

    mensaje.textContent = "";
    dibujarDetalle();
  });

// Mostrar productos agregados
function dibujarDetalle() {
  detalle.replaceChildren();

  if (!lineas.length) {
    const fila = detalle.insertRow();
    const celda = fila.insertCell();
    celda.colSpan = 5;
    celda.textContent = "Todavía no has agregado productos.";
  }

  lineas.forEach((p, indice) => {
    const fila = detalle.insertRow();

    fila.insertCell().textContent = p.nombre;

    const celdaCantidad = fila.insertCell();
    const cantidad = document.createElement("input");
    cantidad.type = "number";
    cantidad.min = "1";
    cantidad.step = "1";
    cantidad.value = p.cantidad;
    cantidad.setAttribute("aria-label", "Cantidad");

    cantidad.addEventListener("input", () => {
      p.cantidad = Number(cantidad.value);
      calcularTotal();
    });

    celdaCantidad.append(cantidad);

    const celdaCosto = fila.insertCell();
    const costo = document.createElement("input");
    costo.type = "number";
    costo.min = "0.01";
    costo.step = "0.01";
    costo.value = p.costoUnitario || "";
    costo.placeholder = "0.00";
    costo.setAttribute("aria-label", "Costo unitario");

    costo.addEventListener("input", () => {
      p.costoUnitario = Number(costo.value);
      calcularTotal();
    });

    celdaCosto.append(costo);

    const subtotal = fila.insertCell();
    subtotal.className = "subtotal";
    subtotal.textContent = formatearQuetzales(
      p.cantidad * p.costoUnitario
    );

    const celdaAccion = fila.insertCell();
    const quitar = document.createElement("button");
    quitar.type = "button";
    quitar.className = "action-button wine";
    quitar.textContent = "Quitar";

    quitar.addEventListener("click", () => {
      lineas.splice(indice, 1);
      dibujarDetalle();
    });

    celdaAccion.append(quitar);
  });

  calcularTotal();
}

// Calcular subtotales y total
function calcularTotal() {
  let total = 0;

  detalle.querySelectorAll("tr").forEach((fila, indice) => {
    const p = lineas[indice];
    if (!p) return;

    const subtotal = p.cantidad * p.costoUnitario;
    total += subtotal;

    fila.querySelector(".subtotal").textContent =
      formatearQuetzales(subtotal);
  });

  totalOrden.textContent = formatearQuetzales(total);
}

// Guardar la orden
formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensaje.textContent = "";

  if (!proveedor.value) {
    mensaje.textContent = "Seleccione un proveedor.";
    return;
  }

  if (!lineas.length) {
    mensaje.textContent = "Agregue al menos un producto.";
    return;
  }

  if (lineas.some(p =>
    !Number.isInteger(p.cantidad) ||
    p.cantidad <= 0 ||
    !Number.isFinite(p.costoUnitario) ||
    p.costoUnitario <= 0 ||
    Math.round(p.costoUnitario * 100) !== p.costoUnitario * 100
  )) {
    mensaje.textContent =
      "Revise las cantidades y los costos de los productos.";
    return;
  }

  const cuerpo = {
    idProveedor: Number(proveedor.value),
    observaciones:
      document.querySelector("#observaciones").value.trim(),
    detalle: lineas.map(p => ({
      idProducto: p.idProducto,
      cantidad: p.cantidad,
      costoUnitario: p.costoUnitario.toFixed(2)
    }))
  };

  guardar.disabled = true;
  guardar.textContent = "Guardando...";

  try {
    const respuesta = await solicitar("/api/ordenes-compra/", {
      metodo: "POST",
      cuerpo
    });

    document.querySelector("#numeroOrden").textContent =
      respuesta.codigoCompra;

    document.querySelector("#totalOrdenCreada").textContent =
      formatearQuetzales(respuesta.total);

    document.querySelector("#ordenCreada").hidden = false;

    formulario.reset();
    lineas = [];
    dibujarDetalle();

    mensaje.textContent = "";
    await cargarOrdenes();

  } catch (error) {
    mensaje.textContent =
      "No se pudo guardar la orden: " + error.message;
  } finally {
    guardar.disabled = false;
    guardar.textContent = "Generar orden de compra";
  }
});

// Limpiar la orden sin guardar
formulario.addEventListener("reset", () => {
  lineas = [];
  mensaje.textContent = "";
  document.querySelector("#ordenCreada").hidden = true;
  dibujarDetalle();
});

await iniciarPagina();
await cargarDatos();


async function cargarOrdenes() {
  const tabla = document.querySelector("#listadoOrdenes");

  try {
    const ordenes = await solicitar("/api/ordenes-compra/");

    tabla.replaceChildren();

    if (!ordenes.length) {
      const fila = tabla.insertRow();
      const celda = fila.insertCell();
      celda.colSpan = 5;
      celda.textContent = "No hay órdenes registradas.";
      return;
    }

    ordenes.forEach(orden => {
      const fila = tabla.insertRow();

      [
        orden.codigoCompra,
        orden.proveedor,
        orden.fecha
          ? orden.fecha.substring(0, 10)
          : "",
        formatearQuetzales(orden.total),
        orden.estado
      ].forEach(valor => {
        fila.insertCell().textContent = valor;
      });
    });

  } catch (error) {
    tabla.replaceChildren();
    const fila = tabla.insertRow();
    const celda = fila.insertCell();
    celda.colSpan = 5;
    celda.textContent = "Error: " + error.message;
  }
}

document.querySelector("#actualizarOrdenes")
  .addEventListener("click", cargarOrdenes);

await cargarOrdenes();
