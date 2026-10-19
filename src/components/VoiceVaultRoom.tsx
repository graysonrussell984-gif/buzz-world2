import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceConversation, VoiceDialogueTurn, IntelligenceState } from '../types';
import { useCloudSync, SyncEventPayload } from '../hooks/useCloudSync';
import {
  Mic,
  MicOff,
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
  VolumeX,
  CheckCircle,
  RotateCcw,
  Send,
  Sliders,
  AudioLines,
  StopCircle,
  Copy,
  Check,
  Radio,
  AlertTriangle,
  X,
  MessageSquare,
  Flame,
  Layers,
  ClipboardPaste,
} from 'lucide-react';

interface VoiceVaultRoomProps {
  onBack: () => void;
  onOpenSidebar: () => void;
  onSendToChat: (room: 'buzz' | 'einstein' | 'godmode', text: string) => void;
}

const PERSONA_CONFIGS = {
  buzz: {
    name: 'Buzz',
    title: 'Executive Assistant & Momentum',
    tagline: 'Fast, sharp, daily operations and priority execution',
    defaultVoice: 'Zephyr',
    borderColor: 'border-cyan-400/60',
    glowColor: 'shadow-[0_0_25px_rgba(6,182,212,0.4)]',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    buttonColor: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500',
    waveColor: 'bg-cyan-400',
    icon: Bot,
  },
  einstein: {
    name: 'Einstein',
    title: 'Academic Mentor & Critical Thinking',
    tagline: 'College coursework, essay drafting, and critical reasoning',
    defaultVoice: 'Puck',
    borderColor: 'border-fuchsia-400/60',
    glowColor: 'shadow-[0_0_25px_rgba(217,70,239,0.4)]',
    badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    buttonColor: 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500',
    waveColor: 'bg-fuchsia-400',
    icon: GraduationCap,
  },
  godmode: {
    name: 'God Mode',
    title: 'Unfiltered Truth & Life Strategy',
    tagline: 'Brutal honesty, psychology, and strategic money moves',
    defaultVoice: 'Fenrir',
    borderColor: 'border-amber-400/60',
    glowColor: 'shadow-[0_0_25px_rgba(245,158,11,0.4)]',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    buttonColor: 'bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500',
    waveColor: 'bg-amber-400',
    icon: Zap,
  },
};

const GEMINI_VOICES = [
  { id: 'Zephyr', name: 'Zephyr', desc: 'Energetic, confident, sharp (Buzz default)' },
  { id: 'Puck', name: 'Puck', desc: 'Articulate, intellectual, clear (Einstein default)' },
  { id: 'Fenrir', name: 'Fenrir', desc: 'Deep, direct, assertive (God Mode default)' },
  { id: 'Kore', name: 'Kore', desc: 'Balanced, warm, and natural' },
  { id: 'Charon', name: 'Charon', desc: 'Calm, measured, and reflective' },
];

