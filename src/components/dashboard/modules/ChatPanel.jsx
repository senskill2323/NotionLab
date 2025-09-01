import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, ArrowRight } from 'lucide-react';

const ChatPanel = ({ editMode = false }) => {
  const openChatPopup = () => {
    if (editMode) return;
    const width = 800;
    const height = 600;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    window.open(
      '/chat',
      'NotionLab_Chat',
      `width=${width},height=${height},top=${top},left=${left},toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=no,resizable=yes`
    );
  };

  return (
    <Card className="glass-effect h-full">
      <CardHeader className="p-4 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center text-base">
          <MessageCircle className="w-4 h-4 mr-2 text-primary" />
          Chat en direct
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">Discutez avec un formateur dans une fenêtre dédiée.</p>
          <Button variant="outline" size="sm" onClick={openChatPopup}>
            Ouvrir le Chat <ArrowRight className="w-3 h-3 ml-1.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatPanel;