import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Zap, Users, ArrowRight } from 'lucide-react';

const PartnerHighlight = () => {
  return (
    <motion.section 
      className="container mx-auto px-4 my-24 md:my-32"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative rounded-3xl overflow-hidden p-8 md:p-12 glass-effect-dark border border-primary/20 shadow-2xl">
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20 opacity-50 -z-10"></div>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="relative h-64 md:h-full rounded-2xl overflow-hidden shadow-lg">
            <img 
              alt="Logo ou visuel de Reverse Entropy, partenaire de NotionLab"
              className="w-full h-full object-cover"
             src="https://images.unsplash.com/photo-1696194988781-a97509b28596" />
            <div className="absolute inset-0 bg-black/30"></div>
            <div className="absolute top-4 right-4 bg-primary/80 text-primary-foreground px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm">
              Partenaire Exclusif
            </div>
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
              <span className="gradient-text">Reverse Entropy:</span><br/> Le Système Ultime
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Découvrez notre partenaire français, Reverse Entropy, qui propose un système de vie Notion tout-en-un, ultra-modulaire et adapté à tous les niveaux. C'est la solution parfaite si vous cherchez un template complet et puissant.
            </p>
            <p className="text-md text-foreground/80 mb-8 italic">
              Mon objectif reste de vous apprendre à construire votre propre système, mais je vous aide volontiers à configurer cette pépite si elle vous correspond !
            </p>
            <Link to="/contact">
              <Button size="lg" className="notion-gradient text-white font-bold hover:opacity-90 shadow-lg hover:shadow-primary/50 transition-all duration-300 transform hover:scale-105 text-lg py-7 px-8">
                Découvrir &amp; Configurer
                <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default PartnerHighlight;