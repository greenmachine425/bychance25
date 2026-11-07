#!/usr/bin/env python3
"""
Bychance - Lightweight Web Server & API Backend
Runs on Python 3 standard library with zero external dependencies.
"""

import http.server
import socketserver
import os
import re
import sys
import json
import base64
import time
import socket
import mimetypes
import urllib.parse
from pathlib import Path

# Ensure mime types are registered
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("text/html", ".html")
mimetypes.add_type("image/png", ".png")
mimetypes.add_type("image/jpeg", ".jpg")
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("image/svg+xml", ".svg")

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
GALLERY_DIR = BASE_DIR / "gallery"
GALLERY_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB max request payload
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
SAFE_FILENAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$")
ALLOWED_ORIGIN_RE = re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$")


def _is_valid_image_bytes(data: bytes) -> bool:
    """Verify magic bytes for PNG, JPEG, or WebP images."""
    if len(data) < 12:
        return False
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return True
    if data.startswith(b"\xff\xd8\xff"):
        return True
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return True
    return False


class BychanceHandler(http.server.SimpleHTTPRequestHandler):
    server_version = "Bychance"
    sys_version = ""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)

    def _get_allowed_origin(self):
        origin = self.headers.get("Origin", "")
        if origin and ALLOWED_ORIGIN_RE.match(origin):
            return origin
        return None

    def _verify_same_origin(self) -> bool:
        """Protect state-changing endpoints against cross-origin CSRF requests."""
        origin = self.headers.get("Origin")
        if origin:
            return bool(ALLOWED_ORIGIN_RE.match(origin))
        referer = self.headers.get("Referer")
        if referer:
            parsed = urllib.parse.urlparse(referer)
            ref_origin = f"{parsed.scheme}://{parsed.netloc}"
            return bool(ALLOWED_ORIGIN_RE.match(ref_origin))
        return True

    def end_headers(self):
        # Restrictive CORS for local origin only
        allowed_origin = self._get_allowed_origin()
        if allowed_origin:
            self.send_header("Access-Control-Allow-Origin", allowed_origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")

        # Security Headers
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' https: http://127.0.0.1:* http://localhost:*; "
            "font-src 'self' data:; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "frame-ancestors 'none'",
        )
        self.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        super().end_headers()

    def list_directory(self, path):
        # Disable directory listing to prevent information disclosure
        self.send_error(403, "Directory listing is forbidden")
        return None

    def do_OPTIONS(self):
        if self.headers.get("Origin") and not self._get_allowed_origin():
            self.send_error(403, "Forbidden origin")
            return
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        clean_path = parsed_url.path

        # Route API calls
        if clean_path == "/api/status":
            self._handle_status()
            return
        elif clean_path == "/api/gallery":
            self._handle_gallery_list()
            return
        elif clean_path.startswith("/gallery/"):
            # Serve validated files from gallery folder
            rel_file = urllib.parse.unquote(clean_path[len("/gallery/"):])
            if (
                not rel_file
                or "/" in rel_file
                or "\\" in rel_file
                or ".." in rel_file
                or "\x00" in rel_file
                or not SAFE_FILENAME_RE.match(rel_file)
            ):
                self.send_error(400, "Invalid filename")
                return

            file_path = (GALLERY_DIR / rel_file).resolve()
            if (
                file_path.is_file()
                and not file_path.is_symlink()
                and file_path.is_relative_to(GALLERY_DIR.resolve())
                and file_path.suffix.lower() in ALLOWED_IMAGE_EXTENSIONS
            ):
                mime, _ = mimetypes.guess_type(str(file_path))
                self.send_response(200)
                self.send_header("Content-Type", mime or "application/octet-stream")
                self.send_header("Content-Length", str(file_path.stat().st_size))
                self.send_header("Content-Disposition", f'inline; filename="{file_path.name}"')
                self.end_headers()
                with open(file_path, "rb") as f:
                    self.copyfile(f, self.wfile)
                return
            else:
                self.send_error(404, "File not found")
                return

        # Default static file handler serves from PUBLIC_DIR
        super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path == "/api/save-image":
            if not self._verify_same_origin():
                self._send_json(403, {"success": False, "error": "Forbidden cross-origin request"})
                return
            self._handle_save_image()
            return
        self.send_error(404, "Endpoint not found")

    def _handle_status(self):
        data = {
            "name": "Bychance",
            "version": "1.0.0",
            "status": "online",
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}",
            "server_time": time.time(),
            "models_available": [
                "flux-anime",
                "illustrious-xl",
                "animagine-xl",
                "pony-xl",
                "flux",
                "flux-3d",
                "turbo"
            ]
        }
        self._send_json(200, data)

    def _handle_gallery_list(self):
        images = []
        for file in sorted(GALLERY_DIR.glob("*.*"), key=lambda f: f.stat().st_mtime, reverse=True):
            if (
                file.is_file()
                and not file.is_symlink()
                and file.suffix.lower() in ALLOWED_IMAGE_EXTENSIONS
                and SAFE_FILENAME_RE.match(file.name)
            ):
                images.append({
                    "filename": file.name,
                    "url": f"/gallery/{file.name}",
                    "size_bytes": file.stat().st_size,
                    "modified": file.stat().st_mtime
                })
        self._send_json(200, {"count": len(images), "images": images})

    def _handle_save_image(self):
        try:
            content_type = self.headers.get("Content-Type", "")
            if not content_type.lower().startswith("application/json"):
                self._send_json(415, {"success": False, "error": "Content-Type must be application/json"})
                return

            try:
                content_length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                self._send_json(400, {"success": False, "error": "Invalid Content-Length header"})
                return

            if content_length <= 0 or content_length > MAX_UPLOAD_BYTES:
                self._send_json(413, {"success": False, "error": "Payload size out of allowed bounds"})
                return

            raw_body = self.rfile.read(content_length)
            try:
                payload = json.loads(raw_body.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                self._send_json(400, {"success": False, "error": "Malformed JSON payload"})
                return

            if not isinstance(payload, dict):
                self._send_json(400, {"success": False, "error": "JSON payload must be an object"})
                return

            b64_data = payload.get("image_base64", "")
            filename = payload.get("filename", f"anime_{int(time.time())}.png")

            if not isinstance(b64_data, str) or not b64_data.strip():
                self._send_json(400, {"success": False, "error": "Missing or invalid image_base64"})
                return
            if not isinstance(filename, str) or not filename.strip():
                filename = f"anime_{int(time.time())}.png"

            # Sanitize filename strictly
            base_name = os.path.basename(filename)
            safe_name = "".join(c for c in base_name if c.isalnum() or c in "._-").lstrip("._-")
            if not safe_name:
                safe_name = f"anime_{int(time.time())}.png"
            if len(safe_name) > 100:
                safe_name = safe_name[:100]
            if not safe_name.lower().endswith(".png"):
                safe_name += ".png"

            if not SAFE_FILENAME_RE.match(safe_name):
                self._send_json(400, {"success": False, "error": "Invalid filename"})
                return

            # Remove prefix like data:image/png;base64,
            if "," in b64_data:
                b64_data = b64_data.split(",", 1)[1]

            try:
                image_bytes = base64.b64decode(b64_data.strip(), validate=True)
            except Exception:
                self._send_json(400, {"success": False, "error": "Invalid base64 image data"})
                return

            if len(image_bytes) > MAX_UPLOAD_BYTES or not _is_valid_image_bytes(image_bytes):
                self._send_json(400, {"success": False, "error": "Unsupported or corrupted image format"})
                return

            save_path = (GALLERY_DIR / safe_name).resolve()
            if not save_path.is_relative_to(GALLERY_DIR.resolve()):
                self._send_json(400, {"success": False, "error": "Invalid target path"})
                return

            with open(save_path, "wb") as f:
                f.write(image_bytes)

            self._send_json(200, {
                "success": True,
                "filename": safe_name,
                "url": f"/gallery/{safe_name}",
                "size_bytes": len(image_bytes)
            })
        except Exception:
            self._send_json(500, {"success": False, "error": "Internal server error"})

    def _send_json(self, status_code, data):
        body = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        # Sanitize log arguments to prevent CRLF / control character log injection
        safe_args = [re.sub(r"[\r\n\x00-\x1f\x7f]", "_", str(a)) for a in args]
        req_str = safe_args[0] if len(safe_args) > 0 else ""
        status_str = safe_args[1] if len(safe_args) > 1 else ""
        sys.stderr.write(f"[{time.strftime('%H:%M:%S')}] {req_str} - {status_str}\n")

DEFAULT_PORTS = [3000, 8080, 5000, 8888, 5173, 8000]

def find_available_port(candidate_ports, host="127.0.0.1"):
    for port in candidate_ports:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind((host, port))
                return port
        except OSError:
            continue
    return 3000

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

def run():
    requested_port = None
    if len(sys.argv) > 1:
        try:
            port_val = int(sys.argv[1])
            if 1 <= port_val <= 65535:
                requested_port = port_val
        except ValueError:
            pass

    host = os.environ.get("BYCHANCE_HOST", "127.0.0.1")
    port = requested_port or find_available_port(DEFAULT_PORTS, host)

    print("=" * 60)
    print("✨ Bychance — Anime AI Image Generator")
    print(f"📁 Serving: {PUBLIC_DIR}")
    print(f"🌐 Local URL:   http://localhost:{port}")
    print(f"🌐 Network URL: http://127.0.0.1:{port}")
    print("=" * 60)

    try:
        with ThreadedHTTPServer((host, port), BychanceHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer shutting down gracefully.")
    except Exception as e:
        print(f"Server error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    run()
