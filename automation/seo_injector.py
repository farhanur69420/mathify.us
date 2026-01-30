import os
from pathlib import Path

BASE_DIR = Path("..")

def generate_title(path):
    name = path.parent.name.replace("-", " ").title()
    if name == "":
        name = "Mathify"
    return f"{name} | Mathify"

def generate_description(path):
    name = path.parent.name.replace("-", " ").lower()
    return f"Learn {name} concepts clearly with explanations, tools, and practice on Mathify."

for html in BASE_DIR.rglob("index.html"):
    with open(html, "r") as f:
        content = f.read()

    if "<title>" in content and "meta name=\"description\"" in content:
        continue

    head_end = content.find("</head>")
    if head_end == -1:
        continue

    seo = f"""
  <title>{generate_title(html)}</title>
  <meta name="description" content="{generate_description(html)}">
"""

    content = content.replace("</head>", seo + "\n</head>")

    with open(html, "w") as f:
        f.write(content)

    print(f"SEO added to {html}")

