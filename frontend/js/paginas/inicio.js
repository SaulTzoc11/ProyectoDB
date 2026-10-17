import { obtenerLista, solicitar } from "../api.js";
import { cantidadTotal } from "../carrito.js";
import { cargarProductos } from "../productos.js";
import { iniciarPagina } from "../sesion.js";

function escribir(id, valor) {
  document.querySelector(id).textContent = valor;
}

await iniciarPagina();

escribir("#totalCotizacion", cantidadTotal());

try {
  const [productos, clientes] = await Promise.all([
    cargarProductos(),
    solicitar("/api/clientes/").then(obtenerLista),
  ]);

  escribir("#totalProductos", productos.length);
  escribir("#totalSinStock", productos.filter((p) => p.stock < 1).length);
  escribir("#totalClientes", clientes.filter((c) => c.activo).length);
} catch (error) {
  ["#totalProductos", "#totalSinStock", "#totalClientes"].forEach((id) => escribir(id, "N/D"));
}
