import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CreateUserPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [userTypes, setUserTypes] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    user_type: 'client',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUserTypes = async () => {
      const { data, error } = await supabase.from('user_types').select('*');
      if (!error) {
        setUserTypes(data);
        const clientType = data.find(ut => ut.type_name === 'client');
        if (clientType) {
          setFormData(prev => ({ ...prev, user_type: clientType.type_name }));
        }
      }
    };
    fetchUserTypes();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleUserTypeChange = (value) => {
    setFormData(prev => ({ ...prev, user_type: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    setSaving(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-user-with-role', {
        body: {
          email: formData.email,
          password: formData.password,
          firstName: formData.first_name,
          lastName: formData.last_name,
          userType: formData.user_type
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: "Succès", description: "Utilisateur créé avec succès." });
      navigate('/admin/dashboard?tab=users');

    } catch (err) {
      toast({ title: "Erreur", description: `Impossible de créer l'utilisateur: ${err.message}`, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };
  
  const canSetType = (type) => {
    if (currentUser?.profile?.user_type === 'owner') {
      return true;
    }
    if (currentUser?.profile?.user_type === 'prof' && type !== 'owner') {
      return true;
    }
    return false;
  };

  return (
    <>
      <Helmet><title>Créer un nouvel utilisateur</title></Helmet>
      <main className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" onClick={() => navigate('/admin/dashboard?tab=users')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Créer un nouvel utilisateur</CardTitle>
              <CardDescription>Remplissez les détails pour le nouvel utilisateur.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div><Label htmlFor="first_name">Prénom</Label><Input id="first_name" name="first_name" value={formData.first_name} onChange={handleInputChange} /></div>
                  <div><Label htmlFor="last_name">Nom</Label><Input id="last_name" name="last_name" value={formData.last_name} onChange={handleInputChange} /></div>
                </div>
                <div><Label htmlFor="email">Email</Label><Input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} required /></div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div><Label htmlFor="password">Mot de passe</Label><Input type="password" id="password" name="password" value={formData.password} onChange={handleInputChange} required /></div>
                    <div><Label htmlFor="confirmPassword">Confirmer le mot de passe</Label><Input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} required /></div>
                </div>
                <div>
                  <Label htmlFor="user_type">Type d'utilisateur</Label>
                  <Select name="user_type" value={formData.user_type} onValueChange={handleUserTypeChange}>
                    <SelectTrigger id="user_type">
                      <SelectValue placeholder="Sélectionner un type d'utilisateur" />
                    </SelectTrigger>
                    <SelectContent>
                      {userTypes.map(ut => (
                        <SelectItem key={ut.type_name} value={ut.type_name} disabled={!canSetType(ut.type_name)}>
                          {ut.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={saving} className="notion-gradient text-white">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Créer l'utilisateur
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </>
  );
};

export default CreateUserPage;