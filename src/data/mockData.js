import React from 'react';

export const mockUser = {
  profile: {
    first_name: "Alex",
    email: "alex.demo@notionlab.ch",
    phone_number: "079 123 45 67",
    postal_code: "1015",
    city: "Lausanne",
  }
};

export const mockFormations = [
  {
    id: 'perfectionnement',
    title: 'Perfectionnement en Notion',
    level: ['Intermédiaire'],
    enrolled_at: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
  },
  {
    id: 'introduction',
    title: 'Introduction à Notion',
    level: ['Débutant'],
    enrolled_at: new Date(new Date().setDate(new Date().getDate() - 20)).toISOString(),
  }
];

export const mockUserParcours = [
    {
        id: 'parcours-1',
        name: 'Mon Parcours Personnalisé',
        created_at: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    }
];

export const mockTickets = [
    {
        id: 1,
        reference_number: 'NL-T8B3Z5',
        title: 'Question sur les bases de données relationnelles',
        priority: 'Haut',
        created_at: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
        status: 'A traiter',
    },
    {
        id: 2,
        reference_number: 'NL-A9C4F6',
        title: 'Comment intégrer une automatisation avec Make ?',
        priority: 'Moyen',
        created_at: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
        status: 'Répondu',
    },
    {
        id: 3,
        reference_number: 'NL-X2Y7H1',
        title: 'Problème d\'affichage sur mobile',
        priority: 'Bas',
        created_at: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
        status: 'Résolu',
    },
    {
        id: 4,
        reference_number: 'NL-P5Q9R2',
        title: 'Optimisation de mon tableau de bord principal',
        priority: 'Urgent',
        created_at: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
        status: 'En cours',
    },
    {
        id: 5,
        reference_number: 'NL-K3L8M4',
        title: 'Export de données vers un fichier CSV',
        priority: 'Moyen',
        created_at: new Date(new Date().setDate(new Date().getDate() - 20)).toISOString(),
        status: 'Abandonné',
    },
];

export const mockConversations = [
    {
        id: 'conv_1',
        guest_email: 'visiteur.curieux@email.com',
        status: 'a_traiter',
        user_type: 'Visiteur',
        summary: 'Bonjour, j\'ai une question sur vos formations...',
        created_at: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    },
    {
        id: 'conv_2',
        guest_email: 'membre.vip@email.com',
        status: 'en_cours',
        user_type: 'Membre VIP',
        summary: 'Merci pour votre réponse rapide ! J\'aurais une autr...',
        created_at: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    },
    {
        id: 'conv_3',
        guest_email: 'ancien.client@email.com',
        status: 'resolu',
        user_type: 'Membre',
        summary: 'Parfait, tout fonctionne. Merci beaucoup !',
        created_at: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString(),
    },
    {
        id: 'conv_4',
        guest_email: null,
        status: 'abandonne',
        user_type: 'Visiteur',
        summary: 'Comment puis-je...',
        created_at: new Date(new Date().setDate(new Date().getDate() - 20)).toISOString(),
    },
    {
        id: 'conv_5',
        guest_email: 'prospect.interesse@email.com',
        status: 'a_traiter',
        user_type: 'Visiteur',
        summary: 'Votre offre pour entreprise m\'intéresse.',
        created_at: new Date(new Date().setHours(new Date().getHours() - 2)).toISOString(),
    },
];

export const mockResources = [
    {
        id: 1,
        name: "Modèle de gestion de projet",
        type: "Template",
        format: "pdf",
        rating: 5,
        url: "#"
    },
    {
        id: 2,
        name: "Checklist pour l'onboarding client",
        type: "Document",
        format: "internal_note",
        rating: 4,
        url: "#"
    },
    {
        id: 3,
        name: "Guide des formules Notion",
        type: "Guide",
        format: "youtube",
        rating: 3,
        url: "#"
    },
    {
        id: 4,
        name: "Introduction à l'API Notion",
        type: "Vidéo",
        format: "youtube",
        rating: 5,
        url: "#"
    }
];