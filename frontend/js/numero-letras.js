// Convierte un monto a letras en quetzales: 105.5 -> "CIENTO CINCO QUETZALES CON 50/100".
const UNIDADES = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho",
  "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco",
  "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const DECENAS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CENTENAS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
  "seiscientos", "setecientos", "ochocientos", "novecientos"];

function menorQueMil(n) {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  let texto = CENTENAS[c];
  if (resto) {
    const parte = resto < 30
      ? UNIDADES[resto]
      : DECENAS[Math.floor(resto / 10)] + (resto % 10 ? ` y ${UNIDADES[resto % 10]}` : "");
    texto = texto ? `${texto} ${parte}` : parte;
  }
  return texto;
}

function entero(n) {
  if (n === 0) return "cero";
  const millones = Math.floor(n / 1e6);
  const miles = Math.floor((n % 1e6) / 1000);
  const resto = n % 1000;
  const partes = [];
  if (millones) partes.push(millones === 1 ? "un millón" : `${entero(millones)} millones`);
  if (miles) partes.push(miles === 1 ? "mil" : `${menorQueMil(miles)} mil`);
  if (resto) partes.push(menorQueMil(resto));
  // "veintiuno mil" -> "veintiún mil", "uno" final se queda.
  return partes.join(" ").replace(/veintiuno mil/g, "veintiún mil").replace(/\buno mil/g, "un mil");
}

export function montoEnLetras(valor) {
  const centavosTotales = Math.round((Number(valor) || 0) * 100);
  const quetzales = Math.floor(centavosTotales / 100);
  const centavos = String(centavosTotales % 100).padStart(2, "0");
  let texto = entero(quetzales);
  if (texto.endsWith("uno")) texto = texto.slice(0, -1); // "un quetzal", "veintiún quetzales"
  if (texto.endsWith("veintiun")) texto = texto.replace(/veintiun$/, "veintiún");
  let moneda = quetzales === 1 ? "quetzal" : "quetzales";
  if (quetzales && quetzales % 1e6 === 0) moneda = `de ${moneda}`; // "un millón de quetzales"
  return `${texto} ${moneda} con ${centavos}/100`.toUpperCase();
}
