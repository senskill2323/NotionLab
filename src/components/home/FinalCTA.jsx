import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
const FinalCTA = () => <section className="py-20">
    <div className="container mx-auto px-4">
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
      duration: 0.8
    }} className="max-w-4xl mx-auto text-center glass-effect rounded-2xl p-12">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Boostons vraiment votre <span className="gradient-text">productivité</span> ensemble ?
        </h2>
        <p className="text-xl text-foreground/80 mb-8">Rejoignez des milliers d'utilisateurs qui ont déjà révolutionné leur organisation avec Notion. Economisez du temps et de l'énergie en recevant au minimum des astuces pour commencer proprement sur Notion. Contrairement aux autres professeurs, comme il s'agit d'un axe technologiques, j'ai développé la technologie pour vous supporter pendant votre ascension. je vous promets, j'ai mis le paquet sur l'espace de formation... </p>
        <Link to="/formations">
          <Button size="lg" className="notion-gradient text-white hover:opacity-90">
            Commencer maintenant
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </Link>
      </motion.div>
    </div>
  </section>;
export default FinalCTA;