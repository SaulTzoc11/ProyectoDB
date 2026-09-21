

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

let products = [];

const databaseGroups = {
  "Catálogo": ["PRESENTACION", "MARCA", "CATEGORIA", "COLOR", "TIPO_PRECIO", "PRODUCTO_GENERAL", "PRODUCTO", "PRECIO"],
  "Personas y seguridad": ["TIPO_CLIENTE", "CLIENTE", "PROVEEDOR", "ROL", "USUARIO", "ACCION", "TABLA"],
  "Inventario": ["BODEGA", "ESTANTE", "LOTE", "TIPO_MOVIMIENTO", "MODIFICACION_INVENTARIO", "MOVIMIENTO"],
  "Compras y entregas": ["COMPRA", "DETALLE_COMPRA", "ENTREGA", "DETALLE_ENTREGA"],
  "Ventas": ["COTIZACION", "DETALLE_COTIZACION", "FACTURA", "DETALLE_FACTURA", "TIPO_PAGO", "PAGO"],
  "Devoluciones y control": ["DEVOLUCION", "DETALLE_DEVOLUCION", "MOTIVO", "ESTADO"]
};

// Campos tomados del archivo pintureria.xlsx compartido para el proyecto.
const maintenanceConfigs = {
  CATEGORIA: {
    endpoint: "/api/categorias/",
    primaryKey: "idcategoria",
    fields: [
      { name: "nombre", label: "Nombre", required: true },
      { name: "descripcion", label: "Descripción", type: "textarea" }
    ]
  },

  MARCA: {
    endpoint: "/api/marcas/",
    primaryKey: "idmarca",
    fields: [
      { name: "nombre", label: "Nombre", required: true },
      { name: "descripcion", label: "Descripción", type: "textarea" }
    ]
  },

  PRESENTACION: {
    endpoint: "/api/presentaciones/",
    primaryKey: "idpresentacion",
    fields: [
      { name: "nombre", label: "Nombre", required: true },
      {
        name: "cantidad",
        label: "Cantidad",
        type: "number",
        step: "0.0001",
        required: true
      },
      {
        name: "unidadmedida",
        label: "Unidad de medida",
        required: true
      }
    ]
  },

  COLOR: {
    endpoint: "/api/colores/",
    primaryKey: "idcolor",
    fields: [
      { name: "nombre", label: "Nombre", required: true },
      {
        name: "codigohex",
        label: "Código hexadecimal",
        placeholder: "#FFFFFF"
      },
      { name: "activo", label: "Activo", type: "checkbox" }
    ]
  },

  TIPO_PRECIO: {
    endpoint: "/api/tipos-precio/",
    primaryKey: "idtipoprecio",
    fields: [
      { name: "nombre", label: "Nombre", required: true },
      { name: "descripcion", label: "Descripción", type: "textarea" },
      { name: "activo", label: "Activo", type: "checkbox" }
    ]
  },

  PRODUCTO_GENERAL: {
    endpoint: "/api/productos-generales/",
    primaryKey: "idproductogeneral",
    fields: [
      {
        name: "idmarca",
        label: "Marca",
        type: "select",
        source: "/api/marcas/",
        valueKey: "idmarca",
        labelKey: "nombre",
        required: true
      },
      {
        name: "idcategoria",
        label: "Categoría",
        type: "select",
        source: "/api/categorias/",
        valueKey: "idcategoria",
        labelKey: "nombre",
        required: true
      },
      { name: "nombre", label: "Nombre", required: true },
      { name: "descripcion", label: "Descripción", type: "textarea" },
      { name: "activo", label: "Activo", type: "checkbox" }
    ]
  },

  PRODUCTO: {
    endpoint: "/api/productos/",
    primaryKey: "idproducto",
    fields: [
      {
        name: "idproductogeneral",
        label: "Producto general",
        type: "select",
        source: "/api/productos-generales/",
        valueKey: "idproductogeneral",
        labelKey: "nombre",
        required: true
      },
      {
        name: "idpresentacion",
        label: "Presentación",
        type: "select",
        source: "/api/presentaciones/",
        valueKey: "idpresentacion",
        labelKey: "nombre",
        required: true
      },
      {
        name: "idcolor",
        label: "Color",
        type: "select",
        source: "/api/colores/",
        valueKey: "idcolor",
        labelKey: "nombre"
      },
      {
        name: "codigoproducto",
        label: "Código del producto",
        required: true
      },
      {
        name: "codigobarras",
        label: "Código de barras"
      },
      { name: "activo", label: "Activo", type: "checkbox" }
    ]
  },

  PRECIO: {
    endpoint: "/api/precios/",
    primaryKey: "idprecio",
    fields: [
      {
        name: "idtipoprecio",
        label: "Tipo de precio",
        type: "select",
        source: "/api/tipos-precio/",
        valueKey: "idtipoprecio",
        labelKey: "nombre",
        required: true
      },
      {
        name: "idproducto",
        label: "Producto",
        type: "select",
        source: "/api/productos/",
        valueKey: "idproducto",
        labelKey: "codigoproducto",
        required: true
      },
      {
        name: "idestado",
        label: "Estado",
        type: "select",
        source: "/api/estados/",
        valueKey: "idestado",
        labelKey: "nombre",
        required: true
      },
      {
        name: "precio",
        label: "Precio",
        type: "number",
        step: "0.01",
        required: true
      }
    ]
  },

  TIPO_CLIENTE: {
    endpoint: "/api/tipos-cliente/",
    primaryKey: "idtipocliente",
    fields: [
      { name: "nombre", label: "Nombre", required: true },
      { name: "descripcion", label: "Descripción", type: "textarea" }
    ]
  },

  CLIENTE: {
    endpoint: "/api/clientes/",
    primaryKey: "idcliente",
    fields: [
      {
        name: "idtipocliente",
        label: "Tipo de cliente",
        type: "select",
        source: "/api/tipos-cliente/",
        valueKey: "idtipocliente",
        labelKey: "nombre",
        required: true
      },
      {
        name: "nombrecliente",
        label: "Nombre del cliente",
        required: true
      },
      { name: "nit", label: "NIT", required: true },
      { name: "telefono", label: "Teléfono" },
      { name: "correo", label: "Correo", type: "email" },
      { name: "direccion", label: "Dirección", type: "textarea" },
      { name: "nombrecontacto", label: "Nombre de contacto" },
      { name: "activo", label: "Activo", type: "checkbox" }
    ]
  },

  PROVEEDOR: {
    endpoint: "/api/proveedores/",
    primaryKey: "idproveedor",
    fields: [
      {
        name: "nombreproveedor",
        label: "Nombre del proveedor",
        required: true
      },
      { name: "nit", label: "NIT", required: true },
      { name: "nombrecontacto", label: "Nombre de contacto" },
      { name: "telefono", label: "Teléfono" },
      { name: "correo", label: "Correo", type: "email" },
      { name: "direccion", label: "Dirección", type: "textarea" },
      { name: "activo", label: "Activo", type: "checkbox" }
    ]
  }
};

const tableSchemas = Object.fromEntries(
  Object.entries(maintenanceConfigs).map(([table, config]) => [
    table,
    config.fields.map(field => field.name)
  ])
);

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

  if (section === "catalogo" && option === "categorias") {
    return renderCategories();
  }

  if (section === "catalogo" && option === "producto-detalle") {
    return renderProductSelector();
  }

  if (option === "mantenimientos") return renderMaintenances();
  if (option === "reportes") return renderReports();

  // LISTADO DE PROVEEDORES
  if (section === "compras" && option === "proveedores") {
    return renderDirectory({
      title: "Proveedores",
      description: "Proveedores registrados en la base de datos.",
      endpoint: "/api/proveedores/",
      maintenanceTable: "PROVEEDOR",
      columns: [
        { field: "nombreproveedor", label: "Proveedor" },
        { field: "nit", label: "NIT" },
        { field: "nombrecontacto", label: "Contacto" },
        { field: "telefono", label: "Teléfono" },
        { field: "correo", label: "Correo" },
        { field: "activo", label: "Estado", boolean: true }
      ]
    });
  }

  // LISTADO DE CLIENTES
  if (section === "ventas" && option === "clientes") {
    return renderDirectory({
      title: "Clientes y empresas",
      description: "Clientes registrados en la base de datos.",
      endpoint: "/api/clientes/",
      maintenanceTable: "CLIENTE",
      columns: [
        { field: "nombrecliente", label: "Cliente" },
        { field: "tipo_cliente_nombre", label: "Tipo" },
        { field: "nit", label: "NIT" },
        { field: "telefono", label: "Teléfono" },
        { field: "correo", label: "Correo" },
        { field: "activo", label: "Estado", boolean: true }
      ]
    });
  }
  if (
    section === "ventas" &&
    option.includes("pendiente")
  ) {
    return renderSales(label);
  }

  content.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>${label}</h2>
        <p>
          Pantalla preparada para conectarse posteriormente
          con la base de datos.
        </p>
      </div>

      <button class="action-button">
        Nuevo registro
      </button>
    </div>

    <section class="workspace-card">
      <div class="empty-state">
        <div class="big-icon">▤</div>
        <h2>${label}</h2>
        <p>
          Aquí se mostrará el formulario o consulta correspondiente.
        </p>
      </div>
    </section>
  `;
}
 async function renderDirectory(config) {
  content.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>${escapeHtml(config.title)}</h2>
        <p>${escapeHtml(config.description)}</p>
      </div>

      <button
        class="action-button"
        id="newDirectoryRecord"
      >
        + Nuevo registro
      </button>
    </div>

    <section class="workspace-card">
      <div id="directoryResults">
        <div class="empty-state">
          <h2>Cargando registros...</h2>
          <p>Consultando información en SQL Server.</p>
        </div>
      </div>
    </section>
  `;

  $("#newDirectoryRecord").addEventListener(
    "click",
    () => {
      openMaintenanceTable(config.maintenanceTable);
    }
  );

  try {
    const response = await fetch(config.endpoint);

    if (!response.ok) {
      throw new Error(
        "No se pudieron consultar los registros."
      );
    }

    const responseData = await response.json();

    const records = Array.isArray(responseData)
      ? responseData
      : responseData.results || [];

    if (!records.length) {
      $("#directoryResults").innerHTML = `
        <div class="empty-state">
          <h2>No hay registros</h2>
          <p>
            Presioná “Nuevo registro” para agregar el primero.
          </p>
        </div>
      `;
      return;
    }

    $("#directoryResults").innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              ${config.columns.map(column => `
                <th>${escapeHtml(column.label)}</th>
              `).join("")}

              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            ${records.map(record => `
              <tr>
                ${config.columns.map(column => {
                  const value = record[column.field];

                  if (column.boolean) {
                    return `
                      <td>
                        <span class="${
                          value
                            ? "active-badge"
                            : "inactive-badge"
                        }">
                          ${value ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    `;
                  }

                  return `
                    <td>
                      ${escapeHtml(
                        value === null ||
                        value === undefined ||
                        value === ""
                          ? "—"
                          : value
                      )}
                    </td>
                  `;
                }).join("")}

                <td>
                  <button
                    type="button"
                    class="edit-user"
                    data-directory-maintenance
                  >
                    Administrar
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    document
      .querySelectorAll("[data-directory-maintenance]")
      .forEach(button => {
        button.addEventListener("click", () => {
          openMaintenanceTable(
            config.maintenanceTable
          );
        });
      });

  } catch (error) {
    $("#directoryResults").innerHTML = `
      <div class="empty-state">
        <h2>No se pudo cargar la información</h2>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}


async function openMaintenanceTable(table) {
  navigate("informacion");

  document
    .querySelectorAll(".subnav-button")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.option === "mantenimientos"
      );
    });

  renderMaintenances();
  await selectMaintenanceTable(table);
}

function frogIcon(color) {
  return `<span class="color-swatch" title="Color ${color}" style="color:${color}"><svg viewBox="0 0 72 48" aria-hidden="true"><path d="M6 31C14 15 28 10 45 12c8 1 15 5 21 12-5 1-8 4-11 9-12-4-24-3-37 3-6 3-11 1-12-5Z" fill="currentColor"/><path d="M12 34c14-7 29-8 45-3" fill="none" stroke="white" stroke-opacity=".72" stroke-width="2.8" stroke-linecap="round"/><circle cx="50" cy="18" r="2.2" fill="white"/></svg></span>`;
}

function productCards(items) {
  if (!items.length) return `<div class="empty-state"><h2>No se encontraron productos</h2><p>Probá con otra categoría o búsqueda.</p></div>`;
  return `<section class="product-grid">${items.map(product => `<article class="product-card"><div class="product-color" style="background:linear-gradient(135deg,${product.color},${product.color}99)"></div>${frogIcon(product.color)}<div class="product-info"><div class="product-heading"><div><span class="status">${product.category}</span><span class="brand-tag">${product.brand}</span><h3>${product.name}</h3></div><button class="info-circle" data-info="${product.id}" title="Ver información específica">i</button></div><div class="product-meta"><span>${product.detail}</span><span>Stock: ${product.stock}</span></div><div class="product-footer"><span class="price">Q${product.price.toFixed(2)}</span><div class="quantity-control"><button data-minus="${product.id}">−</button><output id="qty-${product.id}">${quantities[product.id]}</output><button data-plus="${product.id}">+</button></div></div><button class="primary-button" data-add="${product.id}">Agregar al carrito</button></div></article>`).join("")}</section>`;
}

async function loadProductsFromApi() {
  const response = await fetch("/api/productos/");

  if (!response.ok) {
    throw new Error(
      "No se pudieron consultar los productos."
    );
  }

  const responseData = await response.json();

  const apiProducts = Array.isArray(responseData)
    ? responseData
    : responseData.results || [];

  products = apiProducts
    .filter(product => product.activo)
    .map(product => {
      const prices = (product.precios || []).map(price => ({
        type: price.tipo,
        value: Number(price.valor)
      }));

      const individualPrice =
        prices.find(
          price =>
            price.type.toLowerCase() === "individual"
        ) || prices[0];

      return {
        id: product.idproducto,
        generalId: product.idproductogeneral,
        name: product.producto_general_nombre,
        description: product.producto_descripcion || "",
        brand: product.marca_nombre,
        category: product.categoria_nombre,
        colorName: product.color_nombre,
        color: product.color_codigohex || "#027DD6",
        presentation: product.presentacion_nombre,
        presentationQuantity:
          product.presentacion_cantidad,
        unitMeasure: product.unidad_medida,
        detail:
          `${product.color_nombre} · ${product.presentacion_nombre}`,
        code: product.codigoproducto,
        barcode: product.codigobarras,
        stock: Number(product.stock || 0),
        units: [product.presentacion_nombre],
        prices,
        price: individualPrice
          ? individualPrice.value
          : 0,
        locations: (product.ubicaciones || []).map(
          location => ({
            place:
              `${location.bodega} · Estante ${location.estante}`,
            quantity: Number(location.cantidad)
          })
        )
      };
    });

  quantities = Object.fromEntries(
    products.map(product => [product.id, 1])
  );
}


async function renderCategories() {
  markSubnav("categorias");

  content.innerHTML = `
    <section class="workspace-card">
      <div class="empty-state">
        <h2>Cargando productos...</h2>
        <p>Consultando información en SQL Server.</p>
      </div>
    </section>
  `;

  try {
    await loadProductsFromApi();
  } catch (error) {
    content.innerHTML = `
      <section class="workspace-card">
        <div class="empty-state">
          <h2>No se pudo cargar el catálogo</h2>
          <p>${escapeHtml(error.message)}</p>
        </div>
      </section>
    `;
    return;
  }

  const categories = [
    "Todos",
    "Accesorios",
    "Solventes",
    "Pinturas",
    "Barnices"
  ];

  const brands = [
    ...new Set(
      products
        .map(product => product.brand)
        .filter(Boolean)
    )
  ];

  const units = [
    ...new Set(
      products.flatMap(product => product.units)
    )
  ];

  content.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>Catálogo por categoría</h2>
        <p>
          Buscá y filtrá productos para agregarlos
          a una cotización.
        </p>
      </div>
    </div>

    <section class="workspace-card">
      <div class="choice-group">
        ${categories.map((category, index) => `
          <label class="choice-card">
            <input
              type="radio"
              name="category"
              value="${category}"
              ${index === 0 ? "checked" : ""}
            >
            <span>${category}</span>
          </label>
        `).join("")}
      </div>

      <div class="search-row">
        <input
          id="productSearch"
          placeholder="Escribí un producto o una marca"
        >

        <button
          class="action-button"
          id="searchButton"
        >
          Buscar
        </button>

        <button
          class="action-button wine"
          id="filtersButton"
        >
          Filtros
        </button>
      </div>

      <div class="filter-panel" id="filterPanel">
        <div>
          <label>Precio</label>
          <select id="priceOrder">
            <option value="">Sin ordenar</option>
            <option value="asc">Menor a mayor</option>
            <option value="desc">Mayor a menor</option>
          </select>
        </div>

        <div>
          <label>Marca</label>
          <select id="brandFilter">
            <option value="">Todas</option>
            ${brands.map(brand => `
              <option value="${escapeHtml(brand)}">
                ${escapeHtml(brand)}
              </option>
            `).join("")}
          </select>
        </div>

        <div>
          <label>Tipo de cliente</label>
          <select id="clientFilter">
            <option value="Individual" selected>
              Individual
            </option>
            <option value="Empresa">
              Empresa
            </option>
          </select>
        </div>

        <div>
          <label>Unidad</label>
          <select id="unitFilter">
            <option value="">Todas</option>
            ${units.map(unit => `
              <option value="${escapeHtml(unit)}">
                ${escapeHtml(unit)}
              </option>
            `).join("")}
          </select>
        </div>
      </div>

      <div id="categoryProducts"></div>
    </section>
  `;

  const applyFilters = () => {
    const category = document.querySelector(
      'input[name="category"]:checked'
    ).value;

    const query = $("#productSearch")
      .value
      .trim()
      .toLowerCase();

    const brand = $("#brandFilter").value;
    const unit = $("#unitFilter").value;
    const order = $("#priceOrder").value;
    const clientType = $("#clientFilter").value;

    let filteredProducts = products
      .filter(product => {
        const matchesCategory =
          category === "Todos" ||
          product.category === category;

        const searchableText =
          `${product.name} ${product.brand} ${product.code}`
            .toLowerCase();

        const matchesSearch =
          !query || searchableText.includes(query);

        const matchesBrand =
          !brand || product.brand === brand;

        const matchesUnit =
          !unit || product.units.includes(unit);

        return (
          matchesCategory &&
          matchesSearch &&
          matchesBrand &&
          matchesUnit
        );
      })
      .map(product => {
        const selectedPrice = product.prices.find(
          price =>
            price.type.toLowerCase() ===
            clientType.toLowerCase()
        );

        if (!selectedPrice) {
          return null;
        }

        product.price = selectedPrice.value;
        return product;
      })
      .filter(Boolean);

    if (order === "asc") {
      filteredProducts.sort(
        (first, second) =>
          first.price - second.price
      );
    }

    if (order === "desc") {
      filteredProducts.sort(
        (first, second) =>
          second.price - first.price
      );
    }

    $("#categoryProducts").innerHTML =
      productCards(filteredProducts);

    bindProductActions();
  };

  document
    .querySelectorAll('input[name="category"]')
    .forEach(input => {
      input.addEventListener(
        "change",
        applyFilters
      );
    });

  [
    "priceOrder",
    "brandFilter",
    "clientFilter",
    "unitFilter"
  ].forEach(id => {
    $("#" + id).addEventListener(
      "change",
      applyFilters
    );
  });

  $("#searchButton").addEventListener(
    "click",
    applyFilters
  );

  $("#productSearch").addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter") {
        applyFilters();
      }
    }
  );

  $("#filtersButton").addEventListener(
    "click",
    () => {
      $("#filterPanel").classList.toggle("open");
    }
  );

  applyFilters();
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

let currentMaintenanceTable = null;
let currentMaintenanceRecords = [];
let currentMaintenanceEditId = null;


function getCsrfToken() {
  return document.querySelector(
    '[name="csrfmiddlewaretoken"]'
  )?.value || "";
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function renderMaintenances() {
  currentMaintenanceTable = null;
  currentMaintenanceRecords = [];
  currentMaintenanceEditId = null;

  content.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>Mantenimientos</h2>
        <p>
          Creá, consultá, editá y desactivá registros de la base de datos.
        </p>
      </div>
    </div>

    <section class="workspace-card maintenance-shell">
      <details id="tablePicker" class="table-picker">
        <summary>
          <span>
            <i>▤</i>
            <b id="selectedTableLabel">Seleccionar una tabla</b>
          </span>

          <small>
            ${Object.keys(maintenanceConfigs).length} tablas disponibles
          </small>
        </summary>

        <div class="picker-panel">
          <input
            id="tableSearch"
            placeholder="Buscar una tabla..."
          >

          <div
            id="maintenanceGroups"
            class="maintenance-groups"
          >
            ${maintenanceMarkup("")}
          </div>
        </div>
      </details>

      <div
        id="maintenanceForm"
        class="maintenance-form empty-maintenance"
      >
        <div class="big-icon">▤</div>
        <h3>Elegí una tabla</h3>
        <p>
          Aquí aparecerán el formulario y los registros almacenados.
        </p>
      </div>
    </section>
  `;

  $("#tableSearch").addEventListener("input", event => {
    $("#maintenanceGroups").innerHTML =
      maintenanceMarkup(event.target.value);

    bindTableLinks();
  });

  bindTableLinks();
}


function maintenanceMarkup(query) {
  const search = query.toLowerCase();

  return Object.entries(databaseGroups)
    .map(([group, tables]) => {
      const filteredTables = tables.filter(table => {
        if (!maintenanceConfigs[table]) {
          return false;
        }

        const normalName = table
          .replaceAll("_", " ")
          .toLowerCase();

        return (
          table.toLowerCase().includes(search) ||
          normalName.includes(search)
        );
      });

      if (!filteredTables.length) {
        return "";
      }

      return `
        <section class="maintenance-group">
          <h3>
            ${group}
            <span>${filteredTables.length}</span>
          </h3>

          <div>
            ${filteredTables.map(table => `
              <button
                class="maintenance-row"
                data-table="${table}"
              >
                <span class="table-symbol">▤</span>

                <span>
                  <b>${table.replaceAll("_", " ")}</b>
                </span>

                <strong>Seleccionar ›</strong>
              </button>
            `).join("")}
          </div>
        </section>
      `;
    })
    .join("") ||
    `<div class="empty-state">No se encontraron tablas.</div>`;
}


function bindTableLinks() {
  document
    .querySelectorAll("[data-table]")
    .forEach(button => {
      button.addEventListener("click", () => {
        selectMaintenanceTable(button.dataset.table);
      });
    });
}


async function selectMaintenanceTable(table) {
  currentMaintenanceTable = table;
  currentMaintenanceEditId = null;

  $("#selectedTableLabel").textContent =
    table.replaceAll("_", " ");

  $("#tablePicker").open = false;

  await renderMaintenanceWorkspace();
}


async function renderMaintenanceWorkspace(record = null) {
  const config = maintenanceConfigs[currentMaintenanceTable];

  if (!config) {
    return;
  }

  currentMaintenanceEditId = record
    ? record[config.primaryKey]
    : null;

  $("#maintenanceForm").className = "maintenance-form";

  $("#maintenanceForm").innerHTML = `
    <div class="maintenance-form-head">
      <div>
        <span class="table-symbol">▤</span>

        <div>
          <small>
            ${record ? "EDITAR REGISTRO" : "NUEVO REGISTRO"}
          </small>

          <h3>
            ${currentMaintenanceTable.replaceAll("_", " ")}
          </h3>
        </div>
      </div>

      <button class="close-form" id="closeMaintenance">
        × Cerrar
      </button>
    </div>

    <form id="tableForm">
      <div
        id="dynamicMaintenanceFields"
        class="dynamic-fields"
      >
        <p>Cargando formulario...</p>
      </div>

      <div class="form-actions">
        <button
          type="button"
          class="ghost-form-button"
          id="clearMaintenance"
        >
          ${record ? "Cancelar edición" : "Limpiar"}
        </button>

        <button
          type="submit"
          class="action-button green"
          id="saveMaintenance"
        >
          ${record ? "Guardar cambios" : "Guardar registro"}
        </button>
      </div>

      <p id="maintenanceMessage"></p>
    </form>

    <div class="maintenance-records">
      <div class="maintenance-records-head">
        <div>
          <h3>Registros existentes</h3>
          <p>Datos consultados desde SQL Server.</p>
        </div>

        <button
          type="button"
          class="ghost-form-button"
          id="refreshMaintenance"
        >
          Actualizar
        </button>
      </div>

      <div id="maintenanceRecords">
        <p>Cargando registros...</p>
      </div>
    </div>
  `;

  const fieldsMarkup = await Promise.all(
    config.fields.map(field =>
      maintenanceField(
        field,
        record ? record[field.name] : undefined
      )
    )
  );

  $("#dynamicMaintenanceFields").innerHTML =
    fieldsMarkup.join("");

  $("#closeMaintenance").addEventListener("click", () => {
    $("#maintenanceForm").className =
      "maintenance-form empty-maintenance";

    $("#maintenanceForm").innerHTML = `
      <div class="big-icon">▤</div>
      <h3>Formulario cerrado</h3>
      <p>Seleccioná otra tabla para continuar.</p>
    `;
  });

  $("#clearMaintenance").addEventListener("click", async () => {
    if (record) {
      await renderMaintenanceWorkspace();
    } else {
      $("#tableForm").reset();

      document
        .querySelectorAll(
          '#tableForm input[type="checkbox"]'
        )
        .forEach(input => {
          input.checked = true;
        });
    }
  });

  $("#refreshMaintenance").addEventListener(
    "click",
    loadMaintenanceRecords
  );

  $("#tableForm").addEventListener(
    "submit",
    saveMaintenanceRecord
  );

  await loadMaintenanceRecords();
}


async function maintenanceField(field, value = undefined) {
  const required = field.required ? "required" : "";
  const safeValue = escapeHtml(value ?? "");
  const placeholder = escapeHtml(
    field.placeholder || `Ingresar ${field.label.toLowerCase()}`
  );

  if (field.type === "checkbox") {
    const checked =
      value === undefined || value === true
        ? "checked"
        : "";

    return `
      <label class="field-check">
        <input
          type="checkbox"
          name="${field.name}"
          ${checked}
        >
        <span>${field.label}</span>
      </label>
    `;
  }

  if (field.type === "textarea") {
    return `
      <label class="field-wide">
        ${field.label}

        <textarea
          name="${field.name}"
          rows="3"
          placeholder="${placeholder}"
          ${required}
        >${safeValue}</textarea>
      </label>
    `;
  }

  if (field.type === "select") {
    try {
      const response = await fetch(field.source);

      if (!response.ok) {
        throw new Error("No se pudieron cargar las opciones.");
      }

      const responseData = await response.json();

      const options = Array.isArray(responseData)
        ? responseData
        : responseData.results || [];

      return `
        <label>
          ${field.label}

          <select name="${field.name}" ${required}>
            <option value="">
              Seleccionar ${field.label.toLowerCase()}
            </option>

            ${options.map(option => {
              const optionValue = option[field.valueKey];
              const optionLabel = option[field.labelKey];

              const selected =
                String(optionValue) === String(value)
                  ? "selected"
                  : "";

              return `
                <option
                  value="${escapeHtml(optionValue)}"
                  ${selected}
                >
                  ${escapeHtml(optionLabel)}
                </option>
              `;
            }).join("")}
          </select>
        </label>
      `;
    } catch (error) {
      return `
        <label>
          ${field.label}

          <select name="${field.name}" ${required}>
            <option value="">
              No se pudieron cargar las opciones
            </option>
          </select>
        </label>
      `;
    }
  }

  if (field.type === "number") {
    return `
      <label>
        ${field.label}

        <input
          type="number"
          name="${field.name}"
          min="0"
          step="${field.step || "0.01"}"
          value="${safeValue}"
          placeholder="${placeholder}"
          ${required}
        >
      </label>
    `;
  }

  return `
    <label>
      ${field.label}

      <input
        type="${field.type || "text"}"
        name="${field.name}"
        value="${safeValue}"
        placeholder="${placeholder}"
        ${required}
      >
    </label>
  `;
}


function getMaintenancePayload(config) {
  const form = $("#tableForm");
  const payload = {};

  config.fields.forEach(field => {
    const input = form.elements[field.name];

    if (!input) {
      return;
    }

    if (field.type === "checkbox") {
      payload[field.name] = input.checked;
      return;
    }

    if (field.type === "number") {
      payload[field.name] =
        input.value === ""
          ? null
          : Number(input.value);

      return;
    }

    if (field.type === "select") {
      payload[field.name] =
        input.value === ""
          ? null
          : input.value;

      return;
    }

    payload[field.name] = input.value.trim();
  });

  return payload;
}


async function saveMaintenanceRecord(event) {
  event.preventDefault();

  const config =
    maintenanceConfigs[currentMaintenanceTable];

  const payload = getMaintenancePayload(config);
  const editing = currentMaintenanceEditId !== null;

  const url = editing
    ? `${config.endpoint}${currentMaintenanceEditId}/`
    : config.endpoint;

  const button = $("#saveMaintenance");
  const message = $("#maintenanceMessage");

  button.disabled = true;
  button.textContent = "Guardando...";
  message.textContent = "";

  try {
    const response = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken()
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(
        await readMaintenanceError(response)
      );
    }

    showToast(
      editing
        ? "Registro actualizado correctamente"
        : "Registro creado correctamente"
    );

    currentMaintenanceEditId = null;
    await renderMaintenanceWorkspace();

  } catch (error) {
    message.textContent = error.message;
    message.className = "form-error";

  } finally {
    button.disabled = false;
    button.textContent = editing
      ? "Guardar cambios"
      : "Guardar registro";
  }
}


async function readMaintenanceError(response) {
  try {
    const data = await response.json();

    if (data.mensaje) {
      return data.mensaje;
    }

    return Object.entries(data)
      .map(([field, messages]) => {
        const message = Array.isArray(messages)
          ? messages.join(", ")
          : messages;

        return `${field}: ${message}`;
      })
      .join(" | ");

  } catch (error) {
    return "No se pudo completar la operación.";
  }
}


async function loadMaintenanceRecords() {
  const config =
    maintenanceConfigs[currentMaintenanceTable];

  const container = $("#maintenanceRecords");

  if (!config || !container) {
    return;
  }

  container.innerHTML = "<p>Cargando registros...</p>";

  try {
    const response = await fetch(config.endpoint);

    if (!response.ok) {
      throw new Error(
        "No se pudieron consultar los registros."
      );
    }

    const responseData = await response.json();

    currentMaintenanceRecords =
      Array.isArray(responseData)
        ? responseData
        : responseData.results || [];

    renderMaintenanceRecords();

  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No se pudieron cargar los registros</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}


function getMaintenanceDisplayValue(record, field) {
  const relatedNames = {
    idmarca: "marca_nombre",
    idcategoria: "categoria_nombre",
    idproductogeneral: "producto_general_nombre",
    idpresentacion: "presentacion_nombre",
    idcolor: "color_nombre",
    idtipoprecio: "tipo_precio_nombre",
    idproducto: "producto_nombre",
    idestado: "estado_nombre",
    idtipocliente: "tipo_cliente_nombre"
  };

  const relatedField = relatedNames[field.name];

  let value = relatedField && record[relatedField] !== undefined
    ? record[relatedField]
    : record[field.name];

  if (field.type === "checkbox") {
    return value ? "Activo" : "Inactivo";
  }

  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return value;
}


function renderMaintenanceRecords() {
  const config =
    maintenanceConfigs[currentMaintenanceTable];

  const container = $("#maintenanceRecords");

  if (!currentMaintenanceRecords.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No hay registros</h3>
        <p>Usá el formulario para crear el primero.</p>
      </div>
    `;

    return;
  }

  const visibleFields = config.fields.slice(0, 5);
  const hasActiveField = config.fields.some(
    field => field.name === "activo"
  );

  container.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            ${visibleFields.map(field =>
              `<th>${field.label}</th>`
            ).join("")}

            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          ${currentMaintenanceRecords.map(record => {
            const id = record[config.primaryKey];
            const inactive =
              hasActiveField && record.activo === false;

            return `
              <tr>
                ${visibleFields.map(field => `
                  <td>
                    ${escapeHtml(
                      getMaintenanceDisplayValue(
                        record,
                        field
                      )
                    )}
                  </td>
                `).join("")}

                <td>
                  <div class="maintenance-actions">
                    <button
                      type="button"
                      class="edit-user"
                      data-maintenance-edit="${id}"
                    >
                      Editar
                    </button>

                    ${inactive ? `
                      <button
                        type="button"
                        class="maintenance-activate"
                        data-maintenance-activate="${id}"
                      >
                        Activar
                      </button>
                    ` : `
                      <button
                        type="button"
                        class="maintenance-delete"
                        data-maintenance-delete="${id}"
                      >
                        ${hasActiveField
                          ? "Desactivar"
                          : "Eliminar"}
                      </button>
                    `}
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  document
    .querySelectorAll("[data-maintenance-edit]")
    .forEach(button => {
      button.addEventListener("click", () => {
        editMaintenanceRecord(
          button.dataset.maintenanceEdit
        );
      });
    });

  document
    .querySelectorAll("[data-maintenance-delete]")
    .forEach(button => {
      button.addEventListener("click", () => {
        deleteMaintenanceRecord(
          button.dataset.maintenanceDelete
        );
      });
    });

  document
    .querySelectorAll("[data-maintenance-activate]")
    .forEach(button => {
      button.addEventListener("click", () => {
        activateMaintenanceRecord(
          button.dataset.maintenanceActivate
        );
      });
    });
}


async function editMaintenanceRecord(id) {
  const config =
    maintenanceConfigs[currentMaintenanceTable];

  const record = currentMaintenanceRecords.find(item =>
    String(item[config.primaryKey]) === String(id)
  );

  if (!record) {
    showToast("No se encontró el registro");
    return;
  }

  await renderMaintenanceWorkspace(record);
}


async function deleteMaintenanceRecord(id) {
  const config =
    maintenanceConfigs[currentMaintenanceTable];

  const hasActiveField = config.fields.some(
    field => field.name === "activo"
  );

  const action = hasActiveField
    ? "desactivar"
    : "eliminar";

  if (!confirm(`¿Deseás ${action} este registro?`)) {
    return;
  }

  try {
    const response = await fetch(
      `${config.endpoint}${id}/`,
      {
        method: "DELETE",
        headers: {
          "X-CSRFToken": getCsrfToken()
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        await readMaintenanceError(response)
      );
    }

    showToast(
      hasActiveField
        ? "Registro desactivado"
        : "Registro eliminado"
    );

    await loadMaintenanceRecords();

  } catch (error) {
    alert(error.message);
  }
}


async function activateMaintenanceRecord(id) {
  const config =
    maintenanceConfigs[currentMaintenanceTable];

  try {
    const response = await fetch(
      `${config.endpoint}${id}/activar/`,
      {
        method: "POST",
        headers: {
          "X-CSRFToken": getCsrfToken()
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        await readMaintenanceError(response)
      );
    }

    showToast("Registro activado");
    await loadMaintenanceRecords();

  } catch (error) {
    alert(error.message);
  }
}

function renderHome() {
  content.innerHTML=`<section class="home-hero"><div class="home-copy"><span class="home-kicker">PANEL PRINCIPAL</span><h2>¡Hola, ${currentUser.name.split(" ")[0]}!</h2><p>Gestioná ventas, compras, inventario y clientes desde un solo lugar.</p><div class="hero-actions"><button class="action-button" data-home-route="catalogo">Explorar catálogo</button><button class="ghost-button" data-home-route="carrito">Nueva cotización</button></div></div><img src="/static/usuarios/assets/logo-sapo-pinturas.png" alt="Logo Sapo Pinturas"></section><img class="home-art-banner" src="/static/usuarios/assets/barra.png" alt="Colores para cada idea"><section class="quick-stats"><article><i>▦</i><span><small>Productos activos</small><b>128</b></span></article><article><i>🛒</i><span><small>Cotizaciones hoy</small><b>12</b></span></article><article><i>$</i><span><small>Ventas del día</small><b>Q8,450</b></span></article><article><i>!</i><span><small>Alertas de stock</small><b>4</b></span></article></section><div class="section-heading"><div><h2>¿Qué querés hacer?</h2><p>Elegí un módulo para comenzar.</p></div></div><section class="module-grid">${modules.filter(m=>m.id!=="inicio").map(m=>`<article class="module-card" data-home-route="${m.id}" tabindex="0"><div class="module-icon">${m.icon}</div><h3>${m.label}</h3><p>${m.desc}</p><span class="card-link">Abrir módulo →</span></article>`).join("")}</section>`;
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
  return `<div class="document-sheet"><div class="document-accent"></div><header class="print-header"><div class="print-brand"><img src="/static/usuarios/assets/logo-sapo-pinturas.png" alt="Sapo Pinturas"><div><b>SAPO <em>PINTURAS</em></b><span>Color en cada proyecto</span></div></div><div class="document-title"><span>DOCUMENTO COMERCIAL</span><h1>${type}</h1></div><div class="print-number"><span>NÚMERO</span><b>${number}</b><small>${new Date().toLocaleDateString("es-GT")}</small></div></header><section class="print-meta"><div><span>CLIENTE</span><b>Cliente de demostración</b><small>NIT: C/F</small></div><div><span>ATENDIÓ / DESPACHÓ</span><b>${currentUser.name}</b><small>${currentUser.role}</small></div><div><span>MEDIO DE PAGO</span><b>${payment}</b><small>Quetzales (GTQ)</small></div></section><table class="print-table"><thead><tr><th>Descripción</th><th>Cant.</th><th>Precio unitario</th><th>Descuento</th><th>Importe</th></tr></thead><tbody>${items.map(x=>`<tr><td><b>${x.name}</b><small>${x.brand} · ${x.detail}</small></td><td>${x.quantity}</td><td>Q${x.price.toFixed(2)}</td><td>${x.discount||0}%</td><td><b>Q${(x.price*x.quantity*(1-(x.discount||0)/100)).toFixed(2)}</b></td></tr>`).join("")}</tbody></table><section class="document-bottom"><div class="document-note"><b>Observaciones</b><p>${note}</p><span>Documento generado por el sistema comercial Sapo Pinturas.</span></div><div class="print-totals"><p><span>Subtotal</span><b>Q${subtotal.toFixed(2)}</b></p><p><span>Descuento</span><b>− Q${discount.toFixed(2)}</b></p><p class="print-grand"><span>TOTAL</span><b>Q${total.toFixed(2)}</b></p></div></section><footer class="print-footer"><div class="signature-row"><span>Firma del cliente</span><span>Firma del responsable</span></div><div class="footer-wave"><span></span><span></span><span></span></div><div class="footer-content"><img src="/static/usuarios/assets/logo-sapo-pinturas.png" alt=""><p><b>COLOR EN CADA PROYECTO</b><small>Gracias por preferirnos · Sapo Pinturas</small></p><p class="footer-contact">Guatemala<br>ventas@sapopinturas.com</p></div></footer></div>`;
}
function obtenerCsrfToken() {
  return document.querySelector(
    '[name="csrfmiddlewaretoken"]'
  )?.value || "";
}


function obtenerLista(datos) {
  return Array.isArray(datos) ? datos : datos.results || [];
}


function obtenerMensajeError(datos) {
  if (datos.mensaje) {
    return datos.mensaje;
  }

  const primerCampo = Object.keys(datos)[0];

  if (!primerCampo) {
    return "No se pudo completar la operación.";
  }

  const error = datos[primerCampo];

  if (Array.isArray(error)) {
    return `${primerCampo}: ${error[0]}`;
  }

  return `${primerCampo}: ${error}`;
}


async function renderUsers() {
  content.innerHTML = `
    <section class="workspace-card">
      <p>Cargando usuarios...</p>
    </section>
  `;

  try {
    const [respuestaUsuarios, respuestaRoles] = await Promise.all([
      fetch("/api/usuarios/"),
      fetch("/api/roles/")
    ]);

    if (!respuestaUsuarios.ok || !respuestaRoles.ok) {
      throw new Error("No se pudieron cargar los datos.");
    }

    const usuarios = obtenerLista(await respuestaUsuarios.json());
    const roles = obtenerLista(await respuestaRoles.json());

    const activos = usuarios.filter(usuario => usuario.activo).length;

    content.innerHTML = `
      <div class="section-heading users-heading">
        <div>
          <span class="users-kicker">SEGURIDAD Y ACCESOS</span>
          <h2>Usuarios y roles</h2>
          <p>
            Administra quién puede acceder y qué función cumple
            dentro del sistema.
          </p>
        </div>

        <button class="action-button" id="nuevoUsuario">
          + Nuevo usuario
        </button>
      </div>

      <section class="user-stats">
        <article>
          <span>Usuarios activos</span>
          <b>${activos}</b>
        </article>

        <article>
          <span>Usuarios registrados</span>
          <b>${usuarios.length}</b>
        </article>

        <article>
          <span>Roles configurados</span>
          <b>${roles.length}</b>
        </article>
      </section>

      <section
        class="workspace-card user-form-card hidden"
        id="formularioUsuarioContenedor"
      ></section>

      <section class="workspace-card user-list">
        <div class="user-list-header">
          <span>Usuario</span>
          <span>Nombre de acceso</span>
          <span>Rol asignado</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        ${
          usuarios.length
            ? usuarios.map(usuario => {
                const nombreCompleto =
                  `${usuario.nombres} ${usuario.apellidos}`.trim();

                const estadoClase = usuario.activo
                  ? "active-badge"
                  : "inactive-badge";

                const estadoTexto = usuario.activo
                  ? "Activo"
                  : "Inactivo";

                return `
                  <article class="user-row">
                    <div class="user-person">
                      <i>${nombreCompleto.charAt(0).toUpperCase()}</i>

                      <span>
                        <b>${nombreCompleto}</b>
                        <small>${usuario.correo}</small>
                      </span>
                    </div>

                    <code>${usuario.nombreusuario}</code>

                    <span class="role-badge">
                      ${usuario.rol_nombre || "Sin rol"}
                    </span>

                    <span class="${estadoClase}">
                      <i></i>${estadoTexto}
                    </span>

                    <div class="user-actions">
                      <button
                        class="edit-user"
                        data-editar-usuario="${usuario.idusuario}"
                      >
                        Editar
                      </button>

                      <button
                        class="toggle-user"
                        data-cambiar-estado="${usuario.idusuario}"
                        data-activo="${usuario.activo}"
                      >
                        ${usuario.activo ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </article>
                `;
              }).join("")
            : `
              <p class="empty-users">
                No hay usuarios registrados.
              </p>
            `
        }
      </section>
    `;

    $("#nuevoUsuario").addEventListener("click", () => {
      mostrarFormularioUsuario(null, roles);
    });

    document.querySelectorAll("[data-editar-usuario]").forEach(boton => {
      boton.addEventListener("click", () => {
        const id = Number(boton.dataset.editarUsuario);
        const usuario = usuarios.find(item => item.idusuario === id);

        mostrarFormularioUsuario(usuario, roles);
      });
    });

    document.querySelectorAll("[data-cambiar-estado]").forEach(boton => {
      boton.addEventListener("click", async () => {
        const id = boton.dataset.cambiarEstado;
        const estaActivo = boton.dataset.activo === "true";

        await cambiarEstadoUsuario(id, estaActivo);
      });
    });

  } catch (error) {
    content.innerHTML = `
      <section class="workspace-card">
        <h3>No se pudieron cargar los usuarios</h3>
        <p>${error.message}</p>
      </section>
    `;
  }
}


function mostrarFormularioUsuario(usuario, roles) {
  const contenedor = $("#formularioUsuarioContenedor");
  const editando = Boolean(usuario);

  contenedor.classList.remove("hidden");

  contenedor.innerHTML = `
    <div class="user-form-header">
      <div>
        <h3>${editando ? "Editar usuario" : "Crear usuario"}</h3>
        <p>
          ${
            editando
              ? "Modifica los datos y el rol del usuario."
              : "Ingresa los datos del nuevo usuario."
          }
        </p>
      </div>

      <button type="button" id="cerrarFormularioUsuario">
        ×
      </button>
    </div>

    <form id="formularioUsuario" class="user-form">
      <label>
        Nombres
        <input
          name="nombres"
          value="${usuario?.nombres || ""}"
          required
        >
      </label>

      <label>
        Apellidos
        <input
          name="apellidos"
          value="${usuario?.apellidos || ""}"
          required
        >
      </label>

      <label>
        Nombre de usuario
        <input
          name="nombreusuario"
          value="${usuario?.nombreusuario || ""}"
          required
        >
      </label>

      <label>
        Correo
        <input
          type="email"
          name="correo"
          value="${usuario?.correo || ""}"
          required
        >
      </label>

      <label>
        Rol
        <select name="idrol" required>
          <option value="">Seleccionar rol</option>

          ${roles.map(rol => `
            <option
              value="${rol.idrol}"
              ${usuario?.idrol === rol.idrol ? "selected" : ""}
            >
              ${rol.nombre}
            </option>
          `).join("")}
        </select>
      </label>

      <label>
        ${editando ? "Nueva contraseña (opcional)" : "Contraseña"}
        <input
          type="password"
          name="contrasena"
          minlength="8"
          ${editando ? "" : "required"}
        >
      </label>

      <label class="field-check">
        <input
          type="checkbox"
          name="activo"
          ${usuario?.activo !== false ? "checked" : ""}
        >
        <span>Usuario activo</span>
      </label>

      <div class="user-form-error" id="errorFormularioUsuario"></div>

      <div class="form-actions">
        <button
          type="button"
          class="ghost-form-button"
          id="cancelarFormularioUsuario"
        >
          Cancelar
        </button>

        <button type="submit" class="action-button">
          ${editando ? "Guardar cambios" : "Crear usuario"}
        </button>
      </div>
    </form>
  `;

  $("#cerrarFormularioUsuario").addEventListener(
    "click",
    cerrarFormularioUsuario
  );

  $("#cancelarFormularioUsuario").addEventListener(
    "click",
    cerrarFormularioUsuario
  );

  $("#formularioUsuario").addEventListener("submit", event => {
    guardarUsuario(event, usuario?.idusuario);
  });

  contenedor.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


function cerrarFormularioUsuario() {
  const contenedor = $("#formularioUsuarioContenedor");
  contenedor.classList.add("hidden");
  contenedor.innerHTML = "";
}


async function guardarUsuario(event, idUsuario = null) {
  event.preventDefault();

  const formulario = event.currentTarget;
  const boton = formulario.querySelector('button[type="submit"]');
  const datosFormulario = new FormData(formulario);

  const datos = {
    nombres: datosFormulario.get("nombres"),
    apellidos: datosFormulario.get("apellidos"),
    nombreusuario: datosFormulario.get("nombreusuario"),
    correo: datosFormulario.get("correo"),
    idrol: datosFormulario.get("idrol"),
    activo: datosFormulario.get("activo") === "on"
  };

  const contrasena = datosFormulario.get("contrasena");

  if (contrasena) {
    datos.contrasena = contrasena;
  }

  const url = idUsuario
    ? `/api/usuarios/${idUsuario}/`
    : "/api/usuarios/";

  const metodo = idUsuario ? "PATCH" : "POST";

  boton.disabled = true;
  boton.textContent = "Guardando...";
  $("#errorFormularioUsuario").textContent = "";

  try {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": obtenerCsrfToken()
      },
      body: JSON.stringify(datos)
    });

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      $("#errorFormularioUsuario").textContent =
        obtenerMensajeError(resultado);
      return;
    }

    showToast(
      idUsuario
        ? "Usuario actualizado correctamente."
        : "Usuario creado correctamente."
    );

    await renderUsers();

  } catch (error) {
    $("#errorFormularioUsuario").textContent =
      "No se pudo conectar con el servidor.";
  } finally {
    boton.disabled = false;
    boton.textContent = idUsuario
      ? "Guardar cambios"
      : "Crear usuario";
  }
}


async function cambiarEstadoUsuario(idUsuario, estaActivo) {
  const accion = estaActivo ? "desactivar" : "activar";

  if (!confirm(`¿Deseas ${accion} este usuario?`)) {
    return;
  }

  const url = estaActivo
    ? `/api/usuarios/${idUsuario}/`
    : `/api/usuarios/${idUsuario}/activar/`;

  const metodo = estaActivo ? "DELETE" : "POST";

  try {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: {
        "X-CSRFToken": obtenerCsrfToken()
      }
    });

    if (!respuesta.ok) {
      const resultado = await respuesta.json();
      alert(obtenerMensajeError(resultado));
      return;
    }

    showToast(`Usuario ${accion}do correctamente.`);
    await renderUsers();

  } catch (error) {
    alert("No se pudo conectar con el servidor.");
  }
}function renderModule(module){const items={compras:["Nueva compra","Proveedores","Compras pendientes","Entregas"],ventas:["Nueva cotización","Clientes y empresas","Pendiente de despachar","Pendiente de cancelar","Devoluciones"],informacion:["Consultas","Reportes","Mantenimientos","Usuarios y roles","Historial de movimientos"]};content.innerHTML=`<div class="section-heading"><div><h2>${module.label}</h2><p>${module.desc}</p></div></div><section class="module-grid">${(items[module.id]||[]).map((name,i)=>`<article class="module-card"><div class="module-icon">${i+1}</div><h3>${name}</h3><p>Seleccioná la opción superior para abrir esta gestión.</p></article>`).join("")}</section>`;}
function showToast(message){const toast=$("#toast");toast.textContent=message;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2200);}
