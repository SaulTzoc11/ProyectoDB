import { obtenerLista, solicitar } from "./api.js";

const COLOR_PREDETERMINADO = "#027DD6";

function normalizar(producto) {
  const precios = (producto.precios || []).map((precio) => ({
    tipo: precio.tipo,
    valor: Number(precio.valor),
  }));

  return {
    id: producto.idproducto,
    nombre: producto.producto_general_nombre,
    descripcion: producto.producto_descripcion || "",
    marca: producto.marca_nombre,
    categoria: producto.categoria_nombre,
    color: producto.color_codigohex || COLOR_PREDETERMINADO,
    nombreColor: producto.color_nombre,
    presentacion: producto.presentacion_nombre,
    detalle: `${producto.color_nombre} · ${producto.presentacion_nombre}`,
    codigo: producto.codigoproducto,
    stock: Number(producto.stock || 0),
    precios,
    ubicaciones: (producto.ubicaciones || []).map((ubicacion) => ({
      lugar: `${ubicacion.bodega} · Estante ${ubicacion.estante}`,
      cantidad: Number(ubicacion.cantidad),
    })),
  };
}

export async function cargarProductos() {
  const datos = await solicitar("/api/productos/");
  return obtenerLista(datos)
    .filter((producto) => producto.activo)
    .map(normalizar);
}

export function precioPara(producto, tipo) {
  const precio = producto.precios.find(
    (item) => item.tipo.toLowerCase() === tipo.toLowerCase()
  );
  return precio ? precio.valor : null;
}

export function aplicarColor(nodo, color) {
  nodo.style.color = color;
  nodo.title = `Color ${color}`;
}
