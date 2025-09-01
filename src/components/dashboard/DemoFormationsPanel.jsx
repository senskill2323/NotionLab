import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen, ArrowRight } from 'lucide-react';

const DemoFormationsPanel = ({ formations }) => {
    const { toast } = useToast();

    const handleDisabledFeature = (feature) => {
        toast({
          title: 'Ceci est une démo',
          description: `Pour ${feature}, veuillez vous connecter ou créer un compte.`,
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="glass-effect h-full">
                <CardHeader>
                    <CardTitle className="flex items-center"><BookOpen className="w-5 h-5 mr-2 text-primary" />Mes Formations</CardTitle>
                    <CardDescription>Accédez à toutes vos formations et ressources.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {formations.map((formation) => (
                            <div key={formation.id} className="bg-secondary/50 rounded-lg p-4 flex items-center justify-between hover:bg-secondary transition-colors">
                                <div>
                                    <h4 className="font-medium">{formation.title}</h4>
                                    <p className="text-sm text-muted-foreground">{formation.level?.join(', ')}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleDisabledFeature('accéder à la formation')}>
                                    Accéder <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default DemoFormationsPanel;