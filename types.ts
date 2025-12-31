
export enum JarvisStatus {
  IDLE = 'IDLE',
  STANDBY = 'STANDBY',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR'
}

export type WakeSensitivity = 'Low' | 'Medium' | 'High';

export interface LogEntry {
  id: string;
  timestamp: Date;
  sender: 'SYSTEM' | 'USER' | 'JARVIS';
  message: string;
}

export interface SystemStats {
  cpu: number;
  memory: number;
  network: number;
  uptime: string;
  wakeSensitivity?: WakeSensitivity;
}
