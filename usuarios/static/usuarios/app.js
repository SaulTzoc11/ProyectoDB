const demoUsers = {
  gerente: { password: "Gerente123*", name: "Andrea Morales", role: "Gerente" },
  cajero: { password: "Caja123*", name: "Carlos Pérez", role: "Cajero" },
  digitador: { password: "Datos123*", name: "María López", role: "Digitador" }
};

const DISCOUNT_PASSWORD = "Descuento123*";
const modules = [
  { id: "inicio", label: "Inicio", icon: "⌂", desc: "Resumen general del sistema." },
  { id: "catalogo", label: "Catálogo", icon: "▦", desc: "Productos, precios, presentaciones y existencias." },
  { id: "compras", label: "Compras", icon: "⇩", desc: "Compras, proveedores y recepción de entregas." },
  { id: "ventas", label: "Ventas", icon: "$", desc: "Cotizaciones, despacho, pagos y devoluciones." },
  { id: "informacion", label: "Información", icon: "ⓘ", desc: "Consultas, reportes, mantenimientos e historial." },
  { id: "carrito", label: "Cotización", icon: "🛒", desc: "Productos seleccionados para cotizar." }
];

const sections = {
  catalogo: [{ id: "categorias", label: "Categorías" }, { id: "producto-detalle", label: "Información específica de un producto" }],
  compras: [{ id: "nueva-compra", label: "Nueva compra" }, { id: "proveedores", label: "Proveedores" }, { id: "compras-pendientes", label: "Pendientes" }, { id: "entregas", label: "Entregas" }],
  ventas: [{ id: "nueva-cotizacion", label: "Nueva cotización" }, { id: "clientes", label: "Clientes y empresas" }, { id: "pendiente-despachar", label: "Pendiente de despachar" }, { id: "pendiente-cancelar", label: "Pendiente de cancelar" }, { id: "devoluciones", label: "Devoluciones" }],
  informacion: [{ id: "consultas", label: "Consultas" }, { id: "reportes", label: "Reportes" }, { id: "mantenimientos", label: "Mantenimientos" }, { id: "usuarios", label: "Usuarios y roles", managerOnly: true }, { id: "historial", label: "Historial de movimientos" }]
};

const products = [
  { id: 1, category: "Pinturas", brand: "Sapo", color: "#027DD6", name: "Pintura interior", detail: "Blanco", price: 189.50, stock: 24, units: ["1/2 galón", "1 galón", "1 cubeta"], prices: [{ type: "Individual", value: 189.50 }, { type: "Empresa", value: 174.00 }], locations: [{ place: "Bodega central · Estante A-01", quantity: 16 }, { place: "Bodega zona 3 · Estante B-04", quantity: 8 }] },
  { id: 2, category: "Pinturas", brand: "ColorMax", color: "#53962F", name: "Pintura exterior", detail: "Verde", price: 214.00, stock: 16, units: ["1 galón", "1 cubeta"], prices: [{ type: "Individual", value: 214.00 }, { type: "Empresa", value: 199.00 }], locations: [{ place: "Bodega central · Estante A-03", quantity: 10 }, { place: "Bodega zona 3 · Estante C-02", quantity: 6 }] },
  { id: 3, category: "Barnices", brand: "BrilloPro", color: "#8D0C44", name: "Barniz acrílico", detail: "Transparente", price: 126.75, stock: 9, units: ["1/4 galón", "1/2 galón"], prices: [{ type: "Individual", value: 126.75 }, { type: "Empresa", value: 115.50 }], locations: [{ place: "Bodega central · Estante B-01", quantity: 9 }] },
  { id: 4, category: "Accesorios", brand: "MasterTool", color: "#F4B52E", name: "Brocha profesional 2”", detail: "Cerda mixta", price: 38.25, stock: 31, units: ["Unidad"], prices: [{ type: "Individual", value: 38.25 }, { type: "Empresa", value: 34.50 }], locations: [{ place: "Bodega central · Estante D-05", quantity: 31 }] },
  { id: 5, category: "Solventes", brand: "Solvex", color: "#7A5AF8", name: "Aguarrás mineral", detail: "Limpieza profesional", price: 42.00, stock: 18, units: ["1/16 galón", "1/8 galón", "1/4 galón"], prices: [{ type: "Individual", value: 42.00 }, { type: "Empresa", value: 38.75 }], locations: [{ place: "Bodega central · Estante S-02", quantity: 12 }, { place: "Bodega zona 3 · Estante S-01", quantity: 6 }] }
];

const databaseGroups = {
  "Catálogo": ["PRESENTACION", "MARCA", "CATEGORIA", "COLOR", "TIPO_PRECIO", "PRODUCTO_GENERAL", "PRODUCTO", "PRECIO"],
  "Personas y seguridad": ["TIPO_CLIENTE", "CLIENTE", "PROVEEDOR", "ROL", "USUARIO", "ACCION", "TABLA"],
  "Inventario": ["BODEGA", "ESTANTE", "LOTE", "TIPO_MOVIMIENTO", "MODIFICACION_INVENTARIO", "MOVIMIENTO"],
  "Compras y entregas": ["COMPRA", "DETALLE_COMPRA", "ENTREGA", "DETALLE_ENTREGA"],
  "Ventas": ["COTIZACION", "DETALLE_COTIZACION", "FACTURA", "DETALLE_FACTURA", "TIPO_PAGO", "PAGO"],
  "Devoluciones y control": ["DEVOLUCION", "DETALLE_DEVOLUCION", "MOTIVO", "ESTADO"]
};

