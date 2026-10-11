import React, { useState, useEffect, useRef } from 'react';
import { VoiceConversation } from '../types';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  ArrowLeft,
  Menu,
  Clock,
  Sparkles,
  Bot,
  GraduationCap,
  Zap,
  Volume2,
  CheckCircle,
} from 'lucide-react';

interface VoiceVaultRoomProps {
  onBack: () => void;
  onOpenSidebar: () => void;
  onSendToChat: (room: 'buzz' | 'einstein' | 'godmode', text: string) => void;
}

export const VoiceVaultRoom: React.FC<VoiceVaultRoomProps> = ({
  onBack,
  onOpenSidebar,
  onSendToChat,
}) => {
  const [recordings, setRecordings] = useState<VoiceConversation[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [targetRoom, setTargetRoom] = useState<'buzz' | 'einstein' | 'godmode' | 'general'>('general');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioUrlMap, setAudioUrlMap] = useState<{ [id: string]: string }>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Load recordings from database
  const loadRecordings = async () => {
    try {
      const res = await fetch('/api/database/voice');
      if (res.ok) {
        const data = await res.json();
        setRecordings(data.voiceConversations || []);
      }
    } catch (err) {
      console.error('Failed to load voice conversations:', err);
    }
  };

  useEffect(() => {
    loadRecordings();
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (currentAudioElementRef.current) currentAudioElementRef.current.pause();
    };
  }, []);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      setLiveTranscript('');

      // Timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Speech recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript + ' ';
            }
            setLiveTranscript(transcript.trim());
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn('Speech recognition start failed', e);
        }
      }
    } catch (err) {
      alert('Microphone access denied or not supported on this device.');
      console.error(err);
    }
  };

  // Stop and save recording
  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    const duration = recordingSeconds;

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const title = customTitle.trim() || `Voice Conversation #${recordings.length + 1}`;
        const transcriptText = liveTranscript.trim() || 'Voice audio recorded';

        try {
          const res = await fetch('/api/database/voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              transcript: transcriptText,
              room: targetRoom,
              duration,
              audioData: base64Audio,
              summary: `Voice session (${duration}s) on ${targetRoom} channel.`,
              keyTakeaways: [
                `Captured via voice vault`,
                `Duration: ${duration} seconds`,
                `Room: ${targetRoom}`,
              ],
            }),
          });

          if (res.ok) {
            await loadRecordings();
            setCustomTitle('');
            setLiveTranscript('');
            setRecordingSeconds(0);
          }
        } catch (saveErr) {
          console.error('Failed to save voice note', saveErr);
        }
      };
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    setIsRecording(false);
  };

  // Audio playback
  const togglePlayAudio = (rec: VoiceConversation) => {
    if (playingId === rec.id) {
      currentAudioElementRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (currentAudioElementRef.current) {
      currentAudioElementRef.current.pause();
    }

    if (rec.audioData) {
      const audio = new Audio(rec.audioData);
      currentAudioElementRef.current = audio;
      audio.onended = () => setPlayingId(null);
      audio.play().catch((e) => console.error(e));
      setPlayingId(rec.id);
    } else {
      // Fallback TTS for transcript
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(rec.transcript);
        utter.onend = () => setPlayingId(null);
        window.speechSynthesis.speak(utter);
        setPlayingId(rec.id);
      }
    }
  };

  // Delete voice conversation
  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this voice conversation from the database?')) {
      try {
        const res = await fetch(`/api/database/voice/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setRecordings((prev) => prev.filter((r) => r.id !== id));
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#0b071a] flex flex-col p-4 md:p-6 gap-4 text-white z-20 overflow-y-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-4 glass-panel border border-fuchsia-500/50 shrink-0">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Menu size={22} />
        </button>
        <div className="text-center">
          <h2 className="font-orbitron text-xl md:text-2xl font-bold tracking-wider text-gradient-neon">
            Voice Conversations Database
          </h2>
          <p className="text-xs text-cyan-400 font-mono">
            Persistent Voice Recordings, Live Transcriptions & Memories
          </p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-orbitron text-sm text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/20"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </header>

      {/* Main Grid: Live Recording Studio & Saved Voice Vault */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Left: Recording Studio Console */}
        <div className="lg:col-span-5 glass-panel-neon p-6 flex flex-col gap-5 justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-white/10">
              <Mic size={20} className="text-fuchsia-400" />
              <h3 className="font-orbitron font-bold text-base text-white">Live Voice Studio</h3>
            </div>

            {/* Target Room Selector */}
            <div className="mt-4">
              <label className="text-xs font-orbitron text-gray-300 block mb-2">
                Target AI Channel:
              </label>
              <div className="grid grid-cols-4 gap-2 text-xs font-orbitron">
                {(['general', 'buzz', 'einstein', 'godmode'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTargetRoom(r)}
                    className={`py-2 px-1 rounded-xl capitalize transition-all border ${
                      targetRoom === r
                        ? 'bg-fuchsia-600/80 border-fuchsia-400 text-white font-bold shadow-[0_0_12px_rgba(217,70,239,0.5)]'
                        : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Title Input */}
            <div className="mt-4">
              <label className="text-xs font-orbitron text-gray-300 block mb-1">
                Conversation Title:
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g., Essay Brainstorm / Weekly Business Idea"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-sans"
              />
            </div>

            {/* Recording Visualizer & Status */}
            <div className="mt-6 flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-2xl">
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-red-600/30 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)] animate-pulse'
                    : 'bg-white/5 border border-white/20'
                }`}
              >
                <Mic
                  size={36}
                  className={isRecording ? 'text-red-400 animate-bounce' : 'text-gray-400'}
                />
              </div>

              <div className="mt-4 font-orbitron text-2xl font-bold tracking-widest text-cyan-400">
                {formatTime(recordingSeconds)}
              </div>

              <div className="text-xs text-gray-400 mt-1">
                {isRecording ? 'Recording audio and transcribing speech...' : 'Ready to record voice note'}
              </div>
            </div>

            {/* Live Transcript Display */}
            {liveTranscript && (
              <div className="mt-4 p-3 bg-black/40 border border-cyan-500/40 rounded-xl text-xs font-mono text-cyan-200 max-h-24 overflow-y-auto">
                <span className="text-[10px] text-gray-400 uppercase block mb-1 font-orbitron">
                  Live Transcript:
                </span>
                "{liveTranscript}"
              </div>
            )}
          </div>

          {/* Record / Stop Action Button */}
          <div className="pt-4 border-t border-white/10">
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="w-full py-3.5 bg-red-600 hover:bg-red-500 rounded-2xl font-orbitron font-bold text-sm text-white flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.6)] cursor-pointer transition-all"
              >
                <Square size={18} />
                <span>Stop & Save to Database</span>
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:opacity-90 rounded-2xl font-orbitron font-bold text-sm text-white flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(217,70,239,0.5)] cursor-pointer transition-all"
              >
                <Mic size={18} />
                <span>Start Voice Recording</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Saved Voice Vault Database */}
        <div className="lg:col-span-7 glass-panel-neon p-6 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <Volume2 size={20} className="text-cyan-400" />
              <h3 className="font-orbitron font-bold text-base text-white">
                Saved Voice Conversations ({recordings.length})
              </h3>
            </div>
            <span className="text-xs text-gray-400 font-mono">Synced to Database</span>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-0">
            {recordings.length === 0 ? (
              <div className="text-center py-16 text-gray-400 font-mono text-sm">
                No voice conversations saved yet. Record a note to store it in your database!
              </div>
            ) : (
              recordings.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-white/5 border border-white/15 rounded-2xl p-4 flex flex-col gap-3 hover:border-cyan-400/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePlayAudio(rec)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          playingId === rec.id
                            ? 'bg-fuchsia-600 text-white animate-pulse'
                            : 'bg-white/10 hover:bg-white/20 text-cyan-400'
                        }`}
                        title={playingId === rec.id ? 'Pause' : 'Play audio'}
                      >
                        {playingId === rec.id ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <div>
                        <h4 className="font-orbitron font-bold text-sm text-white">{rec.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {rec.duration}s
                          </span>
                          <span>•</span>
                          <span>{new Date(rec.timestamp).toLocaleDateString()}</span>
                          <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 uppercase text-[9px] font-orbitron">
                            {rec.room}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(rec.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-white/10"
                      title="Delete voice note"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Transcript */}
                  <div className="bg-black/30 rounded-xl p-3 text-xs font-mono text-gray-200 border border-white/10 leading-relaxed">
                    "{rec.transcript}"
                  </div>

                  {/* Key Takeaways & Action */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10 text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
                      <CheckCircle size={14} />
                      <span>{rec.summary || 'Saved in memory bank'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-orbitron text-[11px]">
                      <span className="text-gray-400">Send to:</span>
                      <button
                        onClick={() => onSendToChat('einstein', rec.transcript)}
                        className="px-2 py-1 rounded-lg bg-fuchsia-600/30 hover:bg-fuchsia-600 border border-fuchsia-500/40 text-fuchsia-200 hover:text-white transition-colors"
                      >
                        Einstein
                      </button>
                      <button
                        onClick={() => onSendToChat('buzz', rec.transcript)}
                        className="px-2 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600 border border-cyan-500/40 text-cyan-200 hover:text-white transition-colors"
                      >
                        Buzz
                      </button>
                      <button
                        onClick={() => onSendToChat('godmode', rec.transcript)}
                        className="px-2 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600 border border-amber-500/40 text-amber-200 hover:text-white transition-colors"
                      >
                        God Mode
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Back Button */}
      <div className="text-center pt-2 shrink-0">
        <button
          onClick={onBack}
          className="glass-panel px-8 py-3 text-white font-orbitron tracking-wider text-sm hover:border-fuchsia-500 hover:shadow-[0_0_20px_rgba(217,70,239,0.5)] transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>
      </div>
    </div>
  );
};
