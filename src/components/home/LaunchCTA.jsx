import React from 'react';
    import { motion } from 'framer-motion';
    import { Link } from 'react-router-dom';
    import { Button } from '@/components/ui/button';
    import { Heart, Send } from 'lucide-react';

    const LaunchCTA = () => {
      const today = new Date('2025-08-26');
      const launchDate = new Date('2025-09-01');

      // Pour l'affichage, on va fixer la date au 1er septembre 2025 comme demandé
      const displayDate = new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(launchDate);

      return (
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-orange-500 to-amber-400 opacity-80"></div>
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10"
            style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}
          ></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="max-w-3xl mx-auto text-center bg-white/10 backdrop-blur-lg rounded-2xl p-8 md:p-12 border border-white/20 shadow-2xl"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Heart className="w-16 h-16 mx-auto mb-6 text-white drop-shadow-lg" />
              </motion.div>
              
              <p className="text-lg font-medium text-white/90 mb-4">
                Nous sommes le {displayDate},
              </p>
              
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                Je démarre mon activité et j'ai faim de vous présenter mon outil !
              </h2>
              
              <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
                Alors s'il vous plaît, n'hésitez pas, faites quelques heures de formation, contactez-moi !
              </p>
              
              <Link to="/contact">
                <Button 
                  size="lg" 
                  className="bg-white text-orange-600 hover:bg-white/90 hover:text-orange-700 transition-all duration-300 transform hover:scale-105 text-lg font-bold shadow-lg pulse-glow-white"
                >
                  Contactez-moi !
                  <Send className="ml-3 w-5 h-5" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      );
    };

    export default LaunchCTA;