import React from "react";
import {
  GraduationCap,
  PlusCircle,
  ExternalLink,
  Clock,
  FileEdit,
} from "lucide-react";
import ModuleHeader from "@/components/dashboard/ModuleHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusVariant = (status) => {
  const map = {
    "En cours": "default",
    "A relancer": "secondary",
    Brouillon: "outline",
    Archive: "outline",
  };
  return map[status] ?? "secondary";
};

const DemoFormationsPanel = ({ data, onAction }) => {
  const enrolments = data?.enrolments ?? [];
  const journeys = data?.customJourneys ?? [];

  return (
    <Card className="h-full border border-border/60 shadow-sm">
      <CardContent className="p-4 md:p-5 space-y-4">
        <ModuleHeader
          title="Mes formations"
          Icon={GraduationCap}
          variant="slate"
          iconClassName="text-emerald-500"
          actions={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-8"
                onClick={() => onAction?.("creer un parcours")}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouveau parcours
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => onAction?.("voir le catalogue")}
              >
                Explorer le catalogue
              </Button>
            </div>
          }
        />

        <div className="rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Formation</TableHead>
                <TableHead className="w-[120px]">Statut</TableHead>
                <TableHead className="w-[150px]">Progression</TableHead>
                <TableHead className="w-[160px]">Derniere activite</TableHead>
                <TableHead className="w-[180px]">Prochaine etape</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrolments.map((formation) => (
                <TableRow key={formation.id} className="align-middle">
                  <TableCell className="py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {formation.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Parcours {formation.type ?? "formation"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant={statusVariant(formation.status)}>
                      {formation.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-col gap-1">
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${formation.progress ?? 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formation.progress ?? 0}% complete
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {formation.lastActivity}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-sm text-muted-foreground">
                    {formation.nextStep}
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => onAction?.("poursuivre la formation")}
                      >
                        Reprendre
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onAction?.("modifier la formation")}
                      >
                        <FileEdit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {enrolments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-sm">
                    Aucune formation active dans cette demo.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {journeys.length > 0 && (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Parcours personnalises</p>
                <p className="text-xs text-muted-foreground">
                  Testez la creation de vos propres workflows d apprentissage.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction?.("ouvrir le builder")}
              >
                Ouvrir le builder
              </Button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {journeys.map((journey) => (
                <div
                  key={journey.id}
                  className="rounded-md border border-border/50 bg-background p-3 shadow-sm"
                >
                  <p className="text-sm font-medium">{journey.title}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <Badge variant={statusVariant(journey.status)}>
                      {journey.status}
                    </Badge>
                    <span>MAJ {journey.updatedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DemoFormationsPanel;

