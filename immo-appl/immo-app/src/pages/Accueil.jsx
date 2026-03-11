import { useState } from 'react';
import Navbar from '../components/Navbar';
import AnnonceCard from '../components/AnnonceCard';
import Dashboard from '../components/Dashboard';
import { useApp, computeScore } from '../context/AppContext';
import './Accueil.css';

const TRI_OPTIONS = [
  { value: 'score',      label: 'Score ↓' },
  { value: 'prix-asc',   label: 'Prix ↑' },
  { value: 'prix-desc',  label: 'Prix ↓' },
  { value: 'surface',    label: 'Surface ↓' },
];

const TRI_OPTIONS_AGENT = [
  { value: 'prix-asc',   label: 'Prix ↑' },
  { value: 'prix-desc',  label: 'Prix ↓' },
  { value: 'surface',    label: 'Surface ↓' },
];

export default function Accueil() {
  const { annonces, loadingAnnonces, profil, user } = useApp();
  const isAcheteur = user?.profil === 'Acheteur';

  const [filtre, setFiltre] = useState('tous');
  const [tri, setTri]       = useState(isAcheteur ? 'score' : 'prix-desc');

  const annoncesScored = annonces.map(a => ({ ...a, score: computeScore(a, profil) }));

  const topCount    = annoncesScored.filter(a => a.score >= 85).length;
  const moyenCount  = annoncesScored.filter(a => a.score >= 60 && a.score < 85).length;
  const faibleCount = annoncesScored.filter(a => a.score < 60).length;
  const avgScore    = Math.round(annoncesScored.reduce((s, a) => s + a.score, 0) / annoncesScored.length);

  const filtered = annoncesScored.filter(a => {
    if (filtre === 'top')    return a.score >= 85;
    if (filtre === 'moyen')  return a.score >= 60 && a.score < 85;
    if (filtre === 'faible') return a.score < 60;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (tri === 'score')     return b.score - a.score;
    if (tri === 'prix-asc')  return a.prix - b.prix;
    if (tri === 'prix-desc') return b.prix - a.prix;
    if (tri === 'surface')   return b.surface - a.surface;
    return 0;
  });

  return (
    <div className="accueil-wrapper">
      <Navbar />
      <div className="accueil-content">

        <Dashboard />

        {/* ── Bannière contextuelle ── */}
        {isAcheteur ? (
          <div className="welcome-banner welcome-acheteur">
            <div className="wb-left">
              <div className="wb-title">Bonjour {user?.login} 🏡</div>
              <div className="wb-sub">
                Votre recherche · {profil.typeBien} · {profil.pieces} pièces ·{' '}
                budget {profil.prixMax.toLocaleString('fr-FR')} €
              </div>
            </div>
            <div className="wb-stats">
              <div className="wb-stat">
                <span className="wb-stat-val wb-green">{topCount}</span>
                <span className="wb-stat-label">Top match</span>
              </div>
              <div className="wb-stat">
                <span className="wb-stat-val">{avgScore}</span>
                <span className="wb-stat-label">Score moyen</span>
              </div>
              <div className="wb-stat">
                <span className="wb-stat-val">{annonces.filter(a => a.prix <= profil.prixMax).length}</span>
                <span className="wb-stat-label">Dans budget</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="welcome-banner welcome-agent">
            <div className="wb-left">
              <div className="wb-title">Vue marché 💼 · {user?.login}</div>
              <div className="wb-sub">
                643 transactions DVF · Toulon 2023–2024 · Prix moyen 3 547 €/m²
              </div>
            </div>
            <div className="wb-stats">
              <div className="wb-stat">
                <span className="wb-stat-val wb-orange">{annonces.length}</span>
                <span className="wb-stat-label">Annonces actives</span>
              </div>
              <div className="wb-stat">
                <span className="wb-stat-val">8</span>
                <span className="wb-stat-label">Quartiers</span>
              </div>
              <div className="wb-stat">
                <span className="wb-stat-val">68j</span>
                <span className="wb-stat-label">Délai moyen</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Filtres + Tri ── */}
        <div className="filtres-section">
          <div className="filtres-row">
            <button
              className={`filtre-btn ${filtre === 'tous' ? 'active-all' : ''}`}
              onClick={() => setFiltre('tous')}
            >
              Toutes ({annoncesScored.length})
            </button>

            {isAcheteur && (
              <>
                <button
                  className={`filtre-btn btn-green ${filtre === 'top' ? 'active' : ''}`}
                  onClick={() => setFiltre(filtre === 'top' ? 'tous' : 'top')}
                >
                  ✓ 100% Critères ({topCount})
                </button>
                <button
                  className={`filtre-btn btn-yellow ${filtre === 'moyen' ? 'active' : ''}`}
                  onClick={() => setFiltre(filtre === 'moyen' ? 'tous' : 'moyen')}
                >
                  ~ Partiels ({moyenCount})
                </button>
                <button
                  className={`filtre-btn btn-red ${filtre === 'faible' ? 'active' : ''}`}
                  onClick={() => setFiltre(filtre === 'faible' ? 'tous' : 'faible')}
                >
                  ✗ Faible ({faibleCount})
                </button>
              </>
            )}
          </div>

          <div className="tri-wrap">
            <label className="tri-label">Trier par</label>
            <select
              className="tri-select"
              value={tri}
              onChange={e => setTri(e.target.value)}
            >
              {(isAcheteur ? TRI_OPTIONS : TRI_OPTIONS_AGENT).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loadingAnnonces ? (
          <div className="empty-state"><p>Chargement des annonces...</p></div>
        ) : (
          <>
            <div className="annonces-grid">
              {sorted.map(annonce => (
                <AnnonceCard key={annonce.id} annonce={annonce} />
              ))}
            </div>
            {sorted.length === 0 && (
              <div className="empty-state">
                <p>Aucune annonce pour ce filtre.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
