import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

SOURCE = (
    "https://api.easy-orders.net/api/v1/products/feed/"
    "eff60446d2c94f15ae9a142ee4aec404/channel/meta"
)
G = "http://base.google.com/ns/1.0"
ET.register_namespace("g", G)

request = urllib.request.Request(
    SOURCE, headers={"User-Agent": "OriginalWatchesEG-Catalog/1.0"}
)
with urllib.request.urlopen(request, timeout=90) as response:
    source = ET.fromstring(response.read())

rss = ET.Element("rss", version="2.0")
channel = ET.SubElement(rss, "channel")
ET.SubElement(channel, "title").text = "Original Watches EG"
ET.SubElement(channel, "link").text = "https://www.originalwatcheseg.com/"
ET.SubElement(channel, "description").text = (
    "Available original watches from Easy Orders"
)

seen = set()
total = 0

for item in source.findall("./channel/item"):
    total += 1
    fields = {
        child.tag.split("}")[-1]: child.text or ""
        for child in item
    }
    description = fields.get("description", "")
    searchable = " ".join(
        fields.get(key, "")
        for key in ("title", "description", "link")
    )

    original = re.search(
        r"التصنيف\s*:\s*(?:أصلية|اصلية)", description
    )
    mirror = re.search(r"ميرور|mirror", searchable, re.I)

    if not original or mirror:
        continue
    if fields.get("availability") != "in stock":
        continue

    for key in ("id", "title", "link", "image_link", "price"):
        if not fields.get(key):
            raise ValueError(f"Missing {key}: {fields.get('id')}")

    product_id = fields["id"]
    if product_id in seen:
        raise ValueError(f"Duplicate ID: {product_id}")

    link = urlparse(fields["link"])
    if (
        link.scheme != "https"
        or link.hostname not in (
            "originalwatcheseg.com",
            "www.originalwatcheseg.com",
        )
        or not link.path.startswith("/products/")
    ):
        raise ValueError(f"Unexpected product URL: {fields['link']}")

    seen.add(product_id)
    exported = ET.SubElement(channel, "item")

    # Preserve IDs, prices, descriptions and all image entries.
    for child in item:
        key = child.tag.split("}")[-1]
        if key == "custom_label_0":
            continue
        ET.SubElement(exported, f"{{{G}}}{key}").text = child.text

    ET.SubElement(exported, f"{{{G}}}custom_label_0").text = "original"

if not seen:
    raise ValueError("No eligible products; publication stopped.")

output = Path("_site")
output.mkdir(exist_ok=True)

ET.ElementTree(rss).write(
    output / "meta-catalog.xml",
    encoding="utf-8",
    xml_declaration=True,
)
(output / ".nojekyll").touch()

summary = {
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "source_products": total,
    "available_original_watches": len(seen),
    "excluded": total - len(seen),
}
(output / "meta-catalog-status.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
print(json.dumps(summary, ensure_ascii=False, indent=2))
