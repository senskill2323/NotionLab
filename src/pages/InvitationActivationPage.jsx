import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const extractTokensFromHash = () => {
  if (typeof window === "undefined") {
    return null;
  }
  const hash = window.location.hash;
  if (!hash || hash.length < 2) {
    return null;
  }
  const params = new URLSearchParams(hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const type = params.get("type");
  if (!accessToken || !refreshToken) {
    return null;
  }
  return { accessToken, refreshToken, type };
};

const InvitationActivationPage = () => {
  const navigate = useNavigate();
  const { user, authReady, refreshUser } = useAuth();
  const { toast } = useToast();
  const [checkingSession, setCheckingSession] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });
  const [sessionError, setSessionError] = useState(null);

  useEffect(() => {
    const tokens = extractTokensFromHash();
    if (!tokens) {
      setCheckingSession(false);
      return;
    }

    const applyTokens = async () => {
      const { accessToken, refreshToken } = tokens;
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        setSessionError("Le lien d\'activation est invalide ou expiré. Merci de demander une nouvelle invitation.");
      } else if (!data?.session) {
        setSessionError("Impossible d\'initialiser la session d\'activation.");
      } else {
        await refreshUser();
      }
      if (typeof window !== "undefined") {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
      setCheckingSession(false);
    };

    applyTokens();
  }, [refreshUser]);

  useEffect(() => {
    if (user?.profile) {
      setFormData((prev) => ({
        ...prev,
        firstName: user.profile.first_name || prev.firstName,
        lastName: user.profile.last_name || prev.lastName,
      }));
    }
  }, [user]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (processing) return;
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Les mots de passe ne correspondent pas", description: "Merci de vérifier votre saisie.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Session manquante", description: "Nous n\'avons pas pu identifier votre invitation. Merci de réessayer via l\'e-mail reçu.", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const updatePayload = {
        password: formData.password,
        data: {
          first_name: formData.firstName || null,
          last_name: formData.lastName || null,
        },
      };
      const { error: updateUserError } = await supabase.auth.updateUser(updatePayload);
      if (updateUserError) {
        throw updateUserError;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName || null,
          last_name: formData.lastName || null,
          status: 'active',
        })
        .eq('id', user.id);
      if (profileError) {
        throw profileError;
      }

      await refreshUser();
      toast({ title: "Compte activé", description: "Bienvenue ! Ton espace client est prêt." });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast({ title: "Erreur", description: err.message || "Impossible d\'activer le compte.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const showForm = authReady && user && user.profile?.status !== 'active';
  const alreadyActive = authReady && user && user.profile?.status === 'active';

  return (
    <>
      <Helmet>
        <title>Activer mon compte</title>
      </Helmet>
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-xl">
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Active ton accès client</CardTitle>
              <CardDescription>Crée ton mot de passe et complète tes informations pour accéder à l\'espace NotionLab.</CardDescription>
            </CardHeader>
            <CardContent>
              {checkingSession ? (
                <div className="flex flex-col items-center gap-4 py-10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Vérification de ton invitation…</p>
                </div>
              ) : sessionError ? (
                <div className="space-y-4">
                  <p className="text-sm text-destructive">{sessionError}</p>
                  <Button onClick={() => navigate('/connexion')} variant="outline">Retour à la connexion</Button>
                </div>
              ) : alreadyActive ? (
                <div className="space-y-4">
                  <p className="text-sm">Ton compte est déjà actif. Tu peux accéder directement à ton tableau de bord.</p>
                  <Button onClick={() => navigate('/dashboard')} className="notion-gradient text-white">Accéder au tableau de bord</Button>
                </div>
              ) : showForm ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input id="firstName" value={formData.firstName} onChange={handleChange('firstName')} autoComplete="given-name" />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Nom</Label>
                      <Input id="lastName" value={formData.lastName} onChange={handleChange('lastName')} autoComplete="family-name" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="password">Mot de passe</Label>
                      <Input id="password" type="password" value={formData.password} onChange={handleChange('password')} autoComplete="new-password" required />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirmation</Label>
                      <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange('confirmPassword')} autoComplete="new-password" required />
                    </div>
                  </div>
                  <Button type="submit" className="notion-gradient text-white w-full" disabled={processing}>
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Activation en cours…
                      </>
                    ) : (
                      'Activer mon compte'
                    )}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Nous n\'avons pas pu récupérer les informations de ton invitation. Merci de cliquer à nouveau sur le lien reçu par e-mail ou de contacter l\'administrateur.</p>
                  <Button onClick={() => navigate('/connexion')} variant="outline">Retour à la connexion</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default InvitationActivationPage;
