import React from 'react';
import { Navigate } from 'react-router-dom';

// This page is deprecated and now redirects to the main login page.
const ProfessorLoginPage = () => {
  return <Navigate to="/connexion" replace />;
};

export default ProfessorLoginPage;