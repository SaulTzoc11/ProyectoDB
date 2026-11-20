import { asegurarCsrf, solicitar } from "../api.js";

const paneles = {
  login: document.querySelector("#panelLogin"),
  registro: document.querySelector("#panelRegistro"),
};

const formularioLogin = document.querySelector("#formularioLogin");
const formularioRegistro = document.querySelector("#formularioRegistro");

const errorLogin = document.querySelector("#errorLogin");
const avisoLogin = document.querySelector("#avisoLogin");
const errorRegistro = document.querySelector("#errorRegistro");
const avisoRegistro = document.querySelector("#avisoRegistro");

function limpiarMensajes() {
  document.querySelectorAll(".error, .auth-notice").forEach((elemento) => {
    elemento.textContent = "";
    elemento.hidden = true;
  });
}

function mostrarPanel(nombre) {
  limpiarMensajes();

  Object.entries(paneles).forEach(([clave, panel]) => {
    panel.hidden = clave !== nombre;
  });

  const primero = paneles[nombre].querySelector("input:not([type='hidden'])");
  if (primero) primero.focus();
}

function mostrarError(elemento, texto) {
  elemento.textContent = texto;
  elemento.hidden = false;
}

function mostrarAviso(elemento, texto) {
  elemento.textContent = texto;
  elemento.hidden = false;
}

function textoBoton(boton, texto) {
  boton.dataset.textoOriginal ||= boton.innerHTML;
  boton.innerHTML = texto;
}

function restaurarBoton(boton) {
  boton.innerHTML = boton.dataset.textoOriginal;
  boton.disabled = false;
}

async function conBoton(boton, texto, accion) {
  boton.disabled = true;
  textoBoton(boton, texto);

  try {
    return await accion();
  } finally {
    restaurarBoton(boton);
  }
}

document.querySelectorAll("[data-panel]").forEach((boton) => {
  boton.addEventListener("click", () => mostrarPanel(boton.dataset.panel));
});

document.querySelectorAll("[data-toggle-password]").forEach((boton) => {
  boton.addEventListener("click", () => {
    const campo = document.querySelector(`#${boton.dataset.togglePassword}`);
    const oculto = campo.type === "password";
    campo.type = oculto ? "text" : "password";
    boton.setAttribute(
      "aria-label",
      oculto ? "Ocultar contraseña" : "Mostrar contraseña"
    );
  });
});

async function redirigirSiHaySesion() {
  try {
    await solicitar("/api/sesion/");
    window.location.replace("/pages/inicio.html");
  } catch (error) {
    return;
  }
}

formularioLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  limpiarMensajes();

  const datos = new FormData(formularioLogin);
  const username = String(datos.get("username") || "").trim();
  const password = String(datos.get("password") || "");

  if (!username || !password) {
    mostrarError(errorLogin, "Debe ingresar el usuario y la contraseña.");
    return;
  }

  const boton = formularioLogin.querySelector('button[type="submit"]');

  try {
    await conBoton(boton, "Verificando...", async () => {
      await asegurarCsrf();
      await solicitar("/api/login/", {
        metodo: "POST",
        cuerpo: { username, password },
      });
    });
    window.location.replace("/pages/inicio.html");
  } catch (error) {
    mostrarError(errorLogin, error.message);
  }
});

formularioRegistro.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  limpiarMensajes();

  const datos = new FormData(formularioRegistro);
  const cuerpo = {
    nombreusuario: String(datos.get("nombreusuario") || "").trim(),
    nombres: String(datos.get("nombres") || "").trim(),
    apellidos: String(datos.get("apellidos") || "").trim(),
    correo: String(datos.get("correo") || "").trim(),
    contrasena: String(datos.get("contrasena") || ""),
    confirmacion: String(datos.get("confirmacion") || ""),
  };

  if (!cuerpo.nombreusuario || !cuerpo.nombres || !cuerpo.apellidos || !cuerpo.correo) {
    mostrarError(errorRegistro, "Complete todos los campos para crear la cuenta.");
    return;
  }

  if (cuerpo.contrasena !== cuerpo.confirmacion) {
    mostrarError(errorRegistro, "Las contraseñas no coinciden.");
    return;
  }

  const boton = formularioRegistro.querySelector('button[type="submit"]');

  try {
    await conBoton(boton, "Creando cuenta...", () =>
      solicitar("/api/registro/", { metodo: "POST", cuerpo })
    );

    formularioRegistro.reset();
    document.querySelector("#usuario").value = cuerpo.nombreusuario;
    mostrarPanel("login");
    mostrarAviso(
      avisoLogin,
      "Cuenta creada correctamente. Ya puede iniciar sesión."
    );
  } catch (error) {
    mostrarError(errorRegistro, error.message);
  }
});

redirigirSiHaySesion();
