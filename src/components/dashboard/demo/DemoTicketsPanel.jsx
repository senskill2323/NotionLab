import React from "react";
import {
  Ticket,
  Plus,
  ExternalLink,
  Clock,
  ShieldAlert,
} from "lucide-react";
import ModuleHeader from "@/components/dashboard/ModuleHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const priorityClass = (priority) => {
  switch (priority) {
    case "Urgent":
    case "Haut":
      return "bg-destructive/10 text-destructive border border-destructive/40";
    case "Moyen":
      return "bg-amber-100 text-amber-900 border border-amber-200";
    default:
      return "bg-blue-100 text-blue-900 border border-blue-200";
  }
};

const formatDate = (isoString) => {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(isoString));
  } catch {
    return "Date a definir";
  }
};

const DemoTicketsPanel = ({ data, onAction }) => {
  const [tab, setTab] = React.useState("open");
  const items = data?.items ?? [];
  const openStatuses = data?.openStatuses ?? ["En cours", "A traiter"];

  const openTickets = React.useMemo(
    () => items.filter((ticket) => openStatuses.includes(ticket.status)),
    [items, openStatuses]
  );
  const archivedTickets = React.useMemo(
    () => items.filter((ticket) => !openStatuses.includes(ticket.status)),
    [items, openStatuses]
  );

  const renderTable = (tickets) => {
    if (tickets.length === 0) {
      return (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Aucun ticket dans cette vue pour la demo.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket</TableHead>
            <TableHead className="w-[120px]">Priorite</TableHead>
            <TableHead className="w-[120px]">Statut</TableHead>
            <TableHead className="w-[140px]">Derniere reponse</TableHead>
            <TableHead className="w-[140px]">Assigne a</TableHead>
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id} className="align-middle">
              <TableCell className="py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{ticket.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {ticket.reference} • cree le {formatDate(ticket.createdAt)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-3">
                <Badge className={`${priorityClass(ticket.priority)} text-xs`}>
                  <ShieldAlert className="mr-1 h-3 w-3" />
                  {ticket.priority}
                </Badge>
              </TableCell>
              <TableCell className="py-3">
                <Badge variant="outline" className="text-xs">
                  {ticket.status}
                </Badge>
              </TableCell>
              <TableCell className="py-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(ticket.lastReplyAt)}
                </div>
              </TableCell>
              <TableCell className="py-3 text-sm text-muted-foreground">
                {ticket.assignedTo}
              </TableCell>
              <TableCell className="py-3 text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onAction?.("ouvrir un ticket")}
                >
                  Voir
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card className="h-full border border-border/60 shadow-sm">
      <CardContent className="p-4 md:p-5 space-y-4">
        <ModuleHeader
          title="Support et tickets"
          Icon={Ticket}
          variant="slate"
          iconClassName="text-orange-500"
          actions={
            <Button
              size="sm"
              className="h-8"
              onClick={() => onAction?.("ouvrir un nouveau ticket")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouveau ticket
            </Button>
          }
        />

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="open">
              En cours ({openTickets.length})
            </TabsTrigger>
            <TabsTrigger value="archive">
              Archives ({archivedTickets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="mt-4">
            {renderTable(openTickets)}
          </TabsContent>
          <TabsContent value="archive" className="mt-4">
            {renderTable(archivedTickets)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DemoTicketsPanel;

