import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

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
                <MessageSquare className="w-12 h-12 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Une question ?
              </h1>
              <p className="text-xl text-foreground/80 max-w-2xl mx-auto mb-8">
                Utilisez notre nouveau chat en bas à droite de l'écran pour nous contacter. Nous sommes là pour vous aider !
              </p>
              <p className="text-muted-foreground">
                Cliquez sur l'icône de chat pour commencer la conversation.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactPage;