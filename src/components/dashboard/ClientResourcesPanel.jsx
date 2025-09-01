import React, { useState, useEffect, useCallback } from 'react';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { useToast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { Loader2, FileText, FileType, Youtube, Download, Trash2, Star } from 'lucide-react';
    import {
      AlertDialog,
      AlertDialogAction,
      AlertDialogCancel,
      AlertDialogContent,
      AlertDialogDescription,
      AlertDialogFooter,
      AlertDialogHeader,
      AlertDialogTitle,
      AlertDialogTrigger,
    } from "@/components/ui/alert-dialog";
    
    const StarRating = ({ resourceId, currentRating, onRate }) => {
      const [hoverRating, setHoverRating] = useState(0);
    
      return (
        <div className="flex items-center gap-1">
          {[...Array(10)].map((_, index) => {
            const ratingValue = index + 1;
            return (
              <Star
                key={ratingValue}
                className={`w-5 h-5 cursor-pointer transition-colors ${
                  ratingValue <= (hoverRating || currentRating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-muted-foreground/50'
                }`}
                onClick={() => onRate(resourceId, ratingValue)}
                onMouseEnter={() => setHoverRating(ratingValue)}
                onMouseLeave={() => setHoverRating(0)}
              />
            );
          })}
        </div>
      );
    };
    
    const ClientResourcesPanel = () => {
      const { user } = useAuth();
      const { toast } = useToast();
      const [resources, setResources] = useState([]);
      const [loading, setLoading] = useState(true);
    
      const fetchResources = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase.rpc('get_assigned_resources_with_ratings', { p_user_id: user.id });
    
        if (error) {
          console.error("Error fetching assigned resources:", error);
          toast({ title: "Erreur", description: "Impossible de charger vos ressources.", variant: "destructive" });
        } else {
          setResources(data);
        }
        setLoading(false);
      }, [user, toast]);
    
      useEffect(() => {
        fetchResources();
    
        const channel = supabase
          .channel(`client_resources_${user?.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_assignments', filter: `user_id=eq.${user?.id}` }, fetchResources)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_ratings', filter: `user_id=eq.${user?.id}` }, fetchResources)
          .subscribe();
    
        return () => supabase.removeChannel(channel);
      }, [fetchResources, user?.id]);
    
      const handleRemoveAssignment = async (assignmentId) => {
        const { error } = await supabase.from('resource_assignments').delete().eq('id', assignmentId);
    
        if (error) {
          toast({ title: "Erreur", description: "Impossible de retirer la ressource.", variant: "destructive" });
        } else {
          toast({ title: "Succès", description: "Ressource retirée de votre tableau de bord.", className: "bg-green-500 text-white" });
        }
      };
    
      const handleRateResource = async (resourceId, rating) => {
        const { error } = await supabase.from('resource_ratings').upsert(
          { resource_id: resourceId, user_id: user.id, rating: rating },
          { onConflict: 'resource_id,user_id' }
        );
    
        if (error) {
          toast({ title: "Erreur", description: "Impossible d'enregistrer votre note.", variant: "destructive" });
        } else {
          toast({ title: "Merci !", description: "Votre note a été enregistrée.", className: "bg-green-500 text-white" });
        }
      };
    
      const getFileIcon = (format) => {
        switch (format) {
          case 'pdf': return <FileType className="w-6 h-6 text-red-500" />;
          case 'youtube': return <Youtube className="w-6 h-6 text-red-600" />;
          case 'internal_note': return <FileText className="w-6 h-6 text-yellow-500" />;
          default: return <FileText className="w-6 h-6 text-gray-500" />;
        }
      };
    
      return (
        <Card className="glass-effect w-full col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center text-base font-semibold">
              <Star className="w-4 h-4 mr-2 text-primary" />
              Vos ressources assignées par le staff!
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : resources.length > 0 ? (
              <div className="space-y-4">
                {resources.map((res) => (
                  <div key={res.assignment_id} className="bg-secondary/50 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      {getFileIcon(res.format)}
                      <div className="flex-1">
                        <p className="font-semibold">{res.name}</p>
                        <p className="text-sm text-muted-foreground">{res.type}</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                        <StarRating resourceId={res.resource_id} currentRating={res.rating} onRate={handleRateResource} />
                        <div className="flex items-center gap-2">
                            {res.format === 'pdf' && (
                                <a href={res.url} target="_blank" rel="noopener noreferrer" download>
                                <Button variant="outline" size="icon"><Download className="w-4 h-4" /></Button>
                                </a>
                            )}
                            {res.format === 'youtube' && (
                                <a href={res.url} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="icon"><Youtube className="w-4 h-4" /></Button>
                                </a>
                            )}
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon"><Trash2 className="w-4 h-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Cette action retirera la ressource de votre tableau de bord. Vous ne la supprimerez pas de la bibliothèque principale.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRemoveAssignment(res.assignment_id)} className="bg-destructive hover:bg-destructive/90">Retirer</AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Aucune ressource ne vous a été assignée pour le moment.</p>
            )}
          </CardContent>
        </Card>
      );
    };
    
    export default ClientResourcesPanel;