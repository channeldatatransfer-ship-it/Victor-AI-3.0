
import React from 'react';
import { LogEntry } from '../types';

interface ConsoleProps {
  logs: LogEntry[];
}

const Console: React.FC<ConsoleProps> = ({ logs }) => {
  return (
    <div className="flex-1 flex flex-col bg-slate-900/40 border border-sky-900/50 rounded-lg overflow-hidden backdrop-blur-md">
      <div className="p-2 border-b border-sky-900/50 bg-sky-900/20 flex items-center justify-between">
        <span className="text-[10px] font-orbitron text-sky-500 uppercase tracking-widest">System Logs</span>
        <div className="flex space-x-1">
          <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
          <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
        </div>
      </div>
      <div className="flex-1 p-3 overflow-y-auto space-y-2 font-mono text-[10px] scrollbar-thin scrollbar-thumb-sky-900">
        {logs.length === 0 && (
          <div className="text-sky-900 italic">No activity detected.</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex flex-col opacity-90 border-l border-sky-500/20 pl-2 py-1">
            <div className="flex justify-between items-center mb-0.5">
              <span className={`font-bold ${
                log.sender === 'SYSTEM' ? 'text-amber-500' : 
                log.sender === 'JARVIS' ? 'text-sky-400' : 'text-emerald-400'
              }`}>
                [{log.sender}]
              </span>
              <span className="text-sky-900">{log.timestamp.toLocaleTimeString()}</span>
            </div>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{log.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Console;
