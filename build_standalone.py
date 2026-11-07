#!/usr/bin/env python3
"""
Builds self-contained standalone HTML files (index.html, standalone.html, public/standalone.html)
from public/index.html, public/css/style.css, and public/js/*.js.
"""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")

JS_FILES = [
    "js/promptEngine.js",
    "js/presetManager.js",
    "js/app.js",
]

def read_text(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write_text(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def build():
    html = read_text(os.path.join(PUBLIC_DIR, "index.html"))
    css = read_text(os.path.join(PUBLIC_DIR, "css", "style.css"))

    # Inline CSS
    html = html.replace(
        '<link rel="stylesheet" href="css/style.css" />',
        f"<style>\n{css}\n</style>"
    )

    # Inline JS modules in order
    for js_rel in JS_FILES:
        js_code = read_text(os.path.join(PUBLIC_DIR, js_rel))
        script_tag = f'<script src="{js_rel}"></script>'
        html = html.replace(script_tag, f"<script>\n{js_code}\n</script>")

    targets = [
        os.path.join(BASE_DIR, "index.html"),
        os.path.join(BASE_DIR, "standalone.html"),
        os.path.join(PUBLIC_DIR, "standalone.html"),
    ]

    for t in targets:
        write_text(t, html)
        print(f"Built standalone bundle: {t} ({len(html):,} bytes)")

if __name__ == "__main__":
    build()
