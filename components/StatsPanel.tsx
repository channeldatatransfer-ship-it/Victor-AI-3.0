
import React from 'react';
import { SystemStats, WakeSensitivity } from '../types';

interface StatsPanelProps {
  stats: SystemStats;
  onSensitivityChange?: (val: WakeSensitivity) => void;
}

const StatBar: React.FC<{ label: string; value: number; color: string; unit?: string }> = ({ label, value, color, unit = '%' }) => (
  <div className="flex flex-col space-y-1">
    <div className="flex justify-between items-center text-[10px] font-orbitron text-sky-600 uppercase">
      <span>{label}</span>
      <span>{value}{unit}</span>
    </div>
    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
      <div 
        className={`h-full ${color} transition-all duration-1000 ease-out`} 
        style={{ width: `${value}%` }}
      ></div>
    </div>
  </div>
);

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, onSensitivityChange }) => {
  const sensitivities: WakeSensitivity[] = ['Low', 'Medium', 'High'];

  return (
    <div className="space-y-6">
      {/* System Resources */}
      <div className="bg-sky-900/10 border border-sky-900/30 p-4 rounded-lg backdrop-blur-sm">
        <h3 className="text-[10px] font-orbitron text-sky-500 mb-4 tracking-widest uppercase">System Resources</h3>
        <div className="space-y-4">
          <StatBar label="Neural CPU" value={stats.cpu} color="bg-sky-500" />
          <StatBar label="Core Memory" value={stats.memory} color="bg-emerald-500" />
          <StatBar label="Net Bandwidth" value={Math.min(100, (stats.network / 1000) * 100)} color="bg-amber-500" unit="Mbps" />
        </div>
      </div>

      {/* Configuration Setting */}
      <div className="bg-sky-900/10 border border-sky-900/30 p-4 rounded-lg backdrop-blur-sm">
        <h3 className="text-[10px] font-orbitron text-sky-500 mb-4 tracking-widest uppercase">Configuration</h3>
        <div className="flex flex-col space-y-2">
          <span className="text-[8px] text-sky-700 uppercase">Wake Sensitivity</span>
          <div className="flex bg-slate-900/50 rounded p-1 border border-sky-900/30">
            {sensitivities.map((s) => (
              <button
                key={s}
                onClick={() => onSensitivityChange?.(s)}
                className={`flex-1 text-[9px] font-orbitron py-1 rounded transition-all ${
                  stats.wakeSensitivity === s 
                  ? 'bg-sky-500/20 text-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.2)]' 
                  : 'text-sky-900 hover:text-sky-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-[7px] text-sky-900 italic leading-tight">
            {stats.wakeSensitivity === 'High' && "Maximum responsiveness. May trigger on background noise."}
            {stats.wakeSensitivity === 'Medium' && "Standard balanced detection mode."}
            {stats.wakeSensitivity === 'Low' && "Requires precise wake word articulation."}
          </p>
        </div>
      </div>

      {/* Time & Environment */}
      <div className="bg-sky-900/10 border border-sky-900/30 p-4 rounded-lg backdrop-blur-sm">
        <h3 className="text-[10px] font-orbitron text-sky-500 mb-3 tracking-widest uppercase">Environment</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[8px] text-sky-700 uppercase">Uptime</span>
            <span className="text-xs font-orbitron text-sky-400">{stats.uptime}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] text-sky-700 uppercase">Temp</span>
            <span className="text-xs font-orbitron text-emerald-400">32°C</span>
          </div>
        </div>
      </div>

      {/* Diagnostic Chart */}
      <div className="h-24 bg-sky-900/10 border border-sky-900/30 p-2 rounded-lg relative overflow-hidden">
        <svg viewBox="0 0 200 80" className="w-full h-full opacity-40">
           <path 
             d="M0,40 Q25,20 50,45 T100,30 T150,50 T200,35" 
             fill="none" 
             stroke="#38bdf8" 
             strokeWidth="1"
             className="animate-[dash_5s_linear_infinite]"
             style={{ strokeDasharray: '200' }}
           />
           <path 
             d="M0,50 Q40,30 80,60 T140,20 T200,45" 
             fill="none" 
             stroke="#10b981" 
             strokeWidth="1"
             className="opacity-50"
           />
        </svg>
        <div className="absolute top-2 right-2 text-[8px] font-orbitron text-sky-700">DIAGNOSTIC FEED</div>
      </div>
    </div>
  );
};

export default StatsPanel;
