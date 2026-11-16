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
    permitirEliminar: false,
    campos: [
      { nombre: "nombre", etiqueta: "Nombre", requerido: true },
      { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" }
    ]
  },

  PRESENTACION: {
    ruta: "/api/presentaciones/",
    llavePrimaria: "idpresentacion",
    noCrear: true,
    permitirEliminar: false,
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
        tipo: "select",
        opciones: ["galones", "galón", "unidad"],
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
        permitidos: ["Vigente", "Inactivo"],
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
  },
  
BODEGA: {
  ruta: "/api/bodegas/",
  llavePrimaria: "idbodega",
  campos: [
    { nombre: "nombre", etiqueta: "Nombre", requerido: true },
    { nombre: "direccion", etiqueta: "Dirección", tipo: "textarea" },
    { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" },
    { nombre: "activo", etiqueta: "Activo", tipo: "checkbox" }
  ]
},

ESTANTE: {
  ruta: "/api/estantes/",
  llavePrimaria: "idestante",
  campos: [
    {
      nombre: "idbodega",
      etiqueta: "Bodega",
      tipo: "select",
      origen: "/api/bodegas/",
      claveValor: "idbodega",
      claveEtiqueta: "nombre",
      requerido: true
    },
    {
      nombre: "codigoestante",
      etiqueta: "Código del estante",
      requerido: true
    },
    {
      nombre: "descripcion",
      etiqueta: "Descripción",
      tipo: "textarea"
    },
    {
      nombre: "activo",
      etiqueta: "Activo",
      tipo: "checkbox"
    }
  ]
},

TIPO_PAGO: {
  ruta: "/api/tipos-pago/",
  llavePrimaria: "idtipopago",
  permitirEliminar: false,
  permitirCambiarEstado: false,
  campos: [
    { nombre: "nombre", etiqueta: "Nombre", requerido: true },
    { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" },
    { nombre: "activo", etiqueta: "Activo", tipo: "checkbox" }
  ]
},

TIPO_MOVIMIENTO: {
  ruta: "/api/tipo-movimiento/",
  llavePrimaria: "idtipomovimiento",
  permitirEliminar: false,
  campos: [
    { nombre: "nombre", etiqueta: "Nombre", requerido: true },
    { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" }
  ]
},

MOTIVO: {
  ruta: "/api/motivo/",
  llavePrimaria: "idmotivo",
  permitirEliminar: false,
  campos: [
    {
      nombre: "descripcion",
      etiqueta: "Descripción del motivo",
      requerido: true
    }
  ]
},

ACCION: {
  ruta: "/api/accion/",
  llavePrimaria: "idaccion",
  permitirEliminar: false,
  campos: [
    { nombre: "nombre", etiqueta: "Nombre", requerido: true },
    { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" }
  ]
},

TABLA: {
  ruta: "/api/tabla/",
  llavePrimaria: "idtabla",
  permitirEliminar: false,
  campos: [
    { nombre: "nombre", etiqueta: "Nombre", requerido: true }
  ]
},

LOTE: {
  ruta: "/api/consulta-mantenimientos/LOTE/",
  llavePrimaria: "idlote",
  soloLectura: true,
  campos: [
    { nombre: "codigolote", etiqueta: "Código de lote" },
    { nombre: "idestante", etiqueta: "ID estante" },
    { nombre: "idestado", etiqueta: "Estado" },
    { nombre: "cantidadinicial", etiqueta: "Cantidad inicial" },
    { nombre: "cantidaddisponible", etiqueta: "Disponible" }
  ]
},

MODIFICACION_INVENTARIO: {
  ruta: "/api/consulta-mantenimientos/MODIFICACION_INVENTARIO/",
  llavePrimaria: "idmodificacioninventario",
  soloLectura: true,
  campos: [
    { nombre: "idlote", etiqueta: "Lote" },
    { nombre: "idtipomovimiento", etiqueta: "Tipo movimiento" },
    { nombre: "idusuario", etiqueta: "Usuario" },
    { nombre: "cantidad", etiqueta: "Cantidad" },
    { nombre: "fecha", etiqueta: "Fecha" }
  ]
},

MOVIMIENTO: {
  ruta: "/api/consulta-mantenimientos/MOVIMIENTO/",
  llavePrimaria: "idmovimiento",
  soloLectura: true,
  campos: [
    { nombre: "idusuario", etiqueta: "Usuario" },
    { nombre: "idaccion", etiqueta: "Acción" },
    { nombre: "idtabla", etiqueta: "Tabla" },
    { nombre: "fecha", etiqueta: "Fecha" },
    { nombre: "informacionmodificada", etiqueta: "Información modificada" }
  ]
},

COMPRA: {
  ruta: "/api/consulta-mantenimientos/COMPRA/",
  llavePrimaria: "idcompra",
  soloLectura: true,
  detalleTabla: "DETALLE_COMPRA",
  enlaceOperacion: "/pages/ordenes-compra.html",
  campos: [
    { nombre: "codigocompra", etiqueta: "Código compra" },
    { nombre: "idproveedor", etiqueta: "Proveedor" },
    { nombre: "idestado", etiqueta: "Estado" },
    { nombre: "fechacompra", etiqueta: "Fecha" },
    { nombre: "total", etiqueta: "Total" }
  ]
},

DETALLE_COMPRA: {
  ruta: "/api/consulta-mantenimientos/DETALLE_COMPRA/",
  llavePrimaria: "iddetallecompra",
  soloLectura: true,
  enlaceOperacion: "/pages/ordenes-compra.html",
  campos: [
    { nombre: "idcompra", etiqueta: "Compra" },
    { nombre: "idproducto", etiqueta: "Producto" },
    { nombre: "cantidad", etiqueta: "Cantidad" },
    { nombre: "costounitario", etiqueta: "Costo unitario" },
    { nombre: "subtotal", etiqueta: "Subtotal" }
  ]
},

ENTREGA: {
  ruta: "/api/consulta-mantenimientos/ENTREGA/",
  llavePrimaria: "identrega",
  soloLectura: true,
  detalleTabla: "DETALLE_ENTREGA",
  enlaceOperacion: "/pages/ingreso-bodega.html",
  campos: [
    { nombre: "codigoentrega", etiqueta: "Código entrega" },
    { nombre: "idcompra", etiqueta: "Compra" },
    { nombre: "idestado", etiqueta: "Estado" },
    { nombre: "fechaentrega", etiqueta: "Fecha" },
    { nombre: "observaciones", etiqueta: "Observaciones" }
  ]
},

DETALLE_ENTREGA: {
  ruta: "/api/consulta-mantenimientos/DETALLE_ENTREGA/",
  llavePrimaria: "iddetalleentrega",
  soloLectura: true,
  enlaceOperacion: "/pages/ingreso-bodega.html",
  campos: [
    { nombre: "identrega", etiqueta: "Entrega" },
    { nombre: "iddetallecompra", etiqueta: "Detalle compra" },
    { nombre: "cantidadentregada", etiqueta: "Cantidad recibida" },
    { nombre: "costounitarioreal", etiqueta: "Costo real" }
  ]
},

COTIZACION: {
  ruta: "/api/consulta-mantenimientos/COTIZACION/",
  llavePrimaria: "idcotizacion",
  soloLectura: true,
  enlaceOperacion: "/pages/cotizacion.html",
  campos: [
    { nombre: "codigocotizacion", etiqueta: "Código cotización" },
    { nombre: "idcliente", etiqueta: "Cliente" },
    { nombre: "idestado", etiqueta: "Estado" },
    { nombre: "fecha", etiqueta: "Fecha" },
    { nombre: "total", etiqueta: "Total" }
  ]
},

DETALLE_COTIZACION: {
  ruta: "/api/consulta-mantenimientos/DETALLE_COTIZACION/",
  llavePrimaria: "iddetallecotizacion",
  soloLectura: true,
  detalleTabla: "DETALLE_COTIZACION",
  enlaceOperacion: "/pages/cotizacion.html",
  campos: [
    { nombre: "idcotizacion", etiqueta: "Cotización" },
    { nombre: "idproducto", etiqueta: "Producto" },
    { nombre: "cantidad", etiqueta: "Cantidad" },
    { nombre: "preciounitario", etiqueta: "Precio unitario" },
    { nombre: "subtotal", etiqueta: "Subtotal" }
  ]
},

FACTURA: {
  ruta: "/api/consulta-mantenimientos/FACTURA/",
  llavePrimaria: "idfactura",
  soloLectura: true,
  enlaceOperacion: "/pages/facturacion.html",
  campos: [
    { nombre: "nofactura", etiqueta: "N.º factura" },
    { nombre: "idcliente", etiqueta: "Cliente" },
    { nombre: "idestado", etiqueta: "Estado" },
    { nombre: "fecha", etiqueta: "Fecha" },
    { nombre: "total", etiqueta: "Total" }
  ]
},

DETALLE_FACTURA: {
  ruta: "/api/consulta-mantenimientos/DETALLE_FACTURA/",
  llavePrimaria: "iddetallefactura",
  soloLectura: true,
  detalleTabla: "DETALLE_FACTURA",
  enlaceOperacion: "/pages/facturacion.html",
  campos: [
    { nombre: "idfactura", etiqueta: "Factura" },
    { nombre: "idproducto", etiqueta: "Producto" },
    { nombre: "cantidad", etiqueta: "Cantidad" },
    { nombre: "preciounitario", etiqueta: "Precio unitario" },
    { nombre: "subtotal", etiqueta: "Subtotal" }
  ]
},

PAGO: {
  ruta: "/api/consulta-mantenimientos/PAGO/",
  llavePrimaria: "idpago",
  soloLectura: true,
  enlaceOperacion: "/pages/facturacion.html",
  campos: [
    { nombre: "idfactura", etiqueta: "Factura" },
    { nombre: "idtipopago", etiqueta: "Tipo de pago" },
    { nombre: "monto", etiqueta: "Monto" },
    { nombre: "fecha", etiqueta: "Fecha" },
    { nombre: "observaciones", etiqueta: "Observaciones" }
  ]
},

DEVOLUCION: {
  ruta: "/api/consulta-mantenimientos/DEVOLUCION/",
  llavePrimaria: "iddevolucion",
  soloLectura: true,
  campos: [
    { nombre: "codigodevolucion", etiqueta: "Código devolución" },
    { nombre: "idfactura", etiqueta: "Factura" },
    { nombre: "idmotivo", etiqueta: "Motivo" },
    { nombre: "fecha", etiqueta: "Fecha" },
    { nombre: "total", etiqueta: "Total" }
  ]
},

DETALLE_DEVOLUCION: {
  ruta: "/api/consulta-mantenimientos/DETALLE_DEVOLUCION/",
  llavePrimaria: "iddevolucion",
  soloLectura: true,
  detalleTabla: "DETALLE_DEVOLUCION",
  campos: [
    { nombre: "iddevolucion", etiqueta: "Devolución" },
    { nombre: "iddetallefactura", etiqueta: "Detalle factura" },
    { nombre: "cantidad", etiqueta: "Cantidad" },
    { nombre: "montocobrado", etiqueta: "Monto cobrado" },
    { nombre: "subtotal", etiqueta: "Subtotal" }
  ]
},

ESTADO: {
  ruta: "/api/consulta-mantenimientos/ESTADO/",
  llavePrimaria: "idestado",
  soloLectura: true,
  campos: [
    { nombre: "idestado", etiqueta: "ID" },
    { nombre: "nombre", etiqueta: "Nombre" }
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
