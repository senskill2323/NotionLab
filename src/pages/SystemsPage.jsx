import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Target, Briefcase, Book, Mail, Heart, Trophy, Zap, Mic } from 'lucide-react';
import PartnerHighlight from '@/components/home/PartnerHighlight';

const SystemsPage = () => {
  const systemFeatures = [{
    icon: Briefcase,
    title: 'Gestion de Projets',
    description: 'Centralisez vos projets, de l\'idée à la réalisation, avec des vues Kanban, des timelines et un suivi précis pour ne jamais perdre le fil.',
    imageText: "Un tableau de bord de gestion de projet Kanban complexe avec plusieurs colonnes et des cartes détaillées."
  }, {
    icon: CheckCircle,
    title: 'Gestion de Tâches',
    description: 'Organisez vos journées avec une todo-list intelligente qui relie vos tâches à vos projets et objectifs, pour une productivité sans faille.',
    imageText: "Une liste de tâches personnelles et professionnelles bien organisée sur un ordinateur portable avec des priorités et des dates d'échéance."
  }, {
    icon: Target,
    title: 'CRM Intégré',
    description: 'Suivez chaque interaction client, du premier contact à la fidélisation. Une vue à 360° pour des relations clients plus fortes.',
    imageText: "Un pipeline de vente CRM visuel sur un écran, montrant les différentes étapes du processus de vente."
  }, {
    icon: Book,
    title: 'Ressources & Connaissances',
    description: 'Construisez votre second cerveau. Capturez, organisez et retrouvez facilement toutes les informations importantes pour vous ou votre équipe.',
    imageText: "Une base de connaissances numérique bien structurée avec des articles, des catégories et une fonction de recherche."
  }, {
    icon: Mail,
    title: 'Gestion des E-mails',
    description: 'Transformez votre boîte de réception en un centre de commande. Triez, déléguez et archivez vos communications pour atteindre l\'inbox zéro.',
    imageText: "Une interface de gestion d'e-mails épurée et organisée, visant l'efficacité et le 'zéro inbox'."
  }, {
    icon: Heart,
    title: 'Axes & Sphères de Vie',
    description: 'Équilibrez vos différents domaines de vie (pro, perso, santé, relations) pour un développement personnel et professionnel harmonieux.',
    imageText: "Un tableau de bord personnel affichant un diagramme d'équilibre entre différentes sphères de la vie comme la carrière, la santé et les relations."
  }, {
    icon: Target,
    title: 'Objectifs & Résultats Clés',
    description: 'Définissez des objectifs clairs (OKRs) et suivez vos progrès de manière mesurable pour rester motivé et aligné sur votre vision.',
    imageText: "Un tableau de suivi des objectifs trimestriels avec des barres de progression claires et des résultats clés mesurables."
  }, {
    icon: Trophy,
    title: 'Scoring & Gamification',
    description: 'Rendez vos habitudes et votre progression plus ludiques avec un système de points et de récompenses pour célébrer chaque petite victoire.',
    imageText: "Un système de scoring gamifié avec des points, des niveaux et des badges pour récompenser les accomplissements."
  }];
  return <>
      <Helmet>
        <title>Mon Système de Vie sur Notion | NotionLab</title>
        <meta name="description" content="Découvrez les piliers de mon système de vie sur Notion : gestion de projet, CRM, objectifs, et plus. Une source d'inspiration pour votre propre organisation." />
        <meta property="og:title" content="Mon Système de Vie sur Notion | NotionLab" />
        <meta property="og:description" content="Découvrez les piliers de mon système de vie sur Notion : gestion de projet, CRM, objectifs, et plus. Une source d'inspiration pour votre propre organisation." />
      </Helmet>
      
      <div className="min-h-screen bg-background text-foreground">
        
        <main className="pt-24 md:pt-32">
          {/* Hero Section */}
          <motion.section initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.8
        }} className="container mx-auto px-4 text-center py-12 md:py-20">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
              Un <span className="gradient-text">Écosystème</span> pour une Vie Organisée
            </h1>
            <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground mb-8">Voici les briques fondamentales que j'utilise au quotidien, un système personnel qui s'est amélioré depuis plusieurs années. L'objectif n'est pas de vous vendre mon système, mais de vous inspirer à construire le vôtre, en vous faisant gagner un temps précieux sur la phase d'apprentissage.</p>
            <div className="relative aspect-video max-w-5xl mx-auto rounded-2xl shadow-2xl overflow-hidden glass-effect p-2">
               <img alt="Tableau de bord principal d'un système de vie Notion" className="w-full h-full object-cover rounded-lg" src="https://images.unsplash.com/photo-1658383178431-42985646a636" />
            </div>
          </motion.section>

          {/* Features Sections */}
          <div className="space-y-24 md:space-y-32 my-24 md:my-32">
            {systemFeatures.map((feature, index) => <motion.section key={feature.title} initial={{
            opacity: 0,
            y: 50
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true,
            amount: 0.3
          }} transition={{
            duration: 0.8
          }} className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
                  <div className={`flex flex-col justify-center ${index % 2 === 0 ? 'md:order-1' : 'md:order-2'}`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                        <feature.icon className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-3xl md:text-4xl font-bold">{feature.title}</h3>
                    </div>
                    <p className="text-lg text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <div className={`${index % 2 === 0 ? 'md:order-2' : 'md:order-1'}`}>
                    <div className="glass-effect rounded-2xl p-2 shadow-lg hover:shadow-primary/20 transition-shadow duration-300">
                      <img alt={feature.title} className="rounded-xl aspect-video md:aspect-[4/3] w-full h-full object-cover" src="https://images.unsplash.com/photo-1672582524294-ccb6595580ea" />
                    </div>
                  </div>
                </div>
              </motion.section>)}
          </div>

          <PartnerHighlight />

          {/* Automation CTA Section - Full Width */}
          <motion.section initial={{
          opacity: 0
        }} whileInView={{
          opacity: 1
        }} viewport={{
          once: true,
          amount: 0.5
        }} transition={{
          duration: 1
        }} className="relative w-full h-[70vh] min-h-[500px] flex items-center justify-center text-center text-white overflow-hidden">
            <img alt="Fond abstrait technologique avec des lignes de données lumineuses" className="absolute top-0 left-0 w-full h-full object-cover -z-10" src="https://images.unsplash.com/photo-1695335751363-90ea37f3416b" />
            <div className="absolute top-0 left-0 w-full h-full bg-black/60 bg-gradient-to-t from-black/80 via-black/50 to-transparent -z-10"></div>
            
            <div className="container mx-auto px-4 z-10">
              <motion.div initial={{
              y: 30,
              opacity: 0
            }} whileInView={{
              y: 0,
              opacity: 1
            }} viewport={{
              once: true,
              amount: 0.5
            }} transition={{
              duration: 0.8,
              delay: 0.2
            }}>
                <div className="flex justify-center items-center gap-4 mb-6">
                  <Zap className="w-8 h-8 text-primary" />
                  <Mic className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                  Passez à la <span className="gradient-text">vitesse supérieure</span>
                </h2>
                <p className="text-lg md:text-xl text-white/80 mb-10 max-w-3xl mx-auto">
                  Et si votre système devenait vraiment intelligent ? Grâce à des outils comme n8n, nous pouvons créer des automatisations incroyables. Imaginez simplement parler à votre téléphone pour créer une tâche ou sauvegarder une ressource instantanément dans votre Notion. C'est la prochaine étape de la productivité.
                </p>
                <Link to="/contact">
                  <Button size="lg" className="notion-gradient text-white font-bold hover:opacity-90 shadow-lg hover:shadow-primary/50 transition-all duration-300 transform hover:scale-105 text-lg py-7 px-8">
                    Explorer les automatisations
                    <ArrowRight className="ml-3 w-6 h-6" />
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.section>
        </main>
      </div>
    </>;
};
export default SystemsPage;
