/**
 * HikCentral Streaming Service
 * Handles HLS/RTSP streaming with adaptive quality
 */

import Hls from 'hls.js';
import { STREAM_PROFILES } from './config';

export interface StreamingOptions {
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
  quality?: keyof typeof STREAM_PROFILES;
  onError?: (error: any) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onQualityChange?: (quality: string) => void;
}

export class HikCentralStreaming {
  private hls: Hls | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private currentQuality: keyof typeof STREAM_PROFILES = 'MEDIUM';
  private options: StreamingOptions;
  private retryCount = 0;
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(videoElement: HTMLVideoElement, options: StreamingOptions = {}) {
    this.videoElement = videoElement;
    this.options = {
      autoplay: true,
      muted: true,
      controls: true,
      loop: false,
      quality: 'MEDIUM',
      ...options
    };
    this.currentQuality = this.options.quality || 'MEDIUM';
  }

  /**
   * Load HLS stream
   */
  loadStream(url: string): void {
    if (!this.videoElement) {
      console.error('Video element not found');
      return;
    }

    // Cleanup existing HLS instance
    this.destroy();

    // Check HLS support
    if (Hls.isSupported()) {
      this.hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000, // 60 MB
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 3,
        maxFragLookUpTolerance: 0.25,
        enableSoftwareAES: true,
        startLevel: this.getStartLevel(),
        autoStartLoad: true,
        startPosition: -1,
        xhrSetup: (xhr: XMLHttpRequest) => {
          // Add any required headers for HikCentral
          xhr.withCredentials = true;
        }
      });

      // Bind HLS events
      this.bindHlsEvents();

      // Load source
      this.hls.loadSource(url);
      this.hls.attachMedia(this.videoElement);

