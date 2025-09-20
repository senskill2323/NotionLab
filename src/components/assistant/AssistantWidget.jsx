import React from 'react';
import { useAssistantStore } from '@/hooks/useAssistantStore';
import { Mic, MicOff, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AssistantWidget = ({ onOpen }) => {
  const { micOn, toggleMic, toggleDrawer } = useAssistantStore();

  const open = () => {
    if (onOpen) onOpen(); else toggleDrawer();
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="flex items-center gap-2 p-2 rounded-full bg-background border shadow-lg">
        <Button size="icon" variant={micOn ? 'default' : 'secondary'} onClick={toggleMic} title={micOn ? 'Couper le micro' : 'Rétablir le micro'}>
          {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </Button>
        <Button onClick={open}>
          <PanelRightOpen className="w-4 h-4 mr-2" /> Ouvrir l’assistant
        </Button>
      </div>
    </div>
  );
};

export default AssistantWidget;