// Campos tomados del archivo pintureria.xlsx compartido para el proyecto.
const tableSchemas = {
  PRESENTACION:["nombre","cantidad","unidadMedida"], MARCA:["nombre","descripcion"], CATEGORIA:["nombre","descripcion"], COLOR:["nombre","codigoHex","activo"], TIPO_PRECIO:["nombre","descripcion","activo"],
  PRODUCTO_GENERAL:["idMarca","idCategoria","nombre","descripcion","activo"], PRODUCTO:["idProductoGeneral","idPresentacion","idColor","codigoProducto","codigoBarras","activo"], PRECIO:["idTipoPrecio","idProducto","idEstado","precio","fechaAsignacion"],
  TIPO_CLIENTE:["nombre","descripcion"], CLIENTE:["idTipoCliente","nombreCliente","nit","telefono","correo","direccion","nombreContacto","activo"], PROVEEDOR:["nombreProveedor","nit","nombreContacto","telefono","correo","direccion","activo"],
  BODEGA:["nombre","direccion","descripcion","activo"], ESTANTE:["idBodega","codigoEstante","descripcion","activo"], LOTE:["idDetalleEntrega","idEstante","idEstado","codigoLote","fechaIngreso","cantidadInicial","cantidadDisponible"], TIPO_MOVIMIENTO:["nombre","descripcion"], MODIFICACION_INVENTARIO:["idLote","idTipoMovimiento","idUsuario","fecha","cantidad","observaciones"], MOVIMIENTO:["idUsuario","idAccion","idTabla","fecha","informacionModificada"],
  COMPRA:["idProveedor","idUsuario","idEstado","codigoCompra","fechaCompra","total","observaciones"], DETALLE_COMPRA:["idCompra","idProducto","idEstado","cantidad","costoUnitario","subtotal"], ENTREGA:["idCompra","idUsuario","idEstado","codigoEntrega","fechaEntrega","observaciones"], DETALLE_ENTREGA:["idEntrega","idDetalleCompra","cantidadEntregada","costoUnitarioReal"],
  COTIZACION:["idCliente","idUsuario","idEstado","codigoCotizacion","fecha","subtotal","descuento","total","observaciones"], DETALLE_COTIZACION:["idCotizacion","idProducto","cantidad","precioUnitario","descuento","subtotal"], FACTURA:["idCliente","idUsuario","idCotizacion","idEstado","noFactura","fecha","subtotal","descuento","total","observaciones"], DETALLE_FACTURA:["idFactura","idProducto","cantidad","precioUnitario","descuento","subtotal"], TIPO_PAGO:["nombre","descripcion","activo"], PAGO:["idFactura","idTipoPago","idUsuario","monto","observaciones","fecha"],
  MOTIVO:["descripcion"], ESTADO:["nombre"], DEVOLUCION:["idFactura","idUsuario","idMotivo","idEstado","codigoDevolucion","fecha","total"], DETALLE_DEVOLUCION:["idDevolucion","idDetalleFactura","cantidad","montoCobrado","subtotal"],
  ROL:["nombre"], USUARIO:["idRol","nombreUsuario","contrasenaEncriptada","nombres","apellidos","correo","ultimoAcceso","activo"], ACCION:["nombre","descripcion"], TABLA:["nombre"]
};

const reportDefinitions = [
  { id: 1, icon: "Q", title: "Facturación y medios de pago", desc: "Monto total facturado entre dos fechas, separado en efectivo, cheque y tarjeta.", dates: true },
  { id: 2, icon: "↗", title: "Productos que más dinero generan", desc: "Ranking por ingresos generados entre dos fechas.", dates: true },
  { id: 3, icon: "#", title: "Productos más vendidos", desc: "Ranking según cantidades y unidades vendidas.", dates: true },
  { id: 4, icon: "▦", title: "Inventario actual", desc: "Existencias actuales por producto, bodega y estante." },
  { id: 5, icon: "↘", title: "Productos con menos ventas", desc: "Productos con menor movimiento en el periodo.", dates: true },
  { id: 6, icon: "!", title: "Productos sin stock", desc: "Productos que necesitan adquirirse con proveedores." },
  { id: 7, icon: "⌕", title: "Buscar factura", desc: "Detalle, medios de pago y empleado responsable.", invoice: true }
];

let currentUser = null;
let cart = [];
let quantities = Object.fromEntries(products.map(product => [product.id, 1]));
const $ = selector => document.querySelector(selector);
const content = $("#content");

$("#togglePassword").addEventListener("click", () => { const input = $("#password"); input.type = input.type === "password" ? "text" : "password"; });
$("#loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  const formulario = event.currentTarget;
  const boton = formulario.querySelector('button[type="submit"]');

  $("#loginError").textContent = "";
  boton.disabled = true;
  boton.textContent = "Verificando...";

  try {
    const respuesta = await fetch("/api/login/", {
      method: "POST",
      body: new FormData(formulario)
    });

    const datos = await respuesta.json();

    if (!respuesta.ok || !datos.ok) {
      $("#loginError").textContent =
        datos.mensaje || "No se pudo iniciar sesión.";
      return;
    }

    currentUser = datos.usuario;

    $("#loginView").classList.add("hidden");
    $("#appView").classList.remove("hidden");

    configureUser();
    renderNavigation();
    navigate("inicio");

  } catch (error) {
    $("#loginError").textContent =
      "No se pudo conectar con el servidor.";
  } finally {
    boton.disabled = false;
    boton.innerHTML =
      'Ingresar al sistema <span>→</span>';
  }
});
$("#logoutButton").addEventListener("click", async () => {
  const csrfToken = document.querySelector(
    '[name="csrfmiddlewaretoken"]'
  ).value;

  await fetch("/api/logout/", {
    method: "POST",
    headers: {
      "X-CSRFToken": csrfToken
    }
  });

  currentUser = null;
  cart = [];

  $("#loginForm").reset();
  $("#appView").classList.add("hidden");
  $("#loginView").classList.remove("hidden");
});
$("#menuButton").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
$("#cartButton").addEventListener("click", () => navigate("carrito"));

