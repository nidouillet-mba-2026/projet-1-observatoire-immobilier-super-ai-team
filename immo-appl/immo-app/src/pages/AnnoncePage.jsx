import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useApp, computeScoreDetailed } from '../context/AppContext';
import './AnnoncePage.css';

function getScoreColor(score) {
  if (score >= 85) return 'green';
  if (score >= 60) return 'yellow';
  return 'red';
}

const QUARTIER_INFO = {
  'Mourillon':         { habitants: 25400,  prixMoyenM2: 4800, evol5ans: 12.4,  rendement: 3.2 },
  'Centre-Ville':      { habitants: 31200,  prixMoyenM2: 4120, evol5ans: 8.6,   rendement: 4.1 },
  'Saint-Jean du Var': { habitants: 18700,  prixMoyenM2: 3680, evol5ans: 9.2,   rendement: 4.5 },
  'La Rode':           { habitants: 14300,  prixMoyenM2: 3420, evol5ans: 5.8,   rendement: 4.8 },
  'Pont du Las':       { habitants: 16800,  prixMoyenM2: 3180, evol5ans: -1.2,  rendement: 5.2 },
  'Le Pradet':         { habitants: 12600,  prixMoyenM2: 3050, evol5ans: 11.3,  rendement: 4.0 },
  'La Seyne':          { habitants: 66400,  prixMoyenM2: 2890, evol5ans: -0.8,  rendement: 5.8 },
  'Siblas':            { habitants: 9200,   prixMoyenM2: 2640, evol5ans: -3.3,  rendement: 6.1 },
};

export default function AnnoncePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { annonces, profil, toggleFavori, isFavori } = useApp();

  const annonce = annonces.find(a => a.id === Number(id));
  if (!annonce) {
    return (
      <div className="ap-wrapper">
        <Navbar />
        <div className="ap-content">
          <p style={{ padding: 40, color: 'var(--gray-500)' }}>Annonce introuvable.</p>
        </div>
      </div>
    );
  }

  const favori  = isFavori(annonce.id);
  const { criteria, total: score } = computeScoreDetailed(annonce, profil);
  const color   = getScoreColor(score);
  const qInfo   = QUARTIER_INFO[annonce.quartier] || { habitants: 0, prixMoyenM2: 0, evol5ans: 0, rendement: 0 };

  const handleCopy = () => navigator.clipboard.writeText(window.location.href);

  return (
    <div className="ap-wrapper">
      <Navbar />
      <div className="ap-content">

        <button className="ap-back" onClick={() => navigate(-1)}>
          ← Retour aux annonces
        </button>

        {/* Hero */}
        <div className="ap-hero">
          <img src={annonce.img} alt={annonce.type} />
          <div className="ap-hero-overlay">
            <div className={`ap-score-pill score-bg-${color}`}>{score} pts</div>
            <span className={`ap-al-pill ap-al-${annonce.achatLocation === 'Location' ? 'loc' : 'ach'}`}>
              {annonce.achatLocation}
            </span>
          </div>
        </div>

        {/* Carte principale */}
        <div className="ap-card">

          {/* Prix + actions */}
          <div className="ap-price-row">
            <div>
              <p className="ap-price">{annonce.prix.toLocaleString('fr-FR')} €</p>
              <p className="ap-prixm2">{annonce.prixM2.toLocaleString('fr-FR')} €/m²</p>
            </div>
            <div className="ap-actions">
              <button
                className={`ap-fav-btn ${favori ? 'ap-fav-active' : ''}`}
                onClick={() => toggleFavori(annonce)}
              >
                {favori ? '♥ Sauvegardé' : '♡ Sauvegarder'}
              </button>
              <button className="ap-share-btn" onClick={handleCopy} title="Copier le lien">
                🔗
              </button>
            </div>
          </div>

          <p className="ap-type">{annonce.type}</p>

          {/* Description */}
          {annonce.description && (
            <p className="ap-description">{annonce.description}</p>
          )}

          {/* Grille stats */}
          <div className="ap-grid">
            <div className="ap-stat">
              <div className="ap-stat-label">Surface</div>
              <div className="ap-stat-value">{annonce.surface} m²</div>
            </div>
            <div className="ap-stat">
              <div className="ap-stat-label">Pièces</div>
              <div className="ap-stat-value">{annonce.pieces}</div>
            </div>
            <div className="ap-stat">
              <div className="ap-stat-label">Étage</div>
              <div className="ap-stat-value">{annonce.etage}</div>
            </div>
            <div className="ap-stat">
              <div className="ap-stat-label">Quartier</div>
              <div className="ap-stat-value ap-stat-sm">{annonce.quartier}</div>
            </div>
          </div>

          {/* Données du quartier */}
          <div className="ap-quartier-section">
            <h4 className="ap-quartier-title">Données du quartier · {annonce.quartier}</h4>
            <div className="ap-qs-grid">
              <div className="ap-qs-item">
                <div className="ap-qs-label">Ancienneté annonce</div>
                <div className="ap-qs-value">{annonce.dateAnnonce}</div>
              </div>
              <div className="ap-qs-item">
                <div className="ap-qs-label">Nombre d'habitants</div>
                <div className="ap-qs-value">{qInfo.habitants.toLocaleString('fr-FR')}</div>
              </div>
              <div className="ap-qs-item">
                <div className="ap-qs-label">Prix moyen au m²</div>
                <div className="ap-qs-value">{qInfo.prixMoyenM2.toLocaleString('fr-FR')} €/m²</div>
              </div>
              <div className="ap-qs-item">
                <div className="ap-qs-label">Évolution sur 5 ans</div>
                <div className={`ap-qs-value ${qInfo.evol5ans >= 0 ? 'ap-qs-green' : 'ap-qs-red'}`}>
                  {qInfo.evol5ans >= 0 ? '+' : ''}{qInfo.evol5ans} %
                </div>
              </div>
              <div className="ap-qs-item">
                <div className="ap-qs-label">Rendement moyen</div>
                <div className="ap-qs-value">{qInfo.rendement} %</div>
              </div>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="ap-score-section">
            <div className="ap-score-header">
              <span className="ap-score-title">Correspondance profil</span>
              <span className={`ap-score-total score-txt-${color}`}>{score} / 100</span>
            </div>
            <div className="ap-score-bar-track">
              <div className={`ap-score-bar-fill fill-${color}`} style={{ width: `${score}%` }} />
            </div>

            <div className="ap-criteria-list">
              {criteria.map((c, i) => (
                <div key={i} className="ap-criterion">
                  <div className="ap-criterion-left">
                    <span className={`ap-criterion-dot ${c.met ? 'dot-green' : c.partial ? 'dot-yellow' : 'dot-red'}`} />
                    <span className="ap-criterion-label">{c.label}</span>
                    <span className="ap-criterion-detail">{c.detail}</span>
                  </div>
                  <div className="ap-criterion-right">
                    <div className="ap-crit-mini-track">
                      <div
                        className={`ap-crit-mini-fill ${c.met ? 'fill-green' : c.partial ? 'fill-yellow' : 'fill-red'}`}
                        style={{ width: `${(c.pts / c.max) * 100}%` }}
                      />
                    </div>
                    <span className="ap-crit-pts">{c.pts}/{c.max}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
