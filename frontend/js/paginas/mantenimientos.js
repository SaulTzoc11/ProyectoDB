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
  
  idestante: "estante_nombre",
  idlote: "lote_nombre",
  idtipomovimiento: "tipo_movimiento_nombre",
  idusuario: "usuario_nombre",
  idaccion: "accion_nombre",
  idtabla: "tabla_nombre",
  idproveedor: "proveedor_nombre",
  idcliente: "cliente_nombre",
  idcompra: "compra_codigo",
  identrega: "entrega_codigo",
  iddetallecompra: "detalle_compra_nombre",
  idcotizacion: "cotizacion_codigo",
  idfactura: "factura_numero",
  idtipopago: "tipo_pago_nombre",
  idmotivo: "motivo_nombre",
  iddetallefactura: "detalle_factura_nombre",
  iddevolucion: "devolucion_codigo",

};

const MAXIMO_COLUMNAS = 6;
const modoConsultas = document.body.dataset.modo === "consultas";

const seccionTablas = document.querySelector("#seccionTablas");
const seccionTabla = document.querySelector("#seccionTabla");
const formulario = document.querySelector("#formularioRegistro");
const contenedorCampos = document.querySelector("#camposFormulario");
const mensajeFormulario = document.querySelector("#mensajeFormulario");
const botonGuardar = document.querySelector("#guardar");
const botonCancelar = document.querySelector("#cancelarEdicion");
const contenedorRegistros = document.querySelector("#registros");
const buscador = document.querySelector("#buscarRegistros");

let contadorPeticiones = 0;
let temporizadorBusqueda = null;
let nombreTabla = null;
let configuracion = null;
let registros = [];
let idEdicion = null;

function formatearTitulo(nombre) {
  return titulos[nombre] || nombre;
}


function mostrarGrupos() {
  const contenedor = document.querySelector("#gruposTablas");

  const visibles = Object.entries(grupos)
    .map(([nombreGrupo, nombres]) => [
      nombreGrupo,
      nombres.filter((nombre) =>
        Boolean(tablas[nombre]) &&
        !["ROL", "USUARIO"].includes(nombre) &&
        Boolean(tablas[nombre].soloLectura) === modoConsultas
      )
    ])
    .filter(([, nombres]) => nombres.length > 0);

  contenedor.replaceChildren(
    ...visibles.map(([nombreGrupo, nombresTablas]) => {
      const grupo = clonarPlantilla("plantillaGrupo");

      llenar(grupo, { nombre: nombreGrupo });

      const contenedorTablas = grupo.querySelector(
        '[data-elemento="tablas"]'
      );

      nombresTablas.forEach((tabla) => {
        const enlace = clonarPlantilla("plantillaEnlaceTabla");

        llenar(enlace, { nombre: formatearTitulo(tabla) });

        const pagina = modoConsultas
          ? "consultas"
          : "mantenimientos";

        enlace.href = `/pages/${pagina}.html?tabla=${tabla}`;
        contenedorTablas.append(enlace);
      });

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

    const opciones = campo.opciones
      ? campo.opciones.map((texto) => ({
          valor: texto,
          etiqueta: texto
        }))
      : obtenerLista(await solicitar(campo.origen)).map((item) => ({
          valor: item[campo.claveValor],
          etiqueta: item[campo.claveEtiqueta]
        }));

    opciones
      .filter((opcion) =>
        !campo.permitidos ||
        campo.permitidos.some(
          (permitido) =>
            permitido.toLocaleLowerCase() ===
            String(opcion.etiqueta).toLocaleLowerCase()
        )
      )
      .forEach((opcion) => {
        control.add(
          new Option(opcion.etiqueta, opcion.valor)
        );
      });

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
  if (configuracion.noCrear && !registro) {
    formulario.hidden = true;
    return;
  }

  formulario.hidden = false;
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
  if (
    /^fecha/i.test(campo.nombre) &&
    typeof valor === "string"
  ) {
    const fecha = new Date(valor);

    if (!Number.isNaN(fecha.getTime())) {
      return fecha.toLocaleString("es-GT", {
        dateStyle: "short",
        timeStyle: "short"
      });
    }
  }
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
  
  if (configuracion.soloLectura) {
    if (configuracion.detalleTabla) {
      const enlace = document.createElement("a");

      enlace.className = "action-button";
      enlace.textContent = "Ver detalle";

      const id = registro[configuracion.llavePrimaria];

      enlace.href =
        `/pages/consultas.html?tabla=${configuracion.detalleTabla}` +
        `&padre=${encodeURIComponent(id)}`;

      acciones.replaceChildren(enlace);

    } else {
      acciones.remove();
    }

    return fila;
  }

  const id = registro[configuracion.llavePrimaria];
  const botonActivar = acciones.querySelector('[data-accion="activar"]');
  const botonEliminar = acciones.querySelector('[data-accion="eliminar"]');
  if (configuracion.permitirEliminar === false) {
    botonEliminar.hidden = true;
  }
  if (configuracion.permitirCambiarEstado === false) {
    botonEliminar.hidden = true;
    botonActivar.hidden = true;
  }

  botonEliminar.textContent = tieneActivo ? "Desactivar" : "Eliminar";
  if (tieneActivo && registro.activo === false && configuracion.permitirCambiarEstado !== false) {
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
  const termino = buscador.value.trim().toLocaleLowerCase();

  const busquedaServidor =
    configuracion.soloLectura ||
    ["PRODUCTO", "PRECIO"].includes(nombreTabla);

  const visibles = busquedaServidor || !termino
    ? registros
    : registros.filter((registro) =>
        configuracion.campos.some((campo) =>
          String(valorMostrado(registro, campo))
            .toLocaleLowerCase()
            .includes(termino)
        )
      );

  llenar(seccionTabla, {
    total: `${visibles.length} registro(s)`
  });

  if (!visibles.length) {
    mostrarEstadoVacio(
      contenedorRegistros,
      "No se encontraron registros",
      "Pruebe con otro nombre o código."
    );
    return;
  }

  const campos = configuracion.campos.slice(0, MAXIMO_COLUMNAS);

  const tieneActivo = configuracion.campos.some(
    (campo) => campo.nombre === "activo"
  );

  const tabla = clonarPlantilla("plantillaTablaRegistros");
  const encabezados = tabla.querySelector(
    '[data-elemento="encabezados"]'
  );

  const mostrarAcciones =
    !configuracion.soloLectura ||
    Boolean(configuracion.detalleTabla);

  const nombresColumnas = [
    ...campos.map((campo) => campo.etiqueta),
    ...(mostrarAcciones ? ["Acciones"] : [])
  ];

  nombresColumnas.forEach((texto) => {
    const th = document.createElement("th");
    th.textContent = texto;
    encabezados.append(th);
  });

  const filas = tabla.querySelector(
    '[data-elemento="filas"]'
  );

  filas.append(
    ...visibles.map((registro) =>
      crearFila(registro, campos, tieneActivo)
    )
  );

  contenedorRegistros.replaceChildren(tabla);
}



async function cargarRegistros() {
  const solicitud = ++contadorPeticiones;
  const url = new URL(configuracion.ruta, location.origin);

  const termino = buscador.value.trim();

  const busquedaServidor =
    configuracion.soloLectura ||
    ["PRODUCTO", "PRECIO"].includes(nombreTabla);

  if (busquedaServidor && termino) {
    url.searchParams.set(
      configuracion.soloLectura ? "q" : "search",
      termino
    );
  }

  const padre = new URLSearchParams(location.search).get("padre");

  if (configuracion.soloLectura && padre) {
    url.searchParams.set("padre", padre);
  }

  contenedorRegistros.textContent = "Cargando registros...";

  try {
    const respuesta = await solicitar(
      url.pathname + url.search
    );

    if (solicitud !== contadorPeticiones) return;

    registros = obtenerLista(respuesta);
    dibujarRegistros();

  } catch (error) {
    if (solicitud !== contadorPeticiones) return;

    mostrarEstadoVacio(
      contenedorRegistros,
      "No se pudieron cargar los registros",
      error.message
    );
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
  document.querySelector("#volverTablas").href =
  modoConsultas
    ? "/pages/consultas.html"
    : "/pages/mantenimientos.html";
  if (document.body.dataset.tabla) document.querySelector("#volverTablas").hidden = true;

  
  seccionTabla.hidden = false;

  if (configuracion.soloLectura) {

    formulario.hidden = true;

    const detalle = seccionTabla.querySelector(
      ".section-heading p"
    );

    if (detalle) {
      detalle.textContent =
        "Consulta de los últimos 200 registros. " +
        "Las operaciones se realizan en el módulo correspondiente.";

      if (configuracion.enlaceOperacion) {

        const enlace = document.createElement("a");

        enlace.className = "action-button";
        enlace.href = configuracion.enlaceOperacion;
        enlace.textContent = "Ir al módulo de operaciones";

        detalle.after(enlace);
      }
    }

  } else {

    formulario.hidden = false;
    await dibujarFormulario();

  }

  await cargarRegistros();

}

await iniciarPagina();
buscador.addEventListener("input", () => {
  clearTimeout(temporizadorBusqueda);

  const busquedaServidor =
    configuracion?.soloLectura ||
    ["PRODUCTO", "PRECIO"].includes(nombreTabla);

  if (busquedaServidor) {
    temporizadorBusqueda = setTimeout(
      cargarRegistros,
      300
    );
  } else if (configuracion) {
    dibujarRegistros();
  }
});
formulario.addEventListener("submit", guardar);
botonCancelar.addEventListener("click", () => dibujarFormulario());

const solicitada =
  document.body.dataset.tabla || new URLSearchParams(window.location.search).get("tabla");

if (
  solicitada &&
  tablas[solicitada] &&
  Boolean(tablas[solicitada].soloLectura) === modoConsultas
) {
  abrirTabla(solicitada);
} else {
  mostrarGrupos();
}
