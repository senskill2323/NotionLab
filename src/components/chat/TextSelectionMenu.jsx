import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, PlusSquare } from 'lucide-react';

const TextSelectionMenu = ({ position, onCopy, onCreateResource }) => {
  if (!position) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        zIndex: 50,
      }}
    >
      <Card className="p-1 flex items-center gap-1 shadow-lg bg-background/80 backdrop-blur-sm border-border">
        <Button variant="ghost" size="sm" onClick={onCopy} className="flex items-center gap-2">
          <Copy className="w-4 h-4" />
          Copier
        </Button>
        <div className="w-[1px] h-6 bg-border mx-1" />
        <Button variant="ghost" size="sm" onClick={onCreateResource} className="flex items-center gap-2">
          <PlusSquare className="w-4 h-4" />
          Créer Ressource
        </Button>
      </Card>
    </motion.div>
  );
};

export default TextSelectionMenu;