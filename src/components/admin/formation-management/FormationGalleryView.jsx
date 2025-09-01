import React from 'react';
import FormationCard from './FormationCard';
import { motion } from 'framer-motion';

const FormationGalleryView = ({ formations, onStatusChange, onTypeChange, onDuplicate, onDelete }) => {
  if (formations.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <h3 className="text-lg font-semibold">Aucune formation trouvée</h3>
        <p>Aucune formation ne correspond à vos filtres.</p>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {formations.map((formation) => (
        <motion.div key={formation.id} variants={itemVariants}>
          <FormationCard 
            formation={formation} 
            onStatusChange={onStatusChange}
            onTypeChange={onTypeChange}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default FormationGalleryView;