CREATE DATABASE PintureriaDB;
GO

USE PintureriaDB;
GO

--  Tablas independientes

CREATE TABLE PRESENTACION (
    idPresentacion INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    cantidad DECIMAL(6,4) NOT NULL,
    unidadMedida VARCHAR(20) NOT NULL
);
GO

CREATE TABLE MARCA (
    idMarca INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(250) NULL
);
GO

CREATE TABLE CATEGORIA (
    idCategoria INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(250) NULL
);
GO

CREATE TABLE COLOR (
    idColor INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    codigoHex CHAR(7) NULL,
    activo BIT NOT NULL DEFAULT 1
);
GO

CREATE TABLE TIPO_PRECIO (
    idTipoPrecio INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(150) NULL,
    activo BIT NOT NULL DEFAULT 1
);
GO

CREATE TABLE TIPO_CLIENTE (
    idTipoCliente INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(20) NOT NULL UNIQUE,
    descripcion VARCHAR(150) NULL
);
GO

CREATE TABLE PROVEEDOR (
    idProveedor INT IDENTITY(1,1) PRIMARY KEY,
    nombreProveedor VARCHAR(150) NOT NULL,
    nit VARCHAR(10) NOT NULL UNIQUE,
    nombreContacto VARCHAR(150) NULL,
    telefono VARCHAR(20) NULL,
    correo VARCHAR(100) NULL,
    direccion VARCHAR(250) NULL,
    activo BIT NOT NULL DEFAULT 1
);
GO

CREATE TABLE BODEGA (
    idBodega INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    direccion VARCHAR(250) NULL,
    descripcion VARCHAR(150) NULL,
    activo BIT NOT NULL DEFAULT 1
);
GO

CREATE TABLE TIPO_MOVIMIENTO (
    idTipoMovimiento INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(150) NULL
);
GO

CREATE TABLE TIPO_PAGO (
    idTipoPago INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(20) NOT NULL UNIQUE,
    descripcion VARCHAR(150) NULL,
    activo BIT NOT NULL DEFAULT 1
);
GO

CREATE TABLE MOTIVO (
    idMotivo INT IDENTITY(1,1) PRIMARY KEY,
    descripcion VARCHAR(250) NOT NULL UNIQUE
);
GO

CREATE TABLE ESTADO (
    idEstado INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);
GO

CREATE TABLE ROL (
    idRol INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);
GO

CREATE TABLE ACCION (
    idAccion INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    descripcion VARCHAR(150) NULL
);
GO

CREATE TABLE TABLA (
    idTabla INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);
GO

-- tablas dependientes

CREATE TABLE PRODUCTO_GENERAL (
    idProductoGeneral INT IDENTITY(1,1) PRIMARY KEY,
    idMarca INT NOT NULL,
    idCategoria INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(250) NULL,
    activo BIT NOT NULL DEFAULT 1,
    FOREIGN KEY (idMarca) REFERENCES MARCA(idMarca),
    FOREIGN KEY (idCategoria) REFERENCES CATEGORIA(idCategoria)
);
GO

CREATE TABLE CLIENTE (
    idCliente INT IDENTITY(1,1) PRIMARY KEY,
    idTipoCliente INT NOT NULL,
    nombreCliente VARCHAR(150) NOT NULL,
    nit VARCHAR(10) NOT NULL UNIQUE,
    telefono VARCHAR(20) NULL,
    correo VARCHAR(100) NULL,
    direccion VARCHAR(250) NULL,
    nombreContacto VARCHAR(150) NULL,
    activo BIT NOT NULL DEFAULT 1,
    FOREIGN KEY (idTipoCliente) REFERENCES TIPO_CLIENTE(idTipoCliente)
);
GO

