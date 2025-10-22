import React from 'react';
import { motion } from 'framer-motion';

const AboutSection = () => (
  <section className="py-20">
    <div className="container mx-auto px-4">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -50 }} 
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            De la <span className="gradient-text">Confusion</span> à la <span className="gradient-text">Clarté</span>
          </h2>
          <div className="text-lg text-foreground/90 space-y-6">
            <p>
              Vous jonglez avec une multitude d'outils, de notes éparpillées et de projets qui semblent ne jamais avancer ? Je suis passé par là. C'est cette frustration qui m'a poussé à chercher une solution unique, un véritable cerveau numérique pour mon entreprise.
            </p>
            <p>
              C'est là que Notion a tout changé. J'ai découvert comment organiser ma donnée, centraliser mes projets et processus en un seul endroit. Aujourd'hui, je ne propose pas juste des formations ; je partage les méthodes qui m'ont permis de regagner en sérénité et en efficacité. Mon but ? Vous aider à faire de même.
            </p>
          </div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} 
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, delay: 0.2 }} 
          className="aspect-video rounded-xl overflow-hidden shadow-2xl pulse-glow w-full lg:w-[130%]"
        >
          <img  alt="Exemple d'organisation Notion, montrant un tableau de bord clair et structuré" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1658383178431-42985646a636" />
        </motion.div>
      </div>
    </div>
  </section>
);

export default AboutSection;
