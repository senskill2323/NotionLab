import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import DemoWelcomePanel from "@/components/dashboard/demo/DemoWelcomePanel";
import DemoFormationsPanel from "@/components/dashboard/demo/DemoFormationsPanel";
import DemoKPIPanel from "@/components/dashboard/demo/DemoKPIPanel";
import DemoTicketsPanel from "@/components/dashboard/demo/DemoTicketsPanel";
import DemoResourcesPanel from "@/components/dashboard/demo/DemoResourcesPanel";
import DemoTrainingPreferencesPanel from "@/components/dashboard/demo/DemoTrainingPreferencesPanel";
import DemoAssistantPanel from "@/components/dashboard/demo/DemoAssistantPanel";
import DemoBlueprintsPanel from "@/components/dashboard/demo/DemoBlueprintsPanel";
import { demoDashboardLayout, demoDashboardData } from "@/data/demoDashboardData.js";

const componentMap = {
  client_homepage: DemoWelcomePanel,
  client_formations: DemoFormationsPanel,
  client_kpi: DemoKPIPanel,
  client_tickets: DemoTicketsPanel,
  client_resources: DemoResourcesPanel,
  client_training_preferences: DemoTrainingPreferencesPanel,
  client_ai_assistant: DemoAssistantPanel,
  client_blueprints: DemoBlueprintsPanel,
};

const moduleProps = {
  client_homepage: {
    user: demoDashboardData.user,
    hero: demoDashboardData.homepage.hero,
    kpis: demoDashboardData.kpis,
  },
  client_formations: {
    data: demoDashboardData.formations,
  },
  client_kpi: {
    data: demoDashboardData.kpis,
  },
  client_tickets: {
    data: demoDashboardData.tickets,
  },
  client_resources: {
    data: demoDashboardData.resources,
  },
  client_training_preferences: {
    data: demoDashboardData.trainingPreferences,
  },
  client_ai_assistant: {
    data: demoDashboardData.assistant,
  },
  client_blueprints: {
    data: demoDashboardData.blueprints,
  },
};

const normalizeRow = (row) => {
  if (!row || !Array.isArray(row.columns) || row.columns.length === 0) {
    return { ...row, columns: [] };
  }

  const count = row.columns.length;
  const defaultSpans = {
    1: [12],
    2: [6, 6],
    3: [4, 4, 4],
  };
  const spans = defaultSpans[count] ?? Array(count).fill(Math.floor(12 / count));

  const columns = row.columns.map((col, index) => ({
    ...col,
    span: col.span ?? spans[index] ?? 12,
  }));

  return { ...row, columns };
};

const DemoDashboardPage = () => {
  const { toast } = useToast();

  const handleDemoAction = React.useCallback(
    (feature) => {
      toast({
        title: "Mode demo",
        description:
          feature
            ? `Cette action (${feature}) est disponible apres connexion.`
            : "Connectez-vous pour debloquer toutes les actions.",
        action: (
          <div className="flex gap-2">
            <Link to="/connexion">
              <Button variant="outline" size="sm">
                Connexion
              </Button>
            </Link>
            <Link to="/inscription">
              <Button size="sm">Inscription</Button>
            </Link>
          </div>
        ),
      });
    },
    [toast]
  );

  const greetingName =
    demoDashboardData.user.firstName ??
    demoDashboardData.user.defaultPseudo ??
    "NotionLab";

  return (
    <>
      <Helmet>
        <title>Demo tableau de bord | NotionLab</title>
        <meta
          name="description"
          content="Explorez la demo interactive du tableau de bord client NotionLab."
        />
      </Helmet>
      <div className="min-h-screen">
        <div className="pt-8 pb-6">
          <div className="w-full px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="mb-4"
            >
              <h1 className="text-xl md:text-2xl font-semibold mb-1.5">
                Bonjour{" "}
                <span className="gradient-text">
                  {greetingName}
                </span>{" "}
                !
              </h1>
              <p className="text-xs md:text-sm text-foreground/80 leading-snug">
                Cette page reproduit l experience client. Chaque carte presente les modules disponibles apres connexion.
              </p>
            </motion.div>

            <div className="space-y-3">
              {demoDashboardLayout.rows.map((row) => {
                const normalizedRow = normalizeRow(row);
                if (!normalizedRow.columns.length) {
                  return null;
                }

                return (
                  <div key={normalizedRow.rowId} className="grid grid-cols-12 gap-3">
                    {normalizedRow.columns.map((col) => {
                      const Component = componentMap[col.moduleKey];
                      if (!Component) {
                        return null;
                      }

                      const props = moduleProps[col.moduleKey] ?? {};
                      const span = Math.min(Math.max(col.span ?? 12, 1), 12);

                      return (
                        <div
                          key={col.colId}
                          style={{ gridColumn: `span ${span} / span ${span}` }}
                        >
                          <Component {...props} onAction={handleDemoAction} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DemoDashboardPage;
