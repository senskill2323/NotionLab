import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Send, AlertCircle, HelpCircle, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CreateTicketPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Moyen'
  });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!user) {
      navigate('/connexion');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePriorityChange = (value) => {
    setFormData(prev => ({ ...prev, priority: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('tickets').insert([
        { 
          title: formData.title, 
          description: formData.description,
          priority: formData.priority,
          user_id: user.id,
          client_email: user.email,
          status: 'A traiter'
        }
      ]);

      if (error) throw error;

      toast({
        title: "Ticket créé avec succès !",
        description: "Votre question a été envoyée. Vous recevrez une réponse sous 24h.",
      });

      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création du ticket.",
        variant: "destructive"
      });
      console.error('Error creating ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Créer un Ticket de Support - Posez votre question | NotionLab</title>
        <meta name="description" content="Créez un ticket de support pour obtenir de l'aide personnalisée sur vos projets Notion. Notre expert vous répond sous 24h." />
        <meta property="og:title" content="Créer un Ticket de Support - Posez votre question | NotionLab" />
        <meta property="og:description" content="Créez un ticket de support pour obtenir de l'aide personnalisée sur vos projets Notion. Notre expert vous répond sous 24h." />
      </Helmet>

      <div className="min-h-screen">
        
        <div className="pt-32 pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
              >
                <Link to="/dashboard">
                  <Button variant="ghost">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour au tableau de bord
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center mb-8"
              >
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  Créer un <span className="gradient-text">Ticket</span>
                </h1>
                <p className="text-xl text-foreground/80">
                  Posez votre question sur vos projets Notion et obtenez une réponse d'expert
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="glass-effect">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <HelpCircle className="w-5 h-5 mr-2 text-primary" />
                      Nouvelle Question
                    </CardTitle>
                    <CardDescription>
                      Décrivez votre problème ou question en détail pour obtenir la meilleure aide possible
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-1">
                            <ShieldAlert className="w-4 h-4" /> Priorité *
                          </label>
                          <Select value={formData.priority} onValueChange={handlePriorityChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Définir la priorité" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Bas">Bas</SelectItem>
                              <SelectItem value="Moyen">Moyen</SelectItem>
                              <SelectItem value="Haut">Haut</SelectItem>
                              <SelectItem value="Urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Titre de votre question *
                          </label>
                          <Input
                            name="title"
                            placeholder="Ex: Comment créer des relations ?"
                            value={formData.title}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Description détaillée *
                        </label>
                        <Textarea
                          name="description"
                          placeholder="Décrivez votre problème en détail :
- Que cherchez-vous à faire ?
- Qu'avez-vous déjà essayé ?
- Quel est le résultat attendu ?
- Captures d'écran ou exemples si possible"
                          value={formData.description}
                          onChange={handleInputChange}
                          className="min-h-[150px]"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Plus votre description est détaillée, plus notre réponse sera précise et utile.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <Button
                          type="submit"
                          className="flex-1 notion-gradient text-white hover:opacity-90"
                          size="lg"
                          disabled={loading}
                        >
                          {loading ? (
                            'Création en cours...'
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Créer le ticket
                            </>
                          )}
                        </Button>
                        <Link to="/dashboard">
                          <Button variant="outline" size="lg" className="w-full sm:w-auto">
                            Annuler
                          </Button>
                        </Link>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-8"
              >
                <Card className="glass-effect">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold mb-2">À propos du support</h3>
                        <ul className="text-muted-foreground text-sm space-y-1">
                          <li>• Réponse garantie sous 24h ouvrées</li>
                          <li>• Support personnalisé par un expert Notion</li>
                          <li>• Conseils adaptés à votre contexte métier</li>
                          <li>• Exemples et captures d'écran inclus dans les réponses</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateTicketPage;