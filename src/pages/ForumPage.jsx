import React, { useState, useEffect, useCallback } from 'react';
    import { Link, useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { motion } from 'framer-motion';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
    import { Badge } from '@/components/ui/badge';
    import { Loader2, MessageSquare, Plus, Search, Pin } from 'lucide-react';
    import { useToast } from '@/components/ui/use-toast';

    const TimeAgo = ({ date }) => {
      const [timeAgo, setTimeAgo] = useState('');

      useEffect(() => {
        const update = () => {
          const seconds = Math.floor((new Date() - new Date(date)) / 1000);
          let interval = seconds / 31536000;
          if (interval > 1) { setTimeAgo(Math.floor(interval) + " ans"); return; }
          interval = seconds / 2592000;
          if (interval > 1) { setTimeAgo(Math.floor(interval) + " mois"); return; }
          interval = seconds / 86400;
          if (interval > 1) { setTimeAgo(Math.floor(interval) + " jours"); return; }
          interval = seconds / 3600;
          if (interval > 1) { setTimeAgo(Math.floor(interval) + " heures"); return; }
          interval = seconds / 60;
          if (interval > 1) { setTimeAgo(Math.floor(interval) + " minutes"); return; }
          setTimeAgo("à l'instant");
        };
        update();
        const timer = setInterval(update, 60000);
        return () => clearInterval(timer);
      }, [date]);

      return <>{timeAgo}</>;
    };

    const ForumPage = () => {
      const { user } = useAuth();
      const navigate = useNavigate();
      const { toast } = useToast();
      const [topics, setTopics] = useState([]);
      const [loading, setLoading] = useState(true);
      const [searchTerm, setSearchTerm] = useState('');

      const fetchTopics = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('forum_topics')
          .select(`
            id,
            title,
            created_at,
            last_activity_at,
            is_pinned,
            author:profiles(first_name, last_name, user_types(display_name)),
            posts:forum_posts(count)
          `)
          .order('is_pinned', { ascending: false })
          .order('last_activity_at', { ascending: false });

        if (error) {
          console.error('Error fetching topics:', error);
          toast({ title: "Erreur", description: "Impossible de charger les sujets du forum.", variant: "destructive" });
        } else {
          setTopics(data);
        }
        setLoading(false);
      }, [toast]);

      useEffect(() => {
        fetchTopics();
        const channel = supabase
          .channel('public:forum_topics')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_topics' }, fetchTopics)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts' }, fetchTopics)
          .subscribe();

        return () => supabase.removeChannel(channel);
      }, [fetchTopics]);

      const handleNewTopic = () => {
        if (!user) {
          toast({
            title: "Connexion requise",
            description: "Vous devez être connecté pour créer un nouveau sujet.",
            variant: "destructive",
          });
          navigate('/connexion');
        } else {
          navigate('/forum/topic/new');
        }
      };

      const filteredTopics = topics.filter(topic =>
        topic.title.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return (
        <>
          <Helmet>
            <title>Forum - Discutez et Partagez</title>
            <meta name="description" content="Rejoignez la discussion sur notre forum. Partagez vos idées, posez des questions et connectez-vous avec la communauté." />
          </Helmet>
          <div className="container mx-auto px-4 py-24 sm:py-32">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <header className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <MessageSquare className="w-8 h-8 text-primary" />
                  <h1 className="text-3xl md:text-4xl font-bold">Forum de la communauté</h1>
                </div>
                <p className="text-lg text-muted-foreground">Un espace pour échanger, apprendre et grandir ensemble.</p>
              </header>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Rechercher un sujet..."
                    className="pl-10 w-full sm:w-64 md:w-80"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button onClick={handleNewTopic} className="w-full sm:w-auto notion-gradient text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Nouveau Sujet
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60%]">Sujet</TableHead>
                        <TableHead className="text-center">Réponses</TableHead>
                        <TableHead>Auteur</TableHead>
                        <TableHead>Activité</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTopics.length > 0 ? (
                        filteredTopics.map(topic => (
                          <TableRow key={topic.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/forum/topic/${topic.id}`)}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {topic.is_pinned && <Pin className="w-4 h-4 text-primary" />}
                                <span className="truncate">{topic.title}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{topic.posts[0]?.count || 0}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{topic.author?.first_name || 'Utilisateur'}</span>
                                {topic.author?.user_types && ['owner', 'admin', 'prof'].includes(topic.author.user_types.type_name) && (
                                  <Badge variant="secondary">{topic.author.user_types.display_name}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              <TimeAgo date={topic.last_activity_at} />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            Aucun sujet trouvé. Soyez le premier à en créer un !
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </motion.div>
          </div>
        </>
      );
    };

    export default ForumPage;