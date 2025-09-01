import React from 'react';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
    import { Checkbox } from "@/components/ui/checkbox";
    import ResourcesTableRow from './ResourcesTableRow';
    import { ArrowUpDown } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    
    const SortableHeader = ({ children, columnKey, sortConfig, requestSort }) => {
      const isSorted = sortConfig.key === columnKey;
      const Icon = isSorted ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : <ArrowUpDown className="w-3 h-3 ml-2 opacity-30" />;
      return (
        <Button variant="ghost" onClick={() => requestSort(columnKey)} className="px-2 py-1">
          {children}
          <span className="ml-2 text-xs">{isSorted && Icon}</span>
        </Button>
      );
    };

    const ResourcesTable = ({ groupedResources, selectedRows, setSelectedRows, relatedData, onEdit, onUpdateSuccess, sortConfig, requestSort }) => {
      
      const allResourceIds = groupedResources.flatMap(g => g.resources).map(r => r.id);
      
      const handleSelectAll = (checked) => {
        setSelectedRows(checked ? allResourceIds : []);
      };

      return (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    onCheckedChange={handleSelectAll} 
                    checked={selectedRows.length > 0 && selectedRows.length === allResourceIds.length}
                    aria-label="Tout sélectionner"
                  />
                </TableHead>
                <TableHead><SortableHeader columnKey="name" sortConfig={sortConfig} requestSort={requestSort}>Ressource</SortableHeader></TableHead>
                <TableHead><SortableHeader columnKey="type" sortConfig={sortConfig} requestSort={requestSort}>Type</SortableHeader></TableHead>
                <TableHead>Assigné à</TableHead>
                <TableHead><SortableHeader columnKey="family.name" sortConfig={sortConfig} requestSort={requestSort}>Famille</SortableHeader></TableHead>
                <TableHead><SortableHeader columnKey="subfamily.name" sortConfig={sortConfig} requestSort={requestSort}>Sous-Famille</SortableHeader></TableHead>
                <TableHead><SortableHeader columnKey="created_at" sortConfig={sortConfig} requestSort={requestSort}>Création</SortableHeader></TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedResources.map(({ groupTitle, resources: groupResources }) => (
                <React.Fragment key={groupTitle || 'default'}>
                  {groupTitle && (
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={8} className="font-semibold text-sm py-2">{groupTitle}</TableCell>
                    </TableRow>
                  )}
                  {groupResources.length > 0 ? (
                    groupResources.map(resource => (
                      <ResourcesTableRow
                        key={resource.id}
                        resource={resource}
                        isSelected={selectedRows.includes(resource.id)}
                        onSelectRow={(id, checked) => {
                          setSelectedRows(prev => checked ? [...prev, id] : prev.filter(rowId => rowId !== id));
                        }}
                        relatedData={relatedData}
                        onEdit={onEdit}
                        onUpdateSuccess={onUpdateSuccess}
                      />
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={8} className="h-24 text-center">Aucune ressource dans ce groupe.</TableCell></TableRow>
                  )}
                </React.Fragment>
              ))}
              {allResourceIds.length === 0 && (
                <TableRow><TableCell colSpan={8} className="h-24 text-center">Aucune ressource trouvée.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      );
    };
    
    export default ResourcesTable;