import React from 'react';
import { Navigate } from 'react-router-dom';

// This page is deprecated and now redirects to the main dashboard page.
const ProfessorTicketsPage = () => {
  return <Navigate to="/dashboard" replace />;
};

export default ProfessorTicketsPage;