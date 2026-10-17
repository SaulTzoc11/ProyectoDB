export const grupos = {
  "Catálogo": ["PRESENTACION", "MARCA", "CATEGORIA", "COLOR", "TIPO_PRECIO", "PRODUCTO_GENERAL", "PRODUCTO", "PRECIO"],
  "Personas y seguridad": ["TIPO_CLIENTE", "CLIENTE", "PROVEEDOR", "ROL", "USUARIO", "ACCION", "TABLA"],
  "Inventario": ["BODEGA", "ESTANTE", "LOTE", "TIPO_MOVIMIENTO", "MODIFICACION_INVENTARIO", "MOVIMIENTO"],
  "Compras y entregas": ["COMPRA", "DETALLE_COMPRA", "ENTREGA", "DETALLE_ENTREGA"],
  "Ventas": ["COTIZACION", "DETALLE_COTIZACION", "FACTURA", "DETALLE_FACTURA", "TIPO_PAGO", "PAGO"],
  "Devoluciones y control": ["DEVOLUCION", "DETALLE_DEVOLUCION", "MOTIVO", "ESTADO"]
};

export const tablas = {
  CATEGORIA: {
    ruta: "/api/categorias/",
    llavePrimaria: "idcategoria",
    campos: [
      { nombre: "nombre", etiqueta: "Nombre", requerido: true },
      { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" }
    ]
  },

  MARCA: {
    ruta: "/api/marcas/",
    llavePrimaria: "idmarca",
    campos: [
      { nombre: "nombre", etiqueta: "Nombre", requerido: true },
      { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" }
    ]
  },

  PRESENTACION: {
    ruta: "/api/presentaciones/",
    llavePrimaria: "idpresentacion",
    campos: [
      { nombre: "nombre", etiqueta: "Nombre", requerido: true },
      {
        nombre: "cantidad",
        etiqueta: "Cantidad",
        tipo: "number",
        paso: "0.0001",
        requerido: true
      },
      {
        nombre: "unidadmedida",
        etiqueta: "Unidad de medida",
        requerido: true
      }
    ]
  },

  COLOR: {
    ruta: "/api/colores/",
    llavePrimaria: "idcolor",
    campos: [
      { nombre: "nombre", etiqueta: "Nombre", requerido: true },
      {
        nombre: "codigohex",
        etiqueta: "Código hexadecimal",
        ejemplo: "#FFFFFF"
      },
      { nombre: "activo", etiqueta: "Activo", tipo: "checkbox" }
    ]
  },

  TIPO_PRECIO: {
    ruta: "/api/tipos-precio/",
    llavePrimaria: "idtipoprecio",
    campos: [
      { nombre: "nombre", etiqueta: "Nombre", requerido: true },
      { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" },
      { nombre: "activo", etiqueta: "Activo", tipo: "checkbox" }
    ]
  },

  PRODUCTO_GENERAL: {
    ruta: "/api/productos-generales/",
    llavePrimaria: "idproductogeneral",
    campos: [
      {
        nombre: "idmarca",
        etiqueta: "Marca",
        tipo: "select",
        origen: "/api/marcas/",
        claveValor: "idmarca",
        claveEtiqueta: "nombre",
        requerido: true
      },
      {
        nombre: "idcategoria",
        etiqueta: "Categoría",
        tipo: "select",
        origen: "/api/categorias/",
        claveValor: "idcategoria",
        claveEtiqueta: "nombre",
        requerido: true
      },
      { nombre: "nombre", etiqueta: "Nombre", requerido: true },
      { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" },
      { nombre: "activo", etiqueta: "Activo", tipo: "checkbox" }
    ]
  },

  PRODUCTO: {
    ruta: "/api/productos/",
    llavePrimaria: "idproducto",
    campos: [
      {
        nombre: "idproductogeneral",
        etiqueta: "Producto general",
        tipo: "select",
        origen: "/api/productos-generales/",
        claveValor: "idproductogeneral",
        claveEtiqueta: "nombre",
        requerido: true
      },
      {
        nombre: "idpresentacion",
        etiqueta: "Presentación",
        tipo: "select",
        origen: "/api/presentaciones/",
        claveValor: "idpresentacion",
        claveEtiqueta: "nombre",
        requerido: true
      },
      {
        nombre: "idcolor",
        etiqueta: "Color",
        tipo: "select",
        origen: "/api/colores/",
        claveValor: "idcolor",
        claveEtiqueta: "nombre"
      },
      {
        nombre: "codigoproducto",
        etiqueta: "Código del producto",
        requerido: true
      },
      {
        nombre: "codigobarras",
        etiqueta: "Código de barras"
      },
      { nombre: "activo", etiqueta: "Activo", tipo: "checkbox" }
    ]
  },

  PRECIO: {
    ruta: "/api/precios/",
    llavePrimaria: "idprecio",
    campos: [
      {
        nombre: "idtipoprecio",
        etiqueta: "Tipo de precio",
        tipo: "select",
        origen: "/api/tipos-precio/",
        claveValor: "idtipoprecio",
        claveEtiqueta: "nombre",
        requerido: true
      },
      {
        nombre: "idproducto",
        etiqueta: "Producto",
        tipo: "select",
        origen: "/api/productos/",
        claveValor: "idproducto",
        claveEtiqueta: "codigoproducto",
        requerido: true
      },
      {
        nombre: "idestado",
        etiqueta: "Estado",
        tipo: "select",
        origen: "/api/estados/",
        claveValor: "idestado",
        claveEtiqueta: "nombre",
        requerido: true
      },
      {
        nombre: "precio",
        etiqueta: "Precio",
        tipo: "number",
        paso: "0.01",
        requerido: true
      }
    ]
  },

  TIPO_CLIENTE: {
    ruta: "/api/tipos-cliente/",
    llavePrimaria: "idtipocliente",
    campos: [
      { nombre: "nombre", etiqueta: "Nombre", requerido: true },
      { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" }
    ]
  },

  CLIENTE: {
    ruta: "/api/clientes/",
    llavePrimaria: "idcliente",
    campos: [
      {
        nombre: "idtipocliente",
        etiqueta: "Tipo de cliente",
        tipo: "select",
        origen: "/api/tipos-cliente/",
        claveValor: "idtipocliente",
        claveEtiqueta: "nombre",
        requerido: true
      },
      {
        nombre: "nombrecliente",
        etiqueta: "Nombre del cliente",
        requerido: true
      },
      { nombre: "nit", etiqueta: "NIT", requerido: true },
      { nombre: "telefono", etiqueta: "Teléfono" },
      { nombre: "correo", etiqueta: "Correo", tipo: "email" },
      { nombre: "direccion", etiqueta: "Dirección", tipo: "textarea" },
      { nombre: "nombrecontacto", etiqueta: "Nombre de contacto" },
      { nombre: "activo", etiqueta: "Activo", tipo: "checkbox" }
    ]
  },

  PROVEEDOR: {
    ruta: "/api/proveedores/",
    llavePrimaria: "idproveedor",
    campos: [
      {
        nombre: "nombreproveedor",
        etiqueta: "Nombre del proveedor",
        requerido: true
      },
      { nombre: "nit", etiqueta: "NIT", requerido: true },
      { nombre: "nombrecontacto", etiqueta: "Nombre de contacto" },
      { nombre: "telefono", etiqueta: "Teléfono" },
      { nombre: "correo", etiqueta: "Correo", tipo: "email" },
      { nombre: "direccion", etiqueta: "Dirección", tipo: "textarea" },
      { nombre: "activo", etiqueta: "Activo", tipo: "checkbox" }
    ]
  }
};

export const titulos = {
  PRESENTACION: "Presentación",
  MARCA: "Marca",
  CATEGORIA: "Categoría",
  COLOR: "Color",
  TIPO_PRECIO: "Tipo de precio",
  PRODUCTO_GENERAL: "Producto general",
  PRODUCTO: "Producto",
  PRECIO: "Precio",
  TIPO_CLIENTE: "Tipo de cliente",
  CLIENTE: "Cliente",
  PROVEEDOR: "Proveedor",
  ROL: "Rol",
  USUARIO: "Usuario",
  ACCION: "Acción",
  TABLA: "Tabla",
  BODEGA: "Bodega",
  ESTANTE: "Estante",
  LOTE: "Lote",
  TIPO_MOVIMIENTO: "Tipo de movimiento",
  MODIFICACION_INVENTARIO: "Modificación de inventario",
  MOVIMIENTO: "Movimiento",
  COMPRA: "Compra",
  DETALLE_COMPRA: "Detalle de compra",
  ENTREGA: "Entrega",
  DETALLE_ENTREGA: "Detalle de entrega",
  COTIZACION: "Cotización",
  DETALLE_COTIZACION: "Detalle de cotización",
  FACTURA: "Factura",
  DETALLE_FACTURA: "Detalle de factura",
  TIPO_PAGO: "Tipo de pago",
  PAGO: "Pago",
  DEVOLUCION: "Devolución",
  DETALLE_DEVOLUCION: "Detalle de devolución",
  MOTIVO: "Motivo",
  ESTADO: "Estado",
};
