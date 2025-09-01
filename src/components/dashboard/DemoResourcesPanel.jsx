import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Folder, File, Star, Download } from 'lucide-react';

const getIconForType = (type) => {
    switch (type.toLowerCase()) {
        case 'template':
        case 'guide':
            return <Folder className="w-5 h-5 text-primary" />;
        default:
            return <File className="w-5 h-5 text-primary" />;
    }
};

const StarRating = ({ rating, onAction }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        stars.push(
            <Star
                key={i}
                className={`w-4 h-4 cursor-pointer ${
                    rating && i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/50'
                }`}
                onClick={() => onAction('noter une ressource')}
            />
        );
    }
    return <div className="flex items-center space-x-1">{stars}</div>;
};

const DemoResourcesPanel = ({ resources }) => {
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
            transition={{ duration: 0.5, delay: 0.1 }}
        >
            <Card className="glass-effect">
                <CardHeader>
                    <CardTitle className="flex items-center"><Folder className="w-5 h-5 mr-2 text-primary" />Mes Ressources</CardTitle>
                    <CardDescription>Tous les documents et modèles partagés.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {resources.map((resource) => (
                            <div key={resource.id} className="bg-secondary/50 rounded-lg p-3 flex flex-wrap items-center justify-between gap-4 hover:bg-secondary transition-colors">
                                <div className="flex items-center gap-3">
                                    {getIconForType(resource.type)}
                                    <div>
                                        <h4 className="font-medium">{resource.name}</h4>
                                        <p className="text-sm text-muted-foreground">{resource.type} • {resource.format}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <StarRating rating={resource.rating} onAction={handleDisabledFeature} />
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDisabledFeature('télécharger une ressource')}>
                                        <Download className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default DemoResourcesPanel;