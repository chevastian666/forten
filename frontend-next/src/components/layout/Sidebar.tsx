"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { preloadRoute } from '@/utils/performance';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Building, 
  Home, 
  Users, 
  Key, 
  Camera, 
  Bell, 
  Settings, 
  LogOut,
  Menu,
  X,
  ChevronDown,
  BarChart3,
  FileText,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Edificios', href: '/buildings', icon: Building },
  { name: 'Residentes', href: '/residents', icon: Users },
  { name: 'Accesos', href: '/access', icon: Key },
  { name: 'Cámaras', href: '/cameras', icon: Camera },
  { name: 'Eventos', href: '/events', icon: Bell },
  { name: 'WhatsApp', href: '/whatsapp', icon: MessageSquare },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Reportes', href: '/reports', icon: FileText },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Preload routes on component mount for better performance
  useEffect(() => {
    navigation.forEach(item => {
      if (typeof window !== 'undefined') {
        preloadRoute(item.href);
      }
    });
  }, []);

  return (
    <div className={cn(
      "flex flex-col h-full bg-card border-r transition-all duration-300",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                <Building className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg">FORTEN</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto"
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className="h-4 w-4" />
                {!collapsed && item.name}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t">
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <Avatar>
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Admin</p>
              <p className="text-xs text-muted-foreground truncate">admin@forten.com</p>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon">
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {!collapsed && (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 mt-2 text-destructive hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        )}
      </div>
    </div>
  );
}