function configureUser() {
  $("#avatar").textContent = currentUser.name[0];
  ["#sidebarName", "#headerName"].forEach(id => $(id).textContent = currentUser.name);
  ["#sidebarRole", "#headerRole"].forEach(id => $(id).textContent = currentUser.role);
}

function renderNavigation() {
  $("#mainNav").innerHTML = modules.map(module => `<button class="nav-button" data-route="${module.id}"><span class="nav-icon">${module.icon}</span><span>${module.label}</span></button>`).join("");
  document.querySelectorAll(".nav-button").forEach(button => button.addEventListener("click", () => navigate(button.dataset.route)));
}

function navigate(route) {
  const module = modules.find(item => item.id === route);
  $("#pageTitle").textContent = module?.label || "Panel principal";
  document.querySelectorAll(".nav-button").forEach(button => button.classList.toggle("active", button.dataset.route === route));
  $(".sidebar").classList.remove("open"); renderSubNavigation(route);
  if (route === "inicio") renderHome(); else if (route === "catalogo") renderCategories(); else if (route === "carrito") renderCart(); else renderModule(module);
  content.focus();
}

function renderSubNavigation(route) {
  const subnav = $("#subNav");
  const options = (sections[route] || []).filter(option => !option.managerOnly || currentUser.role === "Gerente");
  subnav.className = `subnav ${route}`;
  subnav.innerHTML = options.map(option => `<button class="subnav-button" data-option="${option.id}">${option.label}</button>`).join("");
  subnav.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    subnav.querySelectorAll("button").forEach(item => item.classList.remove("active")); button.classList.add("active"); openSubsection(route, button.dataset.option, button.textContent);
  }));
}

function openSubsection(section, option, label) {
  if (option === "nueva-cotizacion") return navigate("carrito");
  if (option === "usuarios") return renderUsers();
  if (section === "catalogo" && option === "categorias") return renderCategories();
  if (section === "catalogo" && option === "producto-detalle") return renderProductSelector();
  if (option === "mantenimientos") return renderMaintenances();
  if (option === "reportes") return renderReports();
  if (section === "ventas" && option.includes("pendiente")) return renderSales(label);
  content.innerHTML = `<div class="section-heading"><div><h2>${label}</h2><p>Pantalla preparada para conectarse posteriormente con la base de datos.</p></div><button class="action-button">Nuevo registro</button></div><section class="workspace-card"><div class="empty-state"><div class="big-icon">▤</div><h2>${label}</h2><p>Aquí se mostrará el formulario o consulta correspondiente.</p></div></section>`;
}

function frogIcon(color) {
  return `<span class="color-swatch" title="Color ${color}" style="color:${color}"><svg viewBox="0 0 72 48" aria-hidden="true"><path d="M6 31C14 15 28 10 45 12c8 1 15 5 21 12-5 1-8 4-11 9-12-4-24-3-37 3-6 3-11 1-12-5Z" fill="currentColor"/><path d="M12 34c14-7 29-8 45-3" fill="none" stroke="white" stroke-opacity=".72" stroke-width="2.8" stroke-linecap="round"/><circle cx="50" cy="18" r="2.2" fill="white"/></svg></span>`;
}

function productCards(items) {
  if (!items.length) return `<div class="empty-state"><h2>No se encontraron productos</h2><p>Probá con otra categoría o búsqueda.</p></div>`;
  return `<section class="product-grid">${items.map(product => `<article class="product-card"><div class="product-color" style="background:linear-gradient(135deg,${product.color},${product.color}99)"></div>${frogIcon(product.color)}<div class="product-info"><div class="product-heading"><div><span class="status">${product.category}</span><span class="brand-tag">${product.brand}</span><h3>${product.name}</h3></div><button class="info-circle" data-info="${product.id}" title="Ver información específica">i</button></div><div class="product-meta"><span>${product.detail}</span><span>Stock: ${product.stock}</span></div><div class="product-footer"><span class="price">Q${product.price.toFixed(2)}</span><div class="quantity-control"><button data-minus="${product.id}">−</button><output id="qty-${product.id}">${quantities[product.id]}</output><button data-plus="${product.id}">+</button></div></div><button class="primary-button" data-add="${product.id}">Agregar al carrito</button></div></article>`).join("")}</section>`;
}

