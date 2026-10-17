import { obtenerLista, solicitar } from "../api.js";
import * as carrito from "../carrito.js";
import { aplicarColor, cargarProductos, precioPara } from "../productos.js";
import { iniciarPagina } from "../sesion.js";
import {
  clonarPlantilla,
  formatearQuetzales,
  llenar,
  mostrarAviso,
  mostrarEstadoVacio,
  vaciar,
} from "../ui.js";

const elementos = {
  categorias: document.querySelector("#categorias"),
  busqueda: document.querySelector("#busqueda"),
  panelFiltros: document.querySelector("#panelFiltros"),
  botonFiltros: document.querySelector("#botonFiltros"),
  orden: document.querySelector("#ordenPrecio"),
  marca: document.querySelector("#filtroMarca"),
  tipoPrecio: document.querySelector("#filtroTipoPrecio"),
  presentacion: document.querySelector("#filtroPresentacion"),
  mensaje: document.querySelector("#mensajeCatalogo"),
  productos: document.querySelector("#productos"),
};

let productos = [];

function agregarOpciones(select, valores) {
  valores.forEach((valor) => select.add(new Option(valor, valor)));
}

function crearCategoria(nombre, marcada) {
  const nodo = clonarPlantilla("plantillaCategoria");
  llenar(nodo, { nombre });
  const radio = nodo.querySelector("input");
  radio.value = nombre;
  radio.checked = marcada;
  radio.addEventListener("change", aplicarFiltros);
  return nodo;
}

function categoriaSeleccionada() {
  return document.querySelector('input[name="categoria"]:checked').value;
}

function filtrar() {
  const categoria = categoriaSeleccionada();
  const texto = elementos.busqueda.value.trim().toLowerCase();
  const tipo = elementos.tipoPrecio.value;

  const resultado = productos
    .filter((p) => categoria === "Todos" || p.categoria === categoria)
    .filter((p) => !elementos.marca.value || p.marca === elementos.marca.value)
    .filter((p) => !elementos.presentacion.value || p.presentacion === elementos.presentacion.value)
    .filter((p) => !texto || `${p.nombre} ${p.marca} ${p.codigo}`.toLowerCase().includes(texto))
    .map((p) => ({ producto: p, precio: precioPara(p, tipo) }))
    .filter((item) => item.precio !== null);

  if (elementos.orden.value === "asc") resultado.sort((a, b) => a.precio - b.precio);
  if (elementos.orden.value === "desc") resultado.sort((a, b) => b.precio - a.precio);

  return resultado;
}

function crearTarjeta({ producto, precio }) {
  const nodo = clonarPlantilla("plantillaProducto");
  let cantidad = 1;

  llenar(nodo, {
    categoria: producto.categoria,
    marca: producto.marca,
    nombre: producto.nombre,
    detalle: producto.detalle,
    stock: producto.stock,
    precio: formatearQuetzales(precio),
    cantidad,
  });

  nodo.querySelector(".product-color").style.background =
    `linear-gradient(135deg, ${producto.color}, ${producto.color}99)`;
  aplicarColor(nodo.querySelector('[data-elemento="color"]'), producto.color);
  nodo.querySelector('[data-elemento="detalle"]').href =
    `/pages/producto.html?id=${producto.id}`;

  const salida = nodo.querySelector("output");
  const actualizar = (diferencia) => {
    cantidad = Math.max(1, Math.min(producto.stock || 1, cantidad + diferencia));
    salida.textContent = cantidad;
  };

  nodo.querySelector('[data-accion="menos"]').addEventListener("click", () => actualizar(-1));
  nodo.querySelector('[data-accion="mas"]').addEventListener("click", () => actualizar(1));
  nodo.querySelector('[data-accion="agregar"]').addEventListener("click", () => {
    if (producto.stock < 1) {
      mostrarAviso("El producto no tiene existencias.");
      return;
    }
    carrito.agregar({ ...producto, precio }, cantidad);
    document.querySelectorAll('[data-carrito="cantidad"]').forEach((n) => {
      n.textContent = carrito.cantidadTotal();
    });
    mostrarAviso("Producto agregado a la cotización.");
  });

  return nodo;
}

function aplicarFiltros() {
  const resultado = filtrar();
  vaciar(elementos.productos);

  if (!resultado.length) {
    mostrarEstadoVacio(
      elementos.productos,
      "No se encontraron productos",
      "Pruebe con otra categoría o con otra búsqueda."
    );
    return;
  }

  elementos.productos.append(...resultado.map(crearTarjeta));
}

async function cargarCatalogo() {
  elementos.mensaje.textContent = "Cargando productos...";

  try {
    const [listaProductos, categorias, tiposPrecio] = await Promise.all([
      cargarProductos(),
      solicitar("/api/categorias/").then(obtenerLista),
      solicitar("/api/tipos-precio/").then(obtenerLista),
    ]);

    productos = listaProductos;

    const nombres = ["Todos", ...categorias.map((c) => c.nombre)];
    elementos.categorias.append(...nombres.map((n, i) => crearCategoria(n, i === 0)));

    agregarOpciones(elementos.marca, [...new Set(productos.map((p) => p.marca))].sort());
    agregarOpciones(elementos.presentacion, [...new Set(productos.map((p) => p.presentacion))].sort());

    const tipos = tiposPrecio.filter((t) => t.activo !== false).map((t) => t.nombre);
    agregarOpciones(elementos.tipoPrecio, tipos);
    const individual = tipos.find((t) => t.toLowerCase() === "individual");
    if (individual) elementos.tipoPrecio.value = individual;

    elementos.mensaje.textContent = "";
    aplicarFiltros();
  } catch (error) {
    elementos.mensaje.textContent = "";
    mostrarEstadoVacio(elementos.productos, "No se pudo cargar el catálogo", error.message);
  }
}

await iniciarPagina();

document.querySelector("#botonBuscar").addEventListener("click", aplicarFiltros);
elementos.busqueda.addEventListener("keydown", (e) => {
  if (e.key === "Enter") aplicarFiltros();
});
[elementos.orden, elementos.marca, elementos.tipoPrecio, elementos.presentacion].forEach((s) =>
  s.addEventListener("change", aplicarFiltros)
);
elementos.botonFiltros.addEventListener("click", () => {
  const abierto = elementos.panelFiltros.classList.toggle("open");
  elementos.botonFiltros.setAttribute("aria-expanded", String(abierto));
});

cargarCatalogo();
