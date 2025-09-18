import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { User, Mail, MapPin, Trash2, ArrowLeft, Key } from 'lucide-react';
import ProfileSection from '@/components/account/ProfileSection';
import AvatarUpload from '@/components/account/AvatarUpload';
import AddressSection from '@/components/account/AddressSection';
import DeleteAccountSection from '@/components/account/DeleteAccountSection';
import PasswordChangeSection from '@/components/account/PasswordChangeSection';

const ClientAccountPage = () => {
  const { user } = useAuth();
  const { hasPermission, ready: permissionsReady } = usePermissions();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const isAdmin = user && ['admin', 'prof', 'owner'].includes(user.profile?.user_type);

  // Determine safest dashboard path to avoid redirect loops for admins without access
  const dashboardPath = isAdmin
    ? ((permissionsReady && hasPermission('admin:access_dashboard')) ? '/admin/dashboard' : '/')
    : '/dashboard';

  const handleBackToDashboard = () => {
    navigate(dashboardPath);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          {/* Bouton Retour au dashboard */}
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={handleBackToDashboard}
              className="flex items-center gap-2 hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au dashboard
            </Button>
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Mes données personnelles
          </h1>
          <p className="text-muted-foreground">
            Gérez vos informations personnelles et paramètres de compte
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section Avatar et Profil */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informations de profil
                  </CardTitle>
                  <CardDescription>
                    Vos informations personnelles et photo de profil
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <AvatarUpload />
                  <Separator />
                  <ProfileSection />
                </CardContent>
              </Card>
            </motion.div>

            {/* Section Adresse */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Adresse
                  </CardTitle>
                  <CardDescription>
                    Cette information est <strong>facultative</strong> et ne sera utilisée que si vous le souhaitez
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AddressSection />
                </CardContent>
              </Card>
            </motion.div>

            {/* Section Changement de mot de passe */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <PasswordChangeSection />
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Informations de compte */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Informations de compte
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Membre depuis
                    </label>
                    <p className="text-sm mt-1">
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Zone de danger */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <Trash2 className="h-5 w-5" />
                    Zone de danger
                  </CardTitle>
                  <CardDescription>
                    Actions irréversibles sur votre compte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DeleteAccountSection />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientAccountPage;
