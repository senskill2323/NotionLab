import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Bot } from 'lucide-react';
import { motion } from 'framer-motion';

const ReplyCard = ({ reply }) => {
  const isClient = reply.profile.role === 'client';
  const authorName = isClient ? "Vous" : "Support Notion Pro";
  const AuthorIcon = isClient ? User : Bot;
  const cardClasses = isClient ? 'bg-card' : 'bg-primary/5 dark:bg-primary/10';

  return (
    <motion.div
      className="flex gap-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isClient ? 'bg-secondary' : 'notion-gradient'}`}>
          <AuthorIcon className={`w-5 h-5 ${isClient ? 'text-muted-foreground' : 'text-white'}`} />
        </div>
        <div className="w-px flex-grow bg-border my-2"></div>
      </div>

      <div className="flex-grow">
        <div className={`rounded-lg border ${cardClasses}`}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2 text-sm">
              <p className="font-bold">{authorName}</p>
              <p className="text-muted-foreground text-xs">
                · {new Date(reply.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="whitespace-pre-wrap text-foreground/90">{reply.content}</p>
          </CardContent>
        </div>
      </div>
    </motion.div>
  );
};

export default ReplyCard;