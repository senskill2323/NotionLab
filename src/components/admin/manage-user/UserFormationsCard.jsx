import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, BookOpen, Plus, Trash2 } from 'lucide-react';

const UserFormationsCard = ({ userFormations, allFormations, isSubmitting, handleAssignFormation, handleRemoveFormation, selectedFormation, setSelectedFormation }) => {
  
  const getFormationTitle = (formationId) => {
    const formation = allFormations.find(f => f.id === formationId);
    return formation ? formation.title : 'Formation inconnue';
  };

  const availableFormations = allFormations.filter(f => !userFormations.includes(f.id));

  return (
    <Card className="glass-effect h-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BookOpen /> Gérer les Formations</CardTitle>
        <CardDescription>Assignez ou retirez des formations pour cet utilisateur.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="font-medium">Formations assignées :</p>
          {userFormations.length > 0 ? (
            <ul className="space-y-2">
              {userFormations.map(formationId => (
                <li key={formationId} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                  <span className="text-sm">{getFormationTitle(formationId)}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveFormation(formationId)} disabled={isSubmitting}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune formation assignée.</p>
          )}
        </div>
        <div className="space-y-2 pt-4 border-t">
          <p className="font-medium">Assigner une nouvelle formation :</p>
          {availableFormations.length > 0 ? (
            <div className="flex items-center gap-2">
              <Select value={selectedFormation} onValueChange={setSelectedFormation}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une formation..." />
                </SelectTrigger>
                <SelectContent>
                  {availableFormations.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAssignFormation} disabled={!selectedFormation || isSubmitting} size="icon">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Toutes les formations sont déjà assignées.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserFormationsCard;