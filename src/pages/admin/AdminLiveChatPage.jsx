import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Navigation from '@/components/Navigation';
import AdminLiveChatPanel from '@/components/admin/AdminLiveChatPanel';

const AdminLiveChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from ?? '/admin/dashboard';

  return (
    <>
      <Helmet>
        <title>Live Chat | Admin</title>
        <meta
          name="description"
          content="Gerez toutes les conversations en temps reel depuis une interface unique."
        />
      </Helmet>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navigation />
        <div className="flex flex-1 overflow-hidden">
          <AdminLiveChatPanel
            className="flex-1"
          />
        </div>
      </div>
    </>
  );
};

export default AdminLiveChatPage;

