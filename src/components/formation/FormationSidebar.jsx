import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const FormationSidebar = ({ price, formationTitle, children }) => {
  return (
    <aside className="sticky top-28">
      <Card className="glass-effect">
        <CardHeader>
          <CardDescription className="text-lg text-muted-foreground">Prix de la formation</CardDescription>
          <CardTitle className="text-4xl font-bold gradient-text">{price || 'N/A'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cette formation complète vous donnera toutes les clés pour maîtriser {formationTitle}.
          </p>
          <Separator />
            {children}
        </CardContent>
      </Card>
    </aside>
  );
};

export default FormationSidebar;