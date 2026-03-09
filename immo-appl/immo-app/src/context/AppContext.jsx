import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

// Aligné avec les quartiers suivis dans le Dashboard (graphiques + kNN)
const QUARTIERS_TOULON = [
  'Mourillon', 'Centre-Ville', 'Saint-Jean du Var', 'La Rode',
  'Pont du Las', 'Le Pradet', 'La Seyne', 'Siblas',
];

// Score basé sur les critères réels du profil (100 pts max)
export function computeScoreDetailed(annonce, profil) {
  const criteria = [];

  // Prix max (35 pts)
  let ptsP = 0;
  if (annonce.prix <= profil.prixMax) ptsP = 35;
  else if (annonce.prix <= profil.prixMax * 1.15) ptsP = 18;
  else if (annonce.prix <= profil.prixMax * 1.30) ptsP = 7;
  criteria.push({
    label: 'Budget',
    pts: ptsP, max: 35,
    met: ptsP === 35,
    partial: ptsP > 0 && ptsP < 35,
    detail: ptsP === 35
      ? `${annonce.prix.toLocaleString('fr-FR')} € ≤ ${profil.prixMax.toLocaleString('fr-FR')} €`
      : `${annonce.prix.toLocaleString('fr-FR')} € > ${profil.prixMax.toLocaleString('fr-FR')} €`,
  });

  // Quartier (25 pts)
  let ptsQ = 0;
  let quartierDetail = '';
  if (!profil.quartiers?.length) {
    ptsQ = 25; quartierDetail = 'Tout Toulon accepté';
  } else {
    const qOk = profil.quartiers.some(q =>
      annonce.quartier.toLowerCase().includes(q.toLowerCase()) ||
      q.toLowerCase().includes(annonce.quartier.toLowerCase())
    );
    ptsQ = qOk ? 25 : 0;
    quartierDetail = qOk ? `${annonce.quartier} — dans votre sélection` : `${annonce.quartier} — hors sélection`;
  }
  criteria.push({ label: 'Quartier', pts: ptsQ, max: 25, met: ptsQ === 25, partial: false, detail: quartierDetail });

  // Pièces (20 pts)
  const diff = Math.abs(annonce.pieces - profil.pieces);
  const ptsR = diff === 0 ? 20 : diff === 1 ? 12 : diff === 2 ? 5 : 0;
  criteria.push({
    label: 'Pièces',
    pts: ptsR, max: 20,
    met: diff === 0, partial: diff > 0 && ptsR > 0,
    detail: `${annonce.pieces} pièce${annonce.pieces > 1 ? 's' : ''} — souhaité : ${profil.pieces}`,
  });

  // Type de bien (15 pts)
  const typeOk = profil.typeBien === 'Appartement'
    ? annonce.type.startsWith('Appartement')
    : annonce.type.startsWith('Maison');
  criteria.push({
    label: 'Type de bien',
    pts: typeOk ? 15 : 0, max: 15,
    met: typeOk, partial: false,
    detail: `${annonce.type} — souhaité : ${profil.typeBien}`,
  });

  // Achat / Location (5 pts)
  const alOk = profil.achatLocation === 'Achat / Location' || annonce.achatLocation === profil.achatLocation;
  criteria.push({
    label: 'Achat / Location',
    pts: alOk ? 5 : 0, max: 5,
    met: alOk, partial: false,
    detail: annonce.achatLocation,
  });

  const total = Math.min(100, criteria.reduce((s, c) => s + c.pts, 0));
  return { criteria, total };
}

export function computeScore(annonce, profil) {
  return computeScoreDetailed(annonce, profil).total;
}

const DESCRIPTIONS_ANNONCE = [
  'Beau bien lumineux avec vue dégagée. Cuisine ouverte entièrement équipée, parquet chêne, double vitrage. Très bon état général. Libre de suite.',
  'Idéalement situé au cœur du quartier, à proximité immédiate des commerces et transports en commun. Copropriété bien entretenue, charges raisonnables.',
  'Intérieur soigné, rénovation récente (cuisine, salle de bain). Exposition sud, luminosité optimale toute la journée. Cave et parking inclus.',
  'Résidence sécurisée avec digicode. Prestations soignées : parquet massif, volets roulants électriques, cuisine aménagée et équipée.',
  'Spacieux et très lumineux avec terrasse privative. Proche de toutes commodités. Idéal pour famille ou investissement locatif à fort rendement.',
];

// Génération déterministe (pas de Math.random, prix cohérent surface × prixM2)
const genAnnonces = () => {
  const types = ['Appartement T2', 'Appartement T3', 'Appartement T4', 'Maison T3', 'Maison T4'];
  const quartiers = QUARTIERS_TOULON;
  const etages = ['RDC', '1er', '2ème', '3ème', '4ème', '5ème', '6ème'];
  const jours = ['03','07','10','14','18','22','25','28'];
  const mois  = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const imgs = [
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80',
    'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=400&q=80',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80',
    'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=400&q=80',
    'https://images.unsplash.com/photo-1628744448840-55bdb2497bd4?w=400&q=80',
  ];
  return Array.from({ length: 24 }, (_, i) => {
    const surface = 30 + (i * 7 % 110);
    const prixM2  = 2900 + (i * 113 % 3500);
    const prix    = surface * prixM2;
    const type    = types[i % types.length];
    const quartier = quartiers[i % quartiers.length];
    const dateAnnonce = `${jours[i % jours.length]}/${mois[(i * 3) % mois.length]}/2025`;
    return {
      id: i + 1,
      prix,
      prixM2,
      surface,
      type,
      quartier,
      pieces:        1 + (i % 5),
      etage:         etages[i % etages.length],
      img:           imgs[i % imgs.length],
      niveau:        1 + (i % 3),
      achatLocation: i % 3 === 0 ? 'Location' : 'Achat',
      description:   DESCRIPTIONS_ANNONCE[i % DESCRIPTIONS_ANNONCE.length],
      dateAnnonce,
    };
  });
};

export const QUARTIERS_LIST = QUARTIERS_TOULON;

const DEFAULT_PROFIL = {
  pieces: 3,
  quartiers: [],
  prixMax: 350000,
  mensualiteMax: 1200,
  typeBien: 'Appartement',
  achatLocation: 'Achat',
  environnement: ['Ville'],
};

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [favoris, setFavoris] = useState(() => {
    try { return JSON.parse(localStorage.getItem('immo_favoris') || '[]'); }
    catch { return []; }
  });
  const [annonces] = useState(genAnnonces);
  const [theme, setTheme] = useState('light');
  const [profil, setProfil] = useState(() => {
    try { return JSON.parse(localStorage.getItem('immo_profil') || 'null') || DEFAULT_PROFIL; }
    catch { return DEFAULT_PROFIL; }
  });

  const toggleFavori = (annonce) => {
    setFavoris(prev =>
      prev.find(f => f.id === annonce.id)
        ? prev.filter(f => f.id !== annonce.id)
        : [...prev, annonce]
    );
  };

  const isFavori = (id) => favoris.some(f => f.id === id);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  // Persistance localStorage
  useEffect(() => { localStorage.setItem('immo_favoris', JSON.stringify(favoris)); }, [favoris]);
  useEffect(() => { localStorage.setItem('immo_profil',  JSON.stringify(profil));  }, [profil]);

  // keep body class in sync
  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <AppContext.Provider value={{ user, setUser, favoris, toggleFavori, isFavori, profil, setProfil, annonces, theme, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
