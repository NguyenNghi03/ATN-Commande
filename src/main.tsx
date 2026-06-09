import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { BonDeCommandePage } from './pages/BonDeCommandePage.tsx';
import { isBonDeCommandePage } from './lib/bonDeCommandeUrl.ts';
import './index.css';

function Root() {
  const [bonPage, setBonPage] = useState(() => isBonDeCommandePage());

  useEffect(() => {
    const sync = () => setBonPage(isBonDeCommandePage());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  return bonPage ? <BonDeCommandePage /> : <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