      // Apply options
      this.applyVideoOptions();
    } else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      this.videoElement.src = url;
      this.applyVideoOptions();
      this.bindVideoEvents();
    } else {
      const error = new Error('HLS is not supported in this browser');
      console.error(error);
      if (this.options.onError) {
        this.options.onError(error);
      }
    }
  }

  /**
   * Load RTSP stream (requires transcoding)
   */
  loadRTSPStream(url: string): void {
    // RTSP typically requires server-side transcoding to HLS/WebRTC
    // This is a placeholder for RTSP handling
    console.warn('RTSP streaming requires server-side transcoding');
    
    // You would typically convert RTSP to HLS on the server
    // and then load the HLS stream
    const hlsUrl = url.replace('rtsp://', 'https://').replace(':554', ':8080') + '/stream.m3u8';
    this.loadStream(hlsUrl);
  }

  /**
   * Bind HLS events
   */
  private bindHlsEvents(): void {
    if (!this.hls) return;

    this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('HLS manifest parsed');
      if (this.options.autoplay && this.videoElement) {
        this.videoElement.play().catch(e => {
          console.warn('Autoplay failed:', e);
          // Retry with muted
          if (this.videoElement) {
            this.videoElement.muted = true;
            this.videoElement.play().catch(console.error);
          }
        });
      }
    });

    this.hls.on(Hls.Events.LEVEL_SWITCHING, (_event, data) => {
      console.log(`Switching to quality level ${data.level}`);
      if (this.options.onQualityChange) {
        this.options.onQualityChange(`Level ${data.level}`);
      }
    });

    this.hls.on(Hls.Events.ERROR, (_event, data) => {
      console.error('HLS error:', data);
      
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error('Fatal network error encountered, trying to recover');
            this.handleNetworkError();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error('Fatal media error encountered, trying to recover');
            this.hls?.recoverMediaError();
            break;
          default:
            console.error('Fatal error, cannot recover');
            if (this.options.onError) {
              this.options.onError(data);
            }
            this.destroy();
            break;
        }
      }
    });

    this.hls.on(Hls.Events.FRAG_LOADING, () => {
      if (this.options.onLoadStart) {
        this.options.onLoadStart();
      }
    });

    this.hls.on(Hls.Events.FRAG_LOADED, () => {
      if (this.options.onLoadEnd) {
        this.options.onLoadEnd();
      }
      this.retryCount = 0; // Reset retry count on successful load
    });
  }

  /**
   * Bind video element events
   */
  private bindVideoEvents(): void {
    if (!this.videoElement) return;

    this.videoElement.addEventListener('loadstart', () => {
      if (this.options.onLoadStart) {
        this.options.onLoadStart();
      }
    });

    this.videoElement.addEventListener('loadeddata', () => {
      if (this.options.onLoadEnd) {
        this.options.onLoadEnd();
      }
    });

    this.videoElement.addEventListener('error', (e) => {
      console.error('Video error:', e);
      if (this.options.onError) {
        this.options.onError(e);
      }
    });
  }

  /**
   * Apply video options
   */
  private applyVideoOptions(): void {
    if (!this.videoElement) return;

    this.videoElement.autoplay = this.options.autoplay || false;
    this.videoElement.muted = this.options.muted || false;
    this.videoElement.controls = this.options.controls || true;
    this.videoElement.loop = this.options.loop || false;
  }

  /**
   * Get start level based on quality setting
   */
  private getStartLevel(): number {
    switch (this.currentQuality) {
      case 'HIGH':
        return -1; // Auto, prefer highest
      case 'MEDIUM':
        return 2; // Start with medium quality
      case 'LOW':
        return 1;
      case 'MOBILE':
        return 0;
      default:
        return -1;
    }
  }

  /**
   * Handle network errors with retry
   */
  private handleNetworkError(): void {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`Retrying stream (attempt ${this.retryCount}/${this.maxRetries})`);
      
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
      }
      
      this.retryTimeout = setTimeout(() => {
        if (this.hls) {
          this.hls.startLoad();
        }
      }, 2000 * this.retryCount); // Exponential backoff
    } else {
      console.error('Max retries reached, giving up');
      if (this.options.onError) {
        this.options.onError(new Error('Failed to load stream after multiple attempts'));
      }
    }
  }

  /**
   * Change stream quality
   */
  setQuality(quality: keyof typeof STREAM_PROFILES | 'auto'): void {
    if (!this.hls) return;

    if (quality === 'auto') {
      this.hls.currentLevel = -1; // Enable auto quality
    } else {
      // Find the level that matches the desired quality
      const targetProfile = STREAM_PROFILES[quality];
      const levels = this.hls.levels;
      
      const targetLevel = levels.findIndex(level => {
        return level.width === parseInt(targetProfile.resolution.split('x')[0]);
      });

      if (targetLevel !== -1) {
        this.hls.currentLevel = targetLevel;
        this.currentQuality = quality;
      }
    }
  }

  /**
   * Get available quality levels
   */
  getQualityLevels(): Array<{
    level: number;
    width: number;
    height: number;
    bitrate: number;
  }> {
    if (!this.hls) return [];

    return this.hls.levels.map((level, index) => ({
      level: index,
      width: level.width,
      height: level.height,
      bitrate: level.bitrate
    }));
  }

  /**
   * Get current quality level
   */
  getCurrentQuality(): number {
    return this.hls?.currentLevel || -1;
  }

  /**
   * Take snapshot
   */
  takeSnapshot(): string | null {
    if (!this.videoElement) return null;

    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  /**
   * Play video
   */
  play(): Promise<void> {
    if (!this.videoElement) return Promise.reject('No video element');
    return this.videoElement.play();
  }

  /**
   * Pause video
   */
  pause(): void {
    if (!this.videoElement) return;
    this.videoElement.pause();
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    if (!this.videoElement) return;
    this.videoElement.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Seek to time
   */
  seekTo(time: number): void {
    if (!this.videoElement) return;
    this.videoElement.currentTime = time;
  }

  /**
   * Get current time
   */
  getCurrentTime(): number {
    return this.videoElement?.currentTime || 0;
  }

  /**
   * Get duration
   */
  getDuration(): number {
    return this.videoElement?.duration || 0;
  }

  /**
   * Get buffered percentage
   */
  getBufferedPercentage(): number {
    if (!this.videoElement || !this.videoElement.buffered.length) return 0;
    
    const buffered = this.videoElement.buffered;
    const currentTime = this.videoElement.currentTime;
    const duration = this.videoElement.duration;
    
    if (!duration) return 0;
    
    // Find the buffered range that contains current time
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= currentTime && buffered.end(i) >= currentTime) {
        return (buffered.end(i) / duration) * 100;
      }
    }
    
    return 0;
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    if (this.videoElement) {
      this.videoElement.src = '';
      this.videoElement.load();
    }

    this.retryCount = 0;
  }
}

// Factory function for creating streaming instances
export function createHikCentralStream(
  videoElement: HTMLVideoElement,
  options?: StreamingOptions
): HikCentralStreaming {
  return new HikCentralStreaming(videoElement, options);
}