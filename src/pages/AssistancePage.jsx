import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, Monitor, KeyRound, Share2, CheckCircle } from 'lucide-react';

const AssistancePage = () => {
  const tutorialSteps = [
    {
      icon: Download,
      title: "Téléchargez RustDesk",
      description: "Cliquez sur le bouton correspondant à votre système d'exploitation (Windows ou macOS) pour télécharger le fichier d'installation.",
    },
    {
      icon: Monitor,
      title: "Lancez l'application",
      description: "Ouvrez le fichier téléchargé. Aucune installation n'est nécessaire, l'application se lance directement.",
    },
    {
      icon: KeyRound,
      title: "Trouvez votre ID et mot de passe",
      description: "Sur la gauche de l'application, vous verrez un champ 'Votre ID' et un mot de passe (souvent masqué par des points).",
    },
    {
      icon: Share2,
      title: "Partagez vos identifiants",
      description: "Communiquez-moi l'ID et le mot de passe pour que je puisse me connecter à votre ordinateur et vous assister.",
    },
  ];

  return (
    <>
      <Helmet>
        <title>Assistance à distance - Prise en main rapide | NotionLab</title>
        <meta name="description" content="Suivez ce guide simple pour installer RustDesk et permettre une assistance à distance rapide et sécurisée pour vos projets Notion." />
        <meta property="og:title" content="Assistance à distance - Prise en main rapide | NotionLab" />
        <meta property="og:description" content="Suivez ce guide simple pour installer RustDesk et permettre une assistance à distance rapide et sécurisée pour vos projets Notion." />
      </Helmet>
      <div className="min-h-screen">
        <div className="pt-32 pb-16 hero-pattern">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto text-center"
            >
              <div className="inline-block bg-primary/10 p-3 rounded-full mb-6">
                <Share2 className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Assistance à <span className="gradient-text">distance</span>
              </h1>
              <p className="text-xl md:text-2xl text-foreground/80 mb-8 max-w-3xl mx-auto">
                Pour vous aider le plus efficacement possible, nous utilisons RustDesk, un outil de bureau à distance simple, gratuit et sécurisé.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Qu'est-ce que <span className="gradient-text">RustDesk</span> ?
                </h2>
                <div className="text-lg text-foreground/90 space-y-6">
                  <p>
                    RustDesk est une application qui me permet de voir votre écran et de contrôler votre souris (avec votre permission, bien sûr !) pour vous guider directement dans Notion. C'est comme si j'étais à côté de vous, mais à distance.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                      <span><span className="font-semibold">Gratuit et Open Source :</span> Pas de frais cachés, le code est transparent.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                      <span><span className="font-semibold">Sécurisé :</span> La connexion est chiffrée de bout en bout.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                      <span><span className="font-semibold">Simple :</span> Pas besoin d'installation complexe.</span>
                    </li>
                  </ul>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <Card className="glass-effect shadow-2xl text-center p-8 md:p-12">
                  <CardHeader>
                    <div className="w-16 h-16 mx-auto mb-6 notion-gradient rounded-full flex items-center justify-center">
                      <Download className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-3xl">Téléchargement Rapide</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="https://github.com/rustdesk/rustdesk/releases/latest/download/rustdesk-1.2.3-x86_64.exe" target="_blank" rel="noopener noreferrer">
                      <Button size="lg" className="w-full">
                        <img  className="w-6 h-6 mr-2" alt="Windows logo" src="https://images.unsplash.com/photo-1680128369834-3abfc00155fc" />
                        Télécharger pour Windows
                      </Button>
                    </a>
                    <a href="https://github.com/rustdesk/rustdesk/releases/latest/download/rustdesk-1.2.3-aarch64.dmg" target="_blank" rel="noopener noreferrer">
                      <Button size="lg" className="w-full">
                        <img  className="w-6 h-6 mr-2" alt="Apple logo" src="https://images.unsplash.com/photo-1646640889939-9ce432a1f6b7" />
                        Télécharger pour macOS
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>

        <div className="py-20 bg-background/70">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Comment ça <span className="gradient-text">marche ?</span>
              </h2>
              <p className="text-xl text-foreground/80 max-w-3xl mx-auto">
                Suivez ces 4 étapes simples pour démarrer une session d'assistance.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {tutorialSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                >
                  <Card className="glass-effect h-full text-center p-6">
                    <div className="w-16 h-16 mx-auto mb-6 notion-gradient rounded-full flex items-center justify-center">
                      <step.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
             <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="mt-12 text-center"
              >
                <img  className="max-w-2xl mx-auto rounded-lg shadow-lg border border-border" alt="Screenshot of RustDesk application showing ID and password fields" src="https://images.unsplash.com/photo-1688733718722-27b7027a0f5b" />
              </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AssistancePage;
