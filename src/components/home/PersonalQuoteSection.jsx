import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const PersonalQuoteSection = ({ content = {} }) => {
  const quoteText = content.quoteText || (content.quoteLine1 && content.quoteLine2 ? content.quoteLine1 + " " + content.quoteLine2 : "Cela fait une quinzaine d'années que je teste ce type d'outils — c'est mon métier. Mais depuis six ans, pas une seconde l'envie de quitter Notion. Aujourd'hui, je me lance, j'aimerais vous le présenter ✨✨✨");
  const showCta = content.showCta || false;
  const ctaText = content.ctaText || "En savoir plus";
  const ctaUrl = content.ctaUrl || "#";
  const backgroundColor = content.backgroundColor || "";
  const useDefaultBackground = content.useDefaultBackground !== false;

  const sectionStyle = useDefaultBackground 
    ? { backgroundColor: '#000000' } 
    : backgroundColor 
      ? { backgroundColor } 
      : { backgroundColor: '#000000' };

  return (
    <section 
      className="py-16 md:py-24 text-white flex items-center justify-center"
      style={sectionStyle}
    >
      <div className="container mx-auto px-4 text-center max-w-3xl">
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.5 }}
          className="text-2xl md:text-3xl font-semibold leading-relaxed whitespace-pre-line mb-8"
        >
          {quoteText}
        </motion.p>
        
        {showCta && ctaText && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true, amount: 0.5 }}
            className="mt-8"
          >
            <Button 
              asChild
              className="bg-white text-black hover:bg-gray-100 px-8 py-3 text-lg font-medium rounded-full"
            >
              <a href={ctaUrl} target={ctaUrl.startsWith('http') ? '_blank' : '_self'}>
                {ctaText}
              </a>
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default PersonalQuoteSection;