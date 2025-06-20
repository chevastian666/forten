'use client';

import { useState } from 'react';
import { useWhatsAppConversation } from '@/hooks/useWhatsAppConversation';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { NotificationCenter } from './NotificationCenter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  MessageCircle, 
  Bell, 
  Wifi,
  WifiOff,
  AlertCircle,
  RefreshCw,
  Users,
  Send
} from 'lucide-react';
import { useTranslations } from 'next-intl';

export function WhatsAppDashboard() {
  const t = useTranslations('WhatsApp');
  const [activeTab, setActiveTab] = useState<'conversations' | 'notifications'>('conversations');
  
  const {
    conversations,
    activeConversation,
    isConnected,
    isLoading,
    unreadCount,
    sendMessage,
    markAsRead,
    archiveConversation,
    blockContact,
    unblockContact,
    searchConversations,
    addTag,
    removeTag,
    setActiveConversation
  } = useWhatsAppConversation({
    onEmergency: (data) => {
      console.log('Emergency reported:', data);
      // Handle emergency notification
    }
  });

  const handleSelectConversation = (conversation: any) => {
    setActiveConversation(conversation);
    markAsRead(conversation.id);
  };

  const handleSendMessage = async (text: string) => {
    if (activeConversation) {
      await sendMessage(activeConversation.id, text);
    }
  };

  const handleArchive = () => {
    if (activeConversation) {
      archiveConversation(activeConversation.id);
      setActiveConversation(null);
    }
  };

  const handleBlock = () => {
    if (activeConversation) {
      blockContact(activeConversation.id);
    }
  };

  const handleUnblock = () => {
    if (activeConversation) {
      unblockContact(activeConversation.id);
    }
  };

  const handleAddTag = (tag: string) => {
    if (activeConversation) {
      addTag(activeConversation.id, tag);
    }
  };

  const handleRemoveTag = (tag: string) => {
    if (activeConversation) {
      removeTag(activeConversation.id, tag);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('title')}</CardTitle>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">{t('connected')}</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">{t('disconnected')}</span>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalConversations')}</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.unreadMessages')}</CardTitle>
            <Badge variant="destructive" className="h-6 px-2">
              {unreadCount}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.activeChats')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conversations.filter(c => c.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.sentToday')}</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            {t('tabs.conversations')}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t('tabs.notifications')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversations" className="mt-6">
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4 h-[600px]">
            <div className="md:col-span-1">
              <ConversationList
                conversations={conversations}
                activeConversationId={activeConversation?.id}
                onSelectConversation={handleSelectConversation}
                onSearch={searchConversations}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <ConversationView
                conversation={activeConversation}
                onSendMessage={handleSendMessage}
                onArchive={handleArchive}
                onBlock={handleBlock}
                onUnblock={handleUnblock}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                isLoading={isLoading}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationCenter />
        </TabsContent>
      </Tabs>
    </div>
  );
}