                                                                                                                                                                                                                                                                                                                                  import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Login.css';

export default function Login() {
  const { profil, setProfil, setUser } = useApp();

  const [typeBien, setTypeBien] = useState(profil?.typeBien?.toLowerCase() || '');
  const [typeAppartement, setTypeAppartement] = useState(profil?.typeAppartement || []);
  const [budgetMax, setBudgetMax] = useState(profil?.prixMax?.toString() || '');
  const [environnement, setEnvironnement] = useState(profil?.environnement?.[0]?.toLowerCase() || '');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const toggleTypeAppartement = (type) => {
    setTypeAppartement(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const mapTypeBien = (type) => {
    if (type === 'appartement') return 'Appartement';
    if (type === 'maison') return 'Maison';
    return 'Tous';
  };

  const mapEnvironnement = (env) => {
    if (env === 'urbain') return ['Ville', 'Centre-Ville'];
    if (env === 'periurbain') return ['Périurbain', 'Résidentiel'];
    if (env === 'rural') return ['Rural', 'Campagne'];
    return ['Ville'];
  };

  const getPiecesFromTypes = (types) => {
    if (!types.length) return 3;
    const nums = types.map(t => Number.parseInt(t.replace('T', ''), 10));
    return Math.min(...nums);
  };

  const handleSubmit = () => {
    if (!typeBien) {
      setError('Veuillez sélectionner un type de bien.');
      return;
    }
    if ((typeBien === 'appartement' || typeBien === 'les-deux') && typeAppartement.length === 0) {
      setError('Veuillez sélectionner au moins un type d\'appartement.');
      return;
    }
    if (!budgetMax) {
      setError('Veuillez indiquer votre budget maximum.');
      return;
    }
    if (!environnement) {
      setError('Veuillez sélectionner un environnement.');
      return;
    }

    const newProfil = {
      ...profil,
      typeBien: mapTypeBien(typeBien),
      typeAppartement,
      prixMax: Number.parseInt(budgetMax, 10),
      pieces: getPiecesFromTypes(typeAppartement),
      environnement: mapEnvironnement(environnement),
    };

    setProfil(newProfil);
    setUser({ profil: newProfil });
    navigate('/accueil');
  };

  return (
    <div className="login-wrapper">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-header">
          <img src="/logo-toulon-ai.svg" alt="ToulonFINDAI" className="login-logo-svg" />
          <p className="login-subtitle">Trouvez le bien de vos rêves</p>
        </div>

        <div className="login-form">
          <fieldset className="login-field">
            <legend>Je recherche</legend>
            <div className="choice-grid three-cols">
              <button
                type="button"
                className={`choice-btn ${typeBien === 'appartement' ? 'active' : ''}`}
                onClick={() => setTypeBien('appartement')}
              >
                🏢 Appartement
              </button>
              <button
                type="button"
                className={`choice-btn ${typeBien === 'maison' ? 'active' : ''}`}
                onClick={() => setTypeBien('maison')}
              >
                🏡 Maison
              </button>
              <button
                type="button"
                className={`choice-btn ${typeBien === 'les-deux' ? 'active' : ''}`}
                onClick={() => setTypeBien('les-deux')}
              >
                🏘️ Les deux
              </button>
            </div>
          </fieldset>

          {(typeBien === 'appartement' || typeBien === 'les-deux') && (
            <fieldset className="login-field">
              <legend>Type d'appartement</legend>
              <div className="choice-grid four-cols">
                {['T2', 'T3', 'T4', 'T5'].map(type => (
                  <button
                    type="button"
                    key={type}
                    className={`choice-btn small ${typeAppartement.includes(type) ? 'active' : ''}`}
                    onClick={() => toggleTypeAppartement(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="login-field">
            <label htmlFor="budget-input">Budget maximum</label>
            <div className="budget-input">
              <input
                id="budget-input"
                type="number"
                placeholder="Ex: 300000"
                value={budgetMax}
                onChange={e => setBudgetMax(e.target.value)}
              />
              <span className="budget-suffix">€</span>
            </div>
          </div>

          <fieldset className="login-field">
            <legend>Environnement souhaité</legend>
            <div className="choice-grid three-cols">
              <button
                type="button"
                className={`choice-btn ${environnement === 'urbain' ? 'active' : ''}`}
                onClick={() => setEnvironnement('urbain')}
              >
                🏙️ Urbain
              </button>
              <button
                type="button"
                className={`choice-btn ${environnement === 'periurbain' ? 'active' : ''}`}
                onClick={() => setEnvironnement('periurbain')}
              >
                🏘️ Périurbain
              </button>
              <button
                type="button"
                className={`choice-btn ${environnement === 'rural' ? 'active' : ''}`}
                onClick={() => setEnvironnement('rural')}
              >
                🌳 Rural
              </button>
            </div>
          </fieldset>

          {error && <p className="login-error">{error}</p>}

          <button type="button" className="login-submit" onClick={handleSubmit}>
            Rechercher
          </button>
        </div>
      </div>
    </div>
  );
}
