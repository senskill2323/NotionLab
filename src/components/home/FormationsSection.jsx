import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Video } from 'lucide-react';
import FormationBuilderCTA from '@/components/home/FormationBuilderCTA';

const FormationsSection = () => {
  const [formations, setFormations] = useState([]);
  const [loadingFormations, setLoadingFormations] = useState(true);

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
        <img  alt="Abstract background with geometric shapes" src="https://images.unsplash.com/photo-1687754946970-5ff99224bd70" />
      </div>
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Mes <span className="gradient-text">formations</span>
          </h2>
          <p className="text-xl text-foreground/80 max-w-3xl mx-auto">
            Choisissez la formation qui correspond à votre niveau et vos objectifs.
            Chaque formation est conçue pour vous faire progresser rapidement.
          </p>
        </div>

        {loadingFormations ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {formations.map((formation, index) => (
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
                  <div className="w-full h-24">
                    <img  alt={`Image illustrative pour la formation ${formation.title}`} src="https://images.unsplash.com/photo-1526554779127-cef759318656" />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl">{formation.title}</CardTitle>
                    <CardDescription className="line-clamp-3">{formation.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col justify-end">
                    <div className="space-y-2 mb-4">
                       <div className="flex items-center justify-between">
                         <Badge variant="secondary">{Array.isArray(formation.level) ? formation.level.join(', ') : formation.level}</Badge>
                         <span className="text-sm text-muted-foreground">{formation.duration_text}</span>
                       </div>
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <MapPin className="w-4 h-4 mr-2 text-primary" />
                         <span>{formation.location}</span>
                       </div>
                    </div>
                    <Link to={`/formation/${formation.id}`}>
                      <Button className="w-full" variant="outline">
                        En savoir plus
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
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