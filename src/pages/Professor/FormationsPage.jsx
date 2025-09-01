import React from 'react';
import { Navigate } from 'react-router-dom';

// This page is deprecated and now redirects to the main dashboard page.
const ProfessorFormationsPage = () => {
  return <Navigate to="/dashboard" replace />;
};

export default ProfessorFormationsPage;