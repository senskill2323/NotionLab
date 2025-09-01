import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, CheckCircle } from 'lucide-react';

const FormationObjectives = ({ objectives }) => {
  const objectiveList = Array.isArray(objectives) 
    ? objectives.map(obj => (typeof obj === 'object' && obj !== null && obj.value) ? obj.value : obj)
    : [];

  return (
    <Card className="glass-effect border-gray-700 mb-8">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center">
          <Target className="w-5 h-5 mr-2 text-blue-400" />
          Objectifs de la formation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {objectiveList.map((objective, index) => (
            <li key={index} className="flex items-start text-foreground">
              <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
              {objective}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default FormationObjectives;