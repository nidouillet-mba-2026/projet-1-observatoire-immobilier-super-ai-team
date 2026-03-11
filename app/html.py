import streamlit as st
import streamlit.components.v1 as components
import json
import random
import requests

st.set_page_config(page_title="Toulon Immobilier", layout="wide")
MAPBOX_TOKEN = st.secrets.get("MAPBOX_TOKEN", "YOUR_MAPBOX_TOKEN")

# Titre minimal
st.markdown("""
    <div style='background:#0e1117; padding:10px; border-radius:5px; margin-bottom:10px;'>
        <h1 style='color:white; text-align:center; font-size:22px; margin:0;'>
            📍 Toulon — Prix & Tendances du Marché Immobilier
        </h1>
    </div>
""", unsafe_allow_html=True)

# --- CHARGEMENT DES DONNÉES ---
@st.cache_data
def get_map_data():
    url_iris    = "https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/georef-france-iris/exports/geojson?where=com_code%3D%2283137%22"
    url_commune = "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/83-var/communes-83-var.geojson"
    try:
        res_iris = requests.get(url_iris, timeout=30)
        res_iris.raise_for_status()
        geojson_iris = res_iris.json()

        res_commune = requests.get(url_commune, timeout=30)
        res_commune.raise_for_status()
        communes_data = res_commune.json()
        geojson_outline = {
            "type": "FeatureCollection",
            "features": [f for f in communes_data["features"] if f["properties"].get("code") == "83137"]
        }
    except Exception as e:
        st.error(f"Erreur chargement API : {e}")
        return None, None

    random.seed(42)
    for i, feature in enumerate(geojson_iris.get("features", [])):
        props = feature["properties"]
        props["nom_affichage"] = props.get("iris_name", props.get("nom", f"Quartier {i}"))
        props["Prix_m2_Moyen"] = random.randint(2800, 7800)
        props["Tendance"]      = round(random.uniform(-1.0, 5.0), 1)

    return geojson_iris, geojson_outline

geojson_iris, geojson_outline = get_map_data()

# --- GÉNÉRATION HTML MAPBOX ---
def generate_mapbox_html(token, geojson_iris, geojson_outline, lat, lon, zoom):
    if not geojson_iris:
        return "<h2>Erreur de données.</h2>"

    iris_str    = json.dumps(geojson_iris)
    outline_str = json.dumps(geojson_outline)

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
    <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet">
    <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
    <style>
        body   {{ margin:0; padding:0; }}
        #map   {{ position:absolute; top:0; bottom:0; width:100%; }}

        /* Popup */
        .mapboxgl-popup-content {{
            padding:14px; border-radius:8px;
            box-shadow:0 8px 24px rgba(0,0,0,0.18);
            font-family:Arial,sans-serif; font-size:14px;
        }}
        .popup-nom     {{ font-size:15px; font-weight:800; color:#222; margin-bottom:6px; }}
        .popup-prix    {{ color:#d32f2f; font-size:20px; font-weight:800; }}
        .popup-tendance{{ font-size:13px; margin-top:5px; }}
        .up   {{ color:#2e7d32; font-weight:700; }}
        .down {{ color:#c62828; font-weight:700; }}

        /* Légende */
        .legend {{
            position:absolute; bottom:28px; right:28px;
            background:rgba(255,255,255,0.96); padding:14px 16px;
            border-radius:8px; box-shadow:0 4px 14px rgba(0,0,0,0.18);
            z-index:10; font-family:Arial,sans-serif;
        }}
        .legend-title  {{ font-size:12px; font-weight:800; color:#333; margin-bottom:7px; text-align:center; }}
        .legend-bar    {{ height:11px; width:210px; border-radius:5px;
                         background:linear-gradient(to right,#318239,#8dc63f,#fcd34d,#f58e42,#ea3724,#a81111); }}
        .legend-labels {{ display:flex; justify-content:space-between; font-size:11px; font-weight:700; margin-top:4px; color:#444; }}
    </style>
</head>
<body>
<div id="map"></div>
<div class="legend">
    <div class="legend-title">Prix moyen au m² (€)</div>
    <div class="legend-bar"></div>
    <div class="legend-labels"><span>&lt; 3 000 €</span><span>&gt; 7 000 €</span></div>
</div>
<script>
mapboxgl.accessToken = '{token}';
const map = new mapboxgl.Map({{
    container : 'map',
    style     : 'mapbox://styles/mapbox/light-v11',
    center    : [{lon}, {lat}],
    zoom      : {zoom},
    pitch     : 0,
    bearing   : 0
}});

const irisData    = {iris_str};
const outlineData = {outline_str};
let hoveredId = null;

map.on('load', () => {{

    // Lisibilité des labels de la carte de base
    map.getStyle().layers.forEach(l => {{
        if (l.type === 'symbol' && l.layout?.['text-field']) {{
            map.setPaintProperty(l.id, 'text-color',       '#111');
            map.setPaintProperty(l.id, 'text-halo-color',  '#fff');
            map.setPaintProperty(l.id, 'text-halo-width',  2);
        }}
    }});

    // Trouver le premier layer symbol (pour insérer nos layers en dessous des labels)
    const firstSymbol = map.getStyle().layers.find(l => l.type === 'symbol')?.id;

    map.addSource('iris',    {{ type:'geojson', data:irisData,    generateId:true }});
    map.addSource('outline', {{ type:'geojson', data:outlineData }});

    // Dégradé de couleurs selon le prix
    const colorScale = [
        'interpolate', ['linear'], ['get', 'Prix_m2_Moyen'],
        3000, '#318239',
        4000, '#8dc63f',
        5000, '#fcd34d',
        6000, '#f58e42',
        7000, '#ea3724',
        8000, '#a81111'
    ];

    // Remplissage des zones IRIS
    map.addLayer({{
        id: 'iris-fills', type: 'fill', source: 'iris',
        paint: {{ 'fill-color': colorScale, 'fill-opacity': 0.82 }}
    }}, firstSymbol);

    // Bordures blanches internes
    map.addLayer({{
        id: 'iris-borders', type: 'line', source: 'iris',
        paint: {{ 'line-color': '#fff', 'line-width': 0.8 }}
    }}, firstSymbol);

    // Bordure de survol
    map.addLayer({{
        id: 'iris-hover', type: 'line', source: 'iris',
        paint: {{
            'line-color': '#000',
            'line-width': ['case', ['boolean', ['feature-state','hover'], false], 3, 0]
        }}
    }}, firstSymbol);

    // Contour épais de la ville de Toulon
    map.addLayer({{
        id: 'city-outline', type: 'line', source: 'outline',
        paint: {{ 'line-color': '#000', 'line-width': 4 }}
    }}, firstSymbol);

    map.addControl(new mapboxgl.NavigationControl(), 'top-left');

    // Popup au survol
    const popup = new mapboxgl.Popup({{ closeButton:false, closeOnClick:false, offset:15 }});

    map.on('mousemove', 'iris-fills', (e) => {{
        if (!e.features.length) return;
        map.getCanvas().style.cursor = 'pointer';

        if (hoveredId !== null)
            map.setFeatureState({{ source:'iris', id:hoveredId }}, {{ hover:false }});
        hoveredId = e.features[0].id;
        map.setFeatureState({{ source:'iris', id:hoveredId }}, {{ hover:true }});

        const p       = e.features[0].properties;
        const prix    = Number(p.Prix_m2_Moyen).toLocaleString('fr-FR');
        const t       = parseFloat(p.Tendance);
        const tStr    = t >= 0 ? `+${{t}}%` : `${{t}}%`;
        const tClass  = t >= 0 ? 'up' : 'down';
        const tArrow  = t >= 0 ? '▲' : '▼';

        popup.setLngLat(e.lngLat).setHTML(`
            <div class="popup-nom">${{p.nom_affichage}}</div>
            <div class="popup-prix">${{prix}} €/m²</div>
            <div class="popup-tendance">Tendance : <span class="${{tClass}}">${{tArrow}} ${{tStr}}</span></div>
        `).addTo(map);
    }});

    map.on('mouseleave', 'iris-fills', () => {{
        map.getCanvas().style.cursor = '';
        if (hoveredId !== null)
            map.setFeatureState({{ source:'iris', id:hoveredId }}, {{ hover:false }});
        hoveredId = null;
        popup.remove();
    }});
}});
</script>
</body>
</html>"""

# --- AFFICHAGE ---
if geojson_iris:
    html = generate_mapbox_html(MAPBOX_TOKEN, geojson_iris, geojson_outline, 43.1250, 5.9300, 12.2)
    components.html(html, height=760, scrolling=False)