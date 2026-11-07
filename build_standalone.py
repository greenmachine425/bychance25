#!/usr/bin/env python3
"""
Builds a 100% standalone single-file version of Bychance across all HTML entrypoints
(index.html, standalone.html, public/index.html, public/standalone.html).
Inlines all CSS and JavaScript modules so any HTML file can be opened directly via
file://, Android content://, GitHub Pages, or localhost without module CORS issues.
"""

import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"

def build():
    print("Building self-contained Bychance HTML bundles...")
    with open(PUBLIC_DIR / "index.html", "r", encoding="utf-8") as f:
        html = f.read()

    with open(PUBLIC_DIR / "css" / "style.css", "r", encoding="utf-8") as f:
        css = f.read()

    style_block = f"<!-- BYCHANCE_STYLE_START -->\n<style>\n{css}\n</style>\n<!-- BYCHANCE_STYLE_END -->"
    if "<!-- BYCHANCE_STYLE_START -->" in html:
        html = re.sub(
            r"<!-- BYCHANCE_STYLE_START -->.*?<!-- BYCHANCE_STYLE_END -->",
            lambda m: style_block,
            html,
            flags=re.S,
        )
    else:
        html = re.sub(
            r'<link\s+rel=["\x27]stylesheet["\x27]\s+href=["\x27]css/style\.css["\x27]\s*/?>',
            lambda m: style_block,
            html,
        )

    # Read JS modules in dependency order
    with open(PUBLIC_DIR / "js" / "perchanceEngine.js", "r", encoding="utf-8") as f:
        perchance_code = f.read()

    with open(PUBLIC_DIR / "js" / "storage.js", "r", encoding="utf-8") as f:
        storage_code = f.read()

    with open(PUBLIC_DIR / "js" / "embeddedServer.js", "r", encoding="utf-8") as f:
        embedded_server_code = f.read()

    with open(PUBLIC_DIR / "js" / "viewer.js", "r", encoding="utf-8") as f:
        viewer_code = f.read()

    with open(PUBLIC_DIR / "js" / "imageGenerator.js", "r", encoding="utf-8") as f:
        generator_code = f.read()

    with open(PUBLIC_DIR / "js" / "app.js", "r", encoding="utf-8") as f:
        app_code = f.read()

    # Strip imports and exports to make plain unified script
    def clean_module(code):
        code = re.sub(r'import\s+.*?from\s+[\'\"][^\'\"]+[\'\"];?\n?', '', code)
        code = re.sub(r'export\s+(const|let|var|function|class)\s+', r'\1 ', code)
        code = re.sub(r'export\s+default\s+', '', code)
        code = re.sub(r'export\s*\{[^}]*\};?\n?', '', code)
        return code

    bundle = "\n\n".join([
        "// === MODULE: PerchanceEngine ===",
        clean_module(perchance_code),
        "// === MODULE: Storage ===",
        clean_module(storage_code),
        "// === MODULE: EmbeddedServer ===",
        clean_module(embedded_server_code),
        "// === MODULE: Viewer ===",
        clean_module(viewer_code),
        "// === MODULE: ImageGenerator ===",
        clean_module(generator_code),
        "// === MODULE: App ===",
        clean_module(app_code)
    ])

    script_block = f"<!-- BYCHANCE_BUNDLE_START -->\n<script>\n(function() {{\n{bundle}\n}})();\n</script>\n<!-- BYCHANCE_BUNDLE_END -->"
    if "<!-- BYCHANCE_BUNDLE_START -->" in html:
        html = re.sub(
            r"<!-- BYCHANCE_BUNDLE_START -->.*?<!-- BYCHANCE_BUNDLE_END -->",
            lambda m: script_block,
            html,
            flags=re.S,
        )
    else:
        html = re.sub(
            r'<script\s+type=["\x27]module["\x27]\s+src=["\x27]js/app\.js["\x27]>\s*</script>',
            lambda m: script_block,
            html,
        )

    targets = [
        BASE_DIR / "standalone.html",
        BASE_DIR / "index.html",
        PUBLIC_DIR / "standalone.html",
        PUBLIC_DIR / "index.html",
    ]
    for target in targets:
        with open(target, "w", encoding="utf-8") as f:
            f.write(html)

    print(f"Successfully generated {len(targets)} self-contained HTML files ({len(html)} bytes each)")

if __name__ == "__main__":
    build()
