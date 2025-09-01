import React from 'react';

// This component is no longer needed and has been deprecated.
// The logic is now handled by ProtectedRoute and PublicOnlyRoute.
// Keeping the file to avoid import errors if it's referenced somewhere unexpected,
// but it does nothing.
const AuthRedirector = ({ children }) => {
  return <>{children}</>;
};

export default AuthRedirector;