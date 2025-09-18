import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Helper to detect the specific Supabase error when an email is already used
  const isDuplicateEmailError = (err) => {
    if (!err) return false;
    const msg = (err.message || '').toLowerCase();
    // Common messages from Supabase/Auth: "User already registered", variations containing "email" and "already"
    return (
      msg.includes('already registered') ||
      (msg.includes('email') && msg.includes('already')) ||
      msg.includes('already exists') ||
      msg.includes('user already')
    );
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setEmailError('');
    setLoading(true);
    const { error } = await signUp(email, password, firstName, lastName);
    if (!error) {
      toast({
        title: "Inscription reçue",
        description: "Merci pour votre inscription, je vais valider votre compte rapidement et vous recevrez une notification par e-mail.",
      });
      navigate('/');
    } else {
      if (error?.code === 'email_already_used') {
        const friendly = "Votre e-mail est déjà utilisé";
        setEmailError(friendly);
        toast({
          title: "Erreur d'inscription",
          description: friendly,
          variant: "destructive",
        });
      } else if (isDuplicateEmailError(error)) {
        const friendly = "Votre e-mail est déjà utilisé";
        setEmailError(friendly);
        toast({
          title: "Erreur d'inscription",
          description: friendly,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur d'inscription",
          description: error.message,
          variant: "destructive",
        });
      }
    }
    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Inscription | NotionLab</title>
        <meta name="description" content="Créez votre compte pour accéder à nos formations Notion." />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-secondary/30 pt-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="glass-effect">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold gradient-text">Créer un compte</CardTitle>
              <CardDescription>Rejoignez NotionLab et maîtrisez Notion.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jean" required />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Dupont" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Votre adresse e-mail"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    required
                  />
                  {emailError && (
                    <p className="text-sm text-destructive mt-1">{emailError}</p>
                  )}
                </div>
                <div className="space-y-2">
                   <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full notion-gradient text-white" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'S\'inscrire'}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Vous avez déjà un compte ?{' '}
                <Link to="/connexion" className="font-semibold text-primary hover:underline">
                  Connectez-vous
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default RegisterPage;