CREATE TABLE ESTANTE (
    idEstante INT IDENTITY(1,1) PRIMARY KEY,
    idBodega INT NOT NULL,
    codigoEstante VARCHAR(20) NOT NULL,
    descripcion VARCHAR(150) NULL,
    activo BIT NOT NULL DEFAULT 1,
    UNIQUE (idBodega, codigoEstante),
    FOREIGN KEY (idBodega) REFERENCES BODEGA(idBodega)
);
GO

CREATE TABLE USUARIO (
    idUsuario INT IDENTITY(1,1) PRIMARY KEY,
    idRol INT NOT NULL,
    nombreUsuario VARCHAR(50) NOT NULL UNIQUE,
    contrasenaEncriptada VARCHAR(250) NOT NULL,
    nombres VARCHAR(50) NOT NULL,
    apellidos VARCHAR(50) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    ultimoAcceso DATETIME NULL,
    activo BIT NOT NULL DEFAULT 1,
    FOREIGN KEY (idRol) REFERENCES ROL(idRol)
);
GO

CREATE TABLE PRODUCTO (
    idProducto INT IDENTITY(1,1) PRIMARY KEY,
    idProductoGeneral INT NOT NULL,
    idPresentacion INT NOT NULL,
    idColor INT NULL,
    codigoProducto VARCHAR(50) NOT NULL UNIQUE,
    codigoBarras VARCHAR(50) NULL UNIQUE,
    activo BIT NOT NULL DEFAULT 1,
    UNIQUE (idProductoGeneral, idPresentacion, idColor),
    FOREIGN KEY (idProductoGeneral) REFERENCES PRODUCTO_GENERAL(idProductoGeneral),
    FOREIGN KEY (idPresentacion) REFERENCES PRESENTACION(idPresentacion),
    FOREIGN KEY (idColor) REFERENCES COLOR(idColor)
);
GO

CREATE TABLE PRECIO (
    idPrecio INT IDENTITY(1,1) PRIMARY KEY,
    idTipoPrecio INT NOT NULL,
    idProducto INT NOT NULL,
    idEstado INT NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    fechaAsignacion DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (idTipoPrecio) REFERENCES TIPO_PRECIO(idTipoPrecio),
    FOREIGN KEY (idProducto) REFERENCES PRODUCTO(idProducto),
    FOREIGN KEY (idEstado) REFERENCES ESTADO(idEstado)
);
GO


CREATE TABLE COMPRA (
    idCompra INT IDENTITY(1,1) PRIMARY KEY,
    idProveedor INT NOT NULL,
    idUsuario INT NOT NULL,
    idEstado INT NOT NULL,
    codigoCompra VARCHAR(20) NOT NULL UNIQUE,
    fechaCompra DATETIME NOT NULL DEFAULT GETDATE(),
    total DECIMAL(10,2) NOT NULL,
    observaciones VARCHAR(250) NULL,
    FOREIGN KEY (idProveedor) REFERENCES PROVEEDOR(idProveedor),
    FOREIGN KEY (idUsuario) REFERENCES USUARIO(idUsuario),
    FOREIGN KEY (idEstado) REFERENCES ESTADO(idEstado)
);
GO

CREATE TABLE DETALLE_COMPRA (
    idDetalleCompra INT IDENTITY(1,1) PRIMARY KEY,
    idCompra INT NOT NULL,
    idProducto INT NOT NULL,
    idEstado INT NOT NULL,
    cantidad INT NOT NULL,
    costoUnitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    UNIQUE (idCompra, idProducto),
    FOREIGN KEY (idCompra) REFERENCES COMPRA(idCompra),
    FOREIGN KEY (idProducto) REFERENCES PRODUCTO(idProducto),
    FOREIGN KEY (idEstado) REFERENCES ESTADO(idEstado)
);
GO

CREATE TABLE ENTREGA (
    idEntrega INT IDENTITY(1,1) PRIMARY KEY,
    idCompra INT NOT NULL,
    idUsuario INT NOT NULL,
    idEstado INT NOT NULL,
    codigoEntrega VARCHAR(30) NOT NULL UNIQUE,
    fechaEntrega DATETIME NOT NULL DEFAULT GETDATE(),
    observaciones VARCHAR(250) NULL,
    FOREIGN KEY (idCompra) REFERENCES COMPRA(idCompra),
    FOREIGN KEY (idUsuario) REFERENCES USUARIO(idUsuario),
    FOREIGN KEY (idEstado) REFERENCES ESTADO(idEstado)
);
GO

