import { useState, useEffect, useRef, useCallback } from 'react';

export const useAccountPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const openPanel = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setActiveSection(null);
    // Retour du focus au trigger
    if (triggerRef.current) {
      triggerRef.current.focus();
    }
  }, []);

  const togglePanel = useCallback(() => {
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }, [isOpen, openPanel, closePanel]);

  const toggleSection = useCallback((sectionId) => {
    setActiveSection(current => current === sectionId ? null : sectionId);
  }, []);

  // Gestion des touches clavier
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          closePanel();
          break;
        case 'Tab':
          // Focus trap dans le panneau
          if (panelRef.current) {
            const focusableElements = panelRef.current.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey && document.activeElement === firstElement) {
              event.preventDefault();
              lastElement?.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
              event.preventDefault();
              firstElement?.focus();
            }
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus sur le premier élément focusable du panneau
      setTimeout(() => {
        const firstFocusable = panelRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closePanel]);

  // Fermeture au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && 
          panelRef.current && 
          !panelRef.current.contains(event.target) &&
          triggerRef.current &&
          !triggerRef.current.contains(event.target)) {
        closePanel();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closePanel]);

  return {
    isOpen,
    activeSection,
    triggerRef,
    panelRef,
    openPanel,
    closePanel,
    togglePanel,
    toggleSection
  };
};
