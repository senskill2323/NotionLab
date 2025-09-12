import React, { useState, useEffect } from 'react';

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Monitor, Layers, Clock } from 'lucide-react';
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

const FormationsSection = ({ content = {} }) => {
  const [formations, setFormations] = useState([]);
  const [loadingFormations, setLoadingFormations] = useState(true);
  const title = content.title || 'Mes ';
  const titleSuffix = content.titleSuffix || 'formations';
  const subtitle = content.subtitle || "Choisissez la formation qui correspond à votre niveau et vos objectifs.\n            Chaque formation est conçue pour vous faire progresser rapidement.";
  const backgroundImageUrl = content.backgroundImageUrl || 'https://images.unsplash.com/photo-1687754946970-5ff99224bd70';

  useEffect(() => {
    const fetchFormations = async () => {
      setLoadingFormations(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('status', 'live')
        .eq('course_type', 'standard')
        .order('display_order', { ascending: true, nullsFirst: true })
        .limit(4);

      if (error) {
        console.error('Error fetching formations:', error);
      } else {
        setFormations(data);
      }
      setLoadingFormations(false);
    };
    fetchFormations();
  }, []);

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 z-[-1] opacity-20">
        <img  alt="Abstract background with geometric shapes" src={backgroundImageUrl} />
      </div>
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {title}<span className="gradient-text">{titleSuffix}</span>
          </h2>
          <p className="text-xl text-foreground/80 max-w-3xl mx-auto">
            {subtitle}
          </p>
        </div>

        {loadingFormations ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {formations.map((formation, index) => {
              // Calculer la durée totale des modules
              const totalMinutes = getTotalMinutes(formation.nodes);
              const formattedDuration = formatMinutes(totalMinutes);
              
              // Obtenir le mode de formation avec fallback
              const deliveryMode = formation.delivery_mode || 'hybrid';
              const deliveryModeInfo = deliveryModeConfig[deliveryMode] || deliveryModeConfig.hybrid;
              const DeliveryIcon = deliveryModeInfo.icon;
              
              // Extraire la liste des modules (limitée pour le format compact)
              const modulesList = formation.nodes
                ? formation.nodes
                    .filter(node => node.type === 'moduleNode')
                    .map(node => node.data?.title)
                    .filter(Boolean)
                    .slice(0, 3) // Limiter à 3 modules pour le format compact
                : [];
              
              return (
                <motion.div 
                  key={formation.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="floating-animation"
                  style={{ animationDelay: `${index * 0.5}s` }}
                >
                  <Card className="glass-effect hover:border-primary transition-all duration-300 h-full flex flex-col overflow-hidden">
                    <div className="w-full h-24 overflow-hidden">
                      <img 
                        alt={`Image illustrative pour la formation ${formation.title}`} 
                        src={formation.cover_image_url || "https://images.unsplash.com/photo-1526554779127-cef759318656"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">{Array.isArray(formation.level) ? formation.level.join(', ') : formation.level}</Badge>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-primary" />
                            {formattedDuration}
                          </span>
                          <span className="flex items-center gap-1">
                            <DeliveryIcon className="w-3 h-3 text-primary" />
                            {deliveryModeInfo.label}
                          </span>
                        </div>
                      </div>
                      <CardTitle className="text-lg leading-tight">{formation.title}</CardTitle>
                      <CardDescription className="line-clamp-2 text-sm">{formation.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col justify-end pt-0">
                      {modulesList.length > 0 && (
                        <div className="mb-4">
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {modulesList.map((moduleTitle, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-primary mt-1">•</span>
                                <span className="line-clamp-1">{moduleTitle}</span>
                              </li>
                            ))}
                            {formation.nodes && formation.nodes.filter(node => node.type === 'moduleNode').length > 3 && (
                              <li className="text-xs text-muted-foreground/70 italic">
                                +{formation.nodes.filter(node => node.type === 'moduleNode').length - 3} autres modules
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      <Link to={`/formation/${formation.id}`}>
                        <Button className="w-full" variant="outline">
                          En savoir plus
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
        <div className="mt-16">
          <FormationBuilderCTA />
        </div>
      </div>
    </section>
  );
};

export default FormationsSection;