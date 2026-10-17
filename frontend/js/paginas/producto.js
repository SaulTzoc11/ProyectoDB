import * as carrito from "../carrito.js";
import { aplicarColor, cargarProductos } from "../productos.js";
import { iniciarPagina } from "../sesion.js";
import {
  clonarPlantilla,
  formatearQuetzales,
  llenar,
  mostrarAviso,
  vaciar,
} from "../ui.js";

const seccionSelector = document.querySelector("#seccionSelector");
const seccionDetalle = document.querySelector("#seccionDetalle");
const mensaje = document.querySelector("#mensajeProducto");

function mostrarSelector(productos) {
  const lista = document.querySelector("#listaSelector");
  const enlace = document.querySelector("#verProducto");

  const opciones = productos.map((producto, indice) => {
    const nodo = clonarPlantilla("plantillaOpcionProducto");
    llenar(nodo, {
      nombre: producto.nombre,
      detalle: `${producto.marca} · ${producto.categoria} · ${producto.detalle}`,
      stock: `${producto.stock} en existencia`,
    });
    aplicarColor(nodo.querySelector(".color-swatch"), producto.color);

    const radio = nodo.querySelector("input");
    radio.value = producto.id;
    radio.checked = indice === 0;
    radio.addEventListener("change", () => {
      enlace.href = `/pages/producto.html?id=${producto.id}`;
    });
    if (indice === 0) enlace.href = `/pages/producto.html?id=${producto.id}`;

    return nodo;
  });

  lista.append(...opciones);
  seccionSelector.hidden = false;
}

function mostrarDetalle(producto) {
  llenar(seccionDetalle, {
    nombre: producto.nombre,
    resumen: `${producto.marca} · ${producto.categoria} · ${producto.detalle}`,
    color: producto.nombreColor,
    stock: producto.stock,
    presentacion: producto.presentacion,
  });

  const muestra = document.querySelector("#muestraColor");
  muestra.style.background = producto.color;
  muestra.firstElementChild.style.color = "white";

  const ubicaciones = document.querySelector("#tablaUbicaciones");
  vaciar(ubicaciones);
  ubicaciones.append(
    ...(producto.ubicaciones.length
      ? producto.ubicaciones.map((u) => llenar(clonarPlantilla("plantillaUbicacion"), u))
      : [llenar(clonarPlantilla("plantillaUbicacion"), { lugar: "Sin existencias registradas", cantidad: 0 })])
  );

  const precios = document.querySelector("#listaPrecios");
  vaciar(precios);
  precios.append(
    ...producto.precios.map((p) =>
      llenar(clonarPlantilla("plantillaPrecio"), { tipo: p.tipo, valor: formatearQuetzales(p.valor) })
    )
  );

  let cantidad = 1;
  const salida = document.querySelector("#cantidad");
  const cambiar = (diferencia) => {
    cantidad = Math.max(1, Math.min(producto.stock || 1, cantidad + diferencia));
    salida.textContent = cantidad;
  };
  document.querySelector("#menos").addEventListener("click", () => cambiar(-1));
  document.querySelector("#mas").addEventListener("click", () => cambiar(1));

  document.querySelector("#agregar").addEventListener("click", () => {
    const precio = producto.precios.find((p) => p.tipo.toLowerCase() === "individual") || producto.precios[0];
    if (!precio || producto.stock < 1) {
      mostrarAviso("El producto no se puede cotizar: sin precio o sin existencias.");
      return;
    }
    carrito.agregar({ ...producto, precio: precio.valor }, cantidad);
    document.querySelectorAll('[data-carrito="cantidad"]').forEach((n) => {
      n.textContent = carrito.cantidadTotal();
    });
    mostrarAviso("Producto agregado a la cotización.");
  });

  seccionDetalle.hidden = false;
}

await iniciarPagina();

try {
  const productos = await cargarProductos();
  const id = Number(new URLSearchParams(window.location.search).get("id"));
  const elegido = productos.find((p) => p.id === id);

  if (elegido) {
    mostrarDetalle(elegido);
  } else if (productos.length) {
    mostrarSelector(productos);
  } else {
    mensaje.textContent = "No hay productos activos registrados.";
  }
} catch (error) {
  mensaje.textContent = error.message;
}
