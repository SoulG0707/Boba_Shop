from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


WORKSPACE = Path(__file__).resolve().parents[2]
VIDEO = Path(r"D:\@_YenNgoc\clip\Captures\Tiệm Trà Mơ Ước - Google Chrome 2026-09-29 16-39-05.mp4")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WORKSPACE), **kwargs)

    def translate_path(self, path):
        if urlsplit(path).path == "/__reference.mp4":
            return str(VIDEO)
        return super().translate_path(path)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


if not VIDEO.is_file():
    raise FileNotFoundError(VIDEO)

ThreadingHTTPServer(("127.0.0.1", 8125), Handler).serve_forever()