function renderCategories() {
  markSubnav("categorias");
  const categories = ["Todos", "Accesorios", "Solventes", "Pinturas", "Barnices"];
  content.innerHTML = `<div class="section-heading"><div><h2>Catálogo por categoría</h2><p>Buscá y filtrá productos para agregarlos a una cotización.</p></div></div><section class="workspace-card"><div class="choice-group">${categories.map((category, index) => `<label class="choice-card"><input type="radio" name="category" value="${category}" ${index === 0 ? "checked" : ""}><span>${category}</span></label>`).join("")}</div><div class="search-row"><input id="productSearch" placeholder="Escribí un producto o una marca"><button class="action-button" id="searchButton">Buscar</button><button class="action-button wine" id="filtersButton">Filtros</button></div><div class="filter-panel" id="filterPanel"><div><label>Precio</label><select id="priceOrder"><option value="">Sin ordenar</option><option value="asc">Menor a mayor</option><option value="desc">Mayor a menor</option></select></div><div><label>Marca</label><select id="brandFilter"><option value="">Todas</option>${[...new Set(products.map(p => p.brand))].map(brand => `<option>${brand}</option>`).join("")}</select></div><div><label>Tipo de cliente</label><select id="clientFilter"><option selected>Individual</option><option>Empresa</option></select></div><div><label>Unidad</label><select id="unitFilter"><option value="">Todas</option>${[...new Set(products.flatMap(p => p.units))].map(unit => `<option>${unit}</option>`).join("")}</select></div></div><div id="categoryProducts"></div></section>`;
  const apply = () => {
    const category = document.querySelector('input[name="category"]:checked').value, query = $("#productSearch").value.toLowerCase(), brand = $("#brandFilter").value, unit = $("#unitFilter").value, order = $("#priceOrder").value, client = $("#clientFilter").value;
    let items = products.filter(p => (category === "Todos" || p.category === category) && (!query || `${p.name} ${p.brand}`.toLowerCase().includes(query)) && (!brand || p.brand === brand) && (!unit || p.units.includes(unit))).map(p => ({ ...p, price: p.prices.find(x => x.type === client).value }));
    if (order) items.sort((a,b) => order === "asc" ? a.price-b.price : b.price-a.price);
    $("#categoryProducts").innerHTML = productCards(items); bindProductActions();
  };
  document.querySelectorAll('input[name="category"]').forEach(x => x.addEventListener("change", apply)); ["priceOrder","brandFilter","clientFilter","unitFilter"].forEach(id => $("#"+id).addEventListener("change", apply));
  $("#searchButton").addEventListener("click", apply); $("#productSearch").addEventListener("keydown", e => { if (e.key === "Enter") apply(); }); $("#filtersButton").addEventListener("click", () => $("#filterPanel").classList.toggle("open")); apply();
}

function bindProductActions() {
  document.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => addToCart(+b.dataset.add, quantities[+b.dataset.add])));
  document.querySelectorAll("[data-info]").forEach(b => b.addEventListener("click", () => renderProductDetail(+b.dataset.info)));
  document.querySelectorAll("[data-minus]").forEach(b => b.addEventListener("click", () => changeQuantity(+b.dataset.minus, -1)));
  document.querySelectorAll("[data-plus]").forEach(b => b.addEventListener("click", () => changeQuantity(+b.dataset.plus, 1)));
}

function changeQuantity(id, delta) { quantities[id] = Math.max(1, Math.min(products.find(p => p.id === id).stock, quantities[id] + delta)); const output = $("#qty-" + id); if (output) output.textContent = quantities[id]; }
function addToCart(id, quantity = 1) { const item = cart.find(x => x.id === id); if (item) item.quantity = Math.min(item.stock, item.quantity + quantity); else cart.push({ ...products.find(x => x.id === id), quantity, discount: 0 }); updateCartCount(); showToast("Producto agregado a la cotización"); }
function updateCartCount() { $("#cartCount").textContent = cart.reduce((sum, item) => sum + item.quantity, 0); }
function markSubnav(option) { document.querySelectorAll(".subnav-button").forEach(b => b.classList.toggle("active", b.dataset.option === option)); }

function renderProductSelector() {
  markSubnav("producto-detalle");
  content.innerHTML = `<div class="section-heading"><div><h2>Información específica de un producto</h2><p>Seleccioná un producto para consultar presentaciones, precios y existencias.</p></div></div><section class="workspace-card selector-card"><div class="product-selector-list">${products.map((p,i) => `<label class="product-select-option"><input type="radio" name="detailProduct" value="${p.id}" ${i===0?"checked":""}>${frogIcon(p.color)}<span><strong>${p.name}</strong><small>${p.brand} · ${p.category} · ${p.detail}</small></span><b>Q${p.price.toFixed(2)}</b></label>`).join("")}</div><button class="primary-button compact" id="viewProduct">Ver información del producto</button></section>`;
  $("#viewProduct").addEventListener("click", () => renderProductDetail(+document.querySelector('input[name="detailProduct"]:checked').value));
}

function renderProductDetail(id) {
  markSubnav("producto-detalle"); const p = products.find(x => x.id === id);
  content.innerHTML = `<div class="section-heading"><div><h2>${p.name}</h2><p>${p.brand} · ${p.category} · ${p.detail}</p></div><button class="action-button" id="backCategories">Volver al catálogo</button></div><section class="workspace-card"><div class="product-detail-hero"><div style="background:${p.color}">${frogIcon(p.color)}</div><span><small>Color registrado</small><strong>${p.color}</strong></span><span><small>Stock total</small><strong>${p.stock}</strong></span></div><div class="detail-grid"><div class="detail-section"><h3>Existencias por ubicación</h3><table class="data-table"><thead><tr><th>Bodega y estante</th><th>Cantidad</th></tr></thead><tbody>${p.locations.map(x => `<tr><td>${x.place}</td><td>${x.quantity}</td></tr>`).join("")}</tbody></table></div><div class="detail-section"><h3>Presentaciones disponibles</h3><div>${p.units.map(unit => `<span class="unit-chip">${unit}</span>`).join("")}</div><h3>Precios por cliente</h3>${p.prices.map(x => `<div class="price-line"><span>${x.type}</span><strong>Q${x.value.toFixed(2)}</strong></div>`).join("")}<div class="detail-buy"><div class="quantity-control"><button id="detailMinus">−</button><output id="detailQty">${quantities[p.id]}</output><button id="detailPlus">+</button></div><button class="action-button green" id="detailAdd">Agregar al carrito</button></div></div></div></section>`;
  $("#backCategories").addEventListener("click", renderCategories); $("#detailMinus").addEventListener("click", () => { changeQuantity(id,-1); $("#detailQty").textContent=quantities[id]; }); $("#detailPlus").addEventListener("click", () => { changeQuantity(id,1); $("#detailQty").textContent=quantities[id]; }); $("#detailAdd").addEventListener("click", () => addToCart(id,quantities[id]));
}

function renderCart() {
  const subtotal = cart.reduce((sum,item) => sum + item.price*item.quantity,0), discount = cart.reduce((sum,item) => sum + item.price*item.quantity*(item.discount||0)/100,0), total = subtotal-discount;
  content.innerHTML = `<div class="section-heading"><div><h2>Cotización</h2><p>Revisá cantidades, descuentos y productos antes de imprimir o facturar.</p></div><button class="action-button" id="backCatalog">Agregar productos</button></div><section class="workspace-card quote-card">${cart.length ? `<div class="cart-list">${cart.map(item => { const line=item.price*item.quantity, final=line*(1-(item.discount||0)/100); return `<article class="cart-item"><div class="cart-product-main"><button class="remove-button" data-remove="${item.id}" title="Eliminar">×</button><button class="info-circle" data-cart-info="${item.id}" title="Ver información">i</button><div><strong>${item.name}</strong><span>${item.brand} · ${item.detail}</span>${item.discount ? `<small class="discount-label">Descuento aplicado: ${item.discount}%</small>`:""}</div></div><div class="cart-controls"><div class="quantity-control"><button data-cart-minus="${item.id}">−</button><output>${item.quantity}</output><button data-cart-plus="${item.id}">+</button></div><button class="discount-button" data-discount="${item.id}">${item.discount ? "Cambiar descuento" : "Aplicar descuento"}</button><div class="line-price">${item.discount ? `<del>Q${line.toFixed(2)}</del>`:""}<strong>Q${final.toFixed(2)}</strong></div></div></article>`; }).join("")}</div><div class="quote-summary"><div><span>Subtotal</span><b>Q${subtotal.toFixed(2)}</b></div><div class="discount-total"><span>Descuentos</span><b>− Q${discount.toFixed(2)}</b></div><div class="grand-total"><span>Total estimado</span><b>Q${total.toFixed(2)}</b></div></div><div class="button-row"><button class="action-button" id="printQuote">Imprimir cotización</button><button class="action-button green" id="invoiceQuote">Facturar y convertir en venta</button></div>` : `<div class="empty-state"><div class="big-icon">🛒</div><h2>La cotización está vacía</h2><p>Agregá productos desde el catálogo.</p></div>`}</section>`;
  $("#backCatalog").addEventListener("click", () => navigate("catalogo"));
  document.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => { cart=cart.filter(x=>x.id!==+b.dataset.remove); updateCartCount(); renderCart(); }));
  document.querySelectorAll("[data-cart-minus]").forEach(b => b.addEventListener("click", () => changeCartQuantity(+b.dataset.cartMinus,-1)));
  document.querySelectorAll("[data-cart-plus]").forEach(b => b.addEventListener("click", () => changeCartQuantity(+b.dataset.cartPlus,1)));
  document.querySelectorAll("[data-cart-info]").forEach(b => b.addEventListener("click", () => { navigate("catalogo"); renderProductDetail(+b.dataset.cartInfo); }));
  document.querySelectorAll("[data-discount]").forEach(b => b.addEventListener("click", () => authorizeDiscount(+b.dataset.discount)));
  $("#printQuote")?.addEventListener("click", printQuote); $("#invoiceQuote")?.addEventListener("click", () => { showToast("Cotización convertida en venta de demostración"); setTimeout(()=>renderSales("Venta facturada"),500); });
}

function changeCartQuantity(id, delta) { const item=cart.find(x=>x.id===id); item.quantity=Math.max(1,Math.min(item.stock,item.quantity+delta)); updateCartCount(); renderCart(); }
function authorizeDiscount(id) { const password=prompt("Ingrese la contraseña de autorización:"); if (password===null) return; if (password!==DISCOUNT_PASSWORD) return alert("Contraseña incorrecta. No se aplicó el descuento."); const value=Number(prompt("Porcentaje de descuento (0 a 50):", "10")); if (!Number.isFinite(value)||value<0||value>50) return alert("Ingresá un porcentaje válido entre 0 y 50."); cart.find(x=>x.id===id).discount=value; renderCart(); showToast("Descuento autorizado y aplicado"); }

