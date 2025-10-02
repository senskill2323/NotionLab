import React from 'react';
import { motion } from 'framer-motion';
import { LifeBuoy } from 'lucide-react';

const SupportSection = ({ content = {} }) => {
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.2
      }
    }
  };
  const itemVariants = {
    hidden: {
      y: 20,
      opacity: 0
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100
      }
    }
  };
  const badgeLabel = content.badgeLabel || 'Votre Bouée de Sauvetage Notion';
  const title = content.title || 'Ne restez jamais bloqué.';
  const subtitle = content.subtitle || "Le vrai \"plus\" de mon projet, c'est un système qui vous aide! Vous avez une ligne directe avec un expert Notion, et j'espère à la longue, plusieurs passionnés qui me rejoindront. Rejoignez des milliers d'utilisateurs qui ont déjà révolutionné leur organisation avec Notion. Economisez du temps et de l'énergie en recevant au minimum des astuces pour commencer proprement sur Notion.";
  const imageUrl = content.imageUrl || 'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/capture-daa-c-cran-2025-08-24-235707-02xTj.png';
  const imageAlt = content.imageAlt || 'Un expert Notion souriant, pret a vous accompagner';
  return <section className="py-20 md:py-32 bg-gray-900 text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent"></div>
      <div className="container mx-auto px-4 relative z-10">
        <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{
        once: true,
        amount: 0.5
      }} className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div variants={itemVariants}>
            <div className="mb-4">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/30">
                <LifeBuoy className="w-5 h-5 mr-2" />
                {badgeLabel}
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
              {title}
            </h2>
            <p className="text-xl text-gray-300 mb-8">{subtitle}</p>
          </motion.div>

          <motion.div variants={itemVariants} className="relative h-full min-h-[400px]">
            <img alt={imageAlt} className="w-full h-full object-cover rounded-3xl shadow-2xl shadow-primary/20" src={imageUrl} />
          </motion.div>
        </motion.div>
      </div>
    </section>;
};
export default SupportSection;