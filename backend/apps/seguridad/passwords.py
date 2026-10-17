import hashlib
import hmac

from django.contrib.auth.hashers import check_password, identify_hasher, make_password

PREFIJO_LEGADO = "PBKDF2-SHA512$"


def _hash_legado(contrasena, sal, iteraciones):
    resultado = hashlib.sha512(sal + contrasena.encode("utf-16-le")).digest()
    for _ in range(iteraciones):
        resultado = hashlib.sha512(resultado + sal).digest()
    return resultado


def _verificar_legado(contrasena, almacenado):
    try:
        _, iteraciones, sal_hex, hash_hex = almacenado.split("$")
        esperado = bytes.fromhex(hash_hex)
        calculado = _hash_legado(
            contrasena, bytes.fromhex(sal_hex), int(iteraciones)
        )
    except ValueError:
        return False
    return hmac.compare_digest(calculado, esperado)


def es_formato_django(almacenado):
    if "$" not in almacenado:
        return False
    try:
        identify_hasher(almacenado)
    except ValueError:
        return False
    return True


def es_formato_legado(almacenado):
    return almacenado.startswith(PREFIJO_LEGADO)


def cifrar(contrasena):
    return make_password(contrasena)


def verificar(contrasena, almacenado):
    """Devuelve (coincide, requiere_actualizar)."""
    if not almacenado:
        return False, False

    if es_formato_legado(almacenado):
        return _verificar_legado(contrasena, almacenado), True

    if es_formato_django(almacenado):
        return check_password(contrasena, almacenado), False

    return False, False