CREATE TABLE DETALLE_ENTREGA (
    idDetalleEntrega INT IDENTITY(1,1) PRIMARY KEY,
    idEntrega INT NOT NULL,
    idDetalleCompra INT NOT NULL,
    cantidadEntregada INT NOT NULL,
    costoUnitarioReal DECIMAL(10,2) NOT NULL,
    UNIQUE (idEntrega, idDetalleCompra),
    FOREIGN KEY (idEntrega) REFERENCES ENTREGA(idEntrega),
    FOREIGN KEY (idDetalleCompra) REFERENCES DETALLE_COMPRA(idDetalleCompra)
);
GO

CREATE TABLE LOTE (
    idLote INT IDENTITY(1,1) PRIMARY KEY,
    idDetalleEntrega INT NOT NULL,
    idEstante INT NOT NULL,
    idEstado INT NOT NULL,
    codigoLote VARCHAR(50) NOT NULL UNIQUE,
    fechaIngreso DATETIME NOT NULL DEFAULT GETDATE(),
    cantidadInicial INT NOT NULL,
    cantidadDisponible INT NOT NULL,
    FOREIGN KEY (idDetalleEntrega) REFERENCES DETALLE_ENTREGA(idDetalleEntrega),
    FOREIGN KEY (idEstante) REFERENCES ESTANTE(idEstante),
    FOREIGN KEY (idEstado) REFERENCES ESTADO(idEstado)
);
GO

CREATE TABLE MODIFICACION_INVENTARIO (
    idModificacionInventario INT IDENTITY(1,1) PRIMARY KEY,
    idLote INT NOT NULL,
    idTipoMovimiento INT NOT NULL,
    idUsuario INT NOT NULL,
    fecha DATETIME NOT NULL DEFAULT GETDATE(),
    cantidad INT NOT NULL,
    observaciones VARCHAR(250) NULL,
    FOREIGN KEY (idLote) REFERENCES LOTE(idLote),
    FOREIGN KEY (idTipoMovimiento) REFERENCES TIPO_MOVIMIENTO(idTipoMovimiento),
    FOREIGN KEY (idUsuario) REFERENCES USUARIO(idUsuario)
);
GO



CREATE TABLE COTIZACION (
    idCotizacion INT IDENTITY(1,1) PRIMARY KEY,
    idCliente INT NOT NULL,
    idUsuario INT NOT NULL,
    idEstado INT NOT NULL,
    codigoCotizacion VARCHAR(30) NOT NULL UNIQUE,
    fecha DATETIME NOT NULL DEFAULT GETDATE(),
    subtotal DECIMAL(12,2) NOT NULL,
    descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    observaciones VARCHAR(250) NULL,
    FOREIGN KEY (idCliente) REFERENCES CLIENTE(idCliente),
    FOREIGN KEY (idUsuario) REFERENCES USUARIO(idUsuario),
    FOREIGN KEY (idEstado) REFERENCES ESTADO(idEstado)
);
GO

