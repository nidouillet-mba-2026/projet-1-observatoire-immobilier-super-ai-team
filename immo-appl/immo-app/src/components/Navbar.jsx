import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Navbar.css';

export default function Navbar() {
  const { user, favoris, theme, toggleTheme } = useApp();
  const navigate = useNavigate();

  const isAcheteur = user?.profil === 'Acheteur';
  const initiales  = user?.login?.slice(0, 2).toUpperCase() || 'US';

  return (
    <nav className={`navbar ${isAcheteur ? 'navbar-acheteur' : 'navbar-agent'}`}>
      <div className="navbar-left">
        <div
          className="navbar-avatar"
          onClick={() => navigate('/profil')}
          title="Mon profil"
        >
          {initiales}
        </div>

        <div className="navbar-profile-pill">
          <span className="profile-emoji">{isAcheteur ? '🏡' : '💼'}</span>
          <span className="profile-label">{isAcheteur ? 'Acheteur' : 'Agent'}</span>
        </div>

        <button
          className="navbar-favoris-btn"
          onClick={() => navigate('/favoris')}
          title="Mes favoris"
        >
          <span>🔖</span>
          {favoris.length > 0 && (
            <span className="favoris-badge">{favoris.length}</span>
          )}
        </button>
      </div>

      <div className="navbar-center" onClick={() => navigate('/accueil')}>
        <span className="navbar-logo">🏠</span>
        <div className="navbar-brand-wrap">
          <span className="navbar-brand">ImmoSearch</span>
          <span className="navbar-brand-sub">Toulon</span>
        </div>
      </div>

      <div className="navbar-right">
        <span className="navbar-login-name">{user?.login}</span>
        <button className="theme-toggle" onClick={toggleTheme} title="Basculer thème">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button className="navbar-logout" onClick={() => navigate('/')}>
          Déconnexion
        </button>
      </div>
    </nav>
  );
}
