import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const DEFAULT_BACKGROUND = '#000000';
const DEFAULT_SOLID = '#111827';
const DEFAULT_GRADIENT =
  'linear-gradient(135deg, #1f2937 0%, #111827 50%, #0f172a 100%)';

const PersonalQuoteWithImageSection = ({ content = {} }) => {
  const quoteText =
    content.quoteText ||
    "Cela fait une quinzaine d'annees que je teste ce type d'outils - c'est mon metier. Mais depuis six ans, pas une seconde l'envie de quitter Notion. Aujourd'hui, je me lance, j'aimerais vous le presenter.";
  const showCta = Boolean(content.showCta);
  const ctaText = content.ctaText || 'En savoir plus';
  const ctaUrl = content.ctaUrl || '#';
  const useDefaultBackground = content.useDefaultBackground !== false;
  const backgroundMode =
    content.backgroundMode === 'solid' || content.backgroundMode === 'gradient'
      ? content.backgroundMode
      : 'gradient';
  const solidColor =
    content.solidColor ||
    content.backgroundColor ||
    DEFAULT_SOLID;
  const gradient =
    content.gradient ||
    content.backgroundGradient ||
    DEFAULT_GRADIENT;

  const imageUrl = content.imageUrl;
  const imageAlt = content.imageAlt || 'Illustration';
  const showLogo = content.showLogo !== false;
  const logoUrl = content.logoUrl;
  const logoAlt = content.logoAlt || 'Logo';

  const sectionStyle = useDefaultBackground
    ? { backgroundColor: DEFAULT_BACKGROUND }
    : backgroundMode === 'solid'
      ? {
          backgroundColor: solidColor || DEFAULT_SOLID,
          backgroundImage: 'none',
        }
      : {
          background: gradient,
          backgroundColor: solidColor || DEFAULT_BACKGROUND,
        };

  return (
    <section
      className="py-16 md:py-24 text-white"
      style={sectionStyle}
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center gap-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            viewport={{ once: true, amount: 0.5 }}
            className="w-full md:w-1/2 text-center md:text-left space-y-8"
          >
            <p className="text-2xl md:text-3xl font-semibold leading-relaxed whitespace-pre-line">
              {quoteText}
            </p>

            {showCta && ctaText && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                viewport={{ once: true, amount: 0.5 }}
                className="flex justify-center md:justify-start"
              >
                <Button
                  asChild
                  className="bg-white text-black hover:bg-gray-100 px-8 py-3 text-lg font-medium rounded-full"
                >
                  <a
                    href={ctaUrl}
                    target={ctaUrl?.startsWith('http') ? '_blank' : '_self'}
                    rel={ctaUrl?.startsWith('http') ? 'noreferrer' : undefined}
                  >
                    {ctaText}
                  </a>
                </Button>
              </motion.div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            viewport={{ once: true, amount: 0.4 }}
            className="w-full md:w-1/2 flex justify-center"
          >
            <div className="relative w-full max-w-sm">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  className="w-full rounded-2xl object-cover shadow-2xl"
                  loading="lazy"
                />
              ) : (
                <div className="w-full aspect-square rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-sm text-white/70">
                  Ajoutez une image dans l'éditeur pour finaliser ce bloc.
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {showLogo && logoUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
            viewport={{ once: true, amount: 0.5 }}
            className="mt-12 flex justify-center"
          >
            <img
              src={logoUrl}
              alt={logoAlt}
              className="h-16 w-auto object-contain"
              loading="lazy"
            />
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default PersonalQuoteWithImageSection;
