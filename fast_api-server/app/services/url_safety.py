"""Saved-link URL checks (DG-B18). Literal private/loopback/link-local/metadata addresses are always rejected.
Live DNS resolution is checked in live mode only; mock mode makes no network calls."""
import ipaddress
import socket
from urllib.parse import urlsplit, urlunsplit

from app.utils.errors import ApiError

BLOCKED_HOSTS = {"localhost", "metadata.google.internal", "metadata"}
TRACKING = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"}


def canonicalise(url: str) -> str:
    p = urlsplit(url.strip())
    host = (p.hostname or "").lower()
    port = f":{p.port}" if p.port and not (p.scheme == "https" and p.port == 443 or p.scheme == "http" and p.port == 80) else ""
    query = "&".join(q for q in sorted(p.query.split("&")) if q and q.split("=")[0] not in TRACKING)
    path = p.path.rstrip("/") or "/"
    return urlunsplit((p.scheme.lower(), host + port, path, query, ""))


def _blocked_ip(ip) -> bool:
    return ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified


def validate(url: str, resolve: bool = False):
    try:
        p = urlsplit(url.strip())
    except ValueError as exc:
        raise ApiError(422, "VALIDATION_ERROR", "That link is not valid.") from exc
    if p.scheme not in ("http", "https") or not p.hostname:
        raise ApiError(422, "VALIDATION_ERROR", "Only http and https links can be saved.")
    host = p.hostname.lower()
    if host in BLOCKED_HOSTS or host.endswith(".internal"):
        raise ApiError(422, "VALIDATION_ERROR", "That address is not allowed.")
    try:
        if _blocked_ip(ipaddress.ip_address(host)):
            raise ApiError(422, "VALIDATION_ERROR", "That address is not allowed.")
    except ValueError:
        pass  # a hostname, not a literal IP
    if resolve:
        try:
            for info in socket.getaddrinfo(host, None):
                if _blocked_ip(ipaddress.ip_address(info[4][0])):
                    raise ApiError(422, "VALIDATION_ERROR", "That address is not allowed.")
        except socket.gaierror as exc:
            raise ApiError(422, "VALIDATION_ERROR", "That address could not be resolved.") from exc
    return canonicalise(url)


def fetch(url: str, timeout_s: float = 15.0, max_bytes: int = 5 * 1024 * 1024, max_redirects: int = 5) -> dict:
    """Safe GET (DG-B18): every hop is validated (DNS included), TLS is verified, at most 5 redirects and 5 MB.

    Returns {"final_url", "content_type", "body"} with body as text. Raises ApiError on anything unsafe or oversized.
    """
    import httpx

    current = url
    with httpx.Client(timeout=timeout_s, follow_redirects=False, verify=True, headers={"User-Agent": "DayGraph-LinkSaver/1.0"}) as client:
        for _ in range(max_redirects + 1):
            current = validate(current, resolve=True)
            try:
                with client.stream("GET", current) as resp:
                    if resp.is_redirect:
                        location = resp.headers.get("location")
                        if not location:
                            raise ApiError(422, "VALIDATION_ERROR", "The page redirected nowhere.")
                        current = str(resp.url.join(location))
                        continue
                    if resp.status_code >= 400:
                        raise ApiError(422, "VALIDATION_ERROR", f"The page answered with status {resp.status_code}.")
                    chunks, size = [], 0
                    for chunk in resp.iter_bytes():
                        size += len(chunk)
                        if size > max_bytes:
                            raise ApiError(422, "VALIDATION_ERROR", "The page is larger than 5 MB.")
                        chunks.append(chunk)
                    charset = resp.encoding or "utf-8"
                    return {"final_url": current, "content_type": resp.headers.get("content-type", ""),
                            "body": b"".join(chunks).decode(charset, errors="replace")}
            except httpx.HTTPError as exc:
                raise ApiError(422, "VALIDATION_ERROR", "The page could not be fetched.") from exc
    raise ApiError(422, "VALIDATION_ERROR", "Too many redirects.")
