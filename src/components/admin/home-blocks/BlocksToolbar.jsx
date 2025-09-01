import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

const BlocksToolbar = ({ onAddBlock, filters, setFilters }) => {
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
      <div className="flex flex-col md:flex-row gap-2 w-full">
        <Input
          placeholder="Rechercher par titre..."
          className="max-w-sm"
          value={filters.title || ''}
          onChange={(e) => handleFilterChange('title', e.target.value)}
        />
        <Select value={filters.status || ''} onValueChange={(value) => handleFilterChange('status', value)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous les statuts</SelectItem>
            <SelectItem value="published">Publié</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="archived">Archivé</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={onAddBlock} className="w-full md:w-auto">
        <PlusCircle className="h-4 w-4 mr-2" />
        Ajouter un bloque
      </Button>
    </div>
  );
};

export default BlocksToolbar;