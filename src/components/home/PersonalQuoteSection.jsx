import React from 'react';
import { motion } from 'framer-motion';

const PersonalQuoteSection = () => {
  const quoteLine1 = "Cela fait une quinzaine d’années que je teste ce type d’outils — c’est mon métier.";
  const quoteLine2 = "Mais depuis six ans, pas une seconde l’envie de quitter Notion. Aujourd'hui, je me lance, j'aimerais vous le présenter ✨✨✨";

  return (
    <section className="py-16 md:py-24 bg-black text-white flex items-center justify-center">
      <div className="container mx-auto px-4 text-center max-w-3xl">
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.5 }}
          className="text-2xl md:text-3xl font-semibold leading-relaxed mb-2"
        >
          {quoteLine1}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          viewport={{ once: true, amount: 0.5 }}
          className="text-2xl md:text-3xl font-semibold leading-relaxed"
        >
          {quoteLine2}
        </motion.p>
      </div>
    </section>
  );
};

export default PersonalQuoteSection;