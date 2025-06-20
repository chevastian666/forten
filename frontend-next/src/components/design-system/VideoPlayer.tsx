"use client";

import styled from '@emotion/styled';
import { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '@/lib/theme';
import { Spinner } from './Spinner';
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  CameraIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';

const Container = styled.div<{ fullscreen: boolean }>`
  position: ${props => props.fullscreen ? 'fixed' : 'relative'};
  top: ${props => props.fullscreen ? '0' : 'auto'};
  left: ${props => props.fullscreen ? '0' : 'auto'};
  right: ${props => props.fullscreen ? '0' : 'auto'};
  bottom: ${props => props.fullscreen ? '0' : 'auto'};
  width: ${props => props.fullscreen ? '100%' : '100%'};
  height: ${props => props.fullscreen ? '100%' : '100%'};
  background: black;
  border-radius: ${props => props.fullscreen ? '0' : theme.borderRadius.xl};
  overflow: hidden;
  z-index: ${props => props.fullscreen ? '9999' : '1'};
`;

const PlayerWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LoadingOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  z-index: 10;
`;

const Controls = styled(motion.div)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: ${theme.spacing.md};
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  z-index: 20;
`;

const ControlButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: ${theme.borderRadius.full};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const TimeDisplay = styled.div`
  color: white;
  font-size: ${theme.typography.fontSize.sm};
  font-family: ${theme.typography.fontFamily.mono};
  margin-left: auto;
`;

const ErrorMessage = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  text-align: center;
  padding: ${theme.spacing.md};
`;

const ErrorIcon = styled(CameraIcon)`
  width: 48px;
  height: 48px;
  margin-bottom: ${theme.spacing.sm};
  opacity: 0.5;
`;

const ErrorText = styled.p`
  font-size: ${theme.typography.fontSize.lg};
  margin-bottom: ${theme.spacing.xs};
`;

const ErrorSubtext = styled.p`
  font-size: ${theme.typography.fontSize.sm};
  opacity: 0.7;
`;

const RetryButton = styled(ControlButton)`
  margin-top: ${theme.spacing.md};
  width: auto;
  padding: ${theme.spacing.xs} ${theme.spacing.md};
`;

const LiveBadge = styled(motion.div)`
  position: absolute;
  top: ${theme.spacing.md};
  left: ${theme.spacing.md};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.error[600]};
  color: white;
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.bold};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  z-index: 20;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(1.5);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

const RecordingInfo = styled.div`
  position: absolute;
  top: ${theme.spacing.md};
  right: ${theme.spacing.md};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.sm};
  z-index: 20;
`;

export interface VideoPlayerProps {
  url: string;
  type?: 'live' | 'recording';
  isLive?: boolean;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  onSnapshot?: () => void;
  onError?: (error: any) => void;
  deviceName?: string;
  location?: string;
  recordingDate?: Date;
}

export function VideoPlayer({
  url,
  type = 'live',
  isLive = false,
  poster,
  autoPlay = true,
  muted = true,
  controls = true,
  onSnapshot,
  onError,
  deviceName,
  location,
  recordingDate
}: VideoPlayerProps) {
  const [playing, setPlaying] = useState(autoPlay);
  const [volume, setVolume] = useState(muted ? 0 : 1);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const playerRef = useRef<ReactPlayer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreen) {
        setFullscreen(false);
      }
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying(!playing);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [fullscreen, playing]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleReady = () => {
    setLoading(false);
    setError(null);
  };

  const handleError = (e: any) => {
    setLoading(false);
    setError('No se pudo cargar el video');
    onError?.(e);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Force re-render by changing key
    if (playerRef.current) {
      playerRef.current.seekTo(0);
    }
  };

  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds();
    return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!fullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setFullscreen(!fullscreen);
  };

  return (
    <Container 
      ref={containerRef}
      fullscreen={fullscreen}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <PlayerWrapper>
        {error ? (
          <ErrorMessage>
            <ErrorIcon />
            <ErrorText>{error}</ErrorText>
            <ErrorSubtext>
              {deviceName && `${deviceName} - ${location}`}
            </ErrorSubtext>
            <RetryButton onClick={handleRetry}>
              <ArrowPathIcon />
              Reintentar
            </RetryButton>
          </ErrorMessage>
        ) : (
          <>
            <ReactPlayer
              ref={playerRef}
              url={url}
              playing={playing}
              volume={volume}
              muted={muted}
              width="100%"
              height="100%"
              onReady={handleReady}
              onError={handleError}
              onBuffer={() => setLoading(true)}
              onBufferEnd={() => setLoading(false)}
              onDuration={setDuration}
              onProgress={({ playedSeconds }) => setCurrentTime(playedSeconds)}
              config={{
                file: {
                  attributes: {
                    poster
                  }
                }
              }}
            />

            <AnimatePresence>
              {loading && (
                <LoadingOverlay
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Spinner size="lg" />
                </LoadingOverlay>
              )}
            </AnimatePresence>

            {(isLive || type === 'live') && (
              <LiveBadge
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                EN VIVO
              </LiveBadge>
            )}

            {recordingDate && (
              <RecordingInfo>
                {recordingDate.toLocaleDateString('es-UY', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </RecordingInfo>
            )}

            {controls && (
              <AnimatePresence>
                {showControls && (
                  <Controls
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                  >
                    <ControlButton onClick={() => setPlaying(!playing)}>
                      {playing ? <PauseIcon /> : <PlayIcon />}
                    </ControlButton>
                    
                    <ControlButton onClick={() => setVolume(volume > 0 ? 0 : 1)}>
                      {volume > 0 ? <SpeakerWaveIcon /> : <SpeakerXMarkIcon />}
                    </ControlButton>

                    {onSnapshot && (
                      <ControlButton onClick={onSnapshot}>
                        <CameraIcon />
                      </ControlButton>
                    )}

                    <ControlButton onClick={toggleFullscreen}>
                      {fullscreen ? <ArrowsPointingInIcon /> : <ArrowsPointingOutIcon />}
                    </ControlButton>

                    {type === 'recording' && (
                      <TimeDisplay>
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </TimeDisplay>
                    )}
                  </Controls>
                )}
              </AnimatePresence>
            )}
          </>
        )}
      </PlayerWrapper>
    </Container>
  );
}