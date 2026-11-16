const MENSAJE_GENERICO = "No se pudo completar la operación.";

export class ErrorApi extends Error {
  constructor(mensaje, estado, datos) {
    super(mensaje);
    this.estado = estado;
    this.datos = datos;
  }
}

function leerCookie(nombre) {
  const par = document.cookie
    .split("; ")
    .find((fila) => fila.startsWith(`${nombre}=`));
  return par ? decodeURIComponent(par.split("=")[1]) : "";
}

export function extraerMensaje(datos) {
  if (!datos) return MENSAJE_GENERICO;
  if (typeof datos === "string") return datos;
  if (datos.mensaje) return datos.mensaje;
  if (datos.detail) return datos.detail;

  const partes = Object.entries(datos).map(([campo, mensajes]) => {
    const texto = Array.isArray(mensajes) ? mensajes.join(", ") : mensajes;
    return `${campo}: ${texto}`;
  });

  return partes.length ? partes.join(" | ") : MENSAJE_GENERICO;
}

export async function asegurarCsrf() {
  if (leerCookie("csrftoken")) return;
  await fetch("/api/csrf/", { credentials: "same-origin" });
}

export async function solicitar(ruta, { metodo = "GET", cuerpo } = {}) {
  const opciones = { method: metodo, credentials: "same-origin", headers: {} };

  if (metodo !== "GET") {
    await asegurarCsrf();
    opciones.headers["X-CSRFToken"] = leerCookie("csrftoken");
  }

  if (cuerpo !== undefined) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(cuerpo);
  }

  const respuesta = await fetch(ruta, opciones);
  let datos = null;

  try {
    datos = await respuesta.json();
  } catch (error) {
    datos = null;
  }

  if (!respuesta.ok) {
    throw new ErrorApi(extraerMensaje(datos), respuesta.status, datos);
  }

  return datos;
}

export function obtenerLista(datos) {
  return Array.isArray(datos) ? datos : datos?.results || [];
}


export function guardarCotizacion({ idCliente, observaciones, lineas, tokensDescuento }) {
  return solicitar("/api/cotizaciones/generar/", {
    metodo: "POST",
    cuerpo: { idCliente, observaciones, detalle: lineas, tokensDescuento },
  });
}

export function facturarVenta(cuerpo) {
  return solicitar("/api/facturas/", { metodo: "POST", cuerpo });
}