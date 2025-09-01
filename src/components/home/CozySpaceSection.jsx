import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const CozySpaceSection = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.3, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 },
    },
  };

  return (
    <section className="py-20 md:py-32 bg-gray-900 text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      <div className="absolute inset-0 bg-gradient-to-bl from-secondary/20 via-transparent to-transparent"></div>
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          className="grid md:grid-cols-2 gap-12 items-center"
        >
          <motion.div variants={itemVariants}>
            <div className="mb-4">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-secondary/10 text-secondary border border-secondary/30">
                <Sparkles className="w-5 h-5 mr-2" />
                Votre Espace Privilégié
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
              Installez-vous confortablement dans votre espace de formation
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              J'ai mis le paquet sur votre espace personnel. Contrairement à d'autres plateformes, ici, tout est pensé pour être une extension de votre propre espace de travail. C'est un lieu pour apprendre, expérimenter et interagir, sans jamais vous sentir perdu.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="relative h-full min-h-[400px]">
            <img 
              alt="Un espace de travail moderne et confortable avec un ordinateur portable ouvert sur une application de formation"
              class="w-full h-full object-cover rounded-3xl shadow-2xl shadow-secondary/20"
             src="https://images.unsplash.com/photo-1590177600178-c2597bd63ea7" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CozySpaceSection;