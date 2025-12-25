import React, { useState, useEffect, useRef } from 'react';
import { SoundOnIcon, SoundOffIcon } from './Icons';

interface AudioManagerProps {
  shouldPlay: boolean;
  onEnded?: () => void;
}

const AudioManager: React.FC<AudioManagerProps> = ({ shouldPlay, onEnded }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Initialize audio object
    // Note: Http content might be blocked on Https sites (Mixed Content).
    const audio = new Audio("http://music.163.com/song/media/outer/url?id=2111551108.mp3");
    audio.loop = true; // Changed to true for continuous play
    audio.volume = 0; // Start silent for fade in
    audioRef.current = audio;

    const handleEnded = () => {
      if (onEnded) onEnded();
    };

    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audioRef.current = null;
    };
  }, [onEnded]);

  useEffect(() => {
    if (shouldPlay && audioRef.current && !isPlaying) {
      const audio = audioRef.current;
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            // Fade in
            let vol = 0;
            const interval = setInterval(() => {
              if (vol < 0.5) { // Max volume 50%
                vol += 0.05;
                audio.volume = vol;
              } else {
                clearInterval(interval);
              }
            }, 200);
          })
          .catch((error) => {
            console.warn("Audio autoplay blocked or failed:", error);
          });
      }
    }
  }, [shouldPlay, isPlaying]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent launching fireworks
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="absolute top-4 right-4 z-50">
      <button 
        onClick={toggleMute}
        className="text-white/70 hover:text-white bg-white/10 p-2 rounded-full backdrop-blur-md transition-colors"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <SoundOffIcon className="w-6 h-6" /> : <SoundOnIcon className="w-6 h-6" />}
      </button>
    </div>
  );
};

export default AudioManager;