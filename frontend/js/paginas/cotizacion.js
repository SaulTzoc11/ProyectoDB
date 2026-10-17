import { solicitar } from "../api.js";
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

let usuario = null;
let itemEnDescuento = null;

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
    carrito.fijarDescuento(itemEnDescuento.id, respuesta.porcentaje);
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

document.querySelector("#imprimir").addEventListener("click", () => {
  const documento = clonarPlantilla("plantillaDocumento");
  const { subtotal, descuento, total } = carrito.totales();

  llenar(documento, {
    fecha: new Date().toLocaleDateString("es-GT"),
    empleado: usuario.name,
    rol: usuario.role,
    subtotal: formatearQuetzales(subtotal),
    descuento: `− ${formatearQuetzales(descuento)}`,
    total: formatearQuetzales(total),
  });

  documento.querySelector('[data-elemento="filas"]').append(
    ...carrito.obtenerItems().map((item) =>
      llenar(clonarPlantilla("plantillaFilaDocumento"), {
        nombre: item.nombre,
        detalle: `${item.marca} · ${item.detalle}`,
        cantidad: item.cantidad,
        precio: formatearQuetzales(item.precio),
        descuento: `${item.descuento || 0}%`,
        importe: formatearQuetzales(item.precio * item.cantidad * (1 - (item.descuento || 0) / 100)),
      })
    )
  );

  document.querySelector("#areaImpresion").replaceChildren(documento);
  document.body.classList.add("printing-document");
  window.print();
  setTimeout(() => document.body.classList.remove("printing-document"), 500);
});

usuario = await iniciarPagina();
dibujar();
