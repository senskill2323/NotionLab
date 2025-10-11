import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, FileText, ArrowRight, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export const BuilderWelcomeScreen = ({ userParcours, onCreateNew }) => {
  const navigate = useNavigate();

  const handleOpenParcours = (id) => {
    navigate(`/formation-builder/${id}`);
  };

  const handleReturnToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative"
      >
        <Card className="w-[600px] max-w-[90vw] shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Bienvenue dans le Formation Builder</CardTitle>
            <CardDescription>Que souhaitez-vous faire aujourd'hui ?</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center justify-center p-6 bg-muted/50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Commencer un nouveau parcours</h3>
              <Button onClick={onCreateNew} size="lg">
                <PlusCircle className="w-5 h-5 mr-2" />
                Créer une formation
              </Button>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-4 text-center md:text-left">Ouvrir un projet existant</h3>
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-2">
                  {userParcours && userParcours.length > 0 ? (
                    userParcours.map((parcours) => (
                      <button
                        key={parcours.id}
                        onClick={() => handleOpenParcours(parcours.id)}
                        className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{parcours.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Modifié il y a {formatDistanceToNow(new Date(parcours.updated_at), { locale: fr })}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ))
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-10">
                      <FileText className="w-8 h-8 mx-auto mb-2" />
                      <p>Aucun parcours personnalisé trouvé.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={handleReturnToDashboard}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au tableau de bord
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default BuilderWelcomeScreen;