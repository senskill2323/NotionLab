import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'assistant_consent_dismissed_v1';

const ConsentBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY) === '1';
    setVisible(!dismissed);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-3xl m-3 p-3 rounded-md border bg-background shadow-lg">
        <p className="text-sm text-foreground/90">
          Pour utiliser la voix et la caméra, autorise l’accès à ton micro et, si tu veux me montrer quelque chose, à ta caméra. Tu peux couper ces accès à tout moment.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" onClick={dismiss}>Compris</Button>
          <Link to="/mentions-confidentialite" className="text-xs underline text-foreground/80">Mentions & confidentialité</Link>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner;
