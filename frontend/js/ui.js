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
