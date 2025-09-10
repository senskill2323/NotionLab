import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ModuleHeader from '@/components/dashboard/ModuleHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Ticket, 
  Calendar, 
  FolderOpen, 
  Smile,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MOOD_OPTIONS = [
  { emoji: '😊', label: 'Content', value: 'content' },
  { emoji: '🤩', label: 'Très intéressé', value: 'tres_interesse' },
  { emoji: '😐', label: 'Pas content', value: 'pas_content' },
  { emoji: '😢', label: 'Triste', value: 'triste' },
  { emoji: '🔥', label: 'Motivé', value: 'motive' },
  { emoji: '😴', label: 'Fatigué', value: 'fatigue' },
];

const KPICard = ({ icon: Icon, title, value, subtitle, trend, color = "blue" }) => {
  const gradientClasses = {
    blue: "bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-800/30",
    green: "bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200/50 dark:border-green-800/30",
    orange: "bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200/50 dark:border-orange-800/30",
    purple: "bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200/50 dark:border-purple-800/30"
  };

  const iconClasses = {
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
  };

  return (
    <Card className={`${gradientClasses[color]} border-2 hover:shadow-lg hover:scale-105 transition-all duration-300 backdrop-blur-sm`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${iconClasses[color]} shadow-sm`}>
            <Icon className="h-4 w-4" />
          </div>
          {trend && (
            <Badge variant={trend > 0 ? "default" : "secondary"} className="text-xs shadow-sm">
              <TrendingUp className="h-3 w-3 mr-1" />
              {trend > 0 ? '+' : ''}{trend}%
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">{value}</p>
          <p className="text-xs text-muted-foreground font-medium">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground/80">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const MoodSelector = ({ currentMood, onMoodChange }) => {
  const [selectedMood, setSelectedMood] = React.useState(currentMood);
  const justChangedRef = React.useRef(false);
  const currentMoodData = MOOD_OPTIONS.find(m => m.value === selectedMood) || MOOD_OPTIONS[0];

  // Synchroniser avec la prop currentMood tout en ignorant le cycle qui suit un clic utilisateur
  React.useEffect(() => {
    if (justChangedRef.current) {
      justChangedRef.current = false;
      return;
    }
    setSelectedMood(currentMood);
  }, [currentMood]);

  const handleMoodSelect = (newMood) => {
    justChangedRef.current = true;
    setSelectedMood(newMood);
    onMoodChange(newMood);
  };
  
  return (
    <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200/50 dark:border-purple-800/30 border-2 hover:shadow-lg hover:scale-105 transition-all duration-300 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 shadow-sm">
            <Smile className="h-4 w-4" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Mon état d'esprit</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-auto p-2 w-full justify-start hover:bg-purple-100/50 dark:hover:bg-purple-900/20">
                <span className="text-2xl mr-2">{currentMoodData.emoji}</span>
                <span className="text-sm font-medium">{currentMoodData.label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {MOOD_OPTIONS.map((mood) => (
                <DropdownMenuItem
                  key={mood.value}
                  onClick={() => handleMoodSelect(mood.value)}
                  className="flex items-center gap-2"
                >
                  <span className="text-lg">{mood.emoji}</span>
                  <span>{mood.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

const KPIPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [kpiData, setKpiData] = React.useState({
    formationsCount: 0,
    ticketsCount: 0,
    activeDays: 0,
    resourcesCount: 0,
    mood: 'content'
  });
  const [loading, setLoading] = React.useState(true);

  // Fonction de fetch simple sans useCallback pour éviter les boucles
  const fetchKPIData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Formations via RPC (source de vérité du panel formations)
      const { data: formations } = await supabase
        .rpc('get_user_courses_and_parcours', { p_user_id: user.id });

      // Tickets créés par l'utilisateur
      const { data: tickets } = await supabase
        .from('tickets')
        .select('id, status')
        .eq('user_id', user.id);

      // Ressources via RPC
      const { data: resources } = await supabase
        .rpc('get_user_resources_with_ratings', { p_user_id: user.id });

      // Jours actifs depuis la plus ancienne formation démarrée/en cours
      const activeFormations = (formations || []).filter(f =>
        f.status === 'demarre' || f.status === 'en_cours'
      );

      let activeDays = 0;
      if (activeFormations.length > 0) {
        const dates = activeFormations
          .map(f => f.enrolled_at || f.created_at)
          .filter(Boolean)
          .map(d => new Date(d).getTime());
        
        if (dates.length > 0) {
          const oldestActiveDate = Math.min(...dates);
          activeDays = Math.floor((Date.now() - oldestActiveDate) / (1000 * 60 * 60 * 24));
        }
      }

      // Humeur utilisateur: ne pas interroger la DB (colonne absente). Utiliser l'état courant / localStorage.
      let storedMood = null;
      try {
        if (typeof window !== 'undefined') {
          storedMood = window.localStorage.getItem(`mood:${user.id}`);
        }
      } catch (_) {}

      setKpiData(prev => ({
        formationsCount: formations?.length || 0,
        ticketsCount: tickets?.length || 0,
        activeDays,
        resourcesCount: resources?.length || 0,
        // Conserver l'humeur précédente ou utiliser le localStorage si dispo
        mood: storedMood || prev.mood
      }));
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données KPI",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMoodChange = async (newMood) => {
    if (!user?.id) return;
    
    // Mettre à jour immédiatement l'état local
    setKpiData(prev => ({ ...prev, mood: newMood }));
    // Persister localement pour éviter les retours visuels si la colonne DB n'existe pas
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`mood:${user.id}`, newMood);
      }
    } catch (_) {}
    
    try {
      // Tentative de mise à jour directe avec upsert
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          mood: newMood 
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error('Upsert error:', error);
        toast({
          title: "État d'esprit mis à jour",
          description: "Changement enregistré localement"
        });
        return;
      }

      toast({
        title: "État d'esprit mis à jour",
        description: "Votre humeur a été sauvegardée"
      });
    } catch (error) {
      console.error('Error updating mood:', error);
      toast({
        title: "État d'esprit mis à jour",
        description: "Changement enregistré localement"
      });
    }
  };

  // Hydrater l'humeur depuis localStorage dès que l'utilisateur est connu (avant tout fetch)
  React.useEffect(() => {
    if (!user?.id) return;
    try {
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem(`mood:${user.id}`);
        if (stored) {
          setKpiData(prev => ({ ...prev, mood: stored }));
        }
      }
    } catch (_) {}
  }, [user?.id]);

  React.useEffect(() => {
    if (user?.id) {
      fetchKPIData();
    }
  }, [user?.id]);

  if (loading) {
    return (
      <Card className="glass-effect h-full">
        <CardHeader className="p-3 pb-2">
          <ModuleHeader
            title="Mes KPI's"
            Icon={Target}
            variant="slate"
          />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-effect h-full">
      <CardHeader className="p-3 pb-2">
        <ModuleHeader
          title="Mes KPI's"
          Icon={Target}
          variant="slate"
        />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KPICard
            icon={BookOpen}
            title="Formations lancées"
            value={kpiData.formationsCount}
            color="blue"
          />
          <KPICard
            icon={Ticket}
            title="Mes tickets"
            value={kpiData.ticketsCount}
            color="green"
          />
          <KPICard
            icon={Calendar}
            title="Jours actifs"
            value={kpiData.activeDays}
            subtitle="de formation"
            color="orange"
          />
          <KPICard
            icon={FolderOpen}
            title="Ressources"
            value={kpiData.resourcesCount}
            color="purple"
          />
          <MoodSelector
            currentMood={kpiData.mood}
            onMoodChange={handleMoodChange}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default KPIPanel;
