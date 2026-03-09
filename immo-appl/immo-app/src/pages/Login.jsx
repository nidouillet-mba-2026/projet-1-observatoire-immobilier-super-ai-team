import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Login.css';

export default function Login() {
  const [login, setLogin] = useState('');
  const [mdp, setMdp] = useState('');
  const [profil, setProfilType] = useState('');
  const [error, setError] = useState('');
  const { setUser } = useApp();
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!login || !mdp || !profil) {
      setError('Veuillez remplir tous les champs et choisir un profil.');
      return;
    }
    setUser({ login, profil });
    navigate('/accueil');
  };

  return (
    <div className="login-wrapper">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🏠</div>
          <h1 className="login-title">ImmoSearch</h1>
          <p className="login-subtitle">Votre recherche immobilière intelligente</p>
        </div>

        <div className="login-form">
          <div className="login-field">
            <label>Identifiant</label>
            <input
              type="text"
              placeholder="Votre identifiant"
              value={login}
              onChange={e => setLogin(e.target.value)}
            />
          </div>

          <div className="login-field">
            <label>Mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              value={mdp}
              onChange={e => setMdp(e.target.value)}
            />
          </div>

          <div className="login-field">
            <label>Profil</label>
            <div className="profil-choices">
              <button
                className={`profil-btn ${profil === 'Acheteur' ? 'active' : ''}`}
                onClick={() => setProfilType('Acheteur')}
              >
                🏡 Acheteur
              </button>
              <button
                className={`profil-btn ${profil === 'Agent immobilier' ? 'active' : ''}`}
                onClick={() => setProfilType('Agent immobilier')}
              >
                💼 Agent immobilier
              </button>
            </div>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button className="login-submit" onClick={handleSubmit}>
            Se connecter
          </button>
        </div>
      </div>
    </div>
  );
}
