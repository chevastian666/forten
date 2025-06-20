'use client';

import { useState } from 'react';
import { Conversation } from '@/services/whatsapp/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Archive, 
  CheckCheck, 
  Clock,
  Ban,
  Tag
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (conversation: Conversation) => void;
  onSearch: (query: string) => void;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onSearch
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getLastMessagePreview = (conversation: Conversation): string => {
    if (!conversation.lastMessage) return 'Sin mensajes';
    
    const message = conversation.lastMessage;
    switch (message.type) {
      case 'text':
        return message.content.text || 'Mensaje de texto';
      case 'image':
        return '📷 Imagen';
      case 'document':
        return `📄 ${message.content.filename || 'Documento'}`;
      case 'video':
        return '🎥 Video';
      case 'audio':
        return message.content.isVoice ? '🎤 Mensaje de voz' : '🎵 Audio';
      case 'location':
        return '📍 Ubicación';
      default:
        return 'Mensaje';
    }
  };

  const getMessageStatusIcon = (conversation: Conversation) => {
    if (!conversation.lastMessage || conversation.lastMessage.direction === 'inbound') {
      return null;
    }

    switch (conversation.lastMessage.status) {
      case 'sent':
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (activeTab === 'active' && conv.status !== 'active') return false;
    if (activeTab === 'archived' && conv.status !== 'archived') return false;
    return true;
  });

  const renderConversation = (conversation: Conversation) => {
    const isActive = conversation.id === activeConversationId;
    const hasUnread = conversation.unreadCount > 0;

    return (
      <div
        key={conversation.id}
        className={cn(
          "flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors",
          isActive && "bg-muted"
        )}
        onClick={() => onSelectConversation(conversation)}
      >
        <div className="relative">
          <Avatar>
            <AvatarImage src={conversation.contact.profilePicture} />
            <AvatarFallback>{getInitials(conversation.contact.name)}</AvatarFallback>
          </Avatar>
          {conversation.contact.isBlocked && (
            <Ban className="absolute -bottom-1 -right-1 h-4 w-4 text-red-500 bg-background rounded-full" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={cn(
              "font-medium truncate",
              hasUnread && "font-semibold"
            )}>
              {conversation.contact.name}
            </h4>
            <span className={cn(
              "text-xs",
              hasUnread ? "text-primary font-medium" : "text-muted-foreground"
            )}>
              {conversation.lastMessage &&
                formatDistanceToNow(new Date(conversation.lastMessage.timestamp), {
                  addSuffix: true,
                  locale: es
                })}
            </span>
          </div>

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {getMessageStatusIcon(conversation)}
              <p className={cn(
                "text-sm truncate",
                hasUnread ? "text-foreground" : "text-muted-foreground"
              )}>
                {getLastMessagePreview(conversation)}
              </p>
            </div>

            {hasUnread && (
              <Badge variant="default" className="ml-2 h-5 min-w-[20px] px-1">
                {conversation.unreadCount}
              </Badge>
            )}
          </div>

          {conversation.labels && conversation.labels.length > 0 && (
            <div className="flex gap-1 mt-1">
              {conversation.labels.map(label => (
                <Badge key={label} variant="outline" className="text-xs py-0 h-5">
                  <Tag className="h-2 w-2 mr-1" />
                  {label}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b space-y-4">
        <h2 className="text-lg font-semibold">Conversaciones</h2>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar conversaciones..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'archived')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">
              Activas ({conversations.filter(c => c.status === 'active').length})
            </TabsTrigger>
            <TabsTrigger value="archived">
              <Archive className="h-4 w-4 mr-2" />
              Archivadas ({conversations.filter(c => c.status === 'archived').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Archive className="h-8 w-8 mb-2" />
            <p className="text-sm">No hay conversaciones</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map(renderConversation)}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}