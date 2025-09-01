import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
const FormationBuilderCTA = () => {
  return <section className="py-10 md:py-12 bg-gradient-to-r from-purple-600 to-indigo-700 text-white text-center rounded-lg shadow-lg">
      <div className="container mx-auto px-4">
        <motion.p initial={{
        opacity: 0,
        y: 30
      }} whileInView={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.8,
        ease: "easeOut",
        delay: 0.2
      }} viewport={{
        once: true,
        amount: 0.5
      }} className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">Connectez-vous pour accéder au builder de formation et sélectionnez vos modules</motion.p>
        <motion.div initial={{
        opacity: 0,
        scale: 0.8
      }} whileInView={{
        opacity: 1,
        scale: 1
      }} transition={{
        duration: 0.8,
        ease: "easeOut",
        delay: 0.4
      }} viewport={{
        once: true,
        amount: 0.5
      }}>
          <Link to="/inscription">
            <Button size="lg" className="bg-white text-purple-700 font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">Connectez-vous pour accéder au Builder</Button>
          </Link>
        </motion.div>
      </div>
    </section>;
};
export default FormationBuilderCTA;