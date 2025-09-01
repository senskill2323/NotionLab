import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const { signInWithPassword, authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (authLoading) return;
    
    const { profile, error } = await signInWithPassword(email, password);

    if (error) {
      toast({
        title: "Erreur de connexion",
        description: error?.message || "Vos identifiants sont incorrects. Veuillez réessayer.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Connexion réussie !",
        description: "Redirection en cours...",
      });
      const isAdmin = ['admin', 'prof', 'owner'].includes(profile?.user_type);
      const isClient = ['client', 'vip'].includes(profile?.user_type);
      
      let destination = '/';
      if (isAdmin) {
        destination = '/admin/dashboard';
      } else if (isClient) {
        destination = '/dashboard';
      }
      
      navigate(destination, { replace: true });
    }
  };

  return (
    <>
      <Helmet>
        <title>Connexion | NotionLab</title>
        <meta name="description" content="Connectez-vous à votre compte NotionLab pour accéder à votre espace." />
      </Helmet>
      
      <div className="min-h-screen">
        <div className="flex items-center justify-center min-h-screen bg-secondary/30 px-4 pt-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            <Card className="glass-effect shadow-2xl shadow-primary/10">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold gradient-text">Heureux de vous revoir !</CardTitle>
                <CardDescription>Connectez-vous pour accéder à votre espace.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="********"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-background/50"
                    />
                  </div>
                  <Button type="submit" className="w-full notion-gradient text-white hover:opacity-90" disabled={authLoading}>
                    {authLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Connexion...
                        </>
                    ) : 'Se connecter'}
                  </Button>
                </form>
                <div className="mt-6 text-center text-sm">
                  <p className="text-muted-foreground">
                    Pas encore de compte ?{' '}
                    <Link to="/inscription" className="font-semibold text-primary hover:underline">
                      Inscrivez-vous
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;