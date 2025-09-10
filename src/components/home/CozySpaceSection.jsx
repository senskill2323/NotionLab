import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Star, Crown, Zap, Heart, Trophy, Gift, Gem, Shield, Rocket } from 'lucide-react';

const CozySpaceSection = ({ content = {}, previewMode = 'desktop' }) => {
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

  // Provide dynamic content with safe fallbacks (backward compatible)
  const badgeText = content.badgeText ?? 'Votre Espace Privilégié';
  const badgeIconName = content.badgeIcon ?? 'Sparkles';
  const titleText = content.title ?? 'Installez-vous confortablement dans votre espace de formation';
  const descriptionText = content.description ?? "J'ai mis le paquet sur votre espace personnel. Contrairement à d'autres plateformes, ici, tout est pensé pour être une extension de votre propre espace de travail. C'est un lieu pour apprendre, expérimenter et interagir, sans jamais vous sentir perdu.";
  const imageUrl = content.imageUrl ?? 'https://images.unsplash.com/photo-1590177600178-c2597bd63ea7';
  const imageAlt = content.imageAlt ?? "Un espace de travail moderne et confortable avec un ordinateur portable ouvert sur une application de formation";
  const showBadge = content.showBadge !== false; // default true
  const isPreviewDesktop = previewMode === 'desktop';

  // Map icon name to component
  const iconMap = {
    Sparkles, Star, Crown, Zap, Heart, Trophy, Gift, Gem, Shield, Rocket
  };
  const BadgeIcon = iconMap[badgeIconName] || Sparkles;

  const titleSizeClass = isPreviewDesktop ? 'text-5xl' : 'text-4xl';
  const imageMinH = isPreviewDesktop ? 'min-h-[400px]' : 'min-h-[300px]';

  return (
    <section className={`py-20 ${isPreviewDesktop ? 'md:py-32' : ''} bg-gray-900 text-white overflow-hidden relative`}>
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      <div className="absolute inset-0 bg-gradient-to-bl from-secondary/20 via-transparent to-transparent"></div>
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          className={`grid ${isPreviewDesktop ? 'md:grid-cols-2' : ''} gap-12 items-center`}
        >
          <motion.div variants={itemVariants}>
            {showBadge && (
              <div className="mb-4">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-secondary/50 text-white border border-secondary/30">
                  <BadgeIcon className="w-5 h-5 mr-2" />
                  {badgeText}
                </span>
              </div>
            )}
            <h2 className={`${titleSizeClass} font-extrabold mb-6 leading-tight`}>
              {titleText}
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              {descriptionText}
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className={`relative h-full ${imageMinH}`}>
            <img
              alt={imageAlt}
              className="w-full h-full object-cover rounded-3xl shadow-2xl shadow-secondary/20"
              src={imageUrl}
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CozySpaceSection;