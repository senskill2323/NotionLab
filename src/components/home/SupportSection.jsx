import React from 'react';
import { motion } from 'framer-motion';
import { LifeBuoy } from 'lucide-react';

const BADGE_LABEL_FALLBACK = 'Votre Bouee de Sauvetage Notion';
const BADGE_TEXT_COLOR_FALLBACK = '#2563eb';
const BADGE_BACKGROUND_COLOR_FALLBACK = '#dbeafe';

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
  const badgeConfig = content.badge || {};
  const legacyBadgeLabel =
    typeof content.badgeLabel === 'string' && content.badgeLabel.trim().length > 0
      ? content.badgeLabel.trim()
      : BADGE_LABEL_FALLBACK;
  const badgeLabel =
    typeof badgeConfig.label === 'string' && badgeConfig.label.trim().length > 0
      ? badgeConfig.label.trim()
      : legacyBadgeLabel;
  const showBadge = badgeConfig.enabled !== false;
  const badgeTextColor =
    badgeConfig.textColor && badgeConfig.textColor.trim().length > 0
      ? badgeConfig.textColor.trim()
      : BADGE_TEXT_COLOR_FALLBACK;
  const badgeBackgroundColor =
    badgeConfig.backgroundColor && badgeConfig.backgroundColor.trim().length > 0
      ? badgeConfig.backgroundColor.trim()
      : BADGE_BACKGROUND_COLOR_FALLBACK;
  const renderBadge = showBadge && badgeLabel;
  const title = content.title || 'Ne restez jamais bloqué.';
  const subtitle =
    content.subtitle ||
    "Le vrai \"plus\" de mon projet, c'est un système qui vous aide! Vous avez une ligne directe avec un expert Notion, et j'espère à la longue, plusieurs passionnés qui me rejoindront. Rejoignez des milliers d'utilisateurs qui ont déjà révolutionné leur organisation avec Notion. Economisez du temps et de l'énergie en recevant au minimum des astuces pour commencer proprement sur Notion.";
  const imageUrl =
    content.imageUrl ||
    'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/capture-daa-c-cran-2025-08-24-235707-02xTj.png';
  const imageAlt =
    content.imageAlt || 'Un expert Notion souriant, pret a vous accompagner';

  const useDefaultBackground = content.useDefaultBackground !== false;
  const backgroundMode =
    content.backgroundMode === 'solid' || content.backgroundMode === 'gradient'
      ? content.backgroundMode
      : 'gradient';
  const solidColor = content.solidColor || '#111827';
  const gradient =
    content.gradient ||
    'linear-gradient(135deg, #1f2937 0%, #111827 50%, #0f172a 100%)';

  const backgroundStyle = useDefaultBackground
    ? undefined
    : backgroundMode === 'solid'
      ? { backgroundColor: solidColor }
      : { background: gradient };

  const sectionClassName = [
    'py-20',
    'md:py-32',
    'text-white',
    'overflow-hidden',
    'relative',
    useDefaultBackground ? 'bg-gray-900' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={sectionClassName} style={backgroundStyle}>
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-10" />
      {useDefaultBackground && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
      )}
      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{
            once: true,
            amount: 0.5,
          }}
          className="grid items-center gap-12 md:grid-cols-2"
        >
          <motion.div variants={itemVariants}>
            <div className="mb-4">
              <div className="min-h-[2.25rem]">
                {renderBadge && (
                  <span
                    className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium"
                    style={{
                      color: badgeTextColor,
                      backgroundColor: badgeBackgroundColor,
                      borderColor: badgeTextColor,
                    }}
                  >
                    <LifeBuoy className="mr-2 h-5 w-5" style={{ color: badgeTextColor }} />
                    {badgeLabel}
                  </span>
                )}
              </div>
            </div>
            <h2 className="mb-6 text-4xl font-extrabold leading-tight md:text-5xl">
              {title}
            </h2>
            <p className="mb-8 text-xl text-gray-300">{subtitle}</p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="relative h-full min-h-[400px]"
          >
            <img
              alt={imageAlt}
              className="h-full w-full rounded-3xl object-cover shadow-2xl shadow-primary/20"
              src={imageUrl}
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
export default SupportSection;
