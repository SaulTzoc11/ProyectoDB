const CLAVE = "sapo.cotizacion";

function leer() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE)) || [];
  } catch (error) {
    return [];
  }
}

function guardar(items) {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(items));
  } catch (error) {
    return;
  }
}

export function obtenerItems() {
  return leer();
}

export function cantidadTotal() {
  return leer().reduce((suma, item) => suma + item.cantidad, 0);
}

export function agregar(producto, cantidad = 1) {
  const items = leer();
  const existente = items.find((item) => item.id === producto.id);

  if (existente) {
    existente.cantidad = Math.min(producto.stock, existente.cantidad + cantidad);
    existente.stock = producto.stock;
    existente.precio = producto.precio;
  } else {
    items.push({
      id: producto.id,
      nombre: producto.nombre,
      marca: producto.marca,
      detalle: producto.detalle,
      precio: producto.precio,
      stock: producto.stock,
      cantidad: Math.min(producto.stock, cantidad),
      descuento: 0,
    });
  }

  guardar(items);
}

export function cambiarCantidad(id, diferencia) {
  const items = leer();
  const item = items.find((x) => x.id === id);
  if (!item) return;

  item.cantidad = Math.max(1, Math.min(item.stock, item.cantidad + diferencia));
  guardar(items);
}

export function quitar(id) {
  guardar(leer().filter((item) => item.id !== id));
}

export function fijarDescuento(id, porcentaje, token) {
  const items = leer();
  const item = items.find((x) => x.id === id);
  if (!item) return;

  item.descuento = Number(porcentaje);
  
  item.tokenDescuento = item.descuento > 0 ? token : undefined;
  guardar(items);
}

export function vaciar() {
  guardar([]);
}

export function totales() {
  const items = leer();
  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const total = items.reduce(
    (s, i) => s + i.precio * i.cantidad * (1 - (i.descuento || 0) / 100),
    0
  );

  return { subtotal, descuento: subtotal - total, total };
}


export function lineasParaGuardar() {
  const items = leer();
  return {
    lineas: items.map((i) => ({
      idProducto: i.id,                 
      cantidad: i.cantidad,
      descuento: i.descuento || 0,      
    })),
    tokensDescuento: [...new Set(items.map((i) => i.tokenDescuento).filter(Boolean))],
  };
}