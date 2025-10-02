import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LifeBuoy } from 'lucide-react';
import { Link } from 'react-router-dom';

const ContactPage = () => {
  return (
    <>
      <Helmet>
        <title>Contact - Posez vos questions | NotionLab</title>
        <meta name="description" content="Contactez-moi pour toute question sur les formations Notion, un devis personnalisé, ou pour discuter de votre projet." />
      </Helmet>
      <div className="min-h-screen">
        <div className="pt-32 pb-16 flex items-center justify-center" style={{minHeight: '80vh'}}>
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-block bg-primary/10 p-4 rounded-full mb-6">
                <LifeBuoy className="w-12 h-12 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Une question ?
              </h1>
              <p className="text-xl text-foreground/80 max-w-2xl mx-auto mb-8">
                Ouvrez un ticket de support pour nous poser vos questions. Nous vous repondons rapidement !
              </p>
              <p className="text-muted-foreground">
                Utilisez le bouton ci-dessous pour acceder au formulaire de ticket ou contactez-nous a l'adresse support@notionlab.fr.
              </p>
              <div className="mt-6 flex justify-center">
                <Button size="lg" asChild>
                  <Link to="/nouveau-ticket">Creer un ticket de support</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactPage;
