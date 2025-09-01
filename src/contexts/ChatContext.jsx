import React, { createContext, useState, useContext, useCallback } from 'react';

const ChatContext = createContext(null);

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [prefilledMessage, setPrefilledMessage] = useState('');

  const openChat = useCallback((message = '') => {
    setIsOpen(true);
    setIsMinimized(false);
    if (message) {
      setPrefilledMessage(message);
    }
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);
  
  const minimizeChat = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const toggleChat = useCallback(() => {
    if (isOpen) {
      if (isMinimized) {
        setIsOpen(true);
        setIsMinimized(false);
      } else {
        setIsOpen(false);
      }
    } else {
      openChat();
    }
  }, [isOpen, isMinimized, openChat]);

  const value = {
    isOpen,
    isMinimized,
    openChat,
    closeChat,
    minimizeChat,
    toggleChat,
    prefilledMessage,
    setPrefilledMessage
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};