function printQuote() {
  const subtotal=cart.reduce((s,x)=>s+x.price*x.quantity,0), discount=cart.reduce((s,x)=>s+x.price*x.quantity*(x.discount||0)/100,0), total=subtotal-discount;
  $("#printArea").innerHTML = printDocumentMarkup({ type:"COTIZACIÓN", number:"COT-0001", items:cart, subtotal, discount, total, payment:"Cotización sin medio de pago", note:"Esta cotización es válida por 15 días. Los precios y existencias están sujetos a disponibilidad." });
  document.body.classList.add("printing-document"); window.print(); setTimeout(()=>document.body.classList.remove("printing-document"),500);
}

function renderReports() {
  content.innerHTML = `<div class="section-heading"><div><h2>Reportes</h2><p>Seleccioná un informe para ver sus parámetros y datos de demostración.</p></div></div><div class="report-layout"><aside class="report-menu">${reportDefinitions.map((r,i)=>`<button data-report="${r.id}" class="report-option ${i===0?"active":""}"><i>${r.icon}</i><span><b>${r.title}</b><small>${r.desc}</small></span><strong>›</strong></button>`).join("")}</aside><section id="reportViewer" class="workspace-card report-viewer"></section></div>`;
  document.querySelectorAll("[data-report]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-report]").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderReport(+b.dataset.report);})); renderReport(1);
}

function renderReport(id) {
  const r=reportDefinitions.find(x=>x.id===id);
  const form = r.dates ? `<div class="report-filters"><label>Fecha inicial<input type="date" value="2026-09-01"></label><label>Fecha final<input type="date" value="2026-09-18"></label><button class="action-button" data-run-report>Consultar</button></div>` : r.invoice ? `<div class="report-filters invoice-search"><label>Número de factura<input value="FAC-0001"></label><button class="action-button" data-run-report>Buscar factura</button></div>` : `<div class="report-filters"><button class="action-button" data-run-report>Actualizar informe</button></div>`;
  $("#reportViewer").innerHTML=`<div class="report-title"><i>${r.icon}</i><div><h2>${r.title}</h2><p>${r.desc}</p></div></div>${form}<div id="reportResult">${reportResult(id)}</div>`;
  $("[data-run-report]").addEventListener("click",()=>{ $("#reportResult").innerHTML=reportResult(id); showToast("Informe actualizado"); });
}

