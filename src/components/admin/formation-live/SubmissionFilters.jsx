import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

const SubmissionFilters = ({ filters, setFilters, users }) => {
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un parcours..."
          className="pl-8"
          value={filters.searchTerm ?? ''}
          onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
        />
      </div>
      <Select
        value={filters.userId || 'all'}
        onValueChange={(value) => setFilters(prev => ({ ...prev, userId: value === 'all' ? '' : value }))}
      >
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Filtrer par utilisateur" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les utilisateurs</SelectItem>
          {users.map(user => (
            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SubmissionFilters;