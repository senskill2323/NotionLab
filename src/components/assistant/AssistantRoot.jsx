import React, { useEffect, useRef } from 'react';
import { useAssistantStore } from '@/hooks/useAssistantStore';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import AssistantDrawer from './AssistantDrawer';
import AssistantWidget from './AssistantWidget';
import ConsentBanner from './ConsentBanner';

const ALLOWED_USER_TYPES = ['owner', 'admin', 'client'];

const AssistantRoot = () => {
  const { user } = useAuth();
  const { isOpen, minimized, closeDrawer, openDrawer, setConnectionState } = useAssistantStore();
  const allowed = !!user && ALLOWED_USER_TYPES.includes(user?.profile?.user_type);

  useEffect(() => {
    if (!allowed) {
      // Ensure the drawer is closed if user becomes ineligible
      closeDrawer();
      setConnectionState('disconnected');
    }
  }, [allowed, closeDrawer, setConnectionState]);

  if (!allowed) return null;

  return (
    <>
      {/* Drawer anchored to the right. Independent panel that doesn't shift main layout */}
      <AssistantDrawer open={isOpen} onClose={closeDrawer} />

      {/* Floating mini widget for quick actions */}
      {!isOpen && <AssistantWidget onOpen={openDrawer} />}

      {/* Consent banner displayed until dismissed */}
      <ConsentBanner />
    </>
  );
};

export default AssistantRoot;
