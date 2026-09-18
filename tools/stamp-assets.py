#!/usr/bin/env python3
"""Stamp ?v=<content-hash> onto every local CSS and JS reference.

Why: GitHub Pages lets browsers cache assets, so a visitor who has been here
before can keep an old style.css after a deploy. A query string tied to the
file's contents means the URL changes only when the file actually changes --
so returning visitors get the new asset without a hard refresh, and unchanged
files stay cached.

Idempotent: run it as often as you like. Run it before committing a deploy.

    python3 tools/stamp-assets.py

External URLs (jsDelivr and friends) and data: URIs are left alone.
"""
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
REF = re.compile(r'(?P<attr>href|src)="(?P<path>[^"?#]+\.(?:css|js))(?:\?[^"#]*)?(?P<frag>#[^"]*)?"')

def resolve(html_file: pathlib.Path, ref: str) -> pathlib.Path | None:
    """Map a reference as written in the HTML to a file on disk."""
    if ref.startswith(("http://", "https://", "//", "data:")):
        return None
    if ref.startswith("/"):
        return ROOT / ref.lstrip("/")
    return (html_file.parent / ref).resolve()

def short_hash(path: pathlib.Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()[:8]

def main() -> int:
    pages = sorted(p for p in ROOT.rglob("*.html") if ".git" not in p.parts)
    changed, stamped, missing = 0, 0, []

    for page in pages:
        src = page.read_text(encoding="utf-8")

        def sub(m: re.Match) -> str:
            nonlocal stamped
            ref = m.group("path")
            target = resolve(page, ref)
            if target is None:
                return m.group(0)
            if not target.is_file():
                missing.append(f"{page.relative_to(ROOT)} -> {ref}")
                return m.group(0)
            stamped += 1
            frag = m.group("frag") or ""
            return f'{m.group("attr")}="{ref}?v={short_hash(target)}{frag}"'

        out = REF.sub(sub, src)
        if out != src:
            page.write_text(out, encoding="utf-8")
            changed += 1
            print(f"  updated {page.relative_to(ROOT)}")

    print(f"\n  {len(pages)} pages scanned, {stamped} references stamped, {changed} files rewritten")
    if missing:
        print("  references with no file on disk:")
        for m in missing:
            print(f"    {m}")
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
