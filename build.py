#!/usr/bin/env python3
"""Build the dependency-free static website and Markdown report."""
from pathlib import Path
from collections import Counter
from datetime import date
import json

ROOT = Path(__file__).resolve().parent

def load(name):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))

def article_md(a, meta):
    labels = {"body": "\u6b63\u6587\u8981\u70b9", "excerpt": "\u7247\u6bb5\u5206\u6790", "catalog": "\u4ec5\u76ee\u5f55"}
    out = (
        f"## {a['title']}\n\n"
        f"\u539f\u6587\u6807\u9898\uff1a{a['originalTitle']}\n\n"
        f"\u53d1\u5e03\u65e5\u671f\uff1a{a['date']} | \u6574\u7406\u65e5\u671f\uff1a{a['retrievedAt']}\n\n"
        f"\u9605\u8bfb\u72b6\u6001\uff1a{labels[a['status']]}\n\n"
        f"\u9605\u8bfb\u8303\u56f4\uff1a{a['readScope']}\n\n"
        f"\u8bc1\u636e\u7c7b\u578b\uff1a{a['evidenceType']}\n\n"
        f"\u539f\u6587\uff1a{a['url'] or meta['sourceCategory']}\n\n"
    )
    if a["status"] == "catalog":
        out += f"### \u6b63\u6587\u5c1a\u672a\u53d6\u5f97\n\n{a['summary']}\n\n"
    else:
        prefix = "\u7247\u6bb5" if a["status"] == "excerpt" else ""
        out += (
            f"### {prefix}\u4e2d\u6587\u6458\u8981\uff08\u4e0d\u662f\u5168\u6587\u8bd1\u6587\uff09\n\n{a['summary']}\n\n"
            f"### \u4f01\u4e1a\u6d1e\u5bdf\uff1a\u72ec\u7acb\u5206\u6790\n\n{a['insight']}\n\n"
            f"### \u8bd5\u9a8c\u5efa\u8bae\n\n{a['action']}\n\n"
            f"### \u89c2\u5bdf\u6307\u6807\n\n{a['metric']}\n\n"
        )
    return out + f"### \u9002\u7528\u8fb9\u754c\n\n{a['boundary']}\n\n"

def report_md(data):
    meta, articles, insights, plan = (data[x] for x in ("meta", "articles", "insights", "plan"))
    by_id = {a["id"]: a for a in articles}
    out = "# \u4f01\u4e1a AI \u89c2\u5bdf\uff1a\u4ece\u6848\u4f8b\u5230\u51b3\u7b56\n\n"
    out += f"\u6574\u7406\u65e5\u671f\uff1a{meta['retrievedAt']}\n\n"
    out += "\n\n".join(meta[k] for k in ("scope", "copyright", "evidence", "freshness"))
    out += f"\n\n\u539f\u680f\u76ee\uff1a{meta['sourceCategory']}\n\n## \u8de8\u6848\u4f8b\u4f01\u4e1a\u6d1e\u5bdf\n\n"
    fields = [
        ("observation", "\u539f\u6587\u7ebf\u7d22"),
        ("reasoning", "\u72ec\u7acb\u5206\u6790"),
        ("decision", "\u7ba1\u7406\u51b3\u7b56"),
        ("experiment", "\u8bd5\u9a8c"),
        ("metric", "\u6307\u6807"),
        ("owner", "\u8d1f\u8d23\u4eba"),
        ("counter", "\u4e0d\u9002\u7528\u6761\u4ef6"),
    ]
    for i in insights:
        out += f"### {i['kicker']} {i['title']}\n\n{i['thesis']}\n\n"
        for key, label in fields:
            out += f"{label}\uff1a{i[key]}\n\n"
        out += "\u5173\u8054\u6765\u6e90\uff1a\n"
        out += "\n".join(f"- {by_id[x]['title']}\uff1a{by_id[x]['url']}" for x in i["refs"]) + "\n\n"
    out += "## 90 \u5929\u5b9e\u65bd\u6a21\u677f\uff08\u72ec\u7acb\u5efa\u8bae\uff0c\u9700\u8c03\u6574\uff09\n\n"
    for p in plan:
        out += f"### {p['period']}\uff1a{p['title']}\n\n{p['goal']}\n\n"
        out += "\n".join(f"- {t['title']}\uff08{t['owner']}\uff09\uff1a{t['detail']}" for t in p["tasks"])
        out += f"\n\n\u6269\u91cf\u95e8\u69db\uff1a{p['gate']}\n\n"
    out += "## \u9010\u7bc7\u6587\u7ae0\u6458\u8981\u4e0e\u5206\u6790\n\n"
    return out + "\n---\n\n".join(article_md(a, meta) for a in articles)

def main():
    data = {k: load(k + ".json") for k in ("meta", "articles", "insights", "plan")}
    articles = data["articles"]
    ids = [a["id"] for a in articles]
    if len(ids) != len(set(ids)):
        raise ValueError("Article IDs must be unique.")
    required = {
        "id", "date", "topic", "kind", "title", "originalTitle", "url", "status",
        "summary", "insight", "action", "metric", "boundary", "readScope",
        "priority", "retrievedAt", "evidenceType",
    }
    for a in articles:
        missing = required.difference(a)
        if missing:
            raise ValueError(f"{a.get('id')}: missing fields {sorted(missing)}")
        if a["status"] not in {"body", "excerpt", "catalog"}:
            raise ValueError(f"Invalid status for {a['id']}")
        date.fromisoformat(a["date"])
        date.fromisoformat(a["retrievedAt"])
        if a["url"] and not a["url"].startswith("https://claude.com/"):
            raise ValueError(f"Unexpected source domain: {a['url']}")
    for group in data["insights"] + data["plan"]:
        for ref in group["refs"]:
            if ref not in ids:
                raise ValueError(f"Unknown article reference: {ref}")
    template = (ROOT/"src/index.template.html").read_text(encoding="utf-8")
    replacements = {
        "__STYLE__": (ROOT/"src/style.css").read_text(encoding="utf-8"),
        "__SCRIPT__": (ROOT/"src/app.js").read_text(encoding="utf-8"),
        "__DATA__": json.dumps(data, ensure_ascii=False).replace("</", "<\\/"),
    }
    for token, value in replacements.items():
        if template.count(token) != 1:
            raise ValueError(f"Expected one template token: {token}")
        template = template.replace(token, value)
    (ROOT/"index.html").write_text(template, encoding="utf-8")
    (ROOT/"report.md").write_text(report_md(data), encoding="utf-8")
    print(f"Built index.html and report.md; {len(articles)} articles; {dict(Counter(a['status'] for a in articles))}")

if __name__ == "__main__":
    main()
