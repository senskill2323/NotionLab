import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Rocket, Sparkles } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="relative bg-background py-20 md:py-32 overflow-hidden">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
            Je suis formateur indépendant Notion et cette plateforme va vous soutenir durant tout votre apprentissage à mes côtés.
          </h1>
          <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground mb-10">
            Mon objectif est de vous rendre autonome et de vous faire gagner un temps précieux sur la phase d'apprentissage de cet outil incroyable.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link to="/demo-dashboard">
              <Button size="lg" className="notion-gradient text-white font-bold hover:opacity-90 shadow-lg hover:shadow-primary/50 transition-all duration-300 transform hover:scale-105">
                <Rocket className="mr-2 h-5 w-5" />
                Voir la démo de l'espace formation 🚀
              </Button>
            </Link>
            <a href="https://www.notion.so/fr" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="font-bold hover:bg-primary/5 hover:text-primary transition-all duration-300 transform hover:scale-105">
                Voir le site officiel de Notion ✨✨
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;