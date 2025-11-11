import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Music } from 'lucide-react';

interface CustomAudioPlayerProps {
  src: string;
  isMine: boolean;
}

const formatTime = (time: number): string => {
  if (isNaN(time) || time < 0) return '00:00';
  const total = Math.ceil(time);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({ src, isMine }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isHovering, setIsHovering] = useState(false);
  const rafRef = useRef<number | undefined>(undefined);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = undefined;
  }, []);

  const startLoop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const loop = () => {
      if (!audio.paused && !audio.ended) {
        setCurrentTime(audio.currentTime);
        rafRef.current = requestAnimationFrame(loop);
      } else {
        setIsPlaying(false);
      }
    };

    if (!rafRef.current) rafRef.current = requestAnimationFrame(loop);
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;

    if (audio.paused || audio.ended) {
      if (audio.ended) audio.currentTime = 0;
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = src;
    audio.load();
    audio.playbackRate = playbackRate;

    const onLoaded = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const onPlay = () => {
      setIsPlaying(true);
      startLoop();
    };

    const onPause = () => {
      setIsPlaying(false);
      stopLoop();
    };

    const onEnded = () => {
      setIsPlaying(false);
      stopLoop();
      setCurrentTime(duration);
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      stopLoop();
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src, playbackRate, duration, startLoop, stopLoop]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value);
    const newTime = (percent / 100) * duration;

    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  return (
    <div
      className={`
        relative flex items-center gap-4 p-4 rounded-2xl w-full max-w-sm
        shadow-md transition-all duration-300 overflow-hidden
        ${isMine
          ? 'bg-linear-to-br from-indigo-500 via-indigo-600 to-indigo-700 text-white'
          : 'bg-white border border-gray-200 text-gray-900'}
      `}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Glow */}
      <div
        className={`
          absolute inset-0 rounded-2xl blur-xl transition-opacity duration-500
          ${isMine ? 'bg-indigo-400' : 'bg-gray-100'}
          ${isHovering ? 'opacity-30' : 'opacity-0'}
        `}
      />

      {/* Icon */}
      <div
        className={`
          relative z-10 shrink-0 w-11 h-11 flex items-center justify-center rounded-xl
          ${isMine ? 'bg-white/15 backdrop-blur-sm' : 'bg-indigo-50'}
        `}
      >
        <Music size={20} className={isMine ? 'text-white' : 'text-indigo-600'} />
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex flex-col grow gap-3">

        {/* TIME + SPEED (with gap added) */}
        <div className="flex items-center w-full">
          
          {/* timestamps */}
          <div className="flex items-center gap-1">
            <span className={`text-sm font-semibold tabular-nums ${isMine ? 'text-white' : 'text-gray-800'}`}>
              {formatTime(currentTime)}
            </span>
            <span className={`text-xs ${isMine ? 'text-white/60' : 'text-gray-400'}`}>/</span>
            <span className={`text-xs font-medium tabular-nums ${isMine ? 'text-white/80' : 'text-gray-500'}`}>
              {formatTime(duration)}
            </span>
          </div>

          {/* GAP ADDED HERE (ml-8 = good medium–large gap) */}
          <select
            value={playbackRate}
            onChange={(e) => handleRateChange(parseFloat(e.target.value))}
            className={`
              ml-8
              appearance-none px-2 py-0.5 rounded-md text-xs font-semibold
              cursor-pointer focus:outline-none focus:ring-1 transition
              ${isMine
                ? 'bg-white/20 text-white hover:bg-white/30 focus:ring-white/40'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-indigo-400'}
            `}
          >
            {PLAYBACK_RATES.map(rate => (
              <option key={rate} value={rate} className="text-gray-900">
                {rate}×
              </option>
            ))}
          </select>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlayPause}
            disabled={duration === 0}
            className={`
              flex items-center justify-center w-10 h-10 rounded-full transition-all shrink-0
              ${isHovering ? 'scale-105' : 'scale-100'}
              ${isMine
                ? 'bg-white text-indigo-600 hover:shadow-lg'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'}
              ${duration === 0 ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>

          {/* PROGRESS BAR */}
          <div className="relative grow h-2 group">
            <div className={`absolute inset-0 rounded-full ${isMine ? 'bg-white/25' : 'bg-gray-200'}`} />

            <div
              className={`absolute left-0 top-0 h-full rounded-full transition-all duration-150 ${isMine ? 'bg-white' : 'bg-indigo-600'}`}
              style={{ width: `${progressPercent}%` }}
            />

            <div
              className={`
                absolute w-3.5 h-3.5 rounded-full -translate-x-1/2 -translate-y-1/2 top-1/2 transition-transform duration-200
                ${isMine ? 'bg-white' : 'bg-indigo-600 ring-2 ring-white'}
                ${isHovering ? 'scale-125' : 'scale-100'}
              `}
              style={{ left: `${progressPercent}%` }}
            />

            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progressPercent}
              onChange={handleSeek}
              disabled={duration === 0}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

        </div>
      </div>

      <audio ref={audioRef} preload="metadata" className="hidden" />
    </div>
  );
};

export default CustomAudioPlayer;
