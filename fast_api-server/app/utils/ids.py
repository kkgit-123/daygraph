import os
import time

_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def _ulid() -> str:
    """26 char Crockford base32: 48 bit millisecond time + 80 bit randomness."""
    n = (int(time.time() * 1000) << 80) | int.from_bytes(os.urandom(10), "big")
    out = []
    for _ in range(26):
        out.append(_ALPHABET[n & 31])
        n >>= 5
    return "".join(reversed(out))


def new_id(prefix: str) -> str:
    """Prefixed ULID, e.g. new_id('tsk') -> 'tsk_01J...'. The only id generator in the app."""
    return f"{prefix}_{_ulid()}"