function reportResult(id) {
  if(id===1)return `<div class="metric-grid"><article><span>Total facturado</span><b>Q10,000.00</b></article><article><span>Efectivo</span><b>Q5,000.00</b></article><article><span>Cheque</span><b>Q3,500.00</b></article><article><span>Tarjeta</span><b>Q1,500.00</b></article></div>`;
  if(id===2)return reportTable(["Producto","Ingresos"],[["Pintura interior","Q3,825.10"],["Barniz acrílico","Q3,700.33"],["Brocha profesional 2”","Q1,500.00"]]);
  if(id===3)return reportTable(["Producto","Cantidad vendida"],[["Pintura exterior","10 galones"],["Pintura interior","7 cubetas"],["Brocha profesional 2”","5 unidades"]]);
  if(id===4)return reportTable(["Producto","Bodega / estante","Existencia"],products.flatMap(p=>p.locations.map(l=>[p.name,l.place,l.quantity])));
  if(id===5)return reportTable(["Producto","Ventas registradas"],[["Aguarrás mineral","2 unidades"],["Barniz acrílico","3 unidades"],["Brocha profesional 2”","5 unidades"]]);
  if(id===6)return reportTable(["Producto","Proveedor sugerido","Estado"],[["Rodillo profesional","Distribuidora Central","Sin stock"],["Sellador acrílico","Pinturas del Norte","Solicitar compra"]]);
  return `<div class="invoice-summary"><div><span>Factura</span><b>FAC-0001</b></div><div><span>Cliente</span><b>Cliente de demostración</b></div><div><span>Emitida por</span><b>Andrea Morales</b></div><div><span>Fecha</span><b>18/09/2026</b></div></div>${reportTable(["Detalle","Cantidad","Importe"],[["Pintura interior",2,"Q379.00"],["Brocha profesional 2”",1,"Q38.25"]])}<h3>Medios de pago</h3>${reportTable(["Medio","Monto"],[["Tarjeta","Q300.00"],["Efectivo","Q117.25"]])}`;
}
function reportTable(headers,rows){return `<div class="table-wrap"><table class="data-table"><thead><tr>${headers.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;}

function renderMaintenances() {
  content.innerHTML=`<div class="section-heading"><div><h2>Mantenimientos</h2><p>Seleccioná una tabla para abrir su formulario de registro.</p></div></div><section class="workspace-card maintenance-shell"><details id="tablePicker" class="table-picker"><summary><span><i>▤</i><b id="selectedTableLabel">Seleccionar una tabla</b></span><small>${Object.keys(tableSchemas).length} tablas disponibles</small></summary><div class="picker-panel"><input id="tableSearch" placeholder="Buscar una tabla..."><div id="maintenanceGroups" class="maintenance-groups">${maintenanceMarkup("")}</div></div></details><div id="maintenanceForm" class="maintenance-form empty-maintenance"><div class="big-icon">▤</div><h3>Elegí una tabla</h3><p>Al seleccionarla aparecerán aquí los datos que se pueden agregar.</p></div></section>`;
  $("#tableSearch").addEventListener("input",e=>{ $("#maintenanceGroups").innerHTML=maintenanceMarkup(e.target.value); bindTableLinks(); }); bindTableLinks();
}
function maintenanceMarkup(query){const q=query.toLowerCase();return Object.entries(databaseGroups).map(([group,tables])=>{const filtered=tables.filter(t=>tableSchemas[t]&&(t.toLowerCase().includes(q)||t.replaceAll("_"," ").toLowerCase().includes(q)));if(!filtered.length)return "";return `<section class="maintenance-group"><h3>${group}<span>${filtered.length}</span></h3><div>${filtered.map(t=>`<button class="maintenance-row" data-table="${t}"><span class="table-symbol">▤</span><span><b>${t.replaceAll("_"," ")}</b></span><strong>Seleccionar ›</strong></button>`).join("")}</div></section>`;}).join("")||`<div class="empty-state">No se encontraron tablas.</div>`;}
function bindTableLinks(){document.querySelectorAll("[data-table]").forEach(b=>b.addEventListener("click",()=>selectMaintenanceTable(b.dataset.table)));}
function selectMaintenanceTable(table){$("#selectedTableLabel").textContent=table.replaceAll("_"," ");$("#tablePicker").open=false;const fields=tableSchemas[table]||[];$("#maintenanceForm").className="maintenance-form";$("#maintenanceForm").innerHTML=`<div class="maintenance-form-head"><div><span class="table-symbol">▤</span><div><small>NUEVO REGISTRO</small><h3>${table.replaceAll("_"," ")}</h3></div></div><button class="close-form" id="closeMaintenance">× Cerrar</button></div><form id="tableForm"><div class="dynamic-fields">${fields.map(field=>maintenanceField(field)).join("")}</div><div class="form-actions"><button type="button" class="ghost-form-button" id="clearMaintenance">Limpiar</button><button type="submit" class="action-button green">Guardar registro</button></div></form>`;$("#closeMaintenance").addEventListener("click",()=>{$("#maintenanceForm").className="maintenance-form empty-maintenance";$("#maintenanceForm").innerHTML=`<div class="big-icon">▤</div><h3>Formulario cerrado</h3><p>Seleccioná otra tabla para continuar.</p>`;});$("#clearMaintenance").addEventListener("click",()=>$("#tableForm").reset());$("#tableForm").addEventListener("submit",e=>{e.preventDefault();showToast(`Registro de ${table} preparado para guardar`);});}
function maintenanceField(field){const label=field.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/^id/,"").trim();if(field==="activo")return `<label class="field-check"><input type="checkbox" checked><span>Activo</span></label>`;if(field.startsWith("id"))return `<label>${label}<select required><option value="">Seleccionar ${label.toLowerCase()}</option><option>Registro de demostración 1</option><option>Registro de demostración 2</option></select></label>`;if(/fecha|ultimoAcceso/i.test(field))return `<label>${label}<input type="date" required></label>`;if(/descripcion|observaciones|direccion|informacion/i.test(field))return `<label class="field-wide">${label}<textarea rows="3" placeholder="Ingresar ${label.toLowerCase()}"></textarea></label>`;if(/cantidad|precio|costo|subtotal|total|descuento|monto/i.test(field))return `<label>${label}<input type="number" min="0" step="0.01" placeholder="0.00" required></label>`;return `<label>${label}<input placeholder="Ingresar ${label.toLowerCase()}" required></label>`;}

function renderHome() {
  content.innerHTML=`<section class="home-hero"><div class="home-copy"><span class="home-kicker">PANEL PRINCIPAL</span><h2>¡Hola, ${currentUser.name.split(" ")[0]}!</h2><p>Gestioná ventas, compras, inventario y clientes desde un solo lugar.</p><div class="hero-actions"><button class="action-button" data-home-route="catalogo">Explorar catálogo</button><button class="ghost-button" data-home-route="carrito">Nueva cotización</button></div></div><img src="assets/logo-sapo-pinturas.png" alt="Logo Sapo Pinturas"></section><img class="home-art-banner" src="assets/barra.png" alt="Colores para cada idea"><section class="quick-stats"><article><i>▦</i><span><small>Productos activos</small><b>128</b></span></article><article><i>🛒</i><span><small>Cotizaciones hoy</small><b>12</b></span></article><article><i>$</i><span><small>Ventas del día</small><b>Q8,450</b></span></article><article><i>!</i><span><small>Alertas de stock</small><b>4</b></span></article></section><div class="section-heading"><div><h2>¿Qué querés hacer?</h2><p>Elegí un módulo para comenzar.</p></div></div><section class="module-grid">${modules.filter(m=>m.id!=="inicio").map(m=>`<article class="module-card" data-home-route="${m.id}" tabindex="0"><div class="module-icon">${m.icon}</div><h3>${m.label}</h3><p>${m.desc}</p><span class="card-link">Abrir módulo →</span></article>`).join("")}</section>`;
  document.querySelectorAll("[data-home-route]").forEach(x=>x.addEventListener("click",()=>navigate(x.dataset.homeRoute)));
}

function renderSales(statusLabel="Facturas recientes") { content.innerHTML=`<div class="section-heading"><div><h2>${statusLabel}</h2><p>Operaciones disponibles para consulta e impresión.</p></div><button class="action-button" id="printInvoice">Imprimir factura</button></div><section class="workspace-card">${reportTable(["Factura","Cliente","Fecha","Total","Estado"],[["FAC-0001","Cliente de demostración","18/09/2026","Q417.25",statusLabel]])}</section>`; $("#printInvoice").addEventListener("click",printInvoice); }

function printInvoice() {
  const items = cart.length ? cart : [{ ...products[0], quantity:2, discount:0 }, { ...products[3], quantity:1, discount:0 }];
  const subtotal=items.reduce((s,x)=>s+x.price*x.quantity,0), discount=items.reduce((s,x)=>s+x.price*x.quantity*(x.discount||0)/100,0), total=subtotal-discount;
  $("#printArea").innerHTML = printDocumentMarkup({ type:"FACTURA", number:"FAC-0001", items, subtotal, discount, total, payment:"Tarjeta Q300.00 · Efectivo Q117.25", note:"Gracias por confiar en Sapo Pinturas. Conservá este documento para cambios o devoluciones." });
  document.body.classList.add("printing-document"); window.print(); setTimeout(()=>document.body.classList.remove("printing-document"),500);
}

function printDocumentMarkup({type,number,items,subtotal,discount,total,payment,note}) {
  return `<div class="document-sheet"><div class="document-accent"></div><header class="print-header"><div class="print-brand"><img src="assets/logo-sapo-pinturas.png" alt="Sapo Pinturas"><div><b>SAPO <em>PINTURAS</em></b><span>Color en cada proyecto</span></div></div><div class="document-title"><span>DOCUMENTO COMERCIAL</span><h1>${type}</h1></div><div class="print-number"><span>NÚMERO</span><b>${number}</b><small>${new Date().toLocaleDateString("es-GT")}</small></div></header><section class="print-meta"><div><span>CLIENTE</span><b>Cliente de demostración</b><small>NIT: C/F</small></div><div><span>ATENDIÓ / DESPACHÓ</span><b>${currentUser.name}</b><small>${currentUser.role}</small></div><div><span>MEDIO DE PAGO</span><b>${payment}</b><small>Quetzales (GTQ)</small></div></section><table class="print-table"><thead><tr><th>Descripción</th><th>Cant.</th><th>Precio unitario</th><th>Descuento</th><th>Importe</th></tr></thead><tbody>${items.map(x=>`<tr><td><b>${x.name}</b><small>${x.brand} · ${x.detail}</small></td><td>${x.quantity}</td><td>Q${x.price.toFixed(2)}</td><td>${x.discount||0}%</td><td><b>Q${(x.price*x.quantity*(1-(x.discount||0)/100)).toFixed(2)}</b></td></tr>`).join("")}</tbody></table><section class="document-bottom"><div class="document-note"><b>Observaciones</b><p>${note}</p><span>Documento generado por el sistema comercial Sapo Pinturas.</span></div><div class="print-totals"><p><span>Subtotal</span><b>Q${subtotal.toFixed(2)}</b></p><p><span>Descuento</span><b>− Q${discount.toFixed(2)}</b></p><p class="print-grand"><span>TOTAL</span><b>Q${total.toFixed(2)}</b></p></div></section><footer class="print-footer"><div class="signature-row"><span>Firma del cliente</span><span>Firma del responsable</span></div><div class="footer-wave"><span></span><span></span><span></span></div><div class="footer-content"><img src="assets/logo-sapo-pinturas.png" alt=""><p><b>COLOR EN CADA PROYECTO</b><small>Gracias por preferirnos · Sapo Pinturas</small></p><p class="footer-contact">Guatemala<br>ventas@sapopinturas.com</p></div></footer></div>`;
}
function renderUsers(){const roleClass={Gerente:"role-manager",Cajero:"role-cashier",Digitador:"role-data"};content.innerHTML=`<div class="section-heading users-heading"><div><span class="users-kicker">SEGURIDAD Y ACCESOS</span><h2>Usuarios y roles</h2><p>Administrá quién puede acceder y qué función cumple en el sistema.</p></div><button class="action-button">＋ Nuevo usuario</button></div><section class="user-stats"><article><span>Usuarios activos</span><b>3</b></article><article><span>Roles configurados</span><b>3</b></article><article><span>Último acceso</span><b>Hoy, 11:42</b></article></section><section class="workspace-card user-list"><div class="user-list-header"><span>Usuario</span><span>Nombre de acceso</span><span>Rol asignado</span><span>Estado</span><span>Acciones</span></div>${Object.entries(demoUsers).map(([username,user])=>`<article class="user-row"><div class="user-person"><i>${user.name[0]}</i><span><b>${user.name}</b><small>${user.role} del sistema</small></span></div><code>${username}</code><span class="role-badge ${roleClass[user.role]}">${user.role}</span><span class="active-badge"><i></i>Activo</span><button class="edit-user">Editar</button></article>`).join("")}</section>`;}
function renderModule(module){const items={compras:["Nueva compra","Proveedores","Compras pendientes","Entregas"],ventas:["Nueva cotización","Clientes y empresas","Pendiente de despachar","Pendiente de cancelar","Devoluciones"],informacion:["Consultas","Reportes","Mantenimientos","Usuarios y roles","Historial de movimientos"]};content.innerHTML=`<div class="section-heading"><div><h2>${module.label}</h2><p>${module.desc}</p></div></div><section class="module-grid">${(items[module.id]||[]).map((name,i)=>`<article class="module-card"><div class="module-icon">${i+1}</div><h3>${name}</h3><p>Seleccioná la opción superior para abrir esta gestión.</p></article>`).join("")}</section>`;}
function showToast(message){const toast=$("#toast");toast.textContent=message;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2200);}
