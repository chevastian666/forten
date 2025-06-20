// Performance optimization utilities

/**
 * Lazy load component with intersection observer
 */
export function createLazyComponent<T>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  options?: {
    rootMargin?: string;
    threshold?: number;
  }
) {
  return React.lazy(() => {
    return new Promise<{ default: React.ComponentType<T> }>((resolve) => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            observer.disconnect();
            importFn().then(resolve);
          }
        },
        {
          rootMargin: options?.rootMargin || '50px',
          threshold: options?.threshold || 0.1,
        }
      );
      
      // Observer will be set up when component mounts
      resolve(importFn());
    });
  });
}

/**
 * Preload route components
 */
export function preloadRoute(routePath: string) {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = routePath;
  document.head.appendChild(link);
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle function for scroll events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * Optimize image loading
 */
export function getOptimizedImageProps(
  src: string,
  alt: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    priority?: boolean;
  }
) {
  return {
    src,
    alt,
    width: options?.width || 400,
    height: options?.height || 300,
    quality: options?.quality || 75,
    priority: options?.priority || false,
    placeholder: 'blur' as const,
    blurDataURL: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx4f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=='
  };
}

/**
 * Virtual scrolling for large lists
 */
export class VirtualScroller {
  private container: HTMLElement;
  private itemHeight: number;
  private items: any[];
  private visibleRange: { start: number; end: number };
  private renderCallback: (items: any[], startIndex: number) => void;

  constructor(
    container: HTMLElement,
    itemHeight: number,
    items: any[],
    renderCallback: (items: any[], startIndex: number) => void
  ) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.items = items;
    this.renderCallback = renderCallback;
    this.visibleRange = { start: 0, end: 10 };
    
    this.setupScrollListener();
    this.render();
  }

  private setupScrollListener() {
    this.container.addEventListener('scroll', throttle(() => {
      this.updateVisibleRange();
      this.render();
    }, 16)); // ~60fps
  }

  private updateVisibleRange() {
    const scrollTop = this.container.scrollTop;
    const containerHeight = this.container.clientHeight;
    
    const start = Math.floor(scrollTop / this.itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / this.itemHeight) + 5, // Buffer
      this.items.length
    );
    
    this.visibleRange = { start, end };
  }

  private render() {
    const visibleItems = this.items.slice(
      this.visibleRange.start,
      this.visibleRange.end
    );
    
    this.renderCallback(visibleItems, this.visibleRange.start);
  }

  updateItems(newItems: any[]) {
    this.items = newItems;
    this.updateVisibleRange();
    this.render();
  }
}

import React from 'react';