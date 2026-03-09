import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Login from './pages/Login';
import Accueil from './pages/Accueil';
import Profil from './pages/Profil';
import Favoris from './pages/Favoris';
import AnnoncePage from './pages/AnnoncePage';

function PrivateRoute({ children }) {
  const { user } = useApp();
  return user ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/accueil" element={<PrivateRoute><Accueil /></PrivateRoute>} />
      <Route path="/profil" element={<PrivateRoute><Profil /></PrivateRoute>} />
      <Route path="/favoris" element={<PrivateRoute><Favoris /></PrivateRoute>} />
      <Route path="/annonce/:id" element={<PrivateRoute><AnnoncePage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
