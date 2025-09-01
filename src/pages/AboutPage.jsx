import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Linkedin, Twitter, Briefcase, Award, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
const AboutPage = () => {
  const skills = ['Architecture de Workspace Notion', 'Bases de données complexes', 'Formules et automatisations', 'Intégrations API (N8n, Make)', 'Gestion de projet (PMP)', 'Optimisation de la productivité'];
  const values = [{
    icon: Zap,
    title: 'Pragmatisme',
    description: 'Des solutions concrètes et directement applicables pour des résultats rapides.'
  }, {
    icon: Briefcase,
    title: 'Partenariat',
    description: 'Je travaille avec vous, comme un membre de votre équipe, pour atteindre vos objectifs.'
  }, {
    icon: Award,
    title: 'Excellence',
    description: 'Un engagement constant pour la qualité et la performance de vos systèmes Notion.'
  }];
  return <>
      <Helmet>
        <title>Qui suis-je ? - Expert et Formateur Notion | NotionLab</title>
        <meta name="description" content="Découvrez le parcours de votre expert et formateur Notion. Spécialiste en productivité et organisation pour entrepreneurs et équipes." />
        <meta property="og:title" content="Qui suis-je ? - Expert et Formateur Notion | NotionLab" />
        <meta property="og:description" content="Découvrez le parcours de votre expert et formateur Notion. Spécialiste en productivité et organisation pour entrepreneurs et équipes." />
      </Helmet>

      <div className="min-h-screen">
        <div className="pt-32 pb-16">
          <div className="container mx-auto px-4">
            {/* Hero Section */}
            <section className="grid lg:grid-cols-2 gap-12 items-center mb-20">
              <motion.div initial={{
              opacity: 0,
              x: -50
            }} animate={{
              opacity: 1,
              x: 0
            }} transition={{
              duration: 0.8
            }}>
                <h1 className="text-5xl md:text-7xl font-bold mb-6">
                  Votre <span className="gradient-text">Partenaire</span><br />Productivité
                </h1>
                <p className="text-xl md:text-2xl text-foreground/80 mb-8 max-w-xl">
                  Passionné par l'optimisation des processus, j'aide les entrepreneurs et les équipes à transformer leur chaos organisationnel en systèmes fluides et performants grâce à Notion.
                </p>
                <div className="flex items-center gap-4">
                  <Link to="/formations">
                    <Button size="lg" className="notion-gradient text-white hover:opacity-90">
                      Voir mes formations
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" asChild>
                    <a href="#" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                      <Linkedin className="w-6 h-6" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                      <Twitter className="w-6 h-6" />
                    </a>
                  </Button>
                </div>
              </motion.div>
              <motion.div initial={{
              opacity: 0,
              scale: 0.8
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              duration: 0.8,
              delay: 0.2
            }} className="flex justify-center">
                <div className="w-80 h-80 md:w-96 md:h-96 rounded-full notion-gradient p-2 floating-animation">
                  <img className="w-full h-full rounded-full object-cover" alt="Portrait de l'expert Notion" src="https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/20220223_203437-kuCYp.jpg" />
                </div>
              </motion.div>
            </section>

            {/* My Story Section */}
            <section className="mb-20">
              <motion.div initial={{
              opacity: 0,
              y: 50
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.8
            }}>
                <Card className="glass-effect p-8 md:p-12">
                  <CardContent>
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
                      Mon <span className="gradient-text">Parcours</span>
                    </h2>
                    <div className="max-w-3xl mx-auto text-lg text-foreground/90 space-y-6 text-justify">
                      <p>Je m’appelle Yann. À l’EPFL, je fais parler les données et j’automatise des processus pour que les systèmes travaillent réellement pour les équipes. Pendant des années, j’ai vu la même chose : informations éparpillées, fichiers qui se multiplient, temps perdu à recoller les morceaux. Je cherchais un outil simple, fiable et agréable.</p>
                      <p>Notion a tout changé. J’y ai bâti mon propre “operating system”, puis des espaces robustes branchés à des automatisations (n8n, Notion API, bases reliées, formules claires). Les résultats : plus de clarté, moins de clics, des process qui tiennent dans la durée.

Aujourd’hui, je mets cette expertise au service des entreprises et des indépendants :
clarifier, structurer, automatiser. On part de vos objectifs, on conçoit un système élégant (relations, vues utiles, droits propres) et on ajoute juste ce qu’il faut d’automations pour gagner du temps — sans complexité inutile.</p>
                      <p>Ma promesse

Clarté : un espace qui reflète votre façon de travailler.

Structure : des bases propres qui grandissent bien.

Automations : les tâches répétitives disparaissent.

Envie de passer du chaos à la clarté ? Construisons un Notion beau, précis et connecté.</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </section>

            {/* Skills & Values Section */}
            <section className="grid lg:grid-cols-2 gap-12 mb-20">
              {/* Skills */}
              <motion.div initial={{
              opacity: 0,
              x: -50
            }} animate={{
              opacity: 1,
              x: 0
            }} transition={{
              duration: 0.8,
              delay: 0.2
            }}>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Mes <span className="gradient-text">Compétences</span>
                </h2>
                <div className="flex flex-wrap gap-3">
                  {skills.map((skill, index) => <div key={index} className="bg-secondary text-secondary-foreground font-medium py-2 px-4 rounded-full">
                      {skill}
                    </div>)}
                </div>
              </motion.div>

              {/* Values */}
              <motion.div initial={{
              opacity: 0,
              x: 50
            }} animate={{
              opacity: 1,
              x: 0
            }} transition={{
              duration: 0.8,
              delay: 0.4
            }}>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Mes <span className="gradient-text">Valeurs</span>
                </h2>
                <div className="space-y-6">
                  {values.map((value, index) => <div key={index} className="flex items-start gap-4">
                      <div className="w-12 h-12 notion-gradient rounded-lg flex items-center justify-center flex-shrink-0">
                        <value.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{value.title}</h3>
                        <p className="text-foreground/80">{value.description}</p>
                      </div>
                    </div>)}
                </div>
              </motion.div>
            </section>
          </div>
        </div>
      </div>
    </>;
};
export default AboutPage;