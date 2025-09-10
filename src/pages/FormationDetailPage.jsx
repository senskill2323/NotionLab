import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FormationHeader from '@/components/formation/FormationHeader';
import FormationProgram from '@/components/formation/FormationProgram';

const FormationDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formation, setFormation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const fetchFormation = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        author:author_id ( first_name, last_name )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      toast({ title: 'Erreur', description: 'Formation non trouvée.', variant: 'destructive' });
      navigate('/formations');
    } else {
      setFormation(data);
    }
    setLoading(false);
  }, [id, navigate, toast]);

  const flatModules = useMemo(() => {
    if (!formation || !formation.nodes) return [];

    return formation.nodes
      .filter(node => node.type === 'moduleNode')
      .map(node => node.data);
  }, [formation]);

  const formationStats = useMemo(() => {
    if (!flatModules.length) return { totalModules: 0, totalHours: 0 };

    const totalMinutes = flatModules.reduce((total, module) => {
      const duration = module.duration || 0;
      return total + (typeof duration === 'number' ? duration : parseInt(duration) || 0);
    }, 0);

    const totalHours = Math.round((totalMinutes / 60) * 10) / 10; // Arrondi à 1 décimale

    return {
      totalModules: flatModules.length,
      totalHours: totalHours
    };
  }, [flatModules]);

  const checkEnrollment = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_formations')
      .select('id')
      .eq('user_id', user.id)
      .eq('formation_id', id)
      .maybeSingle();

    if (error) {
      console.error("Erreur lors de la vérification de l'inscription:", error);
      return;
    }
    setIsEnrolled(!!data);
  }, [user, id]);

  useEffect(() => {
    fetchFormation();
  }, [fetchFormation]);

  useEffect(() => {
    if (user && formation) {
      checkEnrollment();
    }
  }, [user, formation, checkEnrollment]);

  const handleEnroll = async () => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Vous devez être connecté pour vous inscrire.',
        variant: 'destructive',
      });
      navigate('/connexion');
      return;
    }

    setIsEnrolling(true);
    const { error } = await supabase.rpc('enroll_user_in_course', { p_course_id: id });

    if (error) {
      toast({
        title: 'Erreur d\'inscription',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Inscription réussie !',
        description: `Vous êtes maintenant inscrit à la formation "${formation.title}".`,
        className: 'bg-green-500 text-white',
      });
      setIsEnrolled(true);
    }
    setIsEnrolling(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!formation) {
    return null;
  }
  
  const levelArray = Array.isArray(formation.level) ? formation.level : [formation.level];

  return (
    <>
      <Helmet>
        <title>{`${formation.title} | NotionLab`}</title>
        <meta name="description" content={formation.description} />
        <meta property="og:title" content={`${formation.title} | NotionLab`} />
        <meta property="og:description" content={formation.description} />
      </Helmet>
      <div className="bg-background text-foreground">
        <div className="container mx-auto px-4 pt-32 pb-16">
          <div className="max-w-4xl mx-auto">
            {/* Boutons en haut */}
            <div className="mb-6 flex items-center gap-4">
              <Link to="/">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Retour à la page d'accueil
                </Button>
              </Link>
              
              {/* Bouton d'inscription */}
              {isEnrolled ? (
                <Link to="/dashboard">
                  <Button size="sm" className="notion-gradient text-white flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Accéder à mon espace
                  </Button>
                </Link>
              ) : (
                <Button 
                  onClick={handleEnroll} 
                  disabled={isEnrolling} 
                  size="sm" 
                  className="notion-gradient text-white"
                >
                  {isEnrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  S'inscrire à la formation
                </Button>
              )}
            </div>
            <FormationHeader 
              title={formation.title} 
              description={formation.description}
              level={levelArray.join(', ')}
              coverImageUrl={formation.cover_image_url}
              totalModules={formationStats.totalModules}
              totalHours={formationStats.totalHours}
            />
          </div>

          <main className="max-w-4xl mx-auto">
            <FormationProgram modules={flatModules} />
          </main>
        </div>
      </div>
    </>
  );
};

export default FormationDetailPage;