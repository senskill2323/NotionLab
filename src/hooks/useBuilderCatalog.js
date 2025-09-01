import { useContext } from 'react';
import { BuilderCatalogContext } from '@/contexts/BuilderCatalogContext';

export const useBuilderCatalog = () => {
    const context = useContext(BuilderCatalogContext);
    if (!context) {
        throw new Error('useBuilderCatalog must be used within a BuilderCatalogProvider');
    }
    return context;
};