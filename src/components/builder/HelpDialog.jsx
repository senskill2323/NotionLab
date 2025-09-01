import React from 'react';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
    import { Button } from '@/components/ui/button';
    import { HelpCircle, Lightbulb } from 'lucide-react';

    export const HelpDialog = ({ isOpen, onOpenChange }) => {
      return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl">
                <HelpCircle className="w-6 h-6 mr-2 text-primary"/>
                Bienvenue dans le Formation-Builder !
              </DialogTitle>
              <DialogDescription>
                Créez votre parcours de formation sur-mesure en quelques clics.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-sm">
              <p><strong className="text-primary">1. Explorez :</strong> Parcourez les modules dans la barre latérale.</p>
              <p><strong className="text-primary">2. Ajoutez :</strong> Cliquez ou glissez-déposez un module sur le tableau.</p>
              <p><strong className="text-primary">3. Connectez :</strong> Reliez les modules entre eux pour définir votre flux d'apprentissage.</p>
              <p className="flex items-start mt-2"><Lightbulb className="w-5 h-5 mr-2 mt-1 text-yellow-500" /> C'est votre espace, soyez créatif !</p>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>C'est parti !</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    };