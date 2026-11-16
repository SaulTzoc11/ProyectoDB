import { obtenerLista, solicitar } from "../api.js";
import { iniciarPagina } from "../sesion.js";
import { clonarPlantilla, llenar, mostrarAviso, vaciar } from "../ui.js";

const contenedorFormulario = document.querySelector("#contenedorFormulario");
const lista = document.querySelector("#listaUsuarios");
const mensajePagina = document.querySelector("#mensajePagina");

let usuarios = [];
let roles = [];

function escribir(id, valor) {
  document.querySelector(id).textContent = valor;
}

function cerrarFormulario() {
  contenedorFormulario.classList.add("hidden");
  vaciar(contenedorFormulario);
}

function abrirFormulario(usuario = null) {
  const nodo = clonarPlantilla("plantillaFormularioUsuario");
  const formulario = nodo.querySelector("form");
  const mensaje = nodo.querySelector(".user-form-error");
  const edicion = usuario !== null;

  llenar(nodo, {
    titulo: edicion ? "Editar usuario" : "Nuevo usuario",
    descripcion: edicion
      ? "Modifique los datos y el rol del usuario."
      : "Complete los datos para crear un acceso al sistema.",
    etiquetaContrasena: edicion ? "Nueva contraseña (opcional)" : "Contraseña *",
  });

  const selectorRol = formulario.elements.idrol;
  selectorRol.add(new Option("Seleccione un rol", ""));
  roles.forEach((rol) => selectorRol.add(new Option(rol.nombre, rol.idrol)));

  if (edicion) {
    ["nombres", "apellidos", "correo", "nombreusuario"].forEach((campo) => {
      formulario.elements[campo].value = usuario[campo];
    });
    selectorRol.value = usuario.idrol;
    formulario.elements.activo.checked = usuario.activo;
  } else {
    formulario.elements.contrasena.required = true;
  }

  const cerrar = () => cerrarFormulario();
  nodo.querySelector('[data-accion="cerrar"]').addEventListener("click", cerrar);
  nodo.querySelector('[data-accion="cancelar"]').addEventListener("click", cerrar);

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    mensaje.textContent = "";

    const datos = {
      nombres: formulario.elements.nombres.value.trim(),
      apellidos: formulario.elements.apellidos.value.trim(),
      correo: formulario.elements.correo.value.trim(),
      nombreusuario: formulario.elements.nombreusuario.value.trim(),
      idrol: formulario.elements.idrol.value,
      activo: formulario.elements.activo.checked,
    };
    if (formulario.elements.contrasena.value) {
      datos.contrasena = formulario.elements.contrasena.value;
    }

    const boton = nodo.querySelector('[data-accion="guardar"]');
    boton.disabled = true;

    try {
      await solicitar(edicion ? `/api/usuarios/${usuario.idusuario}/` : "/api/usuarios/", {
        metodo: edicion ? "PATCH" : "POST",
        cuerpo: datos,
      });
      mostrarAviso(edicion ? "Usuario actualizado correctamente." : "Usuario creado correctamente.");
      cerrarFormulario();
      await cargar();
    } catch (error) {
      mensaje.textContent = error.message;
    } finally {
      boton.disabled = false;
    }
  });

  contenedorFormulario.replaceChildren(nodo);
  contenedorFormulario.classList.remove("hidden");
  contenedorFormulario.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function cambiarEstado(usuario) {
  try {
    if (usuario.activo) {
      await solicitar(`/api/usuarios/${usuario.idusuario}/`, { metodo: "DELETE" });
    } else {
      await solicitar(`/api/usuarios/${usuario.idusuario}/activar/`, { metodo: "POST" });
    }
    mostrarAviso(usuario.activo ? "Usuario desactivado." : "Usuario activado.");
    await cargar();
  } catch (error) {
    mostrarAviso(error.message);
  }
}

function crearFila(usuario) {
  const fila = clonarPlantilla("plantillaUsuario");
  const nombreCompleto = `${usuario.nombres} ${usuario.apellidos}`.trim();

  llenar(fila, {
    inicial: nombreCompleto.charAt(0).toUpperCase(),
    nombreCompleto,
    correo: usuario.correo,
    usuario: usuario.nombreusuario,
    rol: usuario.rol_nombre || "Sin rol",
    estado: usuario.activo ? "Activo" : "Inactivo",
  });

  fila.querySelector('[data-elemento="estado"]').className = usuario.activo
    ? "active-badge"
    : "inactive-badge";

  const botonEstado = fila.querySelector('[data-accion="estado"]');
  botonEstado.textContent = usuario.activo ? "Desactivar" : "Activar";
  botonEstado.addEventListener("click", () => cambiarEstado(usuario));
  fila.querySelector('[data-accion="editar"]').addEventListener("click", () => abrirFormulario(usuario));

  return fila;
}

async function cargar() {
  try {
    [usuarios, roles] = await Promise.all([
      solicitar("/api/usuarios/").then(obtenerLista),
      solicitar("/api/roles/").then(obtenerLista),
    ]);
  } catch (error) {
    mensajePagina.textContent = error.message;
    return;
  }

  escribir("#totalActivos", usuarios.filter((u) => u.activo).length);
  escribir("#totalUsuarios", usuarios.length);
  escribir("#totalRoles", roles.length);

  vaciar(lista);
  if (!usuarios.length) {
    lista.append(llenar(clonarPlantilla("plantillaEstadoVacio"), { titulo: "No hay usuarios registrados." }));
    return;
  }
  lista.append(...usuarios.map(crearFila));
}

await iniciarPagina({ roles: ["Gerente"] });
document.querySelector("#nuevoUsuario").addEventListener("click", () => abrirFormulario());
cargar();
