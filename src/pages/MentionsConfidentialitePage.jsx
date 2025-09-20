import React from 'react';
import { Helmet } from 'react-helmet';

const MentionsConfidentialitePage = () => {
  return (
    <div className="container py-8">
      <Helmet>
        <title>Mentions & confidentialité – NotionLab</title>
      </Helmet>
      <h1 className="text-2xl font-semibold mb-4">Mentions & confidentialité</h1>
      <div className="prose prose-sm max-w-none text-foreground/90">
        <p>
          Pour utiliser la voix et la caméra, autorise l’accès à ton micro et, si tu veux me montrer quelque chose, à ta caméra. Tu peux couper ces accès à tout moment.
        </p>
        <p>
          L’assistant vocal fonctionne en temps réel via WebRTC. Les flux audio/vidéo sont traités pour fournir une assistance et ne sont pas enregistrés par l’application. Les documents
          (images/fichiers) que tu envoies sont utilisés pour répondre à ta demande. Évite d’y inclure des informations sensibles.
        </p>
        <p>
          L’affichage des sources est optionnel et n’apparaît que si tu le demandes (“montre les sources”). En cas de documents inaccessibles, l’assistant te prévient : « Je n’ai pas accès à ces documents, je tente une réponse générique. »
        </p>
        <p>
          Une mémoire personnalisée par client peut être conservée pour améliorer les réponses. Elle est stockée côté serveur et mise à jour avec parcimonie. Elle ne contient pas d’informations sensibles.
        </p>
      </div>
    </div>
  );
};

export default MentionsConfidentialitePage;
