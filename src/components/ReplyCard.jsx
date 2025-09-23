import React from "react";
import { CardContent, CardHeader } from "@/components/ui/card";
import { User, Bot } from "lucide-react";
import { motion } from "framer-motion";

const ReplyCard = ({ reply, currentUserId, ticketOwnerId }) => {
  const profileRole = reply?.profile?.role || reply?.profile?.user_types?.type_name || null;
  const isTicketOwner = reply?.user_id && ticketOwnerId && reply.user_id === ticketOwnerId;
  const isCurrentUser = reply?.user_id && currentUserId && reply.user_id === currentUserId;
  const isClientAuthor = profileRole === "client" || profileRole === "vip" || isTicketOwner;

  const authorName = isCurrentUser
    ? "Vous"
    : isClientAuthor
      ? "Client"
      : "Support NotionLab";
  const AuthorIcon = isClientAuthor ? User : Bot;
  const cardClasses = isClientAuthor ? "bg-card" : "bg-primary/5 dark:bg-primary/10";

  return (
    <motion.div
      className="flex gap-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isClientAuthor ? "bg-secondary" : "notion-gradient"}`}>
          <AuthorIcon className={`w-5 h-5 ${isClientAuthor ? "text-muted-foreground" : "text-white"}`} />
        </div>
        <div className="w-px flex-grow bg-border my-2"></div>
      </div>

      <div className="flex-grow">
        <div className={`rounded-lg border ${cardClasses}`}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2 text-sm">
              <p className="font-bold">{authorName}</p>
              <p className="text-muted-foreground text-xs">
                {reply?.created_at ? new Date(reply.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="whitespace-pre-wrap text-foreground/90">{reply?.content}</p>
          </CardContent>
        </div>
      </div>
    </motion.div>
  );
};

export default ReplyCard;

