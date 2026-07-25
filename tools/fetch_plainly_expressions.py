#!/usr/bin/env python3
"""Fetch a local archive of Plainly's After Effects expressions library.

Usage:
    python3 tools/fetch_plainly_expressions.py
"""

from __future__ import annotations

import json
import re
import shutil
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, asdict
from datetime import datetime, UTC
from html import unescape
from html.parser import HTMLParser
from pathlib import Path


LIBRARY_URL = "https://www.plainlyvideos.com/after-effects-expressions-library"
SITEMAP_URL = "https://www.plainlyvideos.com/sitemap.xml"
USER_AGENT = "ae-ai-starter/plainly-expressions-archive"
REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_ROOT = REPO_ROOT / "Input" / "plainly-expressions"
EXPRESSIONS_DIR = OUTPUT_ROOT / "expressions"
MANIFEST_PATH = OUTPUT_ROOT / "manifest.json"


@dataclass(frozen=True)
class ExpressionRecord:
    slug: str
    title: str
    category: str
    source_url: str
    description: str
    practical_use_case: str
    expression_code: str


class RichTextExtractor(HTMLParser):
    """Extract text from a Webflow rich text block with preserved line breaks."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:  # type: ignore[override]
        if tag == "br":
            self.parts.append("\n")
        elif tag == "p" and self.parts:
            if not self.parts[-1].endswith("\n\n"):
                self.parts.append("\n\n")

    def handle_startendtag(self, tag: str, attrs) -> None:  # type: ignore[override]
        if tag == "br":
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:  # type: ignore[override]
        if tag == "p":
            if not self.parts or not self.parts[-1].endswith("\n\n"):
                self.parts.append("\n\n")

    def handle_data(self, data: str) -> None:  # type: ignore[override]
        self.parts.append(unescape(data))

    def handle_entityref(self, name: str) -> None:  # type: ignore[override]
        self.parts.append(unescape("&%s;" % name))

    def handle_charref(self, name: str) -> None:  # type: ignore[override]
        self.parts.append(unescape("&#%s;" % name))

    def text(self) -> str:
        text = "".join(self.parts)
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        text = re.sub(r"\n{3,}", "\n\n", text)
        lines = [line.rstrip() for line in text.split("\n")]
        return "\n".join(lines).strip()


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def get_sitemap_urls() -> list[str]:
    sitemap = fetch_text(SITEMAP_URL)
    urls = []
    for match in re.finditer(r"<loc>(.*?)</loc>", sitemap, re.S):
        url = unescape(match.group(1).strip())
        if url.startswith(LIBRARY_URL + "/"):
            urls.append(url)
    if not urls:
        raise RuntimeError("No expression URLs found in sitemap.")
    return sorted(set(urls))


def extract_first(pattern: str, html_text: str, label: str) -> str:
    match = re.search(pattern, html_text, re.S)
    if not match:
        raise ValueError("Could not extract %s." % label)
    return match.group(1)


def strip_tags(fragment: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", fragment, flags=re.I)
    text = re.sub(r"</p\s*>", "\n\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    lines = [line.strip() for line in text.splitlines()]
    compact = "\n".join(line for line in lines if line)
    return compact.strip()


def extract_rich_text(fragment: str) -> str:
    parser = RichTextExtractor()
    parser.feed(fragment)
    parser.close()
    text = parser.text()
    if not text:
        raise ValueError("Rich text block was empty.")
    return text + "\n"


def parse_expression_page(url: str, html_text: str) -> ExpressionRecord:
    slug = url.rstrip("/").rsplit("/", 1)[-1]
    title = strip_tags(
        extract_first(r'<h1 class="h1-expressions">(.*?)</h1>', html_text, "title")
    )
    category = strip_tags(
        extract_first(
            r'<div class="expression-category-name">(.*?)</div>',
            html_text,
            "category",
        )
    )
    description = strip_tags(
        extract_first(
            r'<p class="gray-expressions">(.*?)</p>',
            html_text,
            "description",
        )
    )
    code_fragment = extract_first(
        r'<div id="code" class="rich-text-block-3 w-richtext">(.*?)</div>',
        html_text,
        "expression code",
    )
    expression_code = extract_rich_text(code_fragment)
    if not expression_code.strip():
        raise ValueError("Expression code was empty.")

    use_case_title = re.escape("Practical use case")
    use_case_pattern = (
        r"<h2[^>]*>%s</h2>\s*<p class=\"gray\">(.*?)</p>" % use_case_title
    )
    practical_use_case = strip_tags(
        extract_first(use_case_pattern, html_text, "practical use case")
    )

    return ExpressionRecord(
        slug=slug,
        title=title,
        category=category,
        source_url=url,
        description=description,
        practical_use_case=practical_use_case,
        expression_code=expression_code,
    )


def markdown_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def render_markdown(record: ExpressionRecord, generated_at: str) -> str:
    return (
        "---\n"
        'title: "%s"\n'
        'slug: "%s"\n'
        'category: "%s"\n'
        'source_url: "%s"\n'
        'fetched_at: "%s"\n'
        "---\n\n"
        "%s\n\n"
        "## Practical use case\n\n"
        "%s\n\n"
        "## Expression\n\n"
        "```javascript\n"
        "%s"
        "```\n"
    ) % (
        markdown_escape(record.title),
        markdown_escape(record.slug),
        markdown_escape(record.category),
        markdown_escape(record.source_url),
        generated_at,
        record.description,
        record.practical_use_case,
        record.expression_code,
    )


def prepare_output_dir() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    if EXPRESSIONS_DIR.exists():
        shutil.rmtree(EXPRESSIONS_DIR)
    EXPRESSIONS_DIR.mkdir(parents=True)


def write_outputs(records: list[ExpressionRecord], generated_at: str) -> None:
    prepare_output_dir()
    for record in records:
        target = EXPRESSIONS_DIR / ("%s.md" % record.slug)
        target.write_text(render_markdown(record, generated_at), encoding="utf-8")

    manifest = {
        "source": LIBRARY_URL,
        "generated_at": generated_at,
        "expression_count": len(records),
        "expressions": [asdict(record) for record in records],
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    generated_at = datetime.now(UTC).replace(microsecond=0).isoformat()
    try:
        urls = get_sitemap_urls()
        records: list[ExpressionRecord] = []
        for url in urls:
            html_text = fetch_text(url)
            records.append(parse_expression_page(url, html_text))
        records.sort(key=lambda item: item.slug)
        write_outputs(records, generated_at)
    except (OSError, urllib.error.URLError, ValueError, RuntimeError) as exc:
        print("Error: %s" % exc, file=sys.stderr)
        return 1

    print("Archived %d expressions to %s" % (len(records), OUTPUT_ROOT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
