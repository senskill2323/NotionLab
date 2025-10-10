import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Star,
  Crown,
  Zap,
  Heart,
  Trophy,
  Gift,
  Gem,
  Shield,
  Rocket,
} from 'lucide-react';

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

  const badgeText = content.badgeText ?? 'Votre Espace Privilégié';
  const badgeIconName = content.badgeIcon ?? 'Sparkles';
  const titleText =
    content.title ??
    'Installez-vous confortablement dans votre espace de formation';
  const descriptionText =
    content.description ??
    "J'ai mis le paquet sur votre espace personnel. Contrairement à d'autres plateformes, ici, tout est pensé pour être une extension de votre propre espace de travail. C'est un lieu pour apprendre, expérimenter et interagir, sans jamais vous sentir perdu.";
  const imageUrl =
    content.imageUrl ??
    'https://images.unsplash.com/photo-1590177600178-c2597bd63ea7';
  const imageAlt =
    content.imageAlt ??
    "Un espace de travail moderne et confortable avec un ordinateur portable ouvert sur une application de formation";
  const showBadge = content.showBadge !== false;
  const isPreviewDesktop = previewMode === 'desktop';

  const useDefaultBackground = content.useDefaultBackground !== false;
  const backgroundMode =
    content.backgroundMode === 'solid' || content.backgroundMode === 'gradient'
      ? content.backgroundMode
      : 'gradient';
  const solidColor =
    content.solidColor || content.backgroundColor || '#1f2937';
  const gradient =
    content.gradient ||
    content.backgroundGradient ||
    'linear-gradient(135deg, #1f2937 0%, #111827 50%, #0f172a 100%)';

  const backgroundStyle = useDefaultBackground
    ? undefined
    : backgroundMode === 'solid'
      ? { backgroundColor: solidColor }
      : { background: gradient };

  const sectionClasses = [
    'relative',
    'overflow-hidden',
    'py-20',
    'text-white',
    isPreviewDesktop ? 'md:py-32' : null,
    useDefaultBackground ? 'bg-gray-900' : null,
  ]
    .filter(Boolean)
    .join(' ');

  const iconMap = {
    Sparkles,
    Star,
    Crown,
    Zap,
    Heart,
    Trophy,
    Gift,
    Gem,
    Shield,
    Rocket,
  };
  const BadgeIcon = iconMap[badgeIconName] || Sparkles;

  const titleSizeClass = isPreviewDesktop ? 'text-5xl' : 'text-4xl';
  const imageMinH = isPreviewDesktop ? 'min-h-[400px]' : 'min-h-[300px]';

  return (
    <section className={sectionClasses} style={backgroundStyle}>
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-10" />
      {useDefaultBackground && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-secondary/20 via-transparent to-transparent" />
      )}
      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          className={[
            'grid items-center gap-12',
            isPreviewDesktop ? 'md:grid-cols-2' : null,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <motion.div variants={itemVariants}>
            {showBadge && (
              <div className="mb-4">
                <span className="inline-flex items-center rounded-full border border-secondary/30 bg-secondary/50 px-4 py-1.5 text-sm font-medium text-white">
                  <BadgeIcon className="mr-2 h-5 w-5" />
                  {badgeText}
                </span>
              </div>
            )}
            <h2
              className={[
                titleSizeClass,
                'mb-6 font-extrabold leading-tight',
              ].join(' ')}
            >
              {titleText}
            </h2>
            <p className="mb-8 text-xl text-gray-300">{descriptionText}</p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className={['relative h-full', imageMinH].join(' ')}
          >
            <img
              alt={imageAlt}
              className="h-full w-full rounded-3xl object-cover shadow-2xl shadow-secondary/20"
              src={imageUrl}
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CozySpaceSection;
