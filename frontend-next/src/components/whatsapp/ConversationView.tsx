'use client';

import { useState, useRef, useEffect } from 'react';
import { Conversation, ConversationMessage } from '@/services/whatsapp/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Phone, 
  Archive, 
  Ban,
  Tag,
  Send,
  Paperclip,
  Image,
  MapPin,
  Smile,
  CheckCheck,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ConversationViewProps {
  conversation: Conversation | null;
  onSendMessage: (text: string) => void;
  onArchive: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  isLoading?: boolean;
}

export function ConversationView({
  conversation,
  onSendMessage,
  onArchive,
  onBlock,
  onUnblock,
  onAddTag,
  onRemoveTag,
  isLoading
}: ConversationViewProps) {
  const [message, setMessage] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(newTag.trim());
      setNewTag('');
      setShowTagInput(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderMessageContent = (message: ConversationMessage) => {
    switch (message.type) {
      case 'text':
        return <p className="whitespace-pre-wrap">{message.content.text}</p>;
      
      case 'image':
        return (
          <div className="space-y-2">
            <div className="bg-muted rounded-lg p-2">
              <Image className="h-4 w-4 inline mr-2" />
              Imagen
            </div>
            {message.content.caption && (
              <p className="text-sm">{message.content.caption}</p>
            )}
          </div>
        );
      
      case 'document':
        return (
          <div className="space-y-2">
            <div className="bg-muted rounded-lg p-2">
              <Paperclip className="h-4 w-4 inline mr-2" />
              {message.content.filename || 'Documento'}
            </div>
            {message.content.caption && (
              <p className="text-sm">{message.content.caption}</p>
            )}
          </div>
        );
      
      case 'location':
        return (
          <div className="bg-muted rounded-lg p-2">
            <MapPin className="h-4 w-4 inline mr-2" />
            {message.content.name || 'Ubicación'}
            {message.content.address && (
              <p className="text-xs text-muted-foreground">{message.content.address}</p>
            )}
          </div>
        );
      
      default:
        return <p className="text-muted-foreground">Mensaje no soportado</p>;
    }
  };

  const getMessageStatusIcon = (message: ConversationMessage) => {
    if (message.direction === 'inbound') return null;

    switch (message.status) {
      case 'pending':
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'sent':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  if (!conversation) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Selecciona una conversación para comenzar</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={conversation.contact.profilePicture} />
            <AvatarFallback>{getInitials(conversation.contact.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{conversation.contact.name}</h3>
            <p className="text-sm text-muted-foreground">{conversation.contact.phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Phone className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Opciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="mr-2 h-4 w-4" />
                Archivar conversación
              </DropdownMenuItem>
              {conversation.contact.isBlocked ? (
                <DropdownMenuItem onClick={onUnblock}>
                  <Ban className="mr-2 h-4 w-4" />
                  Desbloquear contacto
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onBlock}>
                  <Ban className="mr-2 h-4 w-4" />
                  Bloquear contacto
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setShowTagInput(true)}>
                <Tag className="mr-2 h-4 w-4" />
                Agregar etiqueta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Tags */}
      {(conversation.labels && conversation.labels.length > 0) || showTagInput ? (
        <div className="px-6 pb-3 flex flex-wrap gap-2">
          {conversation.labels?.map(label => (
            <Badge
              key={label}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => onRemoveTag(label)}
            >
              {label}
              <span className="ml-1 hover:text-destructive">×</span>
            </Badge>
          ))}
          {showTagInput && (
            <div className="flex items-center gap-1">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Nueva etiqueta"
                className="h-6 w-32 text-xs"
                autoFocus
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={handleAddTag}
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {/* Messages */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {conversation.messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.direction === 'outbound' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg p-3",
                    message.direction === 'outbound'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {renderMessageContent(message)}
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-xs opacity-70">
                      {format(new Date(message.timestamp), 'HH:mm', { locale: es })}
                    </span>
                    {getMessageStatusIcon(message)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      {/* Input */}
      <div className="p-4 border-t">
        {conversation.contact.isBlocked ? (
          <div className="text-center text-muted-foreground text-sm">
            No puedes enviar mensajes a un contacto bloqueado
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Smile className="h-4 w-4" />
            </Button>
            <Input
              ref={inputRef}
              placeholder="Escribe un mensaje..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}