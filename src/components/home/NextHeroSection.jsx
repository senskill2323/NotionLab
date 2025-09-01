import React from 'react';
import { motion } from 'framer-motion';

const NextHeroSection = () => {
  const imageUrl = 'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/71607495a3aa50d9a0c535cc405818d6.png';

  const titleVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut', delay: 0.2 } },
  };

  return (
    <div
      className="relative h-screen w-full bg-cover bg-center bg-no-repeat flex flex-col justify-center items-center text-white"
    >
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className="absolute inset-0 bg-black/40"></div>
      
      <div className="relative z-10 flex flex-col h-full w-full max-w-7xl mx-auto px-4">
        <div className="flex-grow flex items-center justify-center">
          <motion.h2
            variants={titleVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            className="text-8xl md:text-9xl font-extrabold tracking-tighter text-center text-white mix-blend-overlay"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          >
            V2.0!
          </motion.h2>
        </div>
      </div>
    </div>
  );
};

export default NextHeroSection;