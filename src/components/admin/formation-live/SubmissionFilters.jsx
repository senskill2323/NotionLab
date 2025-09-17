import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const SubmissionFilters = ({ filters, setFilters }) => {
  return (
    <div className="mb-4">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un parcours..."
          className="pl-8"
          value={filters.searchTerm ?? ''}
          onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
        />
      </div>
    </div>
  );
};

export default SubmissionFilters;




