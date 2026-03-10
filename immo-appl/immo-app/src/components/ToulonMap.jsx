import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './ToulonMap.css';

export default function ToulonMap() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [data, setData] = useState({ iris: null, outline: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Configuration
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "YOUR_MAPBOX_TOKEN";
  const mapCenter = [5.9300, 43.1250]; // lon, lat
  const mapZoom = 12.2;

  useEffect(() => {
    async function fetchData() {
      try {
        const urlIris = "https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/georef-france-iris/exports/geojson?where=com_code%3D%2283137%22";
        const urlCommune = "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/83-var/communes-83-var.geojson";

        const [resIris, resCommune] = await Promise.all([
          fetch(urlIris),
          fetch(urlCommune)
        ]);

        if (!resIris.ok || !resCommune.ok) throw new Error("Erreur lors de la récupération des données");

        const geojsonIris = await resIris.json();
        const communesData = await resCommune.json();

        const geojsonOutline = {
          type: "FeatureCollection",
          features: communesData.features.filter(f => f.properties.code === "83137")
        };

        // Seed equivalent logic for randomizing
        // Simple seeded random to keep consistency with python version
        let seed = 42;
        function random() {
            var x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        }

        geojsonIris.features.forEach((feature, i) => {
          const props = feature.properties;
          props.nom_affichage = props.iris_name || props.nom || `Quartier ${i}`;
          props.Prix_m2_Moyen = Math.floor(random() * (7800 - 2800 + 1) + 2800);
          props.Tendance = Math.round((random() * 6.0 - 1.0) * 10) / 10;
        });

        setData({ iris: geojsonIris, outline: geojsonOutline });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    if (loading || error || !data.iris || mapRef.current) return; // Wait for data or map already initialized

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: mapCenter,
      zoom: mapZoom,
      pitch: 0,
      bearing: 0
    });

    mapRef.current = map;
    let hoveredId = null;

    map.on('load', () => {
      // Make text labels visible above fills
      const firstSymbol = map.getStyle().layers.find(l => l.type === 'symbol')?.id;
      
      map.getStyle().layers.forEach(l => {
        if (l.type === 'symbol' && l.layout?.['text-field']) {
            map.setPaintProperty(l.id, 'text-color', '#111');
            map.setPaintProperty(l.id, 'text-halo-color', '#fff');
            map.setPaintProperty(l.id, 'text-halo-width', 2);
        }
      });

      map.addSource('iris', { type: 'geojson', data: data.iris, generateId: true });
      map.addSource('outline', { type: 'geojson', data: data.outline });

      const colorScale = [
        'interpolate', ['linear'], ['get', 'Prix_m2_Moyen'],
        3000, '#318239',
        4000, '#8dc63f',
        5000, '#fcd34d',
        6000, '#f58e42',
        7000, '#ea3724',
        8000, '#a81111'
      ];

      map.addLayer({
        id: 'iris-fills', type: 'fill', source: 'iris',
        paint: { 'fill-color': colorScale, 'fill-opacity': 0.82 }
      }, firstSymbol);

      map.addLayer({
        id: 'iris-borders', type: 'line', source: 'iris',
        paint: { 'line-color': '#fff', 'line-width': 0.8 }
      }, firstSymbol);

      map.addLayer({
        id: 'iris-hover', type: 'line', source: 'iris',
        paint: {
            'line-color': '#000',
            'line-width': ['case', ['boolean', ['feature-state','hover'], false], 3, 0]
        }
      }, firstSymbol);

      map.addLayer({
        id: 'city-outline', type: 'line', source: 'outline',
        paint: { 'line-color': '#000', 'line-width': 4 }
      }, firstSymbol);

      map.addControl(new mapboxgl.NavigationControl(), 'top-left');

      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 15 });

      map.on('mousemove', 'iris-fills', (e) => {
        if (!e.features.length) return;
        map.getCanvas().style.cursor = 'pointer';

        if (hoveredId !== null) map.setFeatureState({ source: 'iris', id: hoveredId }, { hover: false });
        hoveredId = e.features[0].id;
        map.setFeatureState({ source: 'iris', id: hoveredId }, { hover: true });

        const p = e.features[0].properties;
        const prix = Number(p.Prix_m2_Moyen).toLocaleString('fr-FR');
        const t = parseFloat(p.Tendance);
        const tStr = t >= 0 ? `+${t}%` : `${t}%`;
        const tClass = t >= 0 ? 'up' : 'down';
        const tArrow = t >= 0 ? '▲' : '▼';

        popup.setLngLat(e.lngLat).setHTML(`
            <div class="popup-nom">${p.nom_affichage}</div>
            <div class="popup-prix">${prix} €/m²</div>
            <div class="popup-tendance">Tendance : <span class="${tClass}">${tArrow} ${tStr}</span></div>
        `).addTo(map);
      });

      map.on('mouseleave', 'iris-fills', () => {
        map.getCanvas().style.cursor = '';
        if (hoveredId !== null) map.setFeatureState({ source: 'iris', id: hoveredId }, { hover: false });
        hoveredId = null;
        popup.remove();
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading, error, data]);

  if (loading) return <div className="map-loader">Chargement des données géographiques...</div>;
  if (error) return <div className="map-error">Erreur: {error}</div>;

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" />
      <div className="map-legend">
          <div className="legend-title">Prix moyen au m² (€)</div>
          <div className="legend-bar"></div>
          <div className="legend-labels"><span>&lt; 3 000 €</span><span>&gt; 7 000 €</span></div>
      </div>
    </div>
  );
}
