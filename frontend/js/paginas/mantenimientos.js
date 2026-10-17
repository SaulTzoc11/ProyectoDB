import { ErrorApi, obtenerLista, solicitar } from "../api.js";
import { grupos, tablas, titulos } from "../config/mantenimientos.js";
import { iniciarPagina } from "../sesion.js";
import {
  clonarPlantilla,
  llenar,
  mostrarAviso,
  mostrarEstadoVacio,
  vaciar,
} from "../ui.js";

const NOMBRES_RELACIONADOS = {
  idmarca: "marca_nombre",
  idcategoria: "categoria_nombre",
  idproductogeneral: "producto_general_nombre",
  idpresentacion: "presentacion_nombre",
  idcolor: "color_nombre",
  idtipoprecio: "tipo_precio_nombre",
  idproducto: "producto_nombre",
  idestado: "estado_nombre",
  idtipocliente: "tipo_cliente_nombre",
};

const MAXIMO_COLUMNAS = 5;

const seccionTablas = document.querySelector("#seccionTablas");
const seccionTabla = document.querySelector("#seccionTabla");
const formulario = document.querySelector("#formularioRegistro");
const contenedorCampos = document.querySelector("#camposFormulario");
const mensajeFormulario = document.querySelector("#mensajeFormulario");
const botonGuardar = document.querySelector("#guardar");
const botonCancelar = document.querySelector("#cancelarEdicion");
const contenedorRegistros = document.querySelector("#registros");

let nombreTabla = null;
let configuracion = null;
let registros = [];
let idEdicion = null;

function formatearTitulo(nombre) {
  return titulos[nombre] || nombre;
}

function mostrarGrupos() {
  const contenedor = document.querySelector("#gruposTablas");

  contenedor.append(
    ...Object.entries(grupos).map(([nombreGrupo, nombresTablas]) => {
      const grupo = clonarPlantilla("plantillaGrupo");
      llenar(grupo, { nombre: nombreGrupo });

      grupo.querySelector('[data-elemento="tablas"]').append(
        ...nombresTablas.map((tabla) => {
          const disponible = Boolean(tablas[tabla]);
          const nodo = clonarPlantilla(
            disponible ? "plantillaEnlaceTabla" : "plantillaTablaNoDisponible"
          );
          llenar(nodo, { nombre: formatearTitulo(tabla) });
          if (disponible) nodo.href = `/pages/mantenimientos.html?tabla=${tabla}`;
          return nodo;
        })
      );

      return grupo;
    })
  );

  seccionTablas.hidden = false;
}

function crearEtiqueta(campo) {
  return campo.requerido ? `${campo.etiqueta} *` : campo.etiqueta;
}

async function crearCampo(campo, valor) {
  if (campo.tipo === "checkbox") {
    const nodo = clonarPlantilla("plantillaCampoCasilla");
    const casilla = nodo.querySelector("input");
    casilla.name = campo.nombre;
    casilla.checked = valor === undefined ? true : Boolean(valor);
    nodo.querySelector("span").textContent = campo.etiqueta;
    return nodo;
  }

  const plantilla =
    campo.tipo === "textarea"
      ? "plantillaCampoAreaTexto"
      : campo.tipo === "select"
        ? "plantillaCampoSeleccion"
        : "plantillaCampoTexto";

  const nodo = clonarPlantilla(plantilla);
  const control = nodo.querySelector("input, textarea, select");
  const etiqueta = nodo.querySelector("label");
  const identificador = `campo_${campo.nombre}`;

  etiqueta.textContent = crearEtiqueta(campo);
  etiqueta.htmlFor = identificador;
  control.id = identificador;
  control.name = campo.nombre;
  if (campo.requerido) control.required = true;

  if (campo.tipo === "select") {
    control.add(new Option("Seleccione una opción", ""));
    const opciones = obtenerLista(await solicitar(campo.origen));
    opciones.forEach((opcion) =>
      control.add(new Option(opcion[campo.claveEtiqueta], opcion[campo.claveValor]))
    );
    control.value = valor ?? "";
    return nodo;
  }

  if (campo.tipo && campo.tipo !== "textarea") control.type = campo.tipo;
  if (campo.paso) control.step = campo.paso;
  if (campo.ejemplo) control.placeholder = campo.ejemplo;
  control.value = valor ?? "";

  return nodo;
}

async function dibujarFormulario(registro = null) {
  idEdicion = registro ? registro[configuracion.llavePrimaria] : null;
  mensajeFormulario.textContent = "";
  document.querySelector("#tituloFormulario").textContent = registro
    ? "Editar registro"
    : "Nuevo registro";
  botonGuardar.textContent = registro ? "Guardar cambios" : "Guardar registro";
  botonCancelar.hidden = !registro;

  vaciar(contenedorCampos);
  const campos = await Promise.all(
    configuracion.campos.map((campo) => crearCampo(campo, registro?.[campo.nombre]))
  );
  contenedorCampos.append(...campos);
}

function leerFormulario() {
  const datos = {};

  configuracion.campos.forEach((campo) => {
    const control = formulario.elements[campo.nombre];
    if (!control) return;

    if (campo.tipo === "checkbox") datos[campo.nombre] = control.checked;
    else if (campo.tipo === "number") datos[campo.nombre] = control.value === "" ? null : Number(control.value);
    else if (campo.tipo === "select") datos[campo.nombre] = control.value === "" ? null : control.value;
    else datos[campo.nombre] = control.value.trim();
  });

  return datos;
}

function valorMostrado(registro, campo) {
  const relacionado = NOMBRES_RELACIONADOS[campo.nombre];
  const valor =
    relacionado && registro[relacionado] !== undefined
      ? registro[relacionado]
      : registro[campo.nombre];

  if (campo.tipo === "checkbox") return valor ? "Activo" : "Inactivo";
  if (valor === null || valor === undefined || valor === "") return "—";
  return valor;
}

function crearFila(registro, campos, tieneActivo) {
  const fila = clonarPlantilla("plantillaFilaRegistro");
  const acciones = fila.querySelector('[data-elemento="acciones"]');

  fila.prepend(
    ...campos.map((campo) => {
      const celda = document.createElement("td");
      celda.textContent = valorMostrado(registro, campo);
      return celda;
    })
  );

  const id = registro[configuracion.llavePrimaria];
  const botonActivar = acciones.querySelector('[data-accion="activar"]');
  const botonEliminar = acciones.querySelector('[data-accion="eliminar"]');

  botonEliminar.textContent = tieneActivo ? "Desactivar" : "Eliminar";
  if (tieneActivo && registro.activo === false) {
    botonActivar.hidden = false;
    botonEliminar.hidden = true;
  }

  acciones.querySelector('[data-accion="editar"]').addEventListener("click", async () => {
    await dibujarFormulario(registro);
    formulario.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  botonActivar.addEventListener("click", () => cambiarEstado(id, "activar"));
  botonEliminar.addEventListener("click", () => eliminar(id, tieneActivo));

  return fila;
}

function dibujarRegistros() {
  llenar(seccionTabla, { total: `${registros.length} registro(s)` });

  if (!registros.length) {
    mostrarEstadoVacio(contenedorRegistros, "No hay registros", "Use el formulario para crear el primero.");
    return;
  }

  const campos = configuracion.campos.slice(0, MAXIMO_COLUMNAS);
  const tieneActivo = configuracion.campos.some((campo) => campo.nombre === "activo");

  const tabla = clonarPlantilla("plantillaTablaRegistros");
  const encabezados = tabla.querySelector('[data-elemento="encabezados"]');
  encabezados.append(
    ...[...campos.map((c) => c.etiqueta), "Acciones"].map((texto) => {
      const th = document.createElement("th");
      th.textContent = texto;
      return th;
    })
  );
  tabla.querySelector('[data-elemento="filas"]').append(
    ...registros.map((registro) => crearFila(registro, campos, tieneActivo))
  );

  contenedorRegistros.replaceChildren(tabla);
}

async function cargarRegistros() {
  contenedorRegistros.textContent = "Cargando registros...";
  try {
    registros = obtenerLista(await solicitar(configuracion.ruta));
    dibujarRegistros();
  } catch (error) {
    mostrarEstadoVacio(contenedorRegistros, "No se pudieron cargar los registros", error.message);
  }
}

async function guardar(evento) {
  evento.preventDefault();
  mensajeFormulario.textContent = "";
  const edicion = idEdicion !== null;
  botonGuardar.disabled = true;
  botonGuardar.textContent = "Guardando...";

  try {
    await solicitar(edicion ? `${configuracion.ruta}${idEdicion}/` : configuracion.ruta, {
      metodo: edicion ? "PATCH" : "POST",
      cuerpo: leerFormulario(),
    });
    mostrarAviso(edicion ? "Registro actualizado correctamente." : "Registro creado correctamente.");
    await dibujarFormulario();
    await cargarRegistros();
  } catch (error) {
    mensajeFormulario.textContent = error.message;
  } finally {
    botonGuardar.disabled = false;
    botonGuardar.textContent = idEdicion !== null ? "Guardar cambios" : "Guardar registro";
  }
}

async function eliminar(id, tieneActivo) {
  const mensaje = tieneActivo
    ? "¿Desea desactivar este registro?"
    : "¿Desea eliminar este registro? Esta acción no se puede deshacer.";
  if (!window.confirm(mensaje)) return;

  try {
    await solicitar(`${configuracion.ruta}${id}/`, { metodo: "DELETE" });
    mostrarAviso(tieneActivo ? "Registro desactivado." : "Registro eliminado.");
    await cargarRegistros();
  } catch (error) {
    mostrarAviso(error instanceof ErrorApi ? error.message : "No se pudo completar la operación.");
  }
}

async function cambiarEstado(id, accion) {
  try {
    await solicitar(`${configuracion.ruta}${id}/${accion}/`, { metodo: "POST" });
    mostrarAviso("Registro activado.");
    await cargarRegistros();
  } catch (error) {
    mostrarAviso(error.message);
  }
}

async function abrirTabla(nombre) {
  nombreTabla = nombre;
  configuracion = tablas[nombre];
  llenar(seccionTabla, { titulo: formatearTitulo(nombre) });

  if (document.body.dataset.tabla) document.querySelector("#volverTablas").hidden = true;

  seccionTabla.hidden = false;
  await dibujarFormulario();
  await cargarRegistros();
}

await iniciarPagina();

formulario.addEventListener("submit", guardar);
botonCancelar.addEventListener("click", () => dibujarFormulario());

const solicitada =
  document.body.dataset.tabla || new URLSearchParams(window.location.search).get("tabla");

if (solicitada && tablas[solicitada]) {
  abrirTabla(solicitada);
} else {
  mostrarGrupos();
}
