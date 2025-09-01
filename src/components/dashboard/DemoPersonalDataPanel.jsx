import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';

const DemoPersonalDataPanel = ({ user }) => {
    const { toast } = useToast();

    const handleDisabledClick = () => {
        toast({
            title: "Fonctionnalité de démo",
            description: "Pour modifier vos informations, veuillez vous inscrire.",
            variant: "default",
            action: (
              <div className="flex gap-2">
                  <Link to="/connexion"><Button variant="outline" size="sm">Connexion</Button></Link>
                  <Link to="/inscription"><Button size="sm">Inscription</Button></Link>
              </div>
            )
        });
    };
    
    return (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2 text-primary" />
                Mes Informations
              </CardTitle>
              <CardDescription>
                Mettez à jour vos données personnelles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={user.profile.email} readOnly disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number">N° de téléphone</Label>
                  <Input id="phone_number" value={user.profile.phone_number} readOnly disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Code postal</Label>
                  <Input id="postal_code" value={user.profile.postal_code} readOnly disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input id="city" value={user.profile.city} readOnly disabled />
                </div>
                <Button type="button" className="w-full notion-gradient text-white" onClick={handleDisabledClick}>
                  Enregistrer les modifications
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      );
};

export default DemoPersonalDataPanel;