import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';

const ConfirmationPage = () => {
  const location = useLocation();
  const hash = location.hash;

  const isError = hash.includes('error');
  const errorDescription = new URLSearchParams(hash.substring(1)).get('error_description');

  return (
    <>
      <Helmet>
        <title>Confirmation de compte | NotionLab</title>
        <meta name="description" content="Page de confirmation de votre compte NotionLab." />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-secondary/30 pt-20">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md px-4"
        >
          <Card className="glass-effect text-center">
            <CardHeader>
              {isError ? (
                <XCircle className="mx-auto h-16 w-16 text-destructive" />
              ) : (
                <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              )}
              <CardTitle className="text-2xl mt-4">
                {isError ? 'Erreur de Confirmation' : 'Compte Confimé !'}
              </CardTitle>
              <CardDescription>
                {isError
                  ? errorDescription || 'Une erreur est survenue. Le lien est peut-être invalide ou a expiré.'
                  : 'Votre compte a été confirmé avec succès. Vous pouvez maintenant vous connecter.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full notion-gradient text-white h-12">
                <Link to="/connexion">
                  {isError ? 'Retourner à l\'accueil' : 'Se connecter'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default ConfirmationPage;