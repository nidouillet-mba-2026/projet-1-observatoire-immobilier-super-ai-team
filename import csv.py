import csv
import os
import urllib.request
from html.parser import HTMLParser


class DescriptionParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_description = False
        self.description = ""

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if any("description" in str(v).lower() for v in attrs_dict.values()):
            self.in_description = True

    def handle_data(self, data):
        if self.in_description and data.strip():
            self.description += data.strip() + " "

    def handle_endtag(self, tag):
        if self.in_description:
            self.in_description = False


def get_description(url):
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
        })
        with urllib.request.urlopen(req, timeout=5) as response:
            html = response.read().decode("utf-8", errors="ignore")

        # Cherche la description dans le HTML
        start = html.find('"description":"')
        if start != -1:
            start += len('"description":"')
            end = html.find('"', start)
            return html[start:end][:500]
        return ""
    except Exception:
        return ""


def enrich_annonces(input_file=None, output_file=None):
    if input_file is None:
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        input_file = os.path.join(base, "data", "annonces.csv")
    if output_file is None:
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        output_file = os.path.join(base, "data", "annonces_enrichies.csv")

    with open(input_file, encoding="utf-8") as f:
        annonces = list(csv.DictReader(f))

    enriched = []
    for i, annonce in enumerate(annonces):
        print(f"Traitement {i+1}/{len(annonces)} : {annonce['titre'][:40]}...")

        # Calcul prix/m²
        try:
            prix = float(annonce["prix"])
            surface = float(annonce["surface"].replace("m²", "").strip())
            prix_m2 = round(prix / surface)
        except Exception:
            prix_m2 = ""

        # Description
        description = get_description(annonce["url"])

        enriched.append({
            **annonce,
            "prix_m2": prix_m2,
            "description": description,
        })

    with open(output_file, "w", newline="", encoding="utf-8") as f:
        fields = ["titre", "prix", "surface", "quartier", "type", "url", "prix_m2", "description"]
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(enriched)

    print(f"\n✅ {len(enriched)} annonces enrichies sauvegardées dans {output_file}")
    return enriched


if __name__ == "__main__":
    enrich_annonces()