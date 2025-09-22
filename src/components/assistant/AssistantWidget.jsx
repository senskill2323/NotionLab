import React from 'react';
import { useAssistantStore } from '@/hooks/useAssistantStore';
import { PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AssistantWidget = ({ onOpen }) => {
  const { toggleDrawer } = useAssistantStore();

  const open = () => {
    if (onOpen) onOpen(); else toggleDrawer();
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="flex items-center gap-2 p-2 rounded-full bg-background border shadow-lg">
        <Button onClick={open}>
          <PanelRightOpen className="w-4 h-4 mr-2" /> Ouvrir l'assistant
        </Button>
      </div>
    </div>
  );
};

export default AssistantWidget;
