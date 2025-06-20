/**
 * WhatsApp Conversation Hook
 * React hook for managing WhatsApp conversations
 */

import { useState, useEffect, useCallback } from 'react';
import { whatsAppConversationService } from '@/services/whatsapp/conversation.service';
import { Conversation, ConversationMessage, IncomingMessage } from '@/services/whatsapp/types';
import { toast } from 'sonner';

interface UseWhatsAppConversationOptions {
  autoConnect?: boolean;
  onMessageReceived?: (message: ConversationMessage) => void;
  onEmergency?: (data: { from: string; message: string; timestamp: Date }) => void;
}

export function useWhatsAppConversation(options: UseWhatsAppConversationOptions = {}) {
  const { autoConnect = true, onMessageReceived, onEmergency } = options;
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load conversations
  const loadConversations = useCallback(() => {
    const allConversations = whatsAppConversationService.getConversations();
    setConversations(allConversations);
    
    // Calculate unread count
    const unread = allConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
    setUnreadCount(unread);
  }, []);

  // Send text message
  const sendMessage = useCallback(
    async (contactId: string, text: string, replyToMessageId?: string) => {
      setIsLoading(true);
      try {
        await whatsAppConversationService.sendMessage(contactId, text, replyToMessageId);
        loadConversations();
      } catch (error) {
        toast.error('Failed to send message');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadConversations]
  );

  // Send image
  const sendImage = useCallback(
    async (contactId: string, imageUrl: string, caption?: string) => {
      setIsLoading(true);
      try {
        await whatsAppConversationService.sendImage(contactId, imageUrl, caption);
        loadConversations();
      } catch (error) {
        toast.error('Failed to send image');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadConversations]
  );

  // Send document
  const sendDocument = useCallback(
    async (contactId: string, documentUrl: string, filename?: string, caption?: string) => {
      setIsLoading(true);
      try {
        await whatsAppConversationService.sendDocument(contactId, documentUrl, filename, caption);
        loadConversations();
      } catch (error) {
        toast.error('Failed to send document');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadConversations]
  );

  // Send location
  const sendLocation = useCallback(
    async (contactId: string, latitude: number, longitude: number, name?: string, address?: string) => {
      setIsLoading(true);
      try {
        await whatsAppConversationService.sendLocation(contactId, latitude, longitude, name, address);
        loadConversations();
      } catch (error) {
        toast.error('Failed to send location');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadConversations]
  );

  // Mark conversation as read
  const markAsRead = useCallback(
    async (conversationId: string) => {
      try {
        await whatsAppConversationService.markAsRead(conversationId);
        loadConversations();
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    },
    [loadConversations]
  );

  // Archive conversation
  const archiveConversation = useCallback(
    (conversationId: string) => {
      whatsAppConversationService.archiveConversation(conversationId);
      loadConversations();
    },
    [loadConversations]
  );

  // Unarchive conversation
  const unarchiveConversation = useCallback(
    (conversationId: string) => {
      whatsAppConversationService.unarchiveConversation(conversationId);
      loadConversations();
    },
    [loadConversations]
  );

  // Block contact
  const blockContact = useCallback(
    (contactId: string) => {
      whatsAppConversationService.blockContact(contactId);
      loadConversations();
      toast.success('Contact blocked');
    },
    [loadConversations]
  );

  // Unblock contact
  const unblockContact = useCallback(
    (contactId: string) => {
      whatsAppConversationService.unblockContact(contactId);
      loadConversations();
      toast.success('Contact unblocked');
    },
    [loadConversations]
  );

  // Search conversations
  const searchConversations = useCallback(
    (query: string): Conversation[] => {
      return whatsAppConversationService.searchConversations(query);
    },
    []
  );

  // Add tag
  const addTag = useCallback(
    (conversationId: string, tag: string) => {
      whatsAppConversationService.addTag(conversationId, tag);
      loadConversations();
    },
    [loadConversations]
  );

  // Remove tag
  const removeTag = useCallback(
    (conversationId: string, tag: string) => {
      whatsAppConversationService.removeTag(conversationId, tag);
      loadConversations();
    },
    [loadConversations]
  );

  // Get conversation
  const getConversation = useCallback(
    (contactId: string): Conversation | undefined => {
      return whatsAppConversationService.getConversation(contactId);
    },
    []
  );

  // Setup event listeners
  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      toast.success('WhatsApp connected');
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      toast.error('WhatsApp disconnected');
    };

    const handleMessageReceived = (message: ConversationMessage) => {
      loadConversations();
      toast.info(`New message from ${message.conversationId}`);
      onMessageReceived?.(message);
    };

    const handleConversationUpdated = () => {
      loadConversations();
    };

    const handleEmergency = (data: any) => {
      toast.error('🚨 Emergency reported!');
      onEmergency?.(data);
    };

    const handleAccessAuthorized = (data: any) => {
      toast.info(`Access ${data.authorized ? 'authorized' : 'denied'} by ${data.from}`);
    };

    whatsAppConversationService.on('connected', handleConnected);
    whatsAppConversationService.on('disconnected', handleDisconnected);
    whatsAppConversationService.on('messageReceived', handleMessageReceived);
    whatsAppConversationService.on('conversationUpdated', handleConversationUpdated);
    whatsAppConversationService.on('emergency', handleEmergency);
    whatsAppConversationService.on('accessAuthorized', handleAccessAuthorized);

    // Initial load
    loadConversations();

    return () => {
      whatsAppConversationService.off('connected', handleConnected);
      whatsAppConversationService.off('disconnected', handleDisconnected);
      whatsAppConversationService.off('messageReceived', handleMessageReceived);
      whatsAppConversationService.off('conversationUpdated', handleConversationUpdated);
      whatsAppConversationService.off('emergency', handleEmergency);
      whatsAppConversationService.off('accessAuthorized', handleAccessAuthorized);
    };
  }, [loadConversations, onMessageReceived, onEmergency]);

  return {
    // State
    conversations,
    activeConversation,
    isConnected,
    isLoading,
    unreadCount,

    // Actions
    sendMessage,
    sendImage,
    sendDocument,
    sendLocation,
    markAsRead,
    archiveConversation,
    unarchiveConversation,
    blockContact,
    unblockContact,
    searchConversations,
    addTag,
    removeTag,
    getConversation,
    setActiveConversation,

    // Helpers
    activeConversations: conversations.filter(c => c.status === 'active'),
    archivedConversations: conversations.filter(c => c.status === 'archived')
  };
}