import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Image as ImageIcon, MoreVertical, Pencil, Trash2, ThumbsUp, Quote, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const formatDate = (dateString, options = {}) => {
  const defaultOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options
  };
  return new Date(dateString).toLocaleDateString('fr-FR', defaultOptions);
};

const renderAttachment = (attachment) => {
  const isImage = attachment.type.startsWith('image/');
  return (
    <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 bg-secondary p-2 rounded-md hover:bg-secondary/80 transition-colors max-w-full">
      {isImage ? <ImageIcon className="w-4 h-4 text-primary flex-shrink-0" /> : <FileText className="w-4 h-4 text-primary flex-shrink-0" />}
      <span className="text-xs font-medium truncate">{attachment.name}</span>
    </a>
  );
};

const QuoteBlock = ({ author, children }) => (
  <blockquote className="mt-2 mb-2 p-2 pl-3 border-l-4 border-primary/50 bg-primary/10 rounded-r-md text-sm text-foreground/80">
    <p className="font-semibold text-xs italic">Citation de {author} :</p>
    <div className="mt-1">{children}</div>
  </blockquote>
);

const parseContent = (text) => {
  const parts = text.split(/(\[quote="[^"]*"\].*?\[\/quote\])/gs);
  return parts.map((part, index) => {
    const match = part.match(/\[quote="([^"]*)"\](.*?)\[\/quote\]/s);
    if (match) {
      return <QuoteBlock key={index} author={match[1]}>{parseContent(match[2])}</QuoteBlock>;
    }
    return <span key={index}>{part}</span>;
  });
};

const ForumPost = ({ post, author, isOp = false, postNumber, onQuote, postCount }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const profile = author;
  const canEdit = user && (user.id === profile?.id || ['admin', 'owner', 'prof'].includes(user.profile?.user_type));
  const importantRole = profile?.user_type && ['owner', 'admin', 'prof'].includes(profile.user_type);

  const handleQuote = () => {
    if (onQuote) {
      onQuote(profile?.first_name || 'Utilisateur', post.content);
    } else {
       toast({
         title: "Fonctionnalité non implémentée",
         description: "La citation de message sera bientôt disponible.",
       });
    }
  };

  const countryFlag = useMemo(() => {
    if (!profile?.country_code) return null;
    try {
      return String.fromCodePoint(...[...profile.country_code.toUpperCase()].map(c => c.charCodeAt(0) + 0x1F1A5));
    } catch (e) {
      return null;
    }
  }, [profile?.country_code]);

  return (
    <motion.div
      id={`post-${post.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card border rounded-lg overflow-hidden flex flex-col"
    >
      <div className="p-2 flex-grow">
        <div className="flex justify-between items-start mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm break-words text-primary">{profile?.first_name || 'Utilisateur'}</p>
            {importantRole && (
              <Badge variant={['owner', 'admin'].includes(profile.user_type) ? 'destructive' : 'secondary'} className="text-xs h-5 px-1.5">
                {profile.user_type}
              </Badge>
            )}
            <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {postCount ?? 'N/A'}</span>
              {countryFlag && <span>{countryFlag}</span>}
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-right flex-shrink-0 ml-2">
            <p className="leading-tight">{formatDate(post.created_at, {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
            <a href={`#post-${post.id}`} className="font-bold text-primary hover:underline">#{postNumber}</a>
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words text-sm">
          {parseContent(post.content)}
        </div>

        {post.attachments && post.attachments.length > 0 && (
          <div className="mt-2">
            <h4 className="text-xs font-semibold mb-1 border-t pt-2">Pièces jointes</h4>
            <div className="flex flex-col items-start gap-1">
              {post.attachments.map((att, index) => <div key={index}>{renderAttachment(att)}</div>)}
            </div>
          </div>
        )}
      </div>

      <div className="p-1.5 mt-auto border-t bg-muted/40">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" className="text-xs h-6 px-1.5">
            <ThumbsUp className="w-3 h-3 mr-1" />
            <span>Voter</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-6 px-1.5" onClick={handleQuote}>
            <Quote className="w-3 h-3 mr-1" />
            <span>Citer</span>
          </Button>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Pencil className="mr-2 h-4 w-4" />
                  <span>Modifier</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Supprimer</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ForumPost;