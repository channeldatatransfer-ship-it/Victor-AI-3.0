
import React from 'react';
import { JarvisStatus } from '../types';

interface HUDProps {
  status: JarvisStatus;
}

const HUD: React.FC<HUDProps> = ({ status }) => {
  const isThinking = status === JarvisStatus.THINKING;
  const isSpeaking = status === JarvisStatus.SPEAKING;
  const isListening = status === JarvisStatus.LISTENING;
  const isStandby = status === JarvisStatus.STANDBY;

  const coreColor = isStandby ? 'text-amber-600/40' : 'text-sky-400';
  const glowColor = isStandby ? 'bg-amber-500/5' : 'bg-sky-500/5';
  const ringColor = isStandby ? 'border-amber-500/10' : 'border-sky-500/20';

  return (
    <div className="relative w-64 h-64 md:w-96 md:h-96 flex items-center justify-center">
      
      {/* Outer Rotating Ring */}
      <div className={`absolute inset-0 border-2 border-dashed rounded-full transition-colors duration-1000 animate-[spin_30s_linear_infinite] ${ringColor} ${isThinking ? 'border-sky-400/50' : ''}`}></div>
      
      {/* Inner Pulsing Rings */}
      <div className={`absolute w-[90%] h-[90%] border rounded-full animate-pulse-ring transition-colors duration-1000 ${isStandby ? 'border-amber-500/5' : 'border-sky-400/10'}`}></div>
      <div className={`absolute w-[80%] h-[80%] border rounded-full transition-colors duration-1000 ${isStandby ? 'border-amber-500/10' : 'border-sky-400/20'} ${isListening ? 'animate-pulse' : ''}`}></div>

      {/* Core Element */}
      <div className="relative w-32 h-32 md:w-48 md:h-48 flex items-center justify-center">
        <div className={`absolute inset-0 rounded-full transition-all duration-1000 ${glowColor} ${isSpeaking ? 'scale-110 opacity-30 shadow-[0_0_30px_rgba(56,189,248,0.4)]' : 'scale-100 opacity-20'}`}></div>
        
        {/* The "Brain" / Arc Reactor style core */}
        <svg viewBox="0 0 100 100" className={`w-full h-full transition-all duration-1000 ${isStandby ? 'opacity-40 drop-shadow-[0_0_5px_rgba(245,158,11,0.3)]' : 'drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]'}`}>
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" className={isStandby ? 'text-amber-900' : 'text-sky-900'} />
          <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="5,10" className={isStandby ? 'text-amber-800' : 'text-sky-700'} />
          
          {/* Central Pulsating Core */}
          <circle 
            cx="50" 
            cy="50" 
            r={isSpeaking ? "18" : (isThinking ? "15" : "12")} 
            className={`transition-all duration-1000 ${isStandby ? 'fill-amber-600/40' : 'fill-sky-400'} ${isThinking ? 'animate-pulse' : ''}`} 
          />
          
          {/* Spokes */}
          {[...Array(12)].map((_, i) => (
            <line
              key={i}
              x1="50"
              y1="25"
              x2="50"
              y2="10"
              transform={`rotate(${i * 30} 50 50)`}
              stroke="currentColor"
              strokeWidth="1.5"
              className={`opacity-40 transition-all duration-1000 ${isStandby ? 'text-amber-700' : 'text-sky-400'} ${isSpeaking ? 'animate-pulse' : ''}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </svg>

        {/* TTS Waveform visualization */}
        {isSpeaking && (
          <div className="absolute inset-0 flex items-center justify-center space-x-1.5 px-6">
             {[...Array(8)].map((_, i) => (
               <div 
                key={i} 
                className="w-1 bg-sky-400/80 rounded-full animate-[bounce_0.6s_infinite]" 
                style={{ 
                  height: `${20 + Math.random() * 50}%`, 
                  animationDelay: `${i * 0.08}s` 
                }}
              ></div>
             ))}
          </div>
        )}
      </div>

      {/* Text Indicator */}
      <div className="absolute bottom-[-25%] flex flex-col items-center">
        <span className={`font-orbitron text-[8px] tracking-[0.4em] uppercase opacity-60 transition-colors duration-1000 ${isStandby ? 'text-amber-500' : 'text-sky-500'}`}>
          {isStandby ? 'Neural Standby' : 'Voice Link Active'}
        </span>
        <div className={`h-[1px] w-24 bg-gradient-to-r from-transparent to-transparent my-1 transition-colors duration-1000 ${isStandby ? 'via-amber-500/30' : 'via-sky-500'}`}></div>
        <span className={`font-orbitron text-[9px] uppercase tracking-[0.2em] ${isStandby ? 'text-amber-600/50' : 'text-sky-400'}`}>
           {status}
        </span>
      </div>
    </div>
  );
};

export default HUD;
