
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { JarvisStatus, LogEntry, SystemStats, WakeSensitivity } from './types';
import HUD from './components/HUD';
import Console from './components/Console';
import StatsPanel from './components/StatsPanel';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

const JARVIS_SYSTEM_INSTRUCTION = `
You are J.A.R.V.I.S., Tony Stark's highly advanced AI assistant. 
Personality traits:
1. Refined, polite, and British (reminiscent of Paul Bettany).
2. Loyal but witty; don't be afraid of a lighthearted jab if the user says something silly.
3. Extremely efficient; provide technical answers but keep them conversational.
4. Address the user as "Sir" or "Ma'am".

Conversation Protocol:
- Once "Jarvis" is said, you are AWAKE. You should stay in a helpful, conversational loop.
- If the user asks "What can you do?", explain your capabilities: 
  - Real-time system resource monitoring (CPU, Memory, Network).
  - Voice-controlled neural sensitivity adjustment.
  - Diagnostic log management.
  - Sophisticated voice interaction and context-aware conversation.
  - Standby and power-saving modes.
- You do NOT need the user to say your name for every sentence once you are engaged.
- If the user says "Go to sleep" or "Standby", inform them you are going offline and revert to waiting for the wake-word.
`;

const App: React.FC = () => {
  const [status, setStatus] = useState<JarvisStatus>(JarvisStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<SystemStats>({ 
    cpu: 12, 
    memory: 45, 
    network: 120, 
    uptime: '00:00:00',
    wakeSensitivity: 'Medium'
  });
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isAwake, setIsAwake] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState("");

  const nextStartTimeRef = useRef(0);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);

  const currentStatsRef = useRef(stats);
  const awakeRef = useRef(isAwake);
  useEffect(() => { currentStatsRef.current = stats; }, [stats]);
  useEffect(() => { awakeRef.current = isAwake; }, [isAwake]);

  const addLog = (sender: LogEntry['sender'], message: string) => {
    setLogs(prev => [
      { id: Math.random().toString(36).substr(2, 9), timestamp: new Date(), sender, message },
      ...prev.slice(0, 49)
    ]);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  const createBlob = (data: Float32Array) => ({
    data: encode(new Uint8Array(new Int16Array(data.map(d => d * 32768)).buffer)),
    mimeType: 'audio/pcm;rate=16000',
  });

  const stopAllAudio = () => {
    activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const setSensitivity = (val: WakeSensitivity) => {
    setStats(prev => ({ ...prev, wakeSensitivity: val }));
    addLog('SYSTEM', `Neural threshold set to ${val}.`);
  };

  const systemTools: FunctionDeclaration[] = [
    { name: 'getSystemStatus', description: 'Returns real-time system performance data.', parameters: { type: Type.OBJECT, properties: {} } },
    { name: 'clearConsoleLogs', description: 'Purges all system logs.', parameters: { type: Type.OBJECT, properties: {} } },
    { 
      name: 'setConfiguration', 
      description: 'Adjusts internal AI settings.', 
      parameters: { 
        type: Type.OBJECT, 
        properties: { 
          sensitivity: { 
            type: Type.STRING, 
            enum: ['Low', 'Medium', 'High'],
            description: 'The level of responsiveness to the wake word.'
          } 
        },
        required: ['sensitivity']
      } 
    }
  ];

  const initializeJarvis = async () => {
    if (!process.env.API_KEY) {
      addLog('SYSTEM', 'CRITICAL ERROR: ACCESS KEY NOT FOUND.');
      setStatus(JarvisStatus.ERROR);
      return;
    }

    try {
      addLog('SYSTEM', 'Initiating handshake with Mark 85 OS...');
      setStatus(JarvisStatus.THINKING);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      outputNodeRef.current = audioContextOutRef.current.createGain();
      outputNodeRef.current.connect(audioContextOutRef.current.destination);
      
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      analyzerRef.current = audioContextInRef.current.createAnalyser();
      analyzerRef.current.fftSize = 256;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsSessionActive(true);
            setStatus(JarvisStatus.STANDBY);
            addLog('SYSTEM', 'Voice recognition systems calibrated.');
            
            if (audioContextInRef.current && streamRef.current) {
              const source = audioContextInRef.current.createMediaStreamSource(streamRef.current);
              source.connect(analyzerRef.current!);
              
              const scriptProcessor = audioContextInRef.current.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                sessionPromiseRef.current?.then(s => s.sendRealtimeInput({ media: pcmBlob }));
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(audioContextInRef.current.destination);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setCurrentTranscription(text);
              
              const lowerText = text.toLowerCase();
              const sensitivity = currentStatsRef.current.wakeSensitivity || 'Medium';
              
              // Handle Standby Command
              if (lowerText.includes("go to sleep") || lowerText.includes("standby")) {
                setIsAwake(false);
                addLog('SYSTEM', 'Entering standby mode.');
              }

              // Wake Word Logic
              let trigger = false;
              if (sensitivity === 'High' && lowerText.includes("jarvis")) trigger = true;
              if (sensitivity === 'Medium' && (lowerText.includes("jarvis") || lowerText.includes("hey jarvis"))) trigger = true;
              if (sensitivity === 'Low' && (lowerText === "jarvis" || lowerText.startsWith("jarvis "))) trigger = true;

              if (trigger && !awakeRef.current) {
                setIsAwake(true);
                addLog('SYSTEM', 'Biometric voice ID confirmed. Jarvis is active.');
              }
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                let result = "Operation complete, Sir.";
                if (fc.name === 'getSystemStatus') {
                  const s = currentStatsRef.current;
                  result = `Sir, CPU is at ${s.cpu} percent, memory is at ${s.memory} percent. Network latency is optimal at ${s.network}ms.`;
                } else if (fc.name === 'clearConsoleLogs') {
                  setLogs([]);
                  result = "Console purged.";
                } else if (fc.name === 'setConfiguration') {
                  const args = fc.args as { sensitivity: WakeSensitivity };
                  setSensitivity(args.sensitivity);
                  result = `Wake sensitivity has been updated to ${args.sensitivity}, Sir.`;
                }
                // FIX: functionResponses should be an object as per @google/genai guidelines
                sessionPromiseRef.current?.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result } } }));
              }
            }

            // FIX: Implement interrupted handling to stop audio output immediately
            if (message.serverContent?.interrupted) {
              stopAllAudio();
            }

            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setStatus(JarvisStatus.SPEAKING);
              const ctx = audioContextOutRef.current;
              if (ctx && outputNodeRef.current) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const buffer = await decodeAudioData(decode(audioData), ctx, OUTPUT_SAMPLE_RATE, 1);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(outputNodeRef.current);
                source.onended = () => {
                  activeSourcesRef.current.delete(source);
                  if (activeSourcesRef.current.size === 0) {
                     setStatus(awakeRef.current ? JarvisStatus.LISTENING : JarvisStatus.STANDBY);
                  }
                };
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                // FIX: Use .current to access the Set stored in the ref
                activeSourcesRef.current.add(source);
              }
            }

            if (message.serverContent?.turnComplete) {
              setCurrentTranscription("");
              if (awakeRef.current) setStatus(JarvisStatus.LISTENING);
            }
          },
          onerror: (err) => {
            console.error(err);
            setStatus(JarvisStatus.ERROR);
            addLog('SYSTEM', 'NETWORK ERROR: NEURAL LINK SEVERED.');
          },
          onclose: () => setIsSessionActive(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: systemTools }],
          inputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } }
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (e) {
      setStatus(JarvisStatus.ERROR);
      addLog('SYSTEM', 'FATAL BOOT ERROR.');
    }
  };

  useEffect(() => {
    const i = setInterval(() => {
      setStats(p => ({ 
        ...p, 
        cpu: Math.floor(Math.random() * 12) + (isAwake ? 25 : 8), 
        memory: 44 + Math.random() * 3,
        network: 110 + Math.random() * 25,
        uptime: new Date().toLocaleTimeString() 
      }));
    }, 3000);
    return () => clearInterval(i);
  }, [isAwake]);

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col bg-[#010816] text-sky-100 font-inter">
      <div className="absolute inset-0 hud-scanline opacity-10 pointer-events-none z-50"></div>

      <header className="p-6 flex justify-between items-center z-30 border-b border-sky-500/10 backdrop-blur-md">
        <div className="flex flex-col">
          <h1 className={`text-2xl font-orbitron font-bold tracking-tighter transition-all duration-700 ${isAwake ? 'text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.6)]' : 'text-slate-600'}`}>J.A.R.V.I.S.</h1>
          <span className="text-[9px] font-orbitron text-sky-900 tracking-widest uppercase">Global Desktop Interface</span>
        </div>
        <div className="flex space-x-4">
          <button onClick={() => setShowCode(!showCode)} className="px-4 py-1 text-[10px] font-orbitron border border-sky-500/20 rounded hover:bg-sky-500/10 transition-colors">
            {showCode ? 'HIDE SOURCE' : 'PYTHON CODE'}
          </button>
          <button onClick={() => isSessionActive ? window.location.reload() : initializeJarvis()} 
            className={`px-4 py-1 text-[10px] font-orbitron border rounded transition-all ${isSessionActive ? 'border-red-500/50 text-red-500 hover:bg-red-500/10' : 'border-sky-400 text-sky-400 hover:bg-sky-400/10'}`}>
            {isSessionActive ? 'DISCONNECT' : 'INITIATE BOOT'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row p-6 gap-6 relative">
        {showCode ? (
          <div className="flex-1 bg-black/80 border border-sky-500/30 rounded-lg p-8 font-mono text-xs overflow-auto z-40 custom-scrollbar">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-sky-400 font-orbitron uppercase text-sm">jarvis.py - Core Neural Engine</h2>
               <div className="text-[9px] text-sky-800">PY3.11 // VEO ENGINE</div>
             </div>
             <div className="p-4 bg-sky-900/10 border border-sky-500/20 rounded mb-6 text-sky-300 leading-relaxed">
               Execute locally for full hardware integration. <br/>
               <code className="text-emerald-400 bg-black/50 px-2 py-1 rounded">pip install google-generativeai speechrecognition pyttsx3 psutil</code>
             </div>
             <pre className="text-sky-300/70 leading-relaxed whitespace-pre">
               <code>{`# Local Jarvis Implementation
import os
import time
import psutil
import pyttsx3
import speech_recognition as sr
import google.generativeai as genai

# Setup your API Key
# os.environ["API_KEY"] = "YOUR_API_KEY"
genai.configure(api_key=os.environ.get("API_KEY"))

engine = pyttsx3.init()
voices = engine.getProperty('voices')
# Try to find a British voice (usually 'com.apple.speech.synthesis.voice.daniel' on macOS or similar on Windows)
for voice in voices:
    if "british" in voice.name.toLowerCase() or "UK" in voice.name:
        engine.setProperty('voice', voice.id)
        break

def speak(text):
    print(f"JARVIS: {text}")
    engine.say(text)
    engine.runAndWait()

def listen():
    r = sr.Recognizer()
    with sr.Microphone() as source:
        print("Listening...")
        r.pause_threshold = 1
        audio = r.listen(source)
    try:
        print("Recognizing...")
        query = r.recognize_google(audio, language='en-in')
        print(f"User: {query}")
        return query.toLowerCase()
    except Exception as e:
        return "none"

def get_stats():
    cpu = psutil.cpu_percent()
    mem = psutil.virtual_memory().percent
    return f"CPU is at {cpu}%, Memory at {mem}%."

model = genai.GenerativeModel('gemini-1.5-flash') # Or use gemini-2.0-flash-exp

def main():
    speak("Systems online. J.A.R.V.I.S. at your service, Sir.")
    while True:
        query = listen()
        if 'jarvis' in query:
            if 'what can you do' in query:
                speak("I can monitor your system resources, adjust my own sensitivity, and assist with complex queries. I am your personal digital butler.")
            elif 'system status' in query:
                speak(get_stats())
            elif 'go to sleep' in query or 'exit' in query:
                speak("Very well, Sir. I shall be standing by.")
                break
            else:
                response = model.generate_content(f"You are J.A.R.V.I.S. Respond to: {query}")
                speak(response.text)

if __name__ == "__main__":
    main()`}</code>
             </pre>
          </div>
        ) : (
          <>
            <div className="hidden md:flex w-72 flex-col space-y-4">
              <StatsPanel stats={stats} onSensitivityChange={setSensitivity} />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <HUD status={status} />
              
              <div className="absolute top-[80%] w-full max-w-lg text-center px-4 transition-all duration-500">
                {currentTranscription ? (
                  <div className="bg-sky-500/5 border border-sky-500/20 backdrop-blur-md p-4 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-sm font-mono text-sky-400 leading-relaxed">
                      <span className="text-sky-800 mr-2 font-bold uppercase text-[10px]">Input:</span>
                      "{currentTranscription}"
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center opacity-40">
                    <p className="font-orbitron text-[9px] text-sky-600 tracking-[0.5em] animate-pulse">
                      {isAwake ? 'READY FOR COMMANDS' : 'AWAITING WAKE-WORD: "JARVIS"'}
                    </p>
                    {isAwake && (
                      <span className="text-[8px] text-sky-900 mt-2 uppercase">Say "Go to sleep" to exit conversation</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        <div className="w-full md:w-96 flex flex-col h-[300px] md:h-auto">
          <Console logs={logs} />
        </div>
      </main>

      <footer className="p-4 border-t border-sky-500/10 flex justify-between text-[8px] font-orbitron text-sky-900 z-30 uppercase">
        <div className="flex space-x-6">
          <span>Stark OS v9.5.2</span>
          <span className="flex items-center"><div className={`w-1 h-1 rounded-full mr-1 ${isSessionActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div> Encryption: Active</span>
        </div>
        <div className="flex space-x-6">
          <span className={isAwake ? "text-sky-400 font-bold" : ""}>Dialogue Loop: {isAwake ? "ENGAGED" : "PASSIVE"}</span>
          <span className={isSessionActive ? "text-emerald-500" : ""}>Link: {isSessionActive ? "STABLE" : "OFFLINE"}</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
