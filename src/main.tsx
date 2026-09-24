import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// La PWA (service worker) met à jour son cache en arrière-plan dès qu'un
// nouveau déploiement est en ligne, mais un onglet déjà ouvert continue de
// faire tourner l'ancien JavaScript déjà chargé en mémoire tant qu'il n'est
// pas rechargé — ce qui peut mélanger ancien code et nouvelles données de
// façon incohérente (observé sur l'onglet "Soins"/"Nouveau soin"). Dès que
// le nouveau service worker prend le contrôle, on recharge la page une
// seule fois pour repartir sur des bases saines.
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
