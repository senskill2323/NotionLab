import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';

import UserProfileForm from '@/components/admin/manage-user/UserProfileForm';
import UserSecurityCard from '@/components/admin/manage-user/UserSecurityCard';
import UserFormationsCard from '@/components/admin/manage-user/UserFormationsCard';
import UserLoginHistory from '@/components/admin/manage-user/UserLoginHistory';

const ManageUserPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [allFormations, setAllFormations] = useState([]);
  const [userFormations, setUserFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState('');
  const [userTypes, setUserTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, control, reset, setValue, formState: { isDirty } } = useForm();

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const userPromise = supabase
        .from('profiles')
        .select('*, user_types(id, type_name, display_name)')
        .eq('id', id)
        .single()
        .throwOnError();
      const formationsPromise = supabase
        .from('courses')
        .select('id, title')
        .eq('course_type', 'standard')
        .throwOnError();
      const userFormationsPromise = supabase
        .from('user_formations')
        .select('formation_id')
        .eq('user_id', id)
        .throwOnError();
      const userTypesPromise = supabase
        .from('user_types')
        .select('*')
        .throwOnError();

      const [{ data: profileData }, { data: formationsData }, { data: userFormationsData }, { data: userTypesData }] = await Promise.all([
        userPromise,
        formationsPromise,
        userFormationsPromise,
        userTypesPromise,
      ]);

      const normalizedProfile = {
        ...profileData,
        country_code: profileData?.country_code_ref ?? profileData?.country_code ?? '',
      };

      setUser(normalizedProfile);
      setAllFormations(formationsData);
      setUserFormations(userFormationsData.map(f => f.formation_id));
      setUserTypes(userTypesData);
      reset(normalizedProfile);

    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les données de l\'utilisateur.' });
    } finally {
      setLoading(false);
    }
  }, [id, toast, reset]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);
  
  const onProfileSubmit = async (formData) => {
    setIsSubmitting(true);
    const { user_types, created_at, id: userId, last_sign_in_at, ...profileData } = formData;
    const normalizedCountryCode = profileData.country_code ? profileData.country_code.trim().toUpperCase() : null;
    profileData.country_code = normalizedCountryCode;
    profileData.country_code_ref = normalizedCountryCode;
    try {
      const previousStatus = (user?.status || 'guest');
      const nextStatus = (profileData?.status || 'guest');
      await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', userId)
        .throwOnError();
      toast({ title: 'Succès', description: 'Profil de l\'utilisateur mis à jour.' });
      // If the account has just been activated, notify the user by email (best-effort)
      if (previousStatus !== 'active' && nextStatus === 'active') {
        try {
          const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
          await supabase.functions.invoke('notify-user-account-activated', {
            body: {
              email: user?.email,
              displayName,
              activatedAt: new Date().toISOString(),
            },
          });
        } catch (notifyErr) {
          console.warn('notify-user-account-activated failed:', notifyErr?.message || notifyErr);
        }
      }
      fetchUserData();
    } catch (profileUpdateError) {
      toast({ variant: 'destructive', title: 'Erreur', description: `Impossible de mettre à jour le profil: ${profileUpdateError.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handlePasswordResetRequest = async () => {
    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/connexion?reason=reset`,
    });
    if (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } else {
      toast({ title: 'Succès', description: 'Une demande de modification de mot de passe a été envoyée à l\'utilisateur.' });
    }
    setIsSubmitting(false);
  };

  const handleSetDefaultPassword = async () => {
    setIsSubmitting(true);
    const { data, error } = await supabase.functions.invoke('set-user-password', {
      body: JSON.stringify({ userId: user.id }),
    });

    if (error || data.error) {
      toast({ variant: 'destructive', title: 'Erreur', description: error?.message || data.error });
    } else {
      toast({ title: 'Succès', description: 'Mot de passe réinitialisé avec succès et email envoyé à l\'utilisateur.' });
    }
    setIsSubmitting(false);
  };

  const handleDeleteUser = async () => {
    setIsSubmitting(true);
    try {
      // Use RPC that performs full cleanup (snapshots, formations, submissions) and deletes auth user
      const { data: fnData, error: fnError } = await supabase.functions.invoke('delete-user-full', {
        body: { userId: user.id },
      });
      if (fnError) {
        throw new Error(fnError.message || "Echec de la suppression de l'utilisateur");
      }
      if (fnData?.error) {
        throw new Error(fnData.error);
      }
      toast({ title: 'Succès', description: 'Utilisateur supprimé avec succès.' });
      navigate('/admin/dashboard?tab=users');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur', description: `Impossible de supprimer l'utilisateur: ${err.message}` });
      setIsSubmitting(false);
    }
  };

  const handleAssignFormation = async () => {
    if (!selectedFormation) return;
    setIsSubmitting(true);
    try {
      await supabase
        .from('user_formations')
        .insert({ user_id: id, formation_id: selectedFormation })
        .throwOnError();
      toast({ title: 'Succès', description: 'Formation assignée avec succès.' });
      setUserFormations([...userFormations, selectedFormation]);
      setSelectedFormation('');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Cette formation est peut-être déjà assignée.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRemoveFormation = async (formationId) => {
    setIsSubmitting(true);
    try {
      await supabase
        .from('user_formations')
        .delete()
        .match({ user_id: id, formation_id: formationId })
        .throwOnError();
      toast({ title: 'Succès', description: 'Formation retirée avec succès.' });
      setUserFormations(userFormations.filter(fId => fId !== formationId));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de retirer la formation.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-center py-10">Utilisateur non trouvé.</div>;
  }

  return (
    <>
      <Helmet>
        <title>Gérer l'utilisateur: {user.email} | Admin</title>
      </Helmet>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button asChild variant="outline" className="mb-8">
            <Link to="/admin/dashboard?tab=users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la liste des utilisateurs
            </Link>
          </Button>
          
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Gérer l'utilisateur</h1>
            <p className="text-xl text-muted-foreground">{user.email}</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <UserProfileForm
                user={user}
                control={control}
                register={register}
                setValue={setValue}
                isSubmitting={isSubmitting}
                isDirty={isDirty}
                handleSubmit={handleSubmit}
                onProfileSubmit={onProfileSubmit}
                handleDeleteUser={handleDeleteUser}
                userTypes={userTypes}
              />
              <UserLoginHistory userId={id} />
            </div>

            <div className="space-y-8">
              <UserSecurityCard
                user={user}
                isSubmitting={isSubmitting}
                handleSetDefaultPassword={handleSetDefaultPassword}
                handlePasswordResetRequest={handlePasswordResetRequest}
              />
              <UserFormationsCard
                userFormations={userFormations}
                allFormations={allFormations}
                isSubmitting={isSubmitting}
                handleAssignFormation={handleAssignFormation}
                handleRemoveFormation={handleRemoveFormation}
                selectedFormation={selectedFormation}
                setSelectedFormation={setSelectedFormation}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default ManageUserPage;

