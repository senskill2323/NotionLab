import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useClientChatIndicator } from '@/hooks/useClientChatIndicator.jsx';

const ChatUnreadNotification = () => {
  const { unreadNotification, acknowledgeUnreadNotification } = useClientChatIndicator();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isChatRoute = location.pathname.startsWith('/chat');

  useEffect(() => {
    if (!unreadNotification || isChatRoute) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [isChatRoute, unreadNotification]);

  const handleClose = () => {
    setOpen(false);
    acknowledgeUnreadNotification();
  };

  const handleNavigate = () => {
    const targetConversation = unreadNotification?.conversationId;
    handleClose();
    if (targetConversation) {
      navigate(`/chat?conversation=${targetConversation}`);
    } else {
      navigate('/chat');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          acknowledgeUnreadNotification();
        }
      }}
    >
      <DialogContent className="sm:max-w-md space-y-4 text-center">
        <DialogHeader className="space-y-2">
          <DialogTitle>Nouveau message sur le chat</DialogTitle>
          <DialogDescription>Un formateur vient de t'envoyer un message. Tu peux l'ouvrir maintenant ou plus tard depuis le bouton "Le Chat".</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-center">
          <Button variant="outline" onClick={handleClose}>Plus tard</Button>
          <Button onClick={handleNavigate}>Ouvrir le chat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChatUnreadNotification;

