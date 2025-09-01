import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Zap, Users, ArrowRight, Mail } from 'lucide-react';

const EntrepriseOfferPage = () => {
  return (
    <>
      <Helmet>
        <title>Offre pour Entreprises - Solutions sur-mesure | NotionLab</title>
        <meta name="description" content="Découvrez notre future offre pour entreprises, combinant l'expertise Notion avec la puissance de l'automatisation pour transformer vos processus métier." />
      </Helmet>
      <div className="min-h-screen">
        <div className="pt-32 pb-16 hero-pattern">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto text-center"
            >
              <div className="inline-block bg-primary/10 p-3 rounded-full mb-6">
                <Building className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Une offre dédiée aux <span className="gradient-text">Entreprises</span>
              </h1>
              <p className="text-xl md:text-2xl text-foreground/80 mb-8 max-w-3xl mx-auto">
                Nous préparons une solution complète pour optimiser les processus de votre équipe, en alliant la flexibilité de Notion à la puissance de l'automatisation.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Bientôt disponible : <span className="gradient-text">Notion & Automatisation</span>
                </h2>
                <div className="text-lg text-foreground/90 space-y-6">
                  <p>
                    En collaboration avec des partenaires experts en automatisation, nous développons une offre unique pour les entreprises. L'objectif : transformer vos systèmes Notion en véritables moteurs de productivité pour vos équipes.
                  </p>
                  <p>
                    Imaginez des workflows fluides, des tâches répétitives éliminées et une synchronisation parfaite entre Notion et vos autres outils. C'est la promesse de notre future offre.
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <p className="font-semibold">Formation d'équipe</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Zap className="w-5 h-5 text-primary" />
                        </div>
                        <p className="font-semibold">Workflows automatisés</p>
                    </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <Card className="glass-effect shadow-2xl text-center p-8 md:p-12">
                  <CardHeader>
                    <div className="w-16 h-16 mx-auto mb-6 notion-gradient rounded-full flex items-center justify-center">
                      <Mail className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-3xl">Soyez les premiers informés</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/80 mb-8">
                      Cette offre vous intéresse ? Vous souhaitez discuter de la manière dont nous pourrions aider votre entreprise ? Contactez-nous dès aujourd'hui pour en savoir plus.
                    </p>
                    <Link to="/contact">
                      <Button size="lg" className="notion-gradient text-white hover:opacity-90">
                        Manifester mon intérêt
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    </Link>
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

export default EntrepriseOfferPage;