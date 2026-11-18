const formatoMoneda = new Intl.NumberFormat("es-GT", {
  style: "currency",
  currency: "GTQ",
  currencyDisplay: "narrowSymbol",
});

let temporizadorAviso = null;

export function formatearQuetzales(valor) {
  return formatoMoneda.format(Number(valor) || 0);
}

export function mostrarAviso(texto) {
  const aviso = document.querySelector("#aviso");
  if (!aviso) return;

  aviso.textContent = texto;
  aviso.classList.add("show");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => aviso.classList.remove("show"), 2600);
}

/**
 * Ventana de confirmación propia (reemplaza window.confirm).
 * Devuelve una promesa que resuelve true si el usuario acepta.
 */
export function confirmar({
  titulo = "¿Desea continuar?",
  mensaje = "",
  detalle = "",
  aceptar = "Aceptar",
  cancelar = "Cancelar",
  tono = "green",
} = {}) {
  return new Promise((resolver) => {
    const dialogo = document.createElement("dialog");
    dialogo.className = `dialogo confirmacion confirmacion-${tono}`;

    const formulario = document.createElement("form");
    formulario.method = "dialog";

    const icono = document.createElement("div");
    icono.className = "confirmacion-icono";
    icono.textContent = tono === "wine" ? "!" : "✓";

    const encabezado = document.createElement("h3");
    encabezado.textContent = titulo;
    formulario.append(icono, encabezado);

    if (mensaje) {
      const parrafo = document.createElement("p");
      parrafo.textContent = mensaje;
      formulario.append(parrafo);
    }
    if (detalle) {
      const nota = document.createElement("p");
      nota.className = "confirmacion-detalle";
      nota.textContent = detalle;
      formulario.append(nota);
    }

    const fila = document.createElement("div");
    fila.className = "button-row";
    const botonCancelar = document.createElement("button");
    botonCancelar.value = "no";
    botonCancelar.className = "action-button ghost";
    botonCancelar.textContent = cancelar;
    const botonAceptar = document.createElement("button");
    botonAceptar.value = "si";
    botonAceptar.className = `action-button ${tono}`;
    botonAceptar.textContent = aceptar;
    fila.append(botonCancelar, botonAceptar);
    formulario.append(fila);
    dialogo.append(formulario);

    // Clic fuera de la tarjeta = cancelar.
    dialogo.addEventListener("click", (evento) => {
      if (evento.target === dialogo) dialogo.close("no");
    });
    dialogo.addEventListener("close", () => {
      resolver(dialogo.returnValue === "si");
      dialogo.remove();
    });

    document.body.append(dialogo);
    dialogo.showModal();
    botonAceptar.focus();
  });
}

export function clonarPlantilla(id) {
  return document.querySelector(`#${id}`).content.firstElementChild.cloneNode(true);
}

export function llenar(nodo, valores) {
  Object.entries(valores).forEach(([campo, valor]) => {
    nodo.querySelectorAll(`[data-campo="${campo}"]`).forEach((destino) => {
      destino.textContent = valor ?? "";
    });
  });
  return nodo;
}

export function vaciar(contenedor) {
  contenedor.replaceChildren();
}

export function mostrarEstadoVacio(contenedor, titulo, detalle) {
  const nodo = clonarPlantilla("plantillaEstadoVacio");
  llenar(nodo, { titulo, detalle });
  contenedor.replaceChildren(nodo);
}
