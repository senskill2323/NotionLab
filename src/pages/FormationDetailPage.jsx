import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FormationHeader from '@/components/formation/FormationHeader';
import FormationSidebar from '@/components/formation/FormationSidebar';
import FormationObjectives from '@/components/formation/FormationObjectives';
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

  const structuredProgram = useMemo(() => {
    if (!formation || !formation.nodes) return [];

    const modules = formation.nodes
      .filter(node => node.type === 'moduleNode')
      .map(node => node.data);

    const families = modules.reduce((acc, module) => {
      const familyName = module.family_name || 'Modules complémentaires';
      if (!acc[familyName]) {
        acc[familyName] = {
          familyName,
          icon: module.family_icon || 'BookOpen',
          modules: []
        };
      }
      acc[familyName].modules.push({
        title: module.title,
        description: module.description,
        duration: module.duration,
        subfamilyName: module.subfamily_name
      });
      return acc;
    }, {});

    return Object.values(families);
  }, [formation]);


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
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
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
          <FormationHeader 
            title={formation.title} 
            description={formation.description}
            level={levelArray.join(', ')}
            color={formation.color || 'bg-primary'}
          />
          <div className="lg:grid lg:grid-cols-12 lg:gap-12">
            <main className="lg:col-span-8">
              <FormationObjectives objectives={formation.objectives} />
              <FormationProgram program={structuredProgram} />
            </main>
            <aside className="lg:col-span-4 mt-12 lg:mt-0">
              <FormationSidebar
                price={formation.price_text}
                formationTitle={formation.title}
              >
                  {isEnrolled ? (
                    <div className="text-center">
                       <div className="flex items-center justify-center text-green-500 mb-4">
                         <CheckCircle className="w-6 h-6 mr-2"/>
                         <span className="font-semibold">Vous êtes inscrit !</span>
                       </div>
                       <Link to="/dashboard">
                          <Button className="w-full notion-gradient text-white">
                            Accéder à mon espace
                            <ArrowRight className="ml-2 w-4 h-4"/>
                          </Button>
                       </Link>
                    </div>
                  ) : (
                    <Button onClick={handleEnroll} disabled={isEnrolling} className="w-full notion-gradient text-white">
                      {isEnrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      S'inscrire à la formation
                    </Button>
                  )}
              </FormationSidebar>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
};

export default FormationDetailPage;