const demoDashboardLayout = {
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
        { colId: "demo-col-formations", moduleKey: "client_formations", span: 12 },
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

const demoDashboardData = {
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
  },
  formations: {
    enrolments: [
      {
        id: "formation-crm",
        title: "Workspace CRM et pipeline ventes",
        status: "En cours",
        lastActivity: "Il y a 2 jours",
        nextStep: "Atelier pipeline mardi 14h",
        type: "formation",
      },
      {
        id: "formation-ops",
        title: "Operations asynchrones d equipe",
        status: "A relancer",
        lastActivity: "Il y a 9 jours",
        nextStep: "Ouvrir le module Automatisations",
        type: "formation",
      },
    ],
    customJourneys: [
      {
        id: "journey-onboarding",
        title: "mon premier parcours de formation personnalise",
        status: "Brouillon",
        updatedAt: "2025-03-10",
      },
    ],
  },
  kpis: {
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
        title: "Comment je fais pour voir mes taches depuis le telephone?",
        priority: "Haut",
        status: "En cours",
        createdAt: "2025-03-14T09:30:00.000Z",
        lastReplyAt: "2025-03-17T08:15:00.000Z",
        assignedTo: "Equipe support",
      },
      {
        id: "ticket-blueprint",
        reference: "NL-4812",
        title: "Besoin d aide avec le module de note IA de Notion svp!",
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
        title: "Comment creer une relation de base de donnees",
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
        label: "mes outils informatiques",
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
        label: "Mes connaissances en informatique...",
        status: "scheduled",
        description: "19 mars - 14h00 (Teams)",
      },
    ],
  },
  assistant: {
    usage: {
      sessionsThisWeek: 7,
      averageDuration: "04:32",
    },
    prompts: [
      "Comment je fais une relation entre un contact et un projet ?",
      "Comment je cree une nouvelle base de donnees ?",
      "Pourquoi ma tache n apparait pas dans ma vue de base de donnee ?",
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

export { demoDashboardLayout, demoDashboardData };
export default demoDashboardData;

