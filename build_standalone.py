#!/usr/bin/env python3
"""
Builds a 100% standalone single-file version of Bychance (standalone.html).
Inlines all CSS and JavaScript modules so it can be opened directly via file://
or hosted without module CORS issues.
"""

import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"

def build():
    print("Building standalone.html...")
    with open(PUBLIC_DIR / "index.html", "r", encoding="utf-8") as f:
        html = f.read()

    with open(PUBLIC_DIR / "css" / "style.css", "r", encoding="utf-8") as f:
        css = f.read()

    # Replace <link rel="stylesheet" href="css/style.css" /> with <style>...</style>
    style_tag = f"<style>\n{css}\n</style>"
    html = re.sub(r'<link\s+rel=["\x27]stylesheet["\x27]\s+href=["\x27]css/style\.css["\x27]\s*/?>', lambda m: style_tag, html)

    # Read JS modules
    with open(PUBLIC_DIR / "js" / "perchanceEngine.js", "r", encoding="utf-8") as f:
        perchance_code = f.read()

    with open(PUBLIC_DIR / "js" / "imageGenerator.js", "r", encoding="utf-8") as f:
        generator_code = f.read()

    with open(PUBLIC_DIR / "js" / "storage.js", "r", encoding="utf-8") as f:
        storage_code = f.read()

    with open(PUBLIC_DIR / "js" / "viewer.js", "r", encoding="utf-8") as f:
        viewer_code = f.read()

    with open(PUBLIC_DIR / "js" / "app.js", "r", encoding="utf-8") as f:
        app_code = f.read()

    # Strip imports and exports to make plain unified script
    def clean_module(code):
        # Remove import statements
        code = re.sub(r'import\s+.*?from\s+[\'\"][^\'\"]+[\'\"];?\n?', '', code)
        # Remove export const / export function / export default
        code = re.sub(r'export\s+(const|let|var|function|class)\s+', r'\1 ', code)
        code = re.sub(r'export\s+default\s+', '', code)
        code = re.sub(r'export\s*\{[^}]*\};?\n?', '', code)
        return code

    bundle = "\n\n".join([
        "// === MODULE: PerchanceEngine ===",
        clean_module(perchance_code),
        "// === MODULE: Storage ===",
        clean_module(storage_code),
        "// === MODULE: Viewer ===",
        clean_module(viewer_code),
        "// === MODULE: ImageGenerator ===",
        clean_module(generator_code),
        "// === MODULE: App ===",
        clean_module(app_code)
    ])

    script_tag = f"<script>\n(function() {{\n{bundle}\n}})();\n</script>"
    html = re.sub(r'<script\s+type=["\x27]module["\x27]\s+src=["\x27]js/app\.js["\x27]>\s*</script>', lambda m: script_tag, html)

    target_path = BASE_DIR / "standalone.html"
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(html)

    target_public = PUBLIC_DIR / "standalone.html"
    with open(target_public, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"Successfully generated {target_path} ({len(html)} bytes)")

if __name__ == "__main__":
    build()
