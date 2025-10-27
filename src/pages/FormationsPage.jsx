import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, ArrowRight, MapPin, Loader2, Monitor, Layers } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import FormationBuilderCTA from '@/components/home/FormationBuilderCTA';

// Configuration des modes de formation
const deliveryModeConfig = {
  online: { label: "En ligne", icon: Monitor },
  in_person: { label: "Présentiel", icon: MapPin },
  hybrid: { label: "Hybride", icon: Layers },
};

// Utilitaire pour calculer la durée totale des modules
const getTotalMinutes = (nodes) => {
  if (!nodes || !Array.isArray(nodes)) return 0;
  
  return nodes
    .filter(node => node.type === 'moduleNode')
    .reduce((total, node) => {
      const duration = node.data?.duration || 0;
      return total + (typeof duration === 'number' ? duration : parseInt(duration) || 0);
    }, 0);
};

// Utilitaire pour formater les minutes en heures lisibles
const formatMinutes = (totalMinutes) => {
  if (totalMinutes === 0) return "0 h";
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (minutes === 0) {
    return `${hours} h`;
  } else {
    return `${hours} h ${minutes}`;
  }
};

const FormationsPage = () => {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFormations = async () => {
      setLoading(true);
      const {
        data,
        error
      } = await supabase
        .from('courses')
        .select('*')
        .eq('status', 'live')
        .eq('course_type', 'standard')
        .order('display_order', {
          ascending: true,
          nullsFirst: true
        });

      if (error) {
        console.error("Error fetching formations:", error);
      } else {
        setFormations(data);
      }
      setLoading(false);
    };
    fetchFormations();
  }, []);

  return <>
      <Helmet>
        <title>Formations Notion - Du Débutant à l'Expert | NotionLab</title>
        <meta name="description" content="Découvrez nos formations Notion complètes en cours particuliers. Introduction, Perfectionnement, Avancée, et Expert. Sur place à Lausanne ou en ligne." />
        <meta property="og:title" content="Formations Notion - Du Débutant à l'Expert | NotionLab" />
        <meta property="og:description" content="Découvrez nos formations Notion complètes en cours particuliers. Introduction, Perfectionnement, Avancée, et Expert. Sur place à Lausanne ou en ligne." />
      </Helmet>

      <div className="min-h-screen">
        
        <div className="pt-32 pb-16">
          <div className="container mx-auto px-4">
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.8
          }} className="text-center mb-16">
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Nos <span className="gradient-text">Formations</span>
              </h1>
              <p className="text-xl text-foreground/80 max-w-3xl mx-auto">Progressez à votre rythme, profitez d'un service de ticketing 24h/24., maîtrisez tous les aspects de votre système! </p>
            </motion.div>

            {loading ? <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div> : <div className="grid lg:grid-cols-2 gap-8 mb-16">
                {formations.map((formation, index) => {
                  // Calculer la durée totale des modules
                  const totalMinutes = getTotalMinutes(formation.nodes);
                  const formattedDuration = formatMinutes(totalMinutes);
                  
                  // Obtenir le mode de formation avec fallback
                  const deliveryMode = formation.delivery_mode || 'hybrid';
                  const deliveryModeInfo = deliveryModeConfig[deliveryMode] || deliveryModeConfig.hybrid;
                  const DeliveryIcon = deliveryModeInfo.icon;
                  
                  // Extraire la liste des modules
                  const modulesList = formation.nodes
                    ? formation.nodes
                        .filter(node => node.type === 'moduleNode')
                        .map(node => node.data?.title)
                        .filter(Boolean)
                    : [];
                  
                  return (
                    <motion.div key={formation.id} initial={{
                  opacity: 0,
                  y: 30
                }} animate={{
                  opacity: 1,
                  y: 0
                }} transition={{
                  duration: 0.6,
                  delay: index * 0.1
                }}>
                        <Card className="glass-effect hover:border-primary transition-all duration-300 h-full flex flex-col overflow-hidden">
                          {(formation.cover_image_url || true) && <div className="h-48 w-full overflow-hidden">
                              <img 
                                alt={`Image de la formation ${formation.title}`} 
                                src={formation.cover_image_url || "https://images.unsplash.com/photo-1561555699-c9e7f2eaa4fa"}
                                className="w-full h-full object-cover"
                              />
                            </div>}
                          <CardHeader>
                            <div className="flex items-start justify-between mb-4">
                               <Badge variant="secondary">{Array.isArray(formation.level) ? formation.level.join(', ') : formation.level}</Badge>
                               <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                 <span className="flex items-center gap-1">
                                   <Clock className="w-4 h-4 text-primary" />
                                   {formattedDuration}
                                 </span>
                                 <span className="flex items-center gap-1">
                                   <DeliveryIcon className="w-4 h-4 text-primary" />
                                   {deliveryModeInfo.label}
                                 </span>
                               </div>
                            </div>
                            <CardTitle className="text-2xl mb-2">{formation.title}</CardTitle>
                            <CardDescription className="text-base">
                              {formation.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="flex flex-col flex-grow">
                            <div className="flex-grow mb-6">
                              {modulesList.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-sm font-medium text-muted-foreground">Modules inclus :</h4>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {modulesList.map((moduleTitle, idx) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <span className="text-primary mt-1.5">•</span>
                                        <span>{moduleTitle}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                              <div className="text-2xl font-bold">{formation.price_text}</div>
                              <Link to={`/formation/${formation.id}`}>
                                <Button className="notion-gradient text-white hover:opacity-90">
                                  Voir le programme
                                  <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                  );
                })}
              </div>}

              <div className="mb-16">
                <FormationBuilderCTA />
              </div>

              <motion.div initial={{
              opacity: 0,
              y: 30
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.8,
              delay: 0.4
            }} className="text-center glass-effect rounded-2xl p-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Une offre pour les <span className="gradient-text">Équipes</span> ?
                </h2>
                <p className="text-xl text-foreground/80 mb-8 max-w-2xl mx-auto">Notion pour les équipes, plus simple à mettre en place que n'importe quel ERP, et plus SMART que n'importe quel ERP pour la gestion de projet. </p>
                <Link to="/offre-entreprise">
                  <Button size="lg" variant="outline">Contactez-moi</Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </>;
  };
  export default FormationsPage;