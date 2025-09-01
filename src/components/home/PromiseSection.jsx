import React from 'react';
import { motion } from 'framer-motion';
import { Users, CalendarDays, Zap } from 'lucide-react';
const PromiseSection = () => <section className="py-20 bg-background/70">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Ma promesse, <span className="gradient-text">simple.</span>
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <motion.div initial={{
        opacity: 0,
        x: -30
      }} whileInView={{
        opacity: 1,
        x: 0
      }} viewport={{
        once: true,
        amount: 0.5
      }} transition={{
        duration: 0.6
      }} className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 notion-gradient rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-4">La passion avant-tout</h3>
          <p className="text-muted-foreground">Je suis juste un passionné de systèmes, et un passionné de Notion. je suis bon pédagogue, et j'ai faim de vous apprendre! </p>
        </motion.div>

        <motion.div initial={{
        opacity: 0,
        y: 30
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true,
        amount: 0.5
      }} transition={{
        duration: 0.6,
        delay: 0.2
      }} className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 notion-gradient rounded-full flex items-center justify-center">
            <CalendarDays className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-4">Premier rendez-vous gratuit</h3>
          <p className="text-muted-foreground">Lancez-vous : aujourd’hui je suis seul, demain l’équipe grandit — mon envie ? Vous former. Le labo est prêt à acceuillir des modérateurs et d'autres experts Notion comme moi. </p>
        </motion.div>

        <motion.div initial={{
        opacity: 0,
        x: 30
      }} whileInView={{
        opacity: 1,
        x: 0
      }} viewport={{
        once: true,
        amount: 0.5
      }} transition={{
        duration: 0.6,
        delay: 0.4
      }} className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 notion-gradient rounded-full flex items-center justify-center">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-4">Support Notion éclair ⚡</h3>
          <p className="text-muted-foreground">Décrivez votre souci, je réponds dans la journée.  Assignéez votre demande à un ticket, un message ou même au forum! Vous aurez de quoi venir les réponses! </p>
        </motion.div>
      </div>
    </div>
  </section>;
export default PromiseSection;