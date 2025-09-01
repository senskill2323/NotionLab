import React, { useState, useEffect, useCallback, useRef } from 'react';
    import { useParams, Link } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { motion } from 'framer-motion';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { Button } from '@/components/ui/button';
    import { Textarea } from '@/components/ui/textarea';
    import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
    import { Loader2, MessageSquare, CornerUpLeft, Send } from 'lucide-react';
    import { useToast } from '@/components/ui/use-toast';
    import ForumPost from '@/components/forum/ForumPost';

    const ForumTopicPage = () => {
      const { id } = useParams();
      const { user } = useAuth();
      const { toast } = useToast();
      const [topic, setTopic] = useState(null);
      const [posts, setPosts] = useState([]);
      const [postCounts, setPostCounts] = useState({});
      const [loading, setLoading] = useState(true);
      const [newPostContent, setNewPostContent] = useState('');
      const [isSubmitting, setIsSubmitting] = useState(false);
      const replyTextareaRef = useRef(null);

      const fetchPostCounts = async (userIds) => {
        const uniqueUserIds = [...new Set(userIds)];
        const newCounts = { ...postCounts };
        let needsUpdate = false;

        for (const userId of uniqueUserIds) {
          if (!newCounts[userId]) {
            const { data, error } = await supabase.rpc('get_user_post_count', { p_user_id: userId });
            if (!error) {
              newCounts[userId] = data;
              needsUpdate = true;
            }
          }
        }
        if (needsUpdate) {
            setPostCounts(newCounts);
        }
      };


      const fetchTopicAndPosts = useCallback(async () => {
        const { data: topicData, error: topicError } = await supabase
          .from('forum_topics')
          .select('*, author:profiles(*, user_types(display_name))')
          .eq('id', id)
          .single();

        if (topicError || !topicData) {
          console.error('Error fetching topic:', topicError);
          toast({ title: "Erreur", description: "Sujet introuvable.", variant: "destructive" });
          setLoading(false);
          return;
        }
        setTopic(topicData);

        const { data: postsData, error: postsError } = await supabase
          .from('forum_posts')
          .select('*, author:profiles(*, user_types(display_name))')
          .eq('topic_id', id)
          .order('created_at', { ascending: true });

        if (postsError) {
          console.error('Error fetching posts:', postsError);
          toast({ title: "Erreur", description: "Impossible de charger les réponses.", variant: "destructive" });
        } else {
          setPosts(postsData);
          const userIds = [topicData.author_id, ...postsData.map(p => p.author_id)];
          fetchPostCounts(userIds);
        }
        setLoading(false);
      }, [id, toast]);

      useEffect(() => {
        fetchTopicAndPosts();
        const channel = supabase
          .channel(`public:forum_posts:topic_id=eq.${id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_posts', filter: `topic_id=eq.${id}` }, (payload) => {
             fetchTopicAndPosts();
          })
          .subscribe();

        return () => supabase.removeChannel(channel);
      }, [id, fetchTopicAndPosts]);

      const handleQuote = (authorName, content) => {
        const selection = window.getSelection().toString();
        const contentToQuote = selection || content;
        const quoteText = `[quote="${authorName}"]\n${contentToQuote.trim()}\n[/quote]\n\n`;
        setNewPostContent(prev => `${quoteText}${prev}`);
        replyTextareaRef.current?.focus();
        document.getElementById('reply')?.scrollIntoView({ behavior: 'smooth' });
      };

      const handlePostSubmit = async (e) => {
        e.preventDefault();
        if (!newPostContent.trim() || !user) return;

        setIsSubmitting(true);
        const { error } = await supabase.from('forum_posts').insert({
          topic_id: id,
          author_id: user.id,
          content: newPostContent,
        });

        if (error) {
          toast({ title: "Erreur", description: "Votre réponse n'a pas pu être envoyée.", variant: "destructive" });
        } else {
          setNewPostContent('');
        }
        setIsSubmitting(false);
      };

      if (loading) {
        return (
          <div className="flex justify-center items-center h-screen">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        );
      }

      if (!topic) {
        return (
          <div className="container mx-auto px-4 py-24 sm:py-32 text-center">
            <h1 className="text-2xl font-bold">Sujet non trouvé</h1>
            <p className="mt-4 text-muted-foreground">Le sujet que vous cherchez n'existe pas ou a été supprimé.</p>
            <Link to="/forum">
              <Button className="mt-6">Retour au forum</Button>
            </Link>
          </div>
        );
      }

      return (
        <>
          <Helmet>
            <title>{topic.title} - Forum</title>
            <meta name="description" content={`Discussion sur le sujet : ${topic.title}`} />
          </Helmet>
          <div className="container mx-auto px-2 sm:px-4 py-24 sm:py-32">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex justify-between items-center mb-4">
                <Link to="/forum" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <CornerUpLeft className="w-4 h-4" />
                  Retour au forum
                </Link>
              </div>

              <header className="mb-4 p-3 bg-card border rounded-lg">
                <h1 className="text-xl md:text-2xl font-bold break-words">{topic.title}</h1>
              </header>

              <div className="space-y-3">
                <ForumPost post={topic} author={topic.author} isOp onQuote={handleQuote} postNumber={0} postCount={postCounts[topic.author_id]} />
                {posts.map((post, index) => (
                  <ForumPost key={post.id} post={post} author={post.author} postNumber={index + 1} onQuote={handleQuote} postCount={postCounts[post.author_id]} />
                ))}
              </div>

              {user ? (
                <Card className="mt-6" id="reply">
                  <CardHeader className="p-4">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" /> Votre réponse
                    </h3>
                  </CardHeader>
                  <form onSubmit={handlePostSubmit}>
                    <CardContent className="p-4 pt-0">
                      <Textarea
                        ref={replyTextareaRef}
                        placeholder="Écrivez votre réponse ici... Sélectionnez du texte dans un message pour le citer."
                        rows={6}
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </CardContent>
                    <CardFooter className="flex justify-end p-4 pt-0">
                      <Button type="submit" disabled={isSubmitting || !newPostContent.trim()}>
                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Envoyer
                        <Send className="w-4 h-4 ml-2" />
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              ) : (
                <div className="text-center mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="font-semibold text-sm">Vous devez être connecté pour répondre.</p>
                  <Link to={`/connexion?redirect=/forum/topic/${id}#reply`}>
                    <Button className="mt-3" size="sm">Se connecter</Button>
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        </>
      );
    };

    export default ForumTopicPage;