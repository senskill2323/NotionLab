import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import PersonalDataForm from '@/components/dashboard/PersonalDataForm';

const PersonalDataPanel = ({ editMode = false }) => {
  return (
    <Card className="glass-effect h-full">
      <CardHeader className="p-4">
        <CardTitle className="flex items-center text-base"><User className="w-4 h-4 mr-2 text-primary" />Mes Données Personnelles</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <PersonalDataForm editMode={editMode} />
      </CardContent>
    </Card>
  );
};

export default PersonalDataPanel;