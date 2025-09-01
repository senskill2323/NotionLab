import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BookOpen, AlertTriangle, CheckCircle } from 'lucide-react';

const FormationProgram = ({ program }) => {
  if (!program || program.length === 0) {
    return (
      <Card className="glass-effect border-border mt-6">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-primary" />
            Programme détaillé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-muted-foreground">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
            <p>Le programme de cette formation n'est pas encore disponible.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-effect border-border mt-6">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-primary" />
          Programme détaillé
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full" defaultValue={program.map(p => p.familyName)}>
          {program.map((family, index) => (
            <AccordionItem value={family.familyName} key={index} className="border-border/50">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  {family.familyName}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-4 pt-2 pl-4 border-l-2 border-primary/20 ml-4">
                  {family.modules.map((module, modIndex) => (
                    <li key={modIndex} className="text-foreground/90 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{module.title}</span>
                        {module.duration > 0 && <span className="text-xs text-muted-foreground">{module.duration} min</span>}
                      </div>
                      {module.description && <p className="text-xs text-muted-foreground mt-1">{module.description}</p>}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default FormationProgram;