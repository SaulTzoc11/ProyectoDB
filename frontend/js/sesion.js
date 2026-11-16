import { asegurarCsrf, solicitar } from "./api.js";
import { cantidadTotal } from "./carrito.js";

const PAGINA_LOGIN = "/index.html";

function rellenarDatos(usuario) {
  document.querySelectorAll('[data-sesion="nombre"]').forEach((nodo) => {
    nodo.textContent = usuario.name;
  });
  document.querySelectorAll('[data-sesion="rol"]').forEach((nodo) => {
    nodo.textContent = usuario.role;
  });
  document.querySelectorAll('[data-sesion="inicial"]').forEach((nodo) => {
    nodo.textContent = usuario.name.charAt(0).toUpperCase();
  });
  document.querySelectorAll('[data-sesion="primer-nombre"]').forEach((nodo) => {
    nodo.textContent = usuario.name.split(" ")[0];
  });
}

function aplicarPermisosDeVista(usuario) {
  document.querySelectorAll("[data-solo-rol]").forEach((nodo) => {
    const permitidos = nodo.dataset.soloRol.split(",").map((rol) => rol.trim());
    nodo.hidden = !permitidos.includes(usuario.role);
  });
}

function activarAcciones() {
  document.querySelectorAll('[data-accion="cerrar-sesion"]').forEach((boton) => {
    boton.addEventListener("click", async () => {
      try {
        await solicitar("/api/logout/", { metodo: "POST" });
      } finally {
        window.location.replace(PAGINA_LOGIN);
      }
    });
  });

  document.querySelectorAll('[data-accion="abrir-menu"]').forEach((boton) => {
    boton.addEventListener("click", () => {
      document.querySelector("#barraLateral")?.classList.toggle("open");
    });
  });

  document.querySelectorAll('[data-carrito="cantidad"]').forEach((nodo) => {
    nodo.textContent = cantidadTotal();
  });
}

export async function iniciarPagina({ roles } = {}) {
  await asegurarCsrf();

  let usuario;
  try {
    usuario = await solicitar("/api/sesion/");
  } catch (error) {
    window.location.replace(PAGINA_LOGIN);
    return new Promise(() => {});
  }

  if (roles && !roles.includes(usuario.role)) {
    window.location.replace("/pages/inicio.html");
    return new Promise(() => {});
  }

  rellenarDatos(usuario);
  aplicarPermisosDeVista(usuario);
  activarAcciones();
  document.body.classList.remove("cargando");

  return usuario;
}