export const VoiceVaultRoom: React.FC<VoiceVaultRoomProps> = ({
  onBack,
  onOpenSidebar,
  onSendToChat,
}) => {
  // Database recordings
  const [recordings, setRecordings] = useState<VoiceConversation[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'buzz' | 'einstein' | 'godmode'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile View Switcher (Live Studio vs Saved Vault)
  const [mobileTab, setMobileTab] = useState<'studio' | 'vault'>('studio');

  // Voice Interaction State
  const [targetRoom, setTargetRoom] = useState<'buzz' | 'einstein' | 'godmode'>('buzz');
  const [selectedVoice, setSelectedVoice] = useState<string>('Zephyr');
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoTalkBack, setAutoTalkBack] = useState(true);
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [showDialogueInHandsFree, setShowDialogueInHandsFree] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live session dialogue and transcription
  const [dialogue, setDialogue] = useState<VoiceDialogueTurn[]>([]);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [customTitle, setCustomTitle] = useState('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to talk. Tap microphone or start speaking.');
  const [micPermissionState, setMicPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported' | 'unknown'>('unknown');
  const [typeInputText, setTypeInputText] = useState('');
  const [intelligence, setIntelligence] = useState<IntelligenceState | null>(null);
  const [memorySyncedToast, setMemorySyncedToast] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/database/intelligence')
      .then((r) => r.json())
      .then((d) => {
        if (d.intelligence) setIntelligence(d.intelligence);
      })
      .catch((err) => console.warn(err));
  }, []);

  // Check microphone permissions safely on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as any })
        .then((permissionStatus) => {
          setMicPermissionState(permissionStatus.state);
          permissionStatus.onchange = () => {
            setMicPermissionState(permissionStatus.state);
          };
        })
        .catch(() => {
          setMicPermissionState('unknown');
        });
    } else if (typeof navigator !== 'undefined' && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
      setMicPermissionState('unsupported');
    }
  }, []);

  // Playback state for saved recordings
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Refs for audio handling, VAD, and hands-free lifecycle
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const autoRestartTimerRef = useRef<any>(null);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<any>(null);
  const dialogueEndRef = useRef<HTMLDivElement | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const transcriptRef = useRef<string>('');
  const handsFreeModeRef = useRef<boolean>(false);
  const hasSpokenRef = useRef<boolean>(false);
  const lastSpokeTimeRef = useRef<number>(0);
  const speechStartTimeRef = useRef<number>(0);

  // Keep handsFreeModeRef synchronized with handsFreeMode state
  useEffect(() => {
    handsFreeModeRef.current = handsFreeMode;
  }, [handsFreeMode]);

  // Helper to convert recorded audio blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Keep selected voice in sync with target room when room changes
  useEffect(() => {
    setSelectedVoice(PERSONA_CONFIGS[targetRoom].defaultVoice);
  }, [targetRoom]);

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
      stopAllAudio();
      stopRecording();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Real-time live synchronization for voice vault recordings (Phone & Laptop link)
  useCloudSync(
    useCallback((event: SyncEventPayload) => {
      if (event.type === 'VOICE_UPDATED' && Array.isArray(event.voiceConversations)) {
        setRecordings(event.voiceConversations);
      }
    }, [])
  );

  // Scroll to bottom of dialogue when it updates
  useEffect(() => {
    dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogue, liveTranscript, isThinking, isSpeaking]);

  // Stop any currently playing audio or speech
  const stopAllAudio = () => {
    if (currentAudioElementRef.current) {
      currentAudioElementRef.current.pause();
      currentAudioElementRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setPlayingId(null);
  };

  // Helper to automatically restart listening in Hands-Free mode when AI completes speaking
  const triggerHandsFreeNextTurn = () => {
    if (autoRestartTimerRef.current) clearTimeout(autoRestartTimerRef.current);
    if (handsFreeModeRef.current) {
      autoRestartTimerRef.current = setTimeout(() => {
        if (handsFreeModeRef.current && !isRecordingRef.current && !currentAudioElementRef.current) {
          startRecording();
        }
      }, 400);
    }
  };

  // Toggle Hands-Free continuous conversation mode
  const toggleHandsFreeMode = (forceState?: boolean) => {
    const nextState = typeof forceState === 'boolean' ? forceState : !handsFreeMode;
    setHandsFreeMode(nextState);
    handsFreeModeRef.current = nextState;

    if (nextState) {
      setShowDialogueInHandsFree(false);
      setStatusMessage(`Hands-Free Orb Active with ${PERSONA_CONFIGS[targetRoom].name}. Listening...`);
      // Start recording immediately within user action
      if (!isSpeaking && !isRecordingRef.current) {
        startRecording();
      }
    } else {
      if (autoRestartTimerRef.current) clearTimeout(autoRestartTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      stopRecording();
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        } catch (e) {}
        streamRef.current = null;
      }
      setStatusMessage('Hands-Free paused. Tap Talk or use push-to-talk anytime.');
    }
  };

  // Play audio data or fallback to browser speech synthesis
  const playSpeechAudio = async (text: string, audioData?: string | null): Promise<void> => {
    stopAllAudio();
    setIsSpeaking(true);
    setStatusMessage(`${PERSONA_CONFIGS[targetRoom].name} is talking back...`);

    return new Promise((resolve) => {
      // 1. Try Gemini WAV Audio if available
      if (audioData && audioData.startsWith('data:audio/')) {
        try {
          const audio = new Audio(audioData);
          currentAudioElementRef.current = audio;
          audio.onended = () => {
            currentAudioElementRef.current = null;
            setIsSpeaking(false);
            setStatusMessage('Ready for your next thought. Listening...');
            resolve();
            triggerHandsFreeNextTurn();
          };
          audio.onerror = (e) => {
            console.warn('Audio playback error, falling back to speech synthesis:', e);
            currentAudioElementRef.current = null;
            fallbackSpeechSynthesis(text, () => {
              resolve();
              triggerHandsFreeNextTurn();
            });
          };
          audio.play().catch((err) => {
            console.warn('Audio play rejected, falling back to speech synthesis:', err);
            currentAudioElementRef.current = null;
            fallbackSpeechSynthesis(text, () => {
              resolve();
              triggerHandsFreeNextTurn();
            });
          });
          return;
        } catch (e) {
          console.warn('Failed audio instance:', e);
        }
      }

      // 2. Fallback to Web Speech API
      fallbackSpeechSynthesis(text, () => {
        resolve();
        triggerHandsFreeNextTurn();
      });
    });
  };

  const fallbackSpeechSynthesis = (text: string, onEnd: () => void) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = targetRoom === 'godmode' ? 0.9 : targetRoom === 'einstein' ? 1.05 : 1.0;

      // Select matching voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferred = voices.find(
          (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('English'))
        );
        if (preferred) utter.voice = preferred;
      }

      utter.onend = () => {
        setIsSpeaking(false);
        setStatusMessage('Ready for your next thought. Listening...');
        onEnd();
      };
      utter.onerror = () => {
        setIsSpeaking(false);
        setStatusMessage('Ready for your next thought.');
        onEnd();
      };

      window.speechSynthesis.speak(utter);
    } else {
      setIsSpeaking(false);
      onEnd();
    }
  };

  // Send transcript or recorded audio to AI talk-back endpoint
  const sendToTalkBack = async (
    userText: string,
    recordedAudioData?: string,
    audioMimeType?: string
  ) => {
    const trimmed = userText.trim();
    if (!trimmed && !recordedAudioData) return;

    // Add user turn to dialogue (with temporary text if awaiting audio transcription)
    const initialText = trimmed || 'Transcribing your voice...';
    const userTurnId = `turn-user-${Date.now()}`;
    const userTurn: VoiceDialogueTurn = {
      id: userTurnId,
      sender: 'user',
      text: initialText,
      timestamp: Date.now(),
      audioData: recordedAudioData,
      room: targetRoom,
    };

    const newDialogue = [...dialogue, userTurn];
    setDialogue(newDialogue);
    setLiveTranscript('');
    setIsThinking(true);
    setStatusMessage(`${PERSONA_CONFIGS[targetRoom].name} is listening & preparing reply...`);

    try {
      const res = await fetch('/api/voice/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: trimmed,
          audioData: recordedAudioData,
          audioMimeType,
          room: targetRoom,
          voiceName: selectedVoice,
          history: newDialogue.map((d) => ({ sender: d.sender, text: d.text })),
        }),
      });

      const data = await res.json();
      setIsThinking(false);

      if (data && data.intelligence) {
        setIntelligence(data.intelligence);
        setMemorySyncedToast(true);
        setTimeout(() => setMemorySyncedToast(false), 4500);
      }

      if (data && data.replyText) {
        // Update user turn with Gemini's server-side audio transcription if client was empty
        if (data.userTranscript) {
          setDialogue((prev) =>
            prev.map((turn) =>
              turn.id === userTurnId ? { ...turn, text: data.userTranscript } : turn
            )
          );
        }

        const aiTurn: VoiceDialogueTurn = {
          id: `turn-ai-${Date.now()}`,
          sender: 'ai',
          text: data.replyText,
          timestamp: Date.now(),
          audioData: data.audioData || undefined,
          room: targetRoom,
        };

        setDialogue((prev) => [...prev, aiTurn]);
        setStatusMessage('Spoken reply received.');

        // Talk back with voice!
        if (autoPlayAudio) {
          await playSpeechAudio(data.replyText, data.audioData);
        } else {
          triggerHandsFreeNextTurn();
        }
      } else {
        // Clean up placeholder turn if response failed
        setDialogue((prev) =>
          prev.map((turn) =>
            turn.id === userTurnId
              ? { ...turn, text: data?.error ? `(Voice note: ${data.error})` : 'Voice note captured' }
              : turn
          )
        );
        setStatusMessage(data?.error || 'Unable to generate response. Ready.');
        triggerHandsFreeNextTurn();
      }
    } catch (err: any) {
      console.error('Talk-back error:', err);
      setIsThinking(false);
      setDialogue((prev) =>
        prev.map((turn) =>
          turn.id === userTurnId ? { ...turn, text: 'Voice note captured' } : turn
        )
      );
      const fallbackText = "I hear you Grayson. Let's keep working.";
      setDialogue((prev) => [
        ...prev,
        {
          id: `turn-ai-err-${Date.now()}`,
          sender: 'ai',
          text: fallbackText,
          timestamp: Date.now(),
          room: targetRoom,
        },
      ]);
      if (autoPlayAudio) {
        await playSpeechAudio(fallbackText, null);
      } else {
        triggerHandsFreeNextTurn();
      }
    }
  };

  // Start recording user audio & streaming transcription
  const startRecording = async () => {
    // If AI is currently speaking, stop it so user can talk
    stopAllAudio();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicPermissionState('unsupported');
      setStatusMessage(`Microphone access is not supported in this browser. You can type below to hear ${PERSONA_CONFIGS[targetRoom].name} speak!`);
      return;
    }

    try {
      let stream = streamRef.current;
      const isStreamAlive = stream && stream.getTracks().some((t: MediaStreamTrack) => t.readyState === 'live');
      if (!isStreamAlive || !stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;
      }
      if (!stream) {
        throw new Error('Microphone stream could not be initialized');
      }
      setMicPermissionState('granted');
      audioChunksRef.current = [];

      let chosenMime = '';
      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      if (typeof MediaRecorder !== 'undefined') {
        for (const candidate of mimeCandidates) {
          if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(candidate)) {
            chosenMime = candidate;
            break;
          }
        }
      }

      const mediaRecorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Audio visualizer setup
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(avg);

            // Audio-level Voice Activity Detection (VAD) for Hands-Free mode
            if (handsFreeModeRef.current && isRecordingRef.current) {
              const now = Date.now();
              // Allow 300ms warmup so mic click doesn't trigger speech
              if (now - speechStartTimeRef.current > 300) {
                if (avg > 7) {
                  hasSpokenRef.current = true;
                  lastSpokeTimeRef.current = now;
                } else if (hasSpokenRef.current && lastSpokeTimeRef.current > 0) {
                  if (now - lastSpokeTimeRef.current > 1350) {
                    // Grayson was speaking, and now 1.35s of natural silence has elapsed -> send turn automatically!
                    hasSpokenRef.current = false;
                    lastSpokeTimeRef.current = 0;
                    stopRecordingAndTalkBack();
                    return;
                  }
                }
              }
            }

            animationFrameRef.current = requestAnimationFrame(updateLevel);
          }
        };
        updateLevel();
      } catch (audioCtxErr) {
        console.warn('AudioContext visualizer unsupported:', audioCtxErr);
      }

      // Collect audio chunks every 250ms
      mediaRecorder.start(250);
      setIsRecording(true);
      isRecordingRef.current = true;
      hasSpokenRef.current = false;
      lastSpokeTimeRef.current = 0;
      speechStartTimeRef.current = Date.now();
      setRecordingSeconds(0);
      setLiveTranscript('');
      transcriptRef.current = '';
      setStatusMessage(
        handsFreeModeRef.current
          ? `Hands-Free Active: Listening to you... Speak freely.`
          : 'Listening to your voice... Speak freely.'
      );

      // Seconds timer
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Web Speech API
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
            const clean = transcript.trim();
            if (clean) {
              transcriptRef.current = clean;
              setLiveTranscript(clean);
              hasSpokenRef.current = true;
              lastSpokeTimeRef.current = Date.now();
            }

            // Dual silence detection in hands-free mode: if recognized clean speech pauses for 1.35 seconds, auto-send
            if (handsFreeModeRef.current && clean.length > 1) {
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = setTimeout(() => {
                if (isRecordingRef.current && handsFreeModeRef.current) {
                  stopRecordingAndTalkBack();
                }
              }, 1350);
            }
          };

          recognition.onerror = (event: any) => {
            console.warn('Speech recognition status:', event?.error);
            if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
              setMicPermissionState('denied');
              setHandsFreeMode(false);
              handsFreeModeRef.current = false;
              setStatusMessage(`Microphone permission blocked. You can type below to talk with ${PERSONA_CONFIGS[targetRoom].name}!`);
            }
          };

          recognition.onend = () => {
            if (isRecordingRef.current) {
              try {
                recognition.start();
              } catch (e) {}
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn('Speech recognition start failed', e);
        }
      }
    } catch (err: any) {
      console.warn('Microphone access denied or unsupported:', err);
      setIsRecording(false);
      isRecordingRef.current = false;
      setHandsFreeMode(false);
      handsFreeModeRef.current = false;
      setMicPermissionState('denied');
      setStatusMessage(`Microphone permission denied. You can type below to talk with ${PERSONA_CONFIGS[targetRoom].name}!`);
    }
  };

  // Stop recording user mic safely
  const stopRecording = () => {
    isRecordingRef.current = false;
    hasSpokenRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (autoRestartTimerRef.current) clearTimeout(autoRestartTimerRef.current);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }

    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {}
      try {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
    }

    setIsRecording(false);
    setAudioLevel(0);
  };

  // Stop recording and trigger talk-back with audio fallback
  const stopRecordingAndTalkBack = async () => {
    if (!mediaRecorderRef.current && !isRecording) return;

    isRecordingRef.current = false;
    hasSpokenRef.current = false;
    setIsRecording(false);
    setStatusMessage('Processing your voice...');

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.requestData();
      } catch (e) {}
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        try {
          recorder.stop();
        } catch (e) {
          resolve();
        }
      });
      if (!handsFreeModeRef.current) {
        try {
          recorder.stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        } catch (e) {}
      }
    }

    setAudioLevel(0);

    const currentText = (transcriptRef.current || liveTranscript).trim();
    let base64Audio: string | undefined;
    const mimeType = recorder?.mimeType || 'audio/webm';

    if (audioChunksRef.current.length > 0) {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size > 100) {
          base64Audio = await blobToBase64(audioBlob);
        }
      } catch (blobErr) {
        console.warn('Audio conversion failed:', blobErr);
      }
    }

    if (currentText || base64Audio) {
      if (autoTalkBack) {
        await sendToTalkBack(currentText, base64Audio, mimeType);
      } else {
        setDialogue((prev) => [
          ...prev,
          {
            id: `turn-user-${Date.now()}`,
            sender: 'user',
            text: currentText || 'Voice note captured',
            timestamp: Date.now(),
            audioData: base64Audio,
            room: targetRoom,
          },
        ]);
        setLiveTranscript('');
        setStatusMessage('Voice note captured.');
      }
    } else {
      setStatusMessage('No speech detected. Ready when you are Grayson.');
      if (handsFreeModeRef.current) {
        triggerHandsFreeNextTurn();
      }
    }
  };

  // Send text message directly to AI talk-back endpoint without needing microphone
  const handleSendTextTurn = async () => {
    const text = typeInputText.trim();
    if (!text || isThinking) return;

    setTypeInputText('');
    stopAllAudio();

    await sendToTalkBack(text);
  };

  // Save current voice session into persistent database
  const saveSessionToDatabase = async () => {
    if (dialogue.length === 0 && !liveTranscript) {
      setStatusMessage('No conversation to save yet. Speak or type a message first!');
      return;
    }

    const title =
      customTitle.trim() ||
      `${PERSONA_CONFIGS[targetRoom].name} Voice Session #${recordings.length + 1}`;

    const userTurns = dialogue.filter((d) => d.sender === 'user').map((d) => d.text);
    const aiTurns = dialogue.filter((d) => d.sender === 'ai').map((d) => d.text);

    const fullTranscript =
      userTurns.length > 0 ? userTurns.join('\n') : liveTranscript || 'Voice session';
    const fullAiResponse = aiTurns.length > 0 ? aiTurns.join('\n\n') : undefined;

    try {
      const res = await fetch('/api/database/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          transcript: fullTranscript,
          aiResponse: fullAiResponse,
          dialogue,
          room: targetRoom,
          duration: Math.max(recordingSeconds, dialogue.length * 10),
          summary: `Voice dialogue (${dialogue.length} turns) with ${PERSONA_CONFIGS[targetRoom].name}`,
          keyTakeaways: [
            `Session with ${PERSONA_CONFIGS[targetRoom].name}`,
            `${dialogue.length} dialogue turns recorded`,
            `Auto-synced to memory database`,
          ],
        }),
      });

      if (res.ok) {
        await loadRecordings();
        setCustomTitle('');
        setStatusMessage('Voice session saved permanently to database!');
      }
    } catch (saveErr) {
      console.error('Failed to save session:', saveErr);
    }
  };

  // Replay a specific dialogue turn's audio
  const handleReplayTurn = (turn: VoiceDialogueTurn) => {
    if (turn.sender === 'ai') {
      playSpeechAudio(turn.text, turn.audioData);
    } else {
      fallbackSpeechSynthesis(turn.text, () => {});
    }
  };

  // Toggle playing a saved recording from the right list
  const togglePlaySavedRecording = (rec: VoiceConversation) => {
    if (playingId === rec.id) {
      stopAllAudio();
      return;
    }

    stopAllAudio();
    setPlayingId(rec.id);

    if (rec.audioData) {
      const audio = new Audio(rec.audioData);
      currentAudioElementRef.current = audio;
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        fallbackSpeechSynthesis(rec.aiResponse || rec.transcript, () => setPlayingId(null));
      };
      audio.play().catch(() => {
        fallbackSpeechSynthesis(rec.aiResponse || rec.transcript, () => setPlayingId(null));
      });
    } else {
      // Speak AI response if present, else user transcript
      const textToSpeak = rec.aiResponse ? `AI: ${rec.aiResponse}` : rec.transcript;
      fallbackSpeechSynthesis(textToSpeak, () => setPlayingId(null));
    }
  };

  // Delete saved voice conversation
  const handleDeleteSaved = async (id: string) => {
    try {
      setRecordings((prev) => prev.filter((r) => r.id !== id));
      const res = await fetch(`/api/database/voice/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMessage('Voice recording deleted from vault.');
        setTimeout(() => setStatusMessage(''), 3000);
      }
    } catch (e) {
      console.error('Failed to delete voice conversation:', e);
      setStatusMessage('Failed to delete recording.');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  // Test voice sample
  const handleTestVoice = async (voiceName: string) => {
    setStatusMessage(`Testing voice: ${voiceName}...`);
    try {
      const testPhrase = `Hey Grayson, this is ${PERSONA_CONFIGS[targetRoom].name}. I am ready to talk back with you in real time.`;
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testPhrase,
          voiceName,
          room: targetRoom,
        }),
      });
      const data = await res.json();
      if (data && data.audioData) {
        await playSpeechAudio(testPhrase, data.audioData);
      } else {
        fallbackSpeechSynthesis(testPhrase, () => {});
      }
    } catch (e) {
      fallbackSpeechSynthesis(`Hey Grayson, I am ready to talk with you.`, () => {});
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        return;
      }
    } catch (err) {
      console.warn('Clipboard writeText permission denied or blocked, using fallback:', err);
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (fallbackErr) {
      console.warn('Fallback copy failed:', fallbackErr);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredRecordings = recordings.filter((r) => {
    if (selectedFilter !== 'all' && r.room !== selectedFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.transcript.toLowerCase().includes(q) ||
        (r.aiResponse && r.aiResponse.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const PersonaIcon = PERSONA_CONFIGS[targetRoom].icon;

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#0b071a] flex flex-col p-2 sm:p-3 md:p-4 gap-2 text-white z-20 overflow-y-auto lg:overflow-hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col gap-2 min-h-0">
        {/* Top Header */}
        <header className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 rounded-2xl bg-[#0e0a1f] border border-fuchsia-500/40 shadow-lg shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="p-1.5 sm:p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Menu"
          >
            <Menu size={18} className="sm:w-5 sm:h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="font-orbitron text-sm sm:text-lg md:text-2xl font-bold tracking-wider text-gradient-neon flex items-center gap-1.5 sm:gap-2 truncate">
              <AudioLines size={18} className="text-cyan-400 shrink-0 sm:w-5 sm:h-5" />
              <span className="truncate">Live Voice Studio</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-cyan-300 font-mono hidden sm:block truncate">
              Conversational Voice Studio • Real-Time Voice Talk-Back • Neural Gemini Audio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {intelligence && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/50 border border-cyan-400/40 text-[10px] font-orbitron text-cyan-300">
              <Zap size={12} className="text-amber-400" />
              <span>Lvl {intelligence.level}: {intelligence.currentTone?.mood}</span>
            </div>
          )}

          {/* Hands-Free Orb Mode Direct Toggle Button */}
          <button
            onClick={() => toggleHandsFreeMode()}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl font-orbitron text-[11px] sm:text-xs font-bold transition-all cursor-pointer border ${
              handsFreeMode
                ? 'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-600 text-white border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.7)]'
                : 'bg-white/5 border-white/20 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Hands-Free Back-and-Forth Orb"
          >
            <Sparkles size={14} className={handsFreeMode ? 'text-amber-300' : 'text-cyan-400'} />
            <span className="hidden sm:inline">{handsFreeMode ? 'Hands-Free Orb: ON' : 'Hands-Free Orb'}</span>
            <span className="sm:hidden">{handsFreeMode ? 'Orb ON' : 'Orb'}</span>
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer ${
              showSettings
                ? 'bg-fuchsia-600 border-fuchsia-400 text-white'
                : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
            }`}
            title="Voice & Talk-Back Settings"
          >
            <Sliders size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl font-orbitron text-xs sm:text-sm text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/20"
          >
            <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Back</span>
          </button>
        </div>
      </header>

      {/* Mobile Switcher Tab (Live Studio vs Saved Vault) */}
      <div className="flex lg:hidden items-center p-1 bg-black/60 rounded-xl border border-white/15 shrink-0">
        <button
          onClick={() => setMobileTab('studio')}
          className={`flex-1 py-1.5 px-3 rounded-lg font-orbitron text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'studio'
              ? 'bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.5)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Mic size={13} className={isRecording ? 'text-red-400' : isSpeaking ? 'text-cyan-300' : ''} />
          <span>Live Studio</span>
          {(isRecording || isSpeaking) && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
          )}
        </button>
        <button
          onClick={() => setMobileTab('vault')}
          className={`flex-1 py-1.5 px-3 rounded-lg font-orbitron text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'vault'
              ? 'bg-white/20 text-white shadow border border-white/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Volume2 size={13} />
          <span>Saved Vault ({recordings.length})</span>
        </button>
      </div>

      {/* Voice Settings Panel (Floating Modal Overlay - Zero Layout Shift) */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="glass-panel p-4 sm:p-6 border border-cyan-400/50 rounded-3xl flex flex-col gap-3 max-h-[85vh] w-full max-w-2xl overflow-y-auto shadow-[0_0_50px_rgba(6,182,212,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 font-orbitron font-bold text-xs sm:text-sm text-cyan-300">
                <Sliders size={16} />
                <span>Voice Studio Talk-Back Settings</span>
              </div>
              {/* Top Back / Close Button */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 hover:text-white font-orbitron text-xs font-semibold transition-all cursor-pointer shadow active:scale-95"
                  title="Back to Voice Studio"
                >
                  <ArrowLeft size={13} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close Settings"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Talk Back Mode */}
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex flex-col gap-2">
                <span className="font-orbitron font-bold text-gray-200">Talk-Back Mode:</span>
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 text-[11px] sm:text-xs">
                  <input
                    type="checkbox"
                    checked={autoTalkBack}
                    onChange={(e) => setAutoTalkBack(e.target.checked)}
                    className="rounded text-cyan-500 focus:ring-0"
                  />
                  <span>Auto Talk-Back (AI speaks replies out loud)</span>
                </label>

                <div className="pt-1 flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-gray-300 text-[11px] sm:text-xs">
                    <input
                      type="checkbox"
                      checked={handsFreeMode}
                      onChange={(e) => toggleHandsFreeMode(e.target.checked)}
                      className="rounded text-fuchsia-500 focus:ring-0"
                    />
                    <span>Hands-Free Auto Dialogue (Continuous loop)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      toggleHandsFreeMode(!handsFreeMode);
                      setShowSettings(false);
                    }}
                    className={`mt-1 py-1 px-2.5 rounded-lg font-orbitron text-[10px] self-start cursor-pointer flex items-center gap-1.5 transition-all ${
                      handsFreeMode
                        ? 'bg-fuchsia-600/40 text-fuchsia-200 border border-fuchsia-400'
                        : 'bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 border border-cyan-500/40'
                    }`}
                  >
                    <Sparkles size={12} />
                    <span>{handsFreeMode ? 'Close & View Active Orb' : 'Activate Hands-Free Orb Now'}</span>
                  </button>
                </div>
              </div>

              {/* Voice Model Selection */}
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex flex-col gap-2">
                <span className="font-orbitron font-bold text-gray-200">Gemini Neural Voice:</span>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="bg-black/50 border border-white/20 rounded-lg p-1.5 text-white font-mono text-[11px] sm:text-xs outline-none focus:border-cyan-400"
                >
                  {GEMINI_VOICES.map((v) => (
                    <option key={v.id} value={v.id} className="bg-gray-900 text-white">
                      {v.name} — {v.desc}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleTestVoice(selectedVoice)}
                  className="mt-1 py-1 px-2.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600 border border-cyan-500/40 text-cyan-200 hover:text-white transition-colors font-orbitron text-[10px] self-start cursor-pointer flex items-center gap-1.5"
                >
                  <Volume2 size={12} />
                  <span>Test Current Voice</span>
                </button>
              </div>

              {/* Audio Autoplay */}
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex flex-col gap-2">
                <span className="font-orbitron font-bold text-gray-200">Audio Playback:</span>
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 text-[11px] sm:text-xs">
                  <input
                    type="checkbox"
                    checked={autoPlayAudio}
                    onChange={(e) => setAutoPlayAudio(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-0"
                  />
                  <span>Auto-play voice audio when reply arrives</span>
                </label>
                <p className="text-[10px] sm:text-[11px] text-gray-400 leading-relaxed font-sans">
                  When active, your chosen assistant speaks directly through your speakers as soon as you stop talking.
                </p>
              </div>
            </div>

            {/* Bottom Back Button to close Settings without scrolling */}
            <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] text-gray-400 font-mono">
                Settings update immediately for your session
              </span>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white font-orbitron text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95"
              >
                <ArrowLeft size={14} />
                <span>Back to Talk Studio</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* HANDS-FREE LIVING COSMIC TALK ORB STAGE (FULL SCREEN, CONTINUOUS GEMINI LOOP, ZERO BUTTONS) */}
      {/* ========================================================= */}
      {handsFreeMode ? (
        <div className="flex-1 w-full h-full min-h-0 flex flex-col items-center justify-between p-3 sm:p-5 md:p-6 bg-gradient-to-b from-black/80 via-purple-950/25 to-black/85 rounded-3xl border border-fuchsia-500/40 relative overflow-hidden shadow-[0_0_50px_rgba(217,70,239,0.3)] animate-fadeIn">
          {/* Cosmic background glow */}
          <div
            className={`absolute inset-0 pointer-events-none transition-all duration-700 opacity-25 ${
              isSpeaking
                ? 'bg-gradient-to-r from-cyan-600 via-fuchsia-600 to-amber-600 animate-pulse'
                : isRecording
                  ? 'bg-gradient-to-b from-teal-500/30 via-cyan-500/20 to-black'
                  : isThinking
                    ? 'bg-gradient-to-r from-purple-700/40 via-fuchsia-600/30 to-indigo-900/40 animate-pulse'
                    : 'bg-gradient-to-b from-purple-950/20 to-black'
            }`}
          />

          {/* Memory Synced Floating Pill Toast */}
          {memorySyncedToast && (
            <div className="absolute top-12 sm:top-14 z-30 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-400 text-emerald-300 font-orbitron text-xs flex items-center gap-1.5 shadow-[0_0_25px_rgba(52,211,153,0.6)] animate-bounce pointer-events-none">
              <Sparkles size={14} className="text-emerald-400 animate-spin" />
              <span>Spoken Words & Tone Synced (+25 XP)</span>
            </div>
          )}

          {/* Top Bar: Exit Orb + Persona Switcher + View Chat Log */}
          <div className="w-full flex items-center justify-between gap-2 z-20 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => toggleHandsFreeMode(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs sm:text-sm font-orbitron text-gray-200 hover:text-white transition-all cursor-pointer shadow active:scale-95 shrink-0"
              title="Exit Hands-Free Orb"
            >
              <ArrowLeft size={15} />
              <span>Exit Orb</span>
            </button>

            {/* Persona Switcher Buttons right at top of Orb */}
            <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-black/60 rounded-xl sm:rounded-2xl border border-white/20 shadow-lg backdrop-blur-md">
              {(['buzz', 'einstein', 'godmode'] as const).map((r) => {
                const cfg = PERSONA_CONFIGS[r];
                const active = targetRoom === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      if (isSpeaking) stopAllAudio();
                      setTargetRoom(r);
                    }}
                    className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl font-orbitron text-xs capitalize transition-all cursor-pointer flex items-center gap-1 ${
                      active
                        ? `${cfg.buttonColor} text-white font-bold shadow-md`
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{cfg.name}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowDialogueInHandsFree((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-orbitron text-gray-200 hover:text-white transition-all cursor-pointer shadow active:scale-95 shrink-0"
              title="View full written conversation log"
            >
              <MessageSquare size={13} />
              <span className="hidden xs:inline">Chat Log ({dialogue.length})</span>
            </button>
          </div>

          {/* Floating Spoken Dialogue Drawer (Zero buttons, clean transcript view) */}
          {showDialogueInHandsFree && (
            <div className="absolute inset-x-2 sm:inset-x-6 top-16 bottom-14 z-40 bg-[#0b071a]/95 backdrop-blur-2xl rounded-3xl border border-white/20 p-3 sm:p-4 flex flex-col shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/15 shrink-0">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-cyan-400" />
                  <span className="font-orbitron font-bold text-xs sm:text-sm text-white">Hands-Free Spoken Log ({dialogue.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDialogueInHandsFree(false)}
                  className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-orbitron text-gray-200 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2.5 min-h-0 select-text">
                {dialogue.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 font-mono text-xs">No spoken words yet. Speak freely into the Orb!</div>
                ) : (
                  dialogue.map((turn) => (
                    <div
                      key={turn.id}
                      className={`p-3 rounded-2xl text-xs flex flex-col gap-1 ${
                        turn.sender === 'user'
                          ? 'bg-cyan-950/50 border border-cyan-500/30 self-end max-w-[88%]'
                          : 'bg-fuchsia-950/40 border border-fuchsia-500/30 self-start max-w-[90%]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-orbitron text-[10px] text-gray-300 font-bold">
                        <span>
                          {turn.sender === 'user'
                            ? 'Grayson'
                            : PERSONA_CONFIGS[turn.room && turn.room !== 'general' ? turn.room : targetRoom].name}
                        </span>
                        <button
                          onClick={() => copyToClipboard(turn.text, turn.id)}
                          className="text-cyan-300 hover:text-white transition-colors"
                        >
                          {copiedId === turn.id ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <p className="font-sans text-gray-100 select-text leading-relaxed">"{turn.text}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Central Living Orb Stage (Continuous Conversation, Zero Send/Stop Buttons) */}
          <div className="flex-1 flex flex-col items-center justify-center my-2 sm:my-3 relative z-10 w-full min-h-0">
            {/* Outermost Celestial Dash Ring with Slow Rotation */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-60 h-60 xs:w-72 xs:h-72 sm:w-84 sm:h-84 md:w-96 md:h-96 rounded-full border border-dashed border-cyan-400/30 animate-[spin_24s_linear_infinite] pointer-events-none" />

              {/* Reactive Soundwave Ripples that Ping outwards */}
              {(isRecording || isSpeaking) && (
                <>
                  <div
                    className={`absolute w-52 h-52 xs:w-64 xs:h-64 sm:w-76 sm:h-76 md:w-88 md:h-88 rounded-full border-2 animate-ping pointer-events-none opacity-40 duration-1000 ${
                      isSpeaking
                        ? targetRoom === 'godmode'
                          ? 'border-amber-400'
                          : targetRoom === 'einstein'
                            ? 'border-fuchsia-400'
                            : 'border-cyan-400'
                        : 'border-emerald-400'
                    }`}
                  />
                  <div
                    className={`absolute w-64 h-64 xs:w-76 xs:h-76 sm:w-88 sm:h-88 md:w-96 md:h-96 rounded-full border border-dashed pointer-events-none opacity-20 duration-1000 ${
                      isSpeaking ? 'border-fuchsia-300 animate-pulse' : 'border-teal-300 animate-pulse'
                    }`}
                  />
                </>
              )}

              {/* Core 3D Interactive Cosmic Orb Sphere */}
              <div
                onClick={() => {
                  if (isSpeaking) {
                    stopAllAudio();
                    setStatusMessage('Interrupted. Listening to you...');
                    triggerHandsFreeNextTurn();
                  } else if (isRecording) {
                    stopRecordingAndTalkBack();
                  } else {
                    startRecording();
                  }
                }}
                style={{
                  transform: `scale(${
                    isRecording
                      ? 1 + Math.min(0.26, (audioLevel / 255) * 0.4)
                      : isSpeaking
                        ? 1.07 + Math.sin(Date.now() / 200) * 0.05
                        : isThinking
                          ? 1.03
                          : 1
                  })`,
                  transition: isRecording ? 'transform 0.07s ease-out' : 'transform 0.35s ease-in-out',
                }}
                className={`relative w-44 h-44 xs:w-52 xs:h-52 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-full cursor-pointer flex flex-col items-center justify-center select-none shadow-2xl transition-all ${
                  isSpeaking
                    ? targetRoom === 'godmode'
                      ? 'bg-gradient-to-tr from-amber-700 via-orange-600 to-yellow-400 shadow-[0_0_80px_rgba(245,158,11,0.9)] border-4 border-amber-300/40'
                      : targetRoom === 'einstein'
                        ? 'bg-gradient-to-tr from-fuchsia-800 via-purple-600 to-pink-500 shadow-[0_0_80px_rgba(217,70,239,0.9)] border-4 border-fuchsia-300/40'
                        : 'bg-gradient-to-tr from-cyan-700 via-blue-600 to-sky-400 shadow-[0_0_80px_rgba(6,182,212,0.9)] border-4 border-cyan-300/40'
                    : isRecording
                      ? 'bg-gradient-to-tr from-emerald-700 via-teal-500 to-cyan-400 shadow-[0_0_80px_rgba(20,184,166,0.9)] border-4 border-emerald-300/40'
                      : isThinking
                        ? 'bg-gradient-to-tr from-purple-900 via-fuchsia-700 to-indigo-600 shadow-[0_0_70px_rgba(217,70,239,0.8)] border-4 border-fuchsia-300/40 animate-pulse'
                        : 'bg-gradient-to-tr from-slate-900 via-indigo-950 to-purple-900 border-2 border-white/20 shadow-[0_0_50px_rgba(147,51,234,0.4)] hover:shadow-[0_0_70px_rgba(6,182,212,0.6)]'
                }`}
                title={isSpeaking ? 'Tap Orb to Interrupt' : 'Living Voice Orb (Hands-Free)'}
              >
                {/* Glass Sphere 3D Highlight Curve */}
                <div className="absolute top-3 left-5 sm:top-5 sm:left-7 w-16 h-8 sm:w-22 sm:h-11 rounded-full bg-white/35 blur-[2px] pointer-events-none transform -rotate-12" />

                {/* Central Icon */}
                <div className="z-10 flex flex-col items-center justify-center pointer-events-none">
                  {isSpeaking ? (
                    <>
                      <AudioLines size={40} className="text-white animate-pulse sm:w-14 sm:h-14 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                      <span className="font-orbitron text-[11px] sm:text-xs font-black tracking-wider text-white uppercase mt-1 drop-shadow">
                        Speaking
                      </span>
                    </>
                  ) : isRecording ? (
                    <>
                      <Mic size={40} className="text-white animate-bounce sm:w-14 sm:h-14 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                      <span className="font-orbitron text-[11px] sm:text-xs font-black tracking-wider text-white uppercase mt-1 drop-shadow">
                        Listening
                      </span>
                    </>
                  ) : isThinking ? (
                    <>
                      <Sparkles size={38} className="text-fuchsia-200 animate-spin sm:w-12 sm:h-12" />
                      <span className="font-orbitron text-[11px] sm:text-xs font-bold tracking-wider text-fuchsia-200 uppercase mt-1">
                        Thinking
                      </span>
                    </>
                  ) : (
                    <>
                      <PersonaIcon size={40} className="text-gray-300 sm:w-14 sm:h-14" />
                      <span className="font-orbitron text-[11px] sm:text-xs font-bold tracking-wider text-gray-300 uppercase mt-1">
                        Ready
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Subtitle / Spoken Transcript Frosted Pill */}
            <div className="mt-3 sm:mt-5 max-w-xl w-full px-2 text-center">
              <div className="font-orbitron text-xs sm:text-sm md:text-base font-bold text-white tracking-wide">
                {isRecording ? (
                  <span className="text-emerald-300 flex items-center justify-center gap-1.5">
                    <Mic size={14} className="animate-pulse" />
                    <span>Listening to Grayson... speak freely</span>
                  </span>
                ) : isSpeaking ? (
                  <span className="text-cyan-300 flex items-center justify-center gap-1.5">
                    <Volume2 size={14} className="animate-pulse" />
                    <span>{PERSONA_CONFIGS[targetRoom].name} is talking out loud</span>
                  </span>
                ) : isThinking ? (
                  <span className="text-fuchsia-300 flex items-center justify-center gap-1.5">
                    <Sparkles size={14} className="animate-spin" />
                    <span>{PERSONA_CONFIGS[targetRoom].name} is preparing spoken reply...</span>
                  </span>
                ) : (
                  <span className="text-gray-300">{statusMessage}</span>
                )}
              </div>

              {/* Live Caption Card */}
              <div className="mt-2 p-2.5 sm:p-3.5 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-md shadow-lg min-h-[3.25rem] sm:min-h-[4rem] flex items-center justify-center">
                {liveTranscript ? (
                  <p className="text-xs sm:text-sm text-cyan-200 font-sans italic leading-snug">
                    "{liveTranscript}"
                  </p>
                ) : isSpeaking && dialogue.length > 0 ? (
                  <p className="text-xs sm:text-sm text-slate-200 font-sans leading-snug line-clamp-3">
                    "{dialogue[dialogue.length - 1].text}"
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-400 font-mono">
                    Say anything to {PERSONA_CONFIGS[targetRoom].name}. Speech is detected automatically.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Hands-Free Info Bar (Pure Hands-Free: Zero send/stop buttons) */}
          <div className="w-full flex items-center justify-center pt-2 border-t border-white/10 z-10 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 border border-white/10 text-[10px] sm:text-xs font-mono text-cyan-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
              <span>Continuous Conversation Mode • Zero Buttons Needed • Tap Orb to Interrupt</span>
            </div>
          </div>
        </div>
      ) : (
        /* Regular Studio View with Left Column (Live Studio) and Right Column (Saved Vault) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-4 md:gap-5 flex-1 min-h-0 overflow-hidden">
          {/* LEFT COLUMN: LIVE TALK-BACK STUDIO CONSOLE */}
          <div
            className={`lg:col-span-7 glass-panel-neon p-2.5 sm:p-3.5 md:p-4 flex flex-col gap-2 sm:gap-2.5 overflow-hidden h-full ${
              mobileTab === 'studio' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Persona Switcher Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1.5 sm:pb-2.5 border-b border-white/10 shrink-0">
              <div className="min-w-0">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-cyan-300/80 font-orbitron">
                  Active Spoken Persona
                </div>
                <h3 className="font-orbitron font-bold text-xs sm:text-base text-white flex items-center gap-1.5 mt-0.5 truncate">
                  <PersonaIcon size={15} className="text-cyan-400 shrink-0" />
                  <span className="truncate">{PERSONA_CONFIGS[targetRoom].name}</span>
                  <span className="text-[10px] sm:text-xs font-mono text-gray-400 font-normal hidden sm:inline">
                    ({PERSONA_CONFIGS[targetRoom].title})
                  </span>
                </h3>
              </div>

              {/* Persona Switcher Buttons */}
              <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-black/40 rounded-xl sm:rounded-2xl border border-white/15 shrink-0">
                {(['buzz', 'einstein', 'godmode'] as const).map((r) => {
                  const cfg = PERSONA_CONFIGS[r];
                  const active = targetRoom === r;
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        if (isSpeaking) stopAllAudio();
                        setTargetRoom(r);
                      }}
                      className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl font-orbitron text-[10px] sm:text-xs capitalize transition-all cursor-pointer flex items-center gap-1 ${
                        active
                          ? `${cfg.buttonColor} text-white font-bold shadow-md`
                          : 'text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span>{cfg.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Launch Hands-Free Orb Card */}
            <button
              type="button"
              onClick={() => toggleHandsFreeMode(true)}
              className="w-full py-2 px-3 rounded-2xl bg-gradient-to-r from-fuchsia-600/30 via-purple-600/25 to-cyan-600/30 hover:from-fuchsia-600/40 hover:to-cyan-600/40 border border-fuchsia-400/50 flex items-center justify-between gap-2 shadow-[0_0_15px_rgba(217,70,239,0.3)] transition-all cursor-pointer shrink-0 active:scale-98"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-fuchsia-500 to-cyan-400 flex items-center justify-center text-white shrink-0 shadow">
                  <Sparkles size={14} />
                </div>
                <div className="text-left min-w-0">
                  <div className="font-orbitron font-bold text-xs text-white truncate">
                    Tap to Launch Hands-Free Orb
                  </div>
                  <div className="text-[10px] text-gray-300 font-sans truncate">
                    Continuous voice conversation with {PERSONA_CONFIGS[targetRoom].name} (Zero buttons)
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-orbitron text-cyan-300 font-bold shrink-0">Open Orb →</span>
            </button>

              {/* Compact Voice Reactive Visualizer Strip (Single-Screen Optimized) */}
              <div
                className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border bg-black/40 flex items-center justify-between gap-2.5 relative overflow-hidden transition-all duration-300 shrink-0 ${
                  isSpeaking
                    ? `${PERSONA_CONFIGS[targetRoom].borderColor} ${PERSONA_CONFIGS[targetRoom].glowColor}`
                    : isRecording
                      ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                      : 'border-white/15'
                }`}
              >
                {/* Background subtle glowing radial */}
                <div
                  className={`absolute inset-0 opacity-20 pointer-events-none transition-all duration-500 ${
                    isSpeaking
                      ? 'bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-amber-500 animate-pulse'
                      : isRecording
                        ? 'bg-red-600/30'
                        : 'bg-transparent'
                  }`}
                />

                {/* Left: Mini Reactive Orb Avatar & Tap-to-Talk */}
                <div className="flex items-center gap-2.5 min-w-0 z-10">
                  <div
                    onClick={() => {
                      if (isSpeaking) stopAllAudio();
                      else if (isRecording) stopRecordingAndTalkBack();
                      else startRecording();
                    }}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shrink-0 ${
                      isSpeaking
                        ? `${PERSONA_CONFIGS[targetRoom].buttonColor} shadow-[0_0_20px_rgba(217,70,239,0.8)] scale-105 animate-pulse`
                        : isRecording
                          ? 'bg-red-600 border-2 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.9)] scale-105'
                          : isThinking
                            ? 'bg-fuchsia-600/50 border border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.5)] animate-spin'
                            : 'bg-white/10 border border-white/20 hover:border-cyan-400'
                    }`}
                    title={isSpeaking ? 'Tap to Interrupt' : isRecording ? 'Tap to Finish Turn' : `Tap to Speak to ${PERSONA_CONFIGS[targetRoom].name}`}
                  >
                    {isSpeaking ? (
                      <AudioLines size={18} className="text-white animate-pulse" />
                    ) : isRecording ? (
                      <Mic size={18} className="text-white animate-bounce" />
                    ) : isThinking ? (
                      <Sparkles size={16} className="text-fuchsia-200" />
                    ) : (
                      <PersonaIcon size={18} className="text-gray-300" />
                    )}
                  </div>

                  {/* Dynamic Status Text & Reactive Mini Soundwave */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-orbitron text-[11px] sm:text-xs font-bold tracking-wide text-white truncate">
                        {statusMessage}
                      </span>
                      {isSpeaking && (
                        <button
                          onClick={stopAllAudio}
                          className="px-2 py-0.5 rounded-full bg-red-600/80 hover:bg-red-600 text-white font-orbitron text-[9px] font-bold flex items-center gap-1 shadow transition-all cursor-pointer shrink-0"
                          title="Stop Speaking / Interrupt"
                        >
                          <Square size={9} fill="currentColor" />
                          <span>Stop</span>
                        </button>
                      )}
                    </div>

                    {/* Mini Waveform Bars Simulation */}
                    <div className="flex items-center gap-0.5 sm:gap-1 h-3 mt-0.5">
                      {[30, 65, 45, 80, 55, 95, 60, 75, 40, 90, 50, 70, 35, 60].map((h, i) => {
                        const heightPercent = isSpeaking
                          ? Math.max(25, (h * (0.6 + Math.sin(Date.now() / 200 + i) * 0.4)))
                          : isRecording
                            ? Math.max(30, Math.min(100, audioLevel > 2 ? (audioLevel / 128) * h : 30 + Math.sin(Date.now() / 150 + i) * 15))
                            : 15;

                        return (
                          <span
                            key={i}
                            style={{ height: `${heightPercent}%` }}
                            className={`w-0.5 sm:w-1 rounded-full transition-all duration-100 ${
                              isSpeaking
                                ? PERSONA_CONFIGS[targetRoom].waveColor
                                : isRecording
                                  ? 'bg-gradient-to-t from-red-500 to-amber-400'
                                  : 'bg-white/20'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right: Telemetry Badges & Hands-Free Launch */}
                <div className="flex items-center gap-1.5 sm:gap-2 z-10 shrink-0">
                  {isRecording && (
                    <span className="text-red-400 font-bold flex items-center gap-1 bg-red-950/70 border border-red-500/40 px-2 py-0.5 rounded-full font-mono text-[10px] tabular-nums">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      REC {formatTime(recordingSeconds)}
                    </span>
                  )}
                  {isRecording && (
                    <span className="text-emerald-400 font-bold hidden xs:flex items-center gap-1 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono text-[10px] tabular-nums">
                      Mic {Math.max(12, Math.round((audioLevel / 255) * 100))}%
                    </span>
                  )}
                  {!handsFreeMode && (
                    <button
                      type="button"
                      onClick={() => toggleHandsFreeMode(true)}
                      className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-fuchsia-600/30 to-purple-600/30 hover:from-fuchsia-600/50 hover:to-purple-600/50 border border-fuchsia-400/40 text-fuchsia-200 text-[10px] sm:text-[11px] font-orbitron font-semibold flex items-center gap-1 transition-all cursor-pointer shadow"
                      title="Open Full Hands-Free Cosmic Orb Mode"
                    >
                      <Sparkles size={11} className="text-amber-300" />
                      <span className="hidden sm:inline">Hands-Free</span>
                      <span>Orb</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Spoken Dialogue Thread: Back-and-Forth Voice Log */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-[160px] bg-black/20 p-2 sm:p-3 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between pb-1 border-b border-white/10 text-[10px] sm:text-xs font-orbitron text-gray-400">
                  <span className="flex items-center gap-1 text-cyan-300">
                    <Radio size={13} className="text-cyan-400" />
                    <span>Live Dialogue Stream ({dialogue.length} turns)</span>
                  </span>
                  {dialogue.length > 0 && (
                    <button
                      onClick={() => {
                        stopAllAudio();
                        setDialogue([]);
                      }}
                      className="text-[10px] text-gray-400 hover:text-red-300 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Clear current stream"
                    >
                      <RotateCcw size={11} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                {dialogue.length === 0 && !liveTranscript && !isThinking ? (
                  <div className="text-center py-4 sm:py-6 text-gray-400 font-mono text-xs flex flex-col items-center gap-1">
                    <Mic size={22} className="text-cyan-400/60" />
                    <p>Tap "Talk to {PERSONA_CONFIGS[targetRoom].name}" below to speak.</p>
                    <p className="text-[10px] sm:text-[11px] text-gray-500">
                      {PERSONA_CONFIGS[targetRoom].tagline}
                    </p>
                  </div>
                ) : (
                  <>
                    {dialogue.map((turn) => (
                      <div
                        key={turn.id}
                        className={`p-2.5 sm:p-3.5 rounded-2xl flex flex-col gap-1.5 transition-all ${
                          turn.sender === 'user'
                            ? 'bg-cyan-950/40 border border-cyan-500/30 self-end max-w-[92%] sm:max-w-[88%]'
                            : `${
                                turn.room === 'godmode'
                                  ? 'bg-amber-950/40 border border-amber-500/30'
                                  : turn.room === 'einstein'
                                    ? 'bg-fuchsia-950/40 border border-fuchsia-500/30'
                                    : 'bg-cyan-950/40 border border-cyan-500/30'
                              } self-start max-w-[94%] sm:max-w-[92%]`
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 font-orbitron text-[11px] sm:text-xs font-bold">
                            {turn.sender === 'user' ? (
                              <span className="text-cyan-300 flex items-center gap-1">
                                <Mic size={12} />
                                <span>Grayson</span>
                              </span>
                            ) : (
                              <span
                                className={`flex items-center gap-1 ${
                                  turn.room === 'godmode'
                                    ? 'text-amber-300'
                                    : turn.room === 'einstein'
                                      ? 'text-fuchsia-300'
                                      : 'text-cyan-300'
                                }`}
                              >
                                <PersonaIcon size={13} />
                                <span>
                                  {turn.room ? PERSONA_CONFIGS[turn.room as 'buzz' | 'einstein' | 'godmode']?.name : PERSONA_CONFIGS[targetRoom].name}
                                </span>
                              </span>
                            )}
                            <span className="text-[9px] sm:text-[10px] text-gray-400 font-mono font-normal">
                              {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleReplayTurn(turn)}
                              className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-cyan-300 hover:text-white transition-colors cursor-pointer"
                              title="Replay Voice Audio"
                            >
                              <Volume2 size={12} />
                            </button>
                            <button
                              onClick={() => copyToClipboard(turn.text, turn.id)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer border ${
                                copiedId === turn.id
                                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 font-bold shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                                  : 'bg-white/10 hover:bg-white/20 border-white/15 text-gray-200 hover:text-white'
                              }`}
                              title="Copy dialogue text"
                            >
                              {copiedId === turn.id ? (
                                <>
                                  <Check size={11} className="text-emerald-400" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={11} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-100 leading-relaxed font-sans select-text">
                          "{turn.text}"
                        </p>

                        {turn.sender === 'ai' && (
                          <div className="flex items-center justify-end gap-1 pt-1 border-t border-white/5 text-[9px] sm:text-[10px] font-orbitron">
                            <span className="text-gray-400">Send:</span>
                            <button
                              onClick={() => onSendToChat('buzz', turn.text)}
                              className="px-1.5 py-0.5 rounded bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 transition-colors"
                            >
                              Buzz
                            </button>
                            <button
                              onClick={() => onSendToChat('einstein', turn.text)}
                              className="px-1.5 py-0.5 rounded bg-fuchsia-600/30 hover:bg-fuchsia-600 text-fuchsia-200 transition-colors"
                            >
                              Einstein
                            </button>
                            <button
                              onClick={() => onSendToChat('godmode', turn.text)}
                              className="px-1.5 py-0.5 rounded bg-amber-600/30 hover:bg-amber-600 text-amber-200 transition-colors"
                            >
                              God Mode
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {liveTranscript && (
                      <div className="p-2.5 sm:p-3 rounded-2xl bg-cyan-900/40 border border-cyan-400/60 self-end max-w-[92%] sm:max-w-[88%] animate-pulse">
                        <span className="text-[9px] sm:text-[10px] font-orbitron text-cyan-300 uppercase block mb-0.5">
                          Transcribing your voice...
                        </span>
                        <p className="text-xs sm:text-sm text-cyan-100 font-mono">
                          "{liveTranscript}"
                        </p>
                      </div>
                    )}

                    {isThinking && (
                      <div className="p-2.5 sm:p-3 rounded-2xl bg-fuchsia-950/40 border border-fuchsia-500/40 self-start max-w-[85%] flex items-center gap-2">
                        <Sparkles size={14} className="text-fuchsia-400 animate-spin" />
                        <span className="text-xs font-orbitron text-fuchsia-200">
                          {PERSONA_CONFIGS[targetRoom].name} is preparing spoken reply...
                        </span>
                      </div>
                    )}

                    <div ref={dialogueEndRef} />
                  </>
                )}
              </div>

              {/* Action Console: Microphone & Talk Buttons */}
              <div className="pt-2 border-t border-white/10 shrink-0 flex flex-col gap-1.5 sm:gap-2">
                {/* Custom Title Input & Save Session Button */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Session title (optional)..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400 font-sans min-w-0"
                  />
                  <button
                    onClick={saveSessionToDatabase}
                    disabled={dialogue.length === 0}
                    className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 font-orbitron text-[11px] sm:text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
                  >
                    <CheckCircle size={13} className="text-emerald-400" />
                    <span className="hidden xs:inline">Save</span>
                  </button>
                </div>

                {/* Microphone Permission Notice Banner if Denied / Blocked */}
                {(micPermissionState === 'denied' || micPermissionState === 'unsupported') && (
                  <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                      <span className="text-[11px] font-sans truncate">
                        {micPermissionState === 'denied'
                          ? 'Microphone blocked by browser. You can type below to hear spoken replies!'
                          : 'Microphone unsupported on this device. Use text input below to chat!'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={startRecording}
                      className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-[10px] font-orbitron text-amber-100 shrink-0 transition-colors"
                    >
                      Retry Mic
                    </button>
                  </div>
                )}

                {/* Main Push-to-Talk / Controller Button */}
                <div className="grid grid-cols-12 gap-1.5 sm:gap-2">
                  {isRecording ? (
                    <button
                      onClick={stopRecordingAndTalkBack}
                      className="col-span-12 py-2.5 sm:py-3 bg-red-600 hover:bg-red-500 rounded-2xl font-orbitron font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.7)] cursor-pointer transition-all animate-pulse active:scale-98"
                    >
                      <Square size={16} fill="currentColor" />
                      <span className="truncate">Finish & Have {PERSONA_CONFIGS[targetRoom].name} Talk Back</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={startRecording}
                        disabled={isThinking}
                        className={`col-span-8 sm:col-span-9 py-2.5 sm:py-3 ${PERSONA_CONFIGS[targetRoom].buttonColor} rounded-2xl font-orbitron font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.5)] cursor-pointer transition-all active:scale-98 disabled:opacity-50`}
                      >
                        <Mic size={17} />
                        <span className="truncate">Talk to {PERSONA_CONFIGS[targetRoom].name}</span>
                      </button>

                      <button
                        onClick={stopAllAudio}
                        disabled={!isSpeaking}
                        className="col-span-4 sm:col-span-3 py-2.5 sm:py-3 rounded-2xl font-orbitron text-[11px] sm:text-xs font-semibold border border-white/20 bg-white/5 hover:bg-white/15 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Stop audio speech"
                      >
                        <VolumeX size={15} />
                        <span className="truncate">Mute</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Type-to-Speak: Works with or without microphone permission */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendTextTurn();
                  }}
                  className="flex items-center gap-1.5 sm:gap-2 pt-0.5"
                >
                  <input
                    type="text"
                    value={typeInputText}
                    onChange={(e) => setTypeInputText(e.target.value)}
                    placeholder={`Type to ${PERSONA_CONFIGS[targetRoom].name} & hear spoken reply...`}
                    disabled={isThinking}
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs text-white placeholder:text-gray-400 outline-none focus:border-cyan-400 font-sans min-w-0 select-text"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (navigator.clipboard?.readText) {
                          const clipText = await navigator.clipboard.readText();
                          if (clipText) setTypeInputText((prev) => (prev ? `${prev} ${clipText}` : clipText));
                        }
                      } catch (err) {
                        console.warn('Clipboard paste error:', err);
                      }
                    }}
                    className="px-2 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-gray-200 hover:text-cyan-300 text-xs font-mono flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-sm"
                    title="Paste text from clipboard"
                  >
                    <ClipboardPaste size={13} className="text-cyan-400" />
                    <span className="hidden xs:inline">Paste</span>
                  </button>
                  <button
                    type="submit"
                    disabled={!typeInputText.trim() || isThinking}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 hover:from-cyan-500 hover:to-fuchsia-500 font-orbitron text-[11px] sm:text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                    title="Send and hear voice reply"
                  >
                    <Send size={13} />
                    <span className="hidden xs:inline">Speak</span>
                  </button>
                </form>
              </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: SAVED VOICE VAULT DATABASE */}
        {/* ========================================================= */}
        <div
          className={`lg:col-span-5 glass-panel-neon p-2.5 sm:p-4 md:p-6 flex flex-col gap-2.5 sm:gap-4 overflow-hidden h-full ${
            mobileTab === 'vault' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Volume2 size={18} className="text-cyan-400 shrink-0" />
              <h3 className="font-orbitron font-bold text-xs sm:text-base text-white truncate">
                Saved Voice Vault ({recordings.length})
              </h3>
            </div>
            <span className="text-[10px] text-cyan-300 font-mono shrink-0">Database Synced</span>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col gap-1.5 sm:gap-2 shrink-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved voice notes..."
              className="w-full bg-white/10 border border-white/20 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400 font-sans"
            />

            <div className="flex items-center gap-1 overflow-x-auto text-[10px] sm:text-[11px] font-orbitron no-scrollbar">
              {(['all', 'buzz', 'einstein', 'godmode'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFilter(f)}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg capitalize transition-colors cursor-pointer shrink-0 ${
                    selectedFilter === f
                      ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-bold'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable list of saved voice notes */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 min-h-0">
            {filteredRecordings.length === 0 ? (
              <div className="text-center py-12 text-gray-400 font-mono text-xs">
                {recordings.length === 0
                  ? 'No voice conversations stored yet. Have a voice conversation to save it in your database!'
                  : 'No recordings match your filter.'}
              </div>
            ) : (
              filteredRecordings.map((rec) => {
                const isPlaying = playingId === rec.id;
                const recRoomConfig =
                  PERSONA_CONFIGS[rec.room as 'buzz' | 'einstein' | 'godmode'] || PERSONA_CONFIGS.buzz;

                return (
                  <div
                    key={rec.id}
                    className="bg-white/5 border border-white/15 rounded-2xl p-2.5 sm:p-3.5 flex flex-col gap-2 hover:border-cyan-400/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={() => togglePlaySavedRecording(rec)}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            isPlaying
                              ? 'bg-fuchsia-600 text-white animate-pulse shadow-[0_0_15px_rgba(217,70,239,0.8)]'
                              : 'bg-white/10 hover:bg-white/20 text-cyan-400'
                          }`}
                          title={isPlaying ? 'Pause' : 'Play audio'}
                        >
                          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <div className="min-w-0">
                          <h4 className="font-orbitron font-bold text-xs sm:text-sm text-white truncate">
                            {rec.title}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-gray-400 font-mono mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {rec.duration}s
                            </span>
                            <span>•</span>
                            <span>{new Date(rec.timestamp).toLocaleDateString()}</span>
                            <span className={`px-1.5 py-0.2 rounded-full uppercase text-[8px] sm:text-[9px] font-orbitron border ${recRoomConfig.badgeColor}`}>
                              {rec.room}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard(rec.aiResponse ? `${rec.transcript}\n\n${recRoomConfig.name}: ${rec.aiResponse}` : rec.transcript, `saved-user-${rec.id}`)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            copiedId === `saved-user-${rec.id}`
                              ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                          }`}
                          title="Copy recording transcript"
                        >
                          {copiedId === `saved-user-${rec.id}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>
                        <button
                          onClick={() => handleDeleteSaved(rec.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                          title="Delete voice note"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* User Transcript */}
                    <div className="bg-black/30 rounded-xl p-2 text-xs font-mono text-gray-300 border border-white/10 leading-relaxed select-text">
                      <span className="text-[8px] sm:text-[9px] uppercase font-orbitron text-cyan-400 block mb-0.5">
                        Grayson's Voice:
                      </span>
                      "{rec.transcript}"
                    </div>

                    {/* AI Spoken Response (if present) */}
                    {rec.aiResponse && (
                      <div className="bg-fuchsia-950/20 rounded-xl p-2 text-xs font-mono text-fuchsia-200 border border-fuchsia-500/20 leading-relaxed select-text">
                        <span className="text-[8px] sm:text-[9px] uppercase font-orbitron text-fuchsia-400 block mb-0.5">
                          {recRoomConfig.name}'s Spoken Reply:
                        </span>
                        "{rec.aiResponse}"
                      </div>
                    )}

                    {/* Takeaway & Send to room actions */}
                    <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-white/10 text-xs">
                      <div className="flex items-center gap-1 text-emerald-400 font-mono text-[9px] sm:text-[10px] truncate max-w-[160px]">
                        <CheckCircle size={11} className="shrink-0" />
                        <span className="truncate">
                          {rec.summary || 'Saved in memory bank'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-orbitron text-[9px] sm:text-[10px]">
                        <span className="text-gray-400">Send:</span>
                        <button
                          onClick={() => onSendToChat('buzz', rec.aiResponse || rec.transcript)}
                          className="px-1.5 py-0.5 rounded bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 transition-colors"
                        >
                          Buzz
                        </button>
                        <button
                          onClick={() => onSendToChat('einstein', rec.aiResponse || rec.transcript)}
                          className="px-1.5 py-0.5 rounded bg-fuchsia-600/30 hover:bg-fuchsia-600 text-fuchsia-200 transition-colors"
                        >
                          Einstein
                        </button>
                        <button
                          onClick={() => onSendToChat('godmode', rec.aiResponse || rec.transcript)}
                          className="px-1.5 py-0.5 rounded bg-amber-600/30 hover:bg-amber-600 text-amber-200 transition-colors"
                        >
                          God Mode
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    )}
      </div>
    </div>
  );
};