CREATE TABLE DETALLE_COTIZACION (
    idDetalleCotizacion INT IDENTITY(1,1) PRIMARY KEY,
    idCotizacion INT NOT NULL,
    idProducto INT NOT NULL,
    cantidad INT NOT NULL,
    precioUnitario DECIMAL(10,2) NOT NULL,
    descuento DECIMAL(5,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    UNIQUE (idCotizacion, idProducto),
    FOREIGN KEY (idCotizacion) REFERENCES COTIZACION(idCotizacion),
    FOREIGN KEY (idProducto) REFERENCES PRODUCTO(idProducto)
);
GO

CREATE TABLE FACTURA (
    idFactura INT IDENTITY(1,1) PRIMARY KEY,
    idCliente INT NOT NULL,
    idUsuario INT NOT NULL,
    idCotizacion INT NULL UNIQUE,
    idEstado INT NOT NULL,
    noFactura VARCHAR(50) NOT NULL UNIQUE,
    fecha DATETIME NOT NULL DEFAULT GETDATE(),
    subtotal DECIMAL(10,2) NOT NULL,
    descuento DECIMAL(5,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    observaciones VARCHAR(250) NULL,
    FOREIGN KEY (idCliente) REFERENCES CLIENTE(idCliente),
    FOREIGN KEY (idUsuario) REFERENCES USUARIO(idUsuario),
    FOREIGN KEY (idCotizacion) REFERENCES COTIZACION(idCotizacion),
    FOREIGN KEY (idEstado) REFERENCES ESTADO(idEstado)
);
GO

CREATE TABLE DETALLE_FACTURA (
    idDetalleFactura INT IDENTITY(1,1) PRIMARY KEY,
    idFactura INT NOT NULL,
    idProducto INT NOT NULL,
    cantidad INT NOT NULL,
    precioUnitario DECIMAL(10,2) NOT NULL,
    descuento DECIMAL(5,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    UNIQUE (idFactura, idProducto),
    FOREIGN KEY (idFactura) REFERENCES FACTURA(idFactura),
    FOREIGN KEY (idProducto) REFERENCES PRODUCTO(idProducto)
);
GO

CREATE TABLE PAGO (
    idPago INT IDENTITY(1,1) PRIMARY KEY,
    idFactura INT NOT NULL,
    idTipoPago INT NOT NULL,
    idUsuario INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    observaciones VARCHAR(100) NULL,
    fecha DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (idFactura) REFERENCES FACTURA(idFactura),
    FOREIGN KEY (idTipoPago) REFERENCES TIPO_PAGO(idTipoPago),
    FOREIGN KEY (idUsuario) REFERENCES USUARIO(idUsuario)
);
GO


CREATE TABLE DEVOLUCION (
    idDevolucion INT IDENTITY(1,1) PRIMARY KEY,
    idFactura INT NOT NULL,
    idUsuario INT NOT NULL,
    idMotivo INT NOT NULL,
    idEstado INT NOT NULL,
    codigoDevolucion VARCHAR(30) NOT NULL UNIQUE,
    fecha DATETIME NOT NULL DEFAULT GETDATE(),
    total DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (idFactura) REFERENCES FACTURA(idFactura),
    FOREIGN KEY (idUsuario) REFERENCES USUARIO(idUsuario),
    FOREIGN KEY (idMotivo) REFERENCES MOTIVO(idMotivo),
    FOREIGN KEY (idEstado) REFERENCES ESTADO(idEstado)
);
GO

CREATE TABLE DETALLE_DEVOLUCION (
    idDevolucion INT NOT NULL,
    idDetalleFactura INT NOT NULL,
    cantidad INT NOT NULL,
    montoCobrado DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (idDevolucion, idDetalleFactura),
    FOREIGN KEY (idDevolucion) REFERENCES DEVOLUCION(idDevolucion),
    FOREIGN KEY (idDetalleFactura) REFERENCES DETALLE_FACTURA(idDetalleFactura)
);
GO


CREATE TABLE MOVIMIENTO (
    idMovimiento INT IDENTITY(1,1) PRIMARY KEY,
    idUsuario INT NOT NULL,
    idAccion INT NOT NULL,
    idTabla INT NOT NULL,
    fecha DATETIME NOT NULL DEFAULT GETDATE(),
    informacionModificada VARCHAR(255) NOT NULL,
    FOREIGN KEY (idUsuario) REFERENCES USUARIO(idUsuario),
    FOREIGN KEY (idAccion) REFERENCES ACCION(idAccion),
    FOREIGN KEY (idTabla) REFERENCES TABLA(idTabla)
);
GO
