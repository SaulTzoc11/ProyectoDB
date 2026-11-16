import { asegurarCsrf, solicitar } from "../api.js";

const formulario = document.querySelector("#formularioLogin");
const campoContrasena = document.querySelector("#contrasena");
const mensajeError = document.querySelector("#errorLogin");
const boton = formulario.querySelector('button[type="submit"]');

document.querySelector("#mostrarContrasena").addEventListener("click", () => {
  campoContrasena.type = campoContrasena.type === "password" ? "text" : "password";
});

async function redirigirSiHaySesion() {
  try {
    await solicitar("/api/sesion/");
    window.location.replace("/pages/inicio.html");
  } catch (error) {
    return;
  }
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensajeError.textContent = "";

  const datos = new FormData(formulario);
  const username = String(datos.get("username") || "").trim();
  const password = String(datos.get("password") || "");

  if (!username || !password) {
    mensajeError.textContent = "Debe ingresar el usuario y la contraseña.";
    return;
  }

  boton.disabled = true;
  boton.textContent = "Verificando...";

  try {
    await asegurarCsrf();
    await solicitar("/api/login/", { metodo: "POST", cuerpo: { username, password } });
    window.location.replace("/pages/inicio.html");
  } catch (error) {
    mensajeError.textContent = error.message;
  } finally {
    boton.disabled = false;
    boton.innerHTML = "Ingresar al sistema <span>&rarr;</span>";
  }
});

redirigirSiHaySesion();
