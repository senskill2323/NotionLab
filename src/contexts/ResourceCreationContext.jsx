import React, { createContext, useContext, useState, useCallback } from 'react';
    import NewResourceDialog from '@/components/admin/NewResourceDialog';

    const ResourceCreationContext = createContext();

    export const useResourceCreation = () => useContext(ResourceCreationContext);

    export const ResourceCreationProvider = ({ children }) => {
      const [isDialogOpen, setIsDialogOpen] = useState(false);
      const [initialData, setInitialData] = useState(null);
      const [onSuccessCallback, setOnSuccessCallback] = useState(null);

      const openResourceDialog = useCallback((data, onSuccess) => {
        setInitialData(data);
        setOnSuccessCallback(() => onSuccess);
        setIsDialogOpen(true);
      }, []);

      const handleSuccess = () => {
        if (onSuccessCallback) {
          onSuccessCallback();
        }
      };

      return (
        <ResourceCreationContext.Provider value={{ openResourceDialog }}>
          {children}
          <NewResourceDialog
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            initialData={initialData}
            onSuccess={handleSuccess}
          />
        </ResourceCreationContext.Provider>
      );
    };