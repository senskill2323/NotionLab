import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowRight } from 'lucide-react';

const ForumPanel = ({ editMode = false }) => {
  return (
    <Card className="glass-effect h-full">
      <CardHeader className="p-4 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center text-base">
          <MessageSquare className="w-4 h-4 mr-2 text-primary" />
          Forum de la communauté
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">Échangez avec les autres membres et formateurs.</p>
          <Link to={editMode ? '#' : '/forum'} onClick={(e) => editMode && e.preventDefault()}>
            <Button variant="outline" size="sm">
              Accéder au Forum <ArrowRight className="w-3 h-3 ml-1.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default ForumPanel;