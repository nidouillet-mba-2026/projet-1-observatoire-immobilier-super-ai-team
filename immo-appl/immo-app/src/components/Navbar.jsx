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
        <button
          type="button"
          className="navbar-avatar"
          onClick={() => navigate('/profil')}
          title="Mon profil"
          aria-label="Mon profil"
        >
          {initiales}
        </button>

        <div className="navbar-profile-pill">
          <span className="profile-emoji">{isAcheteur ? '🏡' : '💼'}</span>
          <span className="profile-label">{isAcheteur ? 'Acheteur' : 'Agent'}</span>
        </div>

        <button
          type="button"
          className="navbar-favoris-btn"
          onClick={() => navigate('/favoris')}
          title="Mes favoris"
          aria-label="Mes favoris"
        >
          <span>❤️</span>
          {favoris.length > 0 && (
            <span className="favoris-badge">{favoris.length}</span>
          )}
        </button>
      </div>

      <button
        type="button"
        className="navbar-center"
        onClick={() => navigate('/accueil')}
        aria-label="Accueil"
      >
        <img src="/logo-toulon-ai.svg" alt="ToulonFINDAI" className="navbar-logo-svg" />
      </button>

      <div className="navbar-right">
        <span className="navbar-login-name">{user?.login}</span>
        <button type="button" className="theme-toggle" onClick={toggleTheme} title="Basculer thème" aria-label="Basculer thème">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button type="button" className="navbar-logout" onClick={() => navigate('/')}>
          Déconnexion
        </button>
      </div>
    </nav>
  );
}
