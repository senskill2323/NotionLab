import React from 'react';
import { motion } from 'framer-motion';

const MainHeroSection = () => {
  const imageUrl = 'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/2b4c9777bf94e4a5f5d5cffcc9da2f69.png';

  return (
    <div
      className="relative h-screen w-full bg-cover bg-center bg-no-repeat flex flex-col justify-center items-center text-white"
    >
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className="absolute inset-0 bg-black/30"></div>
      
      <div className="relative z-10 flex flex-col h-full w-full max-w-7xl mx-auto px-4">
        {/* Le titre et le texte ont été retirés comme demandé */}
      </div>
    </div>
  );
};

export default MainHeroSection;