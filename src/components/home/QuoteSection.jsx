import React from 'react';
import { motion } from 'framer-motion';

const QuoteSection = () => {
  const quoteText = "Deux employeurs, un projet de vie, 4 équipes, dix projets… une seule interface : Notion. Je n’oublie rien, j’organise, je prévois, je libère ma tête. Masterclass Notion — contactez-moi.";
  const backgroundImageUrl = 'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/2b4c9777bf94e4a5f5d5cffcc9da2f69.png';

  return (
    <section className="relative w-full py-20 md:py-32 bg-gray-900 text-white flex items-center justify-center overflow-hidden">
      {/* Chaotic background with low opacity */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.08]"
        style={{ backgroundImage: `url(${backgroundImageUrl})` }}
      ></div>
      {/* Dark overlay to ensure text readability */}
      <div className="absolute inset-0 bg-black/50"></div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <motion.p
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.5 }}
          className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight"
          style={{ textShadow: '0px 4px 15px rgba(0,0,0,0.7)' }}
        >
          {quoteText}
        </motion.p>
      </div>
    </section>
  );
};

export default QuoteSection;