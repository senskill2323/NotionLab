export const demoDashboardLayout = {
  rows: [
    {
      rowId: "demo-row-hero",
      columns: [
        { colId: "demo-col-hero", moduleKey: "client_homepage", span: 12 },
      ],
    },
    {
      rowId: "demo-row-learning",
      columns: [
        { colId: "demo-col-formations", moduleKey: "client_formations", span: 7 },
        { colId: "demo-col-kpi", moduleKey: "client_kpi", span: 5 },
      ],
    },
    {
      rowId: "demo-row-support",
      columns: [
        { colId: "demo-col-tickets", moduleKey: "client_tickets", span: 6 },
        { colId: "demo-col-resources", moduleKey: "client_resources", span: 6 },
      ],
    },
    {
      rowId: "demo-row-preferences",
      columns: [
        {
          colId: "demo-col-preferences",
          moduleKey: "client_training_preferences",
          span: 6,
        },
        {
          colId: "demo-col-assistant",
          moduleKey: "client_ai_assistant",
          span: 6,
        },
      ],
    },
    {
      rowId: "demo-row-blueprints",
      columns: [
        { colId: "demo-col-blueprints", moduleKey: "client_blueprints", span: 12 },
      ],
    },
  ],
};

export const demoDashboardData = {
  user: {
    firstName: "Alex",
    lastName: "Martin",
    defaultPseudo: "alex.demo",
    role: "Operations manager",
  },
  homepage: {
    hero: {
      headline: "Bienvenue dans votre espace client",
      subHeadline:
        "Continuez votre progression Notion et suivez les chantiers en temps reel.",
      upcomingSession: {
        title: "Atelier Automatisations avancees",
        coach: "Nina (Coach NotionLab)",
        scheduledAt: "2025-03-19T14:00:00.000Z",
      },
    },
    highlights: [
      {
        id: "highlight-formation",
        label: "Module actif",
        value: "Certification Notion Pro",
        description: "Session 2 disponible",
      },
      {
        id: "highlight-ticket",
        label: "Support",
        value: "1 ticket en suivi",
        description: "Derniere reponse il y a 3h",
      },
      {
        id: "highlight-blueprint",
        label: "Nouveau blueprint",
        value: "Pilotage OKR",
        description: "Version 2025 prete",
      },
    ],
    quickLinks: [
      {
        id: "link-builder",
        label: "Essayer le builder de formation",
        description: "Creez un parcours sur mesure en 5 minutes.",
      },
      {
        id: "link-request",
        label: "Planifier un point avec un coach",
        description: "Choisissez un horaire qui vous convient.",
      },
    ],
  },
  formations: {
    enrolments: [
      {
        id: "formation-crm",
        title: "Workspace CRM et pipeline ventes",
        status: "En cours",
        lastActivity: "Il y a 2 jours",
        nextStep: "Atelier pipeline mardi 14h",
        progress: 68,
        type: "formation",
      },
      {
        id: "formation-ops",
        title: "Operations asynchrones d equipe",
        status: "A relancer",
        lastActivity: "Il y a 9 jours",
        nextStep: "Ouvrir le module Automatisations",
        progress: 32,
        type: "formation",
      },
    ],
    customJourneys: [
      {
        id: "journey-onboarding",
        title: "Parcours onboarding interne",
        status: "Brouillon",
        updatedAt: "2025-03-10",
      },
    ],
  },
  kpis: {
    mood: {
      value: "motive",
      label: "Motivation elevee",
      emoji: "🚀",
    },
    metrics: [
      {
        id: "kpi-open-tickets",
        label: "Nombre de tickets ouverts",
        value: "1",
        subtitle: "en cours cote support",
        trend: 0,
        color: "orange",
      },
      {
        id: "kpi-modules-completed",
        label: "Nombre de modules termines",
        value: "3",
        subtitle: "sur les 4 modules assignes",
        trend: 12,
        color: "green",
      },
      {
        id: "kpi-formations-completed",
        label: "Nombre de formations terminees",
        value: "2",
        subtitle: "sur les 5 formations actives",
        trend: 5,
        color: "blue",
      },
      {
        id: "kpi-voice-conversations",
        label: "Nombre de conversations vocales avec l IA",
        value: "7",
        subtitle: "sur les 30 derniers jours",
        trend: 18,
        color: "purple",
      },
    ],
  },
  tickets: {
    items: [
      {
        id: "ticket-automation",
        reference: "NL-4821",
        title: "Automatiser la creation de comptes clients",
        priority: "Haut",
        status: "En cours",
        createdAt: "2025-03-14T09:30:00.000Z",
        lastReplyAt: "2025-03-17T08:15:00.000Z",
        assignedTo: "Equipe support",
      },
      {
        id: "ticket-blueprint",
        reference: "NL-4812",
        title: "Question sur le blueprint OKR 2025",
        priority: "Moyen",
        status: "A traiter",
        createdAt: "2025-03-15T16:20:00.000Z",
        lastReplyAt: "2025-03-16T10:45:00.000Z",
        assignedTo: "Nina",
      },
      {
        id: "ticket-mobile",
        reference: "NL-4701",
        title: "Vue mobile tableau de bord",
        priority: "Bas",
        status: "Archive",
        createdAt: "2025-02-28T11:45:00.000Z",
        lastReplyAt: "2025-03-01T09:10:00.000Z",
        assignedTo: "Nathan",
      },
    ],
    openStatuses: ["En cours", "A traiter"],
  },
  resources: {
    items: [
      {
        id: "resource-crm",
        title: "Template CRM - Edition equipe",
        type: "Template",
        format: "Notion",
        category: "CRM",
        lastUpdated: "2025-03-08",
        rating: 5,
        size: "1.2 MB",
      },
      {
        id: "resource-checklist",
        title: "Checklist onboarding client",
        type: "Guide",
        format: "PDF",
        category: "Onboarding",
        lastUpdated: "2025-03-04",
        rating: 4,
        size: "850 KB",
      },
    ],
  },
  trainingPreferences: {
    progress: 72,
    steps: [
      {
        id: "step-profile",
        label: "Profil equipe",
        status: "done",
        description: "Equipe et objectifs renseignes",
      },
      {
        id: "step-survey",
        label: "Questionnaire de cadrage",
        status: "done",
        description: "Reponses valides",
      },
      {
        id: "step-workshop",
        label: "Atelier de lancement",
        status: "scheduled",
        description: "19 mars - 14h00 (Teams)",
      },
    ],
  },
  assistant: {
    usage: {
      sessionsThisWeek: 7,
      averageDuration: "04:32",
      savedTime: "1h20",
    },
    prompts: [
      "Comment je fais une relation entre un contact et un projet ?",
      "Comment je cree une nouvelle base de donnees ?",
      "Pourquoi ma tache n apparait pas dans ma vue de base de donnee ?",
    ],
    lastUpdates: [
      {
        id: "assistant-update-1",
        title: "Nouveaux prompts proposes",
        description: "Le module Assistant suggere maintenant des prompts selon la formation active.",
      },
      {
        id: "assistant-update-2",
        title: "Export conversation",
        description: "Telechargez vos echanges en PDF pour les partager en interne.",
      },
    ],
  },
  blueprints: {
    items: [
      {
        id: "blueprint-okr",
        title: "Structure de mon Notion",
        updatedAt: "2025-03-09",
        status: "Public",
        description: "Structure pour aligner objectifs et resultats par equipe.",
      },
      {
        id: "blueprint-hub",
        title: "Structure page d equipe Notion",
        updatedAt: "2025-03-05",
        status: "Brouillon",
        description: "Espace centralise pour onboarder vos nouvelles recrues.",
      },
      {
        id: "blueprint-support",
        title: "Amelioration prevue Notion",
        updatedAt: "2025-02-27",
        status: "Publie",
        description: "Suivi des tickets, ressources et FAQ equipe support.",
      },
    ],
  },
};
