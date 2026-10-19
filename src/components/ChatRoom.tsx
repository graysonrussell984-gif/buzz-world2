import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, ChatAttachment, IntelligenceState } from '../types';
import { useCloudSync, SyncEventPayload } from '../hooks/useCloudSync';
import {
  Menu,
  ArrowLeft,
  Mic,
  Send,
  Plus,
  Camera,
  Image as ImageIcon,
  FileText,
  X,
  Volume2,
  Copy,
  Check,
  Brain,
  BookmarkCheck,
  Sparkles,
  Zap,
  Loader2,
  SwitchCamera,
  Upload,
  Maximize2,
  Minimize2,
  RefreshCw,
  Globe,
  Search,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ChevronUp,
  Flashlight,
  Sun,
  Moon,
  Focus,
  SlidersHorizontal,
  ClipboardPaste,
  GraduationCap,
  ShieldCheck,
  Clapperboard,
} from 'lucide-react';
import { VideoPresentationStudio } from './VideoPresentationStudio';

// Bulletproof message deduplication to prevent double messages in UI
export function dedupeChatList(list: ChatMessage[]): ChatMessage[] {
  if (!Array.isArray(list) || list.length <= 1) return list || [];
  const result: ChatMessage[] = [];

  for (const m of list) {
    if (!m) continue;
    const mSender = m.sender || 'user';
    const mText = (m.text || '').trim();
    const mTs = Number(m.timestamp) || 0;
    const mId = m.id;

    let isDupe = false;
    for (let i = result.length - 1; i >= 0; i--) {
      const item = result[i];
      if (mId && item.id && item.id === mId) {
        isDupe = true;
        // Merge optional properties if missing
        if (m.isVoice) item.isVoice = true;
        if (m.audioData && !item.audioData) item.audioData = m.audioData;
        if (m.groundingMetadata && !item.groundingMetadata) item.groundingMetadata = m.groundingMetadata;
        break;
      }
      if (item.sender === mSender && item.text.trim() === mText && mText.length > 0) {
        if (Math.abs((item.timestamp || 0) - mTs) < 900000) {
          isDupe = true;
          if (m.isVoice) item.isVoice = true;
          if (m.audioData && !item.audioData) item.audioData = m.audioData;
          if (m.groundingMetadata && !item.groundingMetadata) item.groundingMetadata = m.groundingMetadata;
          break;
        }
      }
    }

    if (!isDupe) {
      result.push(m);
    }
  }

  // Safety pass for any adjacent identical messages
  const sanitized: ChatMessage[] = [];
  for (const item of result) {
    if (sanitized.length > 0) {
      const prev = sanitized[sanitized.length - 1];
      if (
        prev.sender === item.sender &&
        prev.text.trim() === item.text.trim() &&
        Math.abs((item.timestamp || 0) - (prev.timestamp || 0)) < 900000
      ) {
        if (item.isVoice) prev.isVoice = true;
        if (item.audioData && !prev.audioData) prev.audioData = item.audioData;
        if (item.groundingMetadata && !prev.groundingMetadata) prev.groundingMetadata = item.groundingMetadata;
        continue;
      }
    }
    sanitized.push(item);
  }

  return sanitized;
}

interface ChatRoomProps {
  room: 'buzz' | 'einstein' | 'godmode';
  title: string;
  initialGreeting: string;
  backgroundImage: string;
  bgSize?: 'contain' | 'cover';
  onBack: () => void;
  onOpenSidebar: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  room,
  title,
  initialGreeting,
  backgroundImage,
  bgSize = 'contain',
  onBack,
  onOpenSidebar,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(`chat_history_${room}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return dedupeChatList(parsed);
      }
    } catch (e) {
      console.error('Failed to load chat history for', room, e);
    }
    return [
      {
        id: 'msg-init',
        sender: 'ai',
        text: initialGreeting,
        timestamp: Date.now(),
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedMemoryId, setSavedMemoryId] = useState<string | null>(null);
  const [intelligence, setIntelligence] = useState<IntelligenceState | null>(null);
  const [isDeepThinking, setIsDeepThinking] = useState(true);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [isSyncingVoice, setIsSyncingVoice] = useState(false);
  const [einsteinMemories, setEinsteinMemories] = useState<any[]>([]);
  const [einsteinWritingRules, setEinsteinWritingRules] = useState<string[]>([]);
  const [showEinsteinMemoryModal, setShowEinsteinMemoryModal] = useState(false);
  const [einsteinMemoryTab, setEinsteinMemoryTab] = useState<'memories' | 'rules'>('memories');
  const [showVideoStudioModal, setShowVideoStudioModal] = useState(false);

  // Sync spoken discussions from Voice Vault directly into this chatroom
  const handleSyncVoiceTalks = async () => {
    setIsSyncingVoice(true);
    try {
      const res = await fetch(`/api/database/chat/${room}/sync-voice`, { method: 'POST' });
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        lastSourceRef.current = 'server';
        const clean = dedupeChatList(data.messages);
        setMessages(clean);
        try {
          localStorage.setItem(`chat_history_${room}`, JSON.stringify(clean));
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Sync voice talks failed:', e);
    } finally {
      setIsSyncingVoice(false);
    }
  };

  // Cross-device sync & hydration guards (prevents overwriting server with stale local cache)
  const hasHydratedRef = useRef(false);
  const lastSourceRef = useRef<'server' | 'local'>('local');

  // Real-time live synchronization (Phone & Laptop linked via SSE)
  useCloudSync(
    useCallback(
      (event: SyncEventPayload) => {
        if (event.type === 'CHAT_UPDATED' && event.room === room && Array.isArray(event.messages)) {
          lastSourceRef.current = 'server';
          const clean = dedupeChatList(event.messages);
          setMessages(clean);
          setIsLoading(false);
          try {
            localStorage.setItem(`chat_history_${room}`, JSON.stringify(clean));
          } catch (e) {
            // quota protection
          }
        }
        if (event.type === 'MEMORIES_UPDATED') {
          if (event.intelligence) setIntelligence(event.intelligence);
          if (room === 'einstein') {
            fetch('/api/database/einstein-memories')
              .then((r) => r.json())
              .then((d) => {
                if (d.success) {
                  if (Array.isArray(d.connectedMemories)) setEinsteinMemories(d.connectedMemories);
                  if (Array.isArray(d.writingRules)) setEinsteinWritingRules(d.writingRules);
                }
              })
              .catch(() => {});
          }
        }
      },
      [room]
    )
  );

  useEffect(() => {
    hasHydratedRef.current = false;
    lastSourceRef.current = 'local';

    fetch('/api/database/intelligence')
      .then((r) => r.json())
      .then((d) => {
        if (d.intelligence) setIntelligence(d.intelligence);
      })
      .catch((e) => console.warn(e));

    if (room === 'einstein') {
      fetch('/api/database/einstein-memories')
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            if (Array.isArray(d.connectedMemories)) setEinsteinMemories(d.connectedMemories);
            if (Array.isArray(d.writingRules)) setEinsteinWritingRules(d.writingRules);
          }
        })
        .catch((e) => console.warn('Could not load Einstein memories:', e));
    }

    // Authoritatively hydrate latest chat history directly from persistent cloud database
    let isMounted = true;
    fetch(`/api/database/chat/${room}`)
      .then((r) => r.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.messages)) {
          if (data.messages.length > 0) {
            lastSourceRef.current = 'server';
            const clean = dedupeChatList(data.messages);
            setMessages(clean);
            try {
              localStorage.setItem(`chat_history_${room}`, JSON.stringify(clean));
            } catch (err) {
              // quota safe
            }
          }
        }
        hasHydratedRef.current = true;
      })
      .catch((err) => {
        console.warn('Could not hydrate messages from DB:', err);
        hasHydratedRef.current = true;
      });

    return () => {
      isMounted = false;
    };
  }, [room]);

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Live Camera & Photo Upload states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraViewMode, setCameraViewMode] = useState<'whole' | 'fill'>('whole');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedCaption, setCapturedCaption] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isShutterFlashing, setIsShutterFlashing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [cameraZoom, setCameraZoom] = useState<number>(1);
  const [cameraQualityBadge, setCameraQualityBadge] = useState<string>('HD Stream');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isRingLightOn, setIsRingLightOn] = useState<boolean>(false);
  const [clarityMode, setClarityMode] = useState<'hdr' | 'document' | 'natural' | 'lowlight'>('hdr');
  const [focusTapCoord, setFocusTapCoord] = useState<{ x: number; y: number } | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const lastTapTimeRef = useRef<number>(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileCameraRef = useRef<HTMLInputElement | null>(null);
  const filePhotoRef = useRef<HTMLInputElement | null>(null);
  const fileDocRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Safely cache messages to localStorage without concurrent race conditions to the server
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    if (!hasHydratedRef.current) return;
    if (messages.length === 1 && messages[0].id === 'msg-init') return;

    // Cache deduplicated messages with quota protection (strip massive base64 payloads)
    try {
      const deduped = dedupeChatList(messages);
      const safeForLocalStorage = deduped.map((m) => {
        if (m.attachment?.data && m.attachment.data.length > 150000) {
          return {
            ...m,
            attachment: {
              ...m.attachment,
              data: m.attachment.data.slice(0, 100) + '...[Image preserved in database]',
            },
          };
        }
        return m;
      });
      localStorage.setItem(`chat_history_${room}`, JSON.stringify(safeForLocalStorage));
    } catch (e) {
      console.warn('localStorage quota warning, writing trimmed fallback:', e);
      try {
        const compact = dedupeChatList(messages).slice(-25).map(({ attachment, ...rest }) => ({
          ...rest,
          attachment: attachment
            ? { name: attachment.name, type: attachment.type, isImage: attachment.isImage }
            : undefined,
        }));
        localStorage.setItem(`chat_history_${room}`, JSON.stringify(compact));
      } catch (err2) {
        console.warn('localStorage write failed completely:', err2);
      }
    }
  }, [messages, room]);

  // Helper to compress and resize camera photos with ultra-crisp high fidelity
  const compressImage = (
    file: File | Blob,
    maxWidth = 2560,
    maxHeight = 2560,
    quality = 0.94
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Live Camera stream controllers
  const stopCameraStream = () => {
    if (streamRef.current) {
      if (isTorchOn) {
        try {
          const track = streamRef.current.getVideoTracks()[0];
          track?.applyConstraints({ advanced: [{ torch: false }] } as any).catch(() => {});
        } catch {}
      }
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
  };

  const attachStreamToVideo = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      if (el.srcObject !== streamRef.current) {
        el.srcObject = streamRef.current;
      }
      el.muted = true;
      // @ts-ignore
      el.defaultMuted = true;
      el.playsInline = true;
      el.setAttribute('playsinline', 'true');
      el.setAttribute('webkit-playsinline', 'true');
      el.setAttribute('x5-playsinline', 'true');
      el.play().catch((playErr) => console.log('Video play caught in attachStream:', playErr));
    }
  };

  const startCameraStream = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    stopCameraStream();
    setCameraError(null);
    setIsCameraStarting(true);
    setCapturedPhoto(null);
    setCameraFacingMode(facing);
    setIsCameraOpen(true);

    try {
      const getStream = async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
        if (typeof navigator !== 'undefined' && navigator?.mediaDevices?.getUserMedia) {
          return await navigator.mediaDevices.getUserMedia(constraints);
        }
        const legacy =
          (navigator as any)?.getUserMedia ||
          (navigator as any)?.webkitGetUserMedia ||
          (navigator as any)?.mozGetUserMedia ||
          (navigator as any)?.msGetUserMedia;
        if (legacy) {
          return new Promise((resolve, reject) => {
            legacy.call(navigator, constraints, resolve, reject);
          });
        }
        throw new Error('Camera access is not directly exposed in this browser window.');
      };

      const isPortrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
      let stream: MediaStream | null = null;
      let lastError: any = null;

      // Progressive tier list prioritizing Ultra-HD / 1080p Full HD sensor capture
      const tiers: MediaStreamConstraints[] = [
        // Tier 1: 4K / QHD Ultra-HD
        {
          video: {
            facingMode: { ideal: facing },
            width: { ideal: isPortrait ? 2160 : 3840, min: isPortrait ? 1080 : 1920 },
            height: { ideal: isPortrait ? 3840 : 2160, min: isPortrait ? 1920 : 1080 },
            frameRate: { ideal: 60, min: 24 },
          },
          audio: false,
        },
        // Tier 2: 1080p Full HD with high floor
        {
          video: {
            facingMode: { ideal: facing },
            width: { ideal: isPortrait ? 1080 : 1920, min: isPortrait ? 720 : 1280 },
            height: { ideal: isPortrait ? 1920 : 1080, min: isPortrait ? 1280 : 720 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        },
        // Tier 3: 1080p Full HD relaxed
        {
          video: {
            facingMode: { ideal: facing },
            width: { ideal: isPortrait ? 1080 : 1920 },
            height: { ideal: isPortrait ? 1920 : 1080 },
          },
          audio: false,
        },
        // Tier 4: HD 720p with min
        {
          video: {
            facingMode: { ideal: facing },
            width: { ideal: isPortrait ? 720 : 1280, min: isPortrait ? 480 : 640 },
            height: { ideal: isPortrait ? 1280 : 720, min: isPortrait ? 640 : 480 },
          },
          audio: false,
        },
        // Tier 5: Aspect ratio matching display
        {
          video: {
            facingMode: { ideal: facing },
            aspectRatio: { ideal: isPortrait ? 9 / 16 : 16 / 9 },
          },
          audio: false,
        },
        // Tier 6: Unconstrained facingMode ideal
        {
          video: {
            facingMode: { ideal: facing },
          },
          audio: false,
        },
        // Tier 7: Strict facingMode
        {
          video: { facingMode: facing },
          audio: false,
        },
        // Tier 8: Generic video stream
        {
          video: true,
          audio: false,
        },
      ];

      for (const constraint of tiers) {
        try {
          stream = await getStream(constraint);
          if (stream) break;
        } catch (tierErr) {
          lastError = tierErr;
        }
      }

      // If still no stream, try enumerateDevices to find physical back/front sensor directly
      if (!stream && typeof navigator !== 'undefined' && navigator?.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((d) => d.kind === 'videoinput');
          if (videoDevices.length > 0) {
            const match =
              videoDevices.find((d) =>
                facing === 'environment'
                  ? /back|rear|environment|world/i.test(d.label)
                  : /front|user|selfie|face/i.test(d.label)
              ) || videoDevices[0];
            stream = await getStream({
              video: {
                deviceId: { exact: match.deviceId },
                width: { ideal: isPortrait ? 1080 : 1920 },
                height: { ideal: isPortrait ? 1920 : 1080 },
              },
              audio: false,
            });
          }
        } catch (devErr) {
          lastError = devErr;
        }
      }

      if (!stream) {
        throw lastError || new Error('Could not access video stream.');
      }

      streamRef.current = stream;

      // Apply continuous autofocus, auto-exposure, and sharpness hardware track settings
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const caps: any = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
          const settings: any = typeof track.getSettings === 'function' ? track.getSettings() : {};

          // Detect hardware torch (flashlight)
          setHasTorch(Boolean(caps?.torch));

          // Calculate true resolution badge
          const w = settings.width || 0;
          const h = settings.height || 0;
          if (Math.max(w, h) >= 2560) {
            setCameraQualityBadge('✨ 4K Ultra HD');
          } else if (Math.max(w, h) >= 1920 || Math.min(w, h) >= 1080) {
            setCameraQualityBadge('✨ 1080p Full HD');
          } else if (Math.max(w, h) >= 1280 || Math.min(w, h) >= 720) {
            setCameraQualityBadge('✨ 720p HD');
          } else if (w > 0) {
            setCameraQualityBadge(`✨ ${w}×${h}`);
          } else {
            setCameraQualityBadge('✨ HD Stream');
          }

          const adv: any = {};
          if (caps?.focusMode && caps.focusMode.includes('continuous')) {
            adv.focusMode = 'continuous';
          }
          if (caps?.exposureMode && caps.exposureMode.includes('continuous')) {
            adv.exposureMode = 'continuous';
          }
          if (caps?.whiteBalanceMode && caps.whiteBalanceMode.includes('continuous')) {
            adv.whiteBalanceMode = 'continuous';
          }
          if (caps?.sharpness) {
            adv.sharpness = caps.sharpness.max || 100;
          }
          if (Object.keys(adv).length > 0) {
            track.applyConstraints({ advanced: [adv] } as any).catch(() => {});
          }
        } catch (trackErr) {
          console.warn('Track constraint enhancement caught:', trackErr);
        }
      }

      if (videoRef.current) {
        attachStreamToVideo(videoRef.current);
      }
    } catch (err: any) {
      console.warn('In-app camera stream failed:', err);
      const isPermissionDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        String(err?.message || '').toLowerCase().includes('denied') ||
        String(err?.message || '').toLowerCase().includes('permission');

      if (isPermissionDenied) {
        setCameraError(
          'Camera permission is required. Please tap the lock / permissions icon in your browser address bar to allow camera access.'
        );
      } else {
        setCameraError(
          'In-app camera stream could not be started directly in this browser window. You can select a photo from your gallery below without leaving the app.'
        );
      }
    } finally {
      setIsCameraStarting(false);
    }
  };

  // Sync stream to video element whenever camera modal opens or updates
  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current) {
      attachStreamToVideo(videoRef.current);
    }
  }, [isCameraOpen, isCameraStarting]);

  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    const nextTorch = !isTorchOn;
    try {
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.warn('Failed to toggle torch:', err);
    }
  };

  const updateCameraZoom = (val: number) => {
    const clamped = Math.max(1, Math.min(8, Number(val.toFixed(1))));
    setCameraZoom(clamped);

    // Apply hardware optical/sensor zoom if device stream supports it
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && typeof (track as any).getCapabilities === 'function') {
        try {
          const caps: any = (track as any).getCapabilities();
          if (caps?.zoom) {
            const minZ = caps.zoom.min || 1;
            const maxZ = caps.zoom.max || 8;
            const targetZ = Math.max(minZ, Math.min(maxZ, clamped));
            (track as any).applyConstraints({
              advanced: [{ zoom: targetZ }],
            }).catch(() => {});
          }
        } catch {}
      }
    }
  };

  const handlePinchTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = cameraZoom;
    }
  };

  const handlePinchTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = dist / pinchStartDistRef.current;
      updateCameraZoom(pinchStartZoomRef.current * scaleFactor);
    }
  };

  const handlePinchTouchEnd = () => {
    pinchStartDistRef.current = null;
  };

  const handleViewfinderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusTapCoord({ x, y });
    setTimeout(() => setFocusTapCoord(null), 1000);

    // Re-lock continuous autofocus
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && typeof (track as any).getCapabilities === 'function') {
        try {
          const caps = (track as any).getCapabilities();
          if (caps?.focusMode && caps.focusMode.includes('continuous')) {
            (track as any).applyConstraints({
              advanced: [{ focusMode: 'continuous' }],
            }).catch(() => {});
          }
        } catch {}
      }
    }

    // Double tap detected: toggle between 1x and 2x zoom
    const now = Date.now();
    if (now - lastTapTimeRef.current < 350) {
      updateCameraZoom(cameraZoom > 1.2 ? 1 : 2);
      lastTapTimeRef.current = 0;
    } else {
      lastTapTimeRef.current = now;
    }
  };

  const takeCameraSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // Trigger visual shutter flash
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 140);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High quality bicubic interpolation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Apply matching clarity filter to canvas
    if (clarityMode === 'hdr') {
      ctx.filter = 'contrast(106%) saturate(108%) brightness(102%)';
    } else if (clarityMode === 'document') {
      ctx.filter = 'contrast(125%) brightness(105%) saturate(90%)';
    } else if (clarityMode === 'lowlight') {
      ctx.filter = 'brightness(118%) contrast(102%) saturate(104%)';
    } else {
      ctx.filter = 'none';
    }

    // Mirror selfie mode if front-facing
    if (cameraFacingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    // High quality digital zoom crop matching the viewfinder precisely
    if (cameraZoom > 1) {
      const cropWidth = canvas.width / cameraZoom;
      const cropHeight = canvas.height / cameraZoom;
      const cropX = (canvas.width - cropWidth) / 2;
      const cropY = (canvas.height - cropHeight) / 2;
      ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    stopCameraStream();
    setCapturedPhoto(dataUrl);
    setCapturedCaption('');
  };

  const switchCameraFacing = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    setCameraZoom(1);
    startCameraStream(nextFacing);
  };

  const closeCameraModal = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCapturedPhoto(null);
    setCapturedCaption('');
    setCameraError(null);
    setCameraZoom(1);
  };

  const getDefaultPromptForRoom = (roomId: string) => {
    switch (roomId) {
      case 'einstein':
        return 'Please review and explain this homework / study material.';
      case 'godmode':
        return 'Please analyze this business concept / project diagram.';
      case 'buzz':
      default:
        return 'What do you think of this photo?';
    }
  };

  const openInAppCamera = (facing: 'environment' | 'user' = 'environment') => {
    setShowAttachmentMenu(false);
    startCameraStream(facing);
  };

  // Safe alias for phone camera: opens directly IN-APP so it NEVER takes the user out of the app!
  const openPhoneCamera = () => {
    openInAppCamera('environment');
  };

  const openPhotoGallery = () => {
    setShowAttachmentMenu(false);
    if (filePhotoRef.current) {
      filePhotoRef.current.value = '';
      filePhotoRef.current.click();
    }
  };

  const openDocumentPicker = () => {
    setShowAttachmentMenu(false);
    if (fileDocRef.current) {
      fileDocRef.current.value = '';
      fileDocRef.current.click();
    }
  };

  const inCameraFileRef = useRef<HTMLInputElement | null>(null);

  const handleInCameraFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedData = await compressImage(file);
      stopCameraStream();
      setCapturedPhoto(compressedData);
      setCapturedCaption('');
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          stopCameraStream();
          setCapturedPhoto(reader.result);
          setCapturedCaption('');
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleUploadCapturedPhoto = (customText?: string) => {
    if (!capturedPhoto) return;
    const captionText =
      (customText !== undefined ? customText : capturedCaption).trim() ||
      getDefaultPromptForRoom(room);
    const photoAttachment: ChatAttachment = {
      name: `camera-${Date.now()}.jpg`,
      type: 'image/jpeg',
      data: capturedPhoto,
      isImage: true,
      isText: false,
    };

    closeCameraModal();
    // Immediately upload and send directly into the chat!
    handleSendMessage(captionText, photoAttachment);
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // File selection handler: instantly compresses and uploads photos directly into the actual chat!
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAttachmentMenu(false);
    const isCameraInput = e.target === fileCameraRef.current;
    const isImage =
      file.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|gif|bmp|heic|svg)$/i.test(file.name) ||
      isCameraInput;

    const isText =
      file.type === 'text/plain' ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.json');

    if (isImage) {
      try {
        setIsLoading(true);
        const compressedData = await compressImage(file);
        const photoAttachment: ChatAttachment = {
          name: file.name || `photo-${Date.now()}.jpg`,
          type: 'image/jpeg',
          data: compressedData,
          isImage: true,
          isText: false,
        };

        // Determine prompt text: use whatever user already typed, or smart room default
        const promptText = inputText.trim() || getDefaultPromptForRoom(room);
        setInputText('');
        setAttachment(null);
        closeCameraModal();

        // Directly upload and send right into the actual chat!
        await handleSendMessage(promptText, photoAttachment);
      } catch (imgErr) {
        console.warn('Failed to compress/send image:', imgErr);
        setIsLoading(false);
      }
      e.target.value = '';
      return;
    }

    if (isText) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const textContent = event.target?.result as string;
        setAttachment({
          name: file.name,
          type: file.type || 'text/plain',
          data: textContent,
          isImage: false,
          isText: true,
          textContent: textContent,
        });
      };
      reader.readAsText(file);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachment({
        name: file.name,
        type: file.type || 'application/octet-stream',
        data: event.target?.result as string,
        isImage: false,
        isText: false,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Voice recognition and recording with Gemini audio transcription fallback
  const toggleListening = async () => {
    if (isListening) {
      // User tapped mic button to finish speaking
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== 'inactive') {
        setVoiceProcessing(true);
        try {
          rec.requestData();
        } catch (e) {}
        await new Promise<void>((resolve) => {
          rec.onstop = () => resolve();
          try {
            rec.stop();
          } catch (e) {
            resolve();
          }
        });
        try {
          rec.stream.getTracks().forEach((track) => track.stop());
        } catch (e) {}

        // If audio chunks were captured and input text is still empty, transcribe with Gemini
        if (audioChunksRef.current.length > 0) {
          try {
            const blob = new Blob(audioChunksRef.current, { type: rec.mimeType || 'audio/webm' });
            if (blob.size > 200) {
              const reader = new FileReader();
              reader.onloadend = async () => {
                const base64 = reader.result as string;
                if (base64) {
                  try {
                    const res = await fetch('/api/voice/transcribe', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        audioData: base64,
                        audioMimeType: rec.mimeType || 'audio/webm',
                      }),
                    });
                    const data = await res.json();
                    if (data?.transcript) {
                      setInputText((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
                    }
                  } catch (e) {
                    console.warn('Transcription error:', e);
                  }
                }
                setVoiceProcessing(false);
              };
              reader.readAsDataURL(blob);
              return;
            }
          } catch (blobErr) {
            console.warn('Audio blob error:', blobErr);
          }
        }
        setVoiceProcessing(false);
      }
      return;
    }

    // Starting recording
    audioChunksRef.current = [];
    setIsListening(true);
    let micStream: MediaStream | null = null;

    try {
      if (typeof navigator !== 'undefined' && navigator?.mediaDevices?.getUserMedia) {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        let chosenMime = '';
        for (const candidate of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
          if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate)) {
            chosenMime = candidate;
            break;
          }
        }

        const recorder = chosenMime ? new MediaRecorder(micStream, { mimeType: chosenMime }) : new MediaRecorder(micStream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.start(250);
      }
    } catch (micErr) {
      console.warn('getUserMedia mic access denied or unsupported:', micErr);
    }

    // Also run browser SpeechRecognition if available for live typing
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript + ' ';
          }
          const clean = transcript.trim();
          if (clean) {
            setInputText(clean);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition status:', e?.error);
        };

        recognition.onend = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            toggleListening();
          } else {
            setIsListening(false);
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('Speech recognition start failed:', err);
      }
    }
  };

  // Read aloud message
  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Copy message text safely without unhandled permission errors
  const handleCopy = async (id: string, text: string) => {
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

    // Fallback using textarea execCommand
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

  // Paste text into chat input
  const handlePasteToInput = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          setInputText((prev) => (prev ? `${prev} ${clipText}` : clipText));
          return;
        }
      }
    } catch (err) {
      console.warn('Clipboard readText permission denied or blocked:', err);
    }
  };

  // Save specific message as long-term persistent memory
  const handleSaveToMemory = async (msg: ChatMessage) => {
    try {
      const res = await fetch('/api/database/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: room === 'einstein' ? 'school' : room === 'godmode' ? 'goal' : 'personal',
          title: `${title} Insight`,
          content: msg.text,
          source: 'user',
        }),
      });

      if (res.ok) {
        setSavedMemoryId(msg.id);
        setTimeout(() => setSavedMemoryId(null), 2500);
      }
    } catch (err) {
      console.error('Failed saving message to memory', err);
    }
  };

  // Automatically format rough draft for college submission auditing 100% of Grayson's connected memory bank
  const handleAutoFormatForCollege = async (customText?: string) => {
    let textToFormat = (customText || inputText).trim();

    // If input box is empty, check if there is text on clipboard
    if (!textToFormat && typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      try {
        const clip = await navigator.clipboard.readText();
        if (clip && clip.trim().length > 3) {
          textToFormat = clip.trim();
        }
      } catch (e) {
        // clipboard permission blocked
      }
    }

    // If still empty, check the latest message from user in current chat history
    if (!textToFormat) {
      const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user' && m.text && m.text.length > 5);
      if (lastUserMsg) {
        textToFormat = lastUserMsg.text;
      }
    }

    if (!textToFormat) {
      setInputText('Format this college draft checking all my memories and writing rules: ');
      return;
    }

    setInputText('');
    const command = `[COLLEGE SUBMISSION FORMATTER - ACTIVE MEMORY AUDIT]:
Please format and polish this draft for my online college course submission.

MY ROUGH DRAFT / NOTES:
"${textToFormat}"

CRITICAL MEMORY AUDIT REQUIREMENTS (AUTOMATICALLY CHECK 100% OF CONNECTED MEMORIES):
- Automatically check ALL of my connected memories: my writing rules (10th-grade plain vocabulary, short sentences, explaining reasoning as you go, and authentic everyday phrases like "putting pen to paper" and "ins and outs").
- Incorporate my active coursework context (Empowered Learner habits of success, SMART goals, managing time, and effective communication).
- Clean paragraph organization with zero robotic AI fluff (banish words like "delve", "tapestry", "crucial beacon", "testament").
- Output:
  1. "### 📝 Submission-Ready College Draft" (ready to copy and paste directly into Canvas/Blackboard).
  2. "### 🛡️ Automatic Memory & Rubric Audit" (2-3 short bullets explaining how this hits the requirements while protecting my authentic voice).`;

    handleSendMessage(command);
  };

  // Quick Action 2: Audit Draft Against All Memories and Writing Rules
  const handleAuditAllMemories = async (customText?: string) => {
    let textToAudit = (customText || inputText).trim();

    if (!textToAudit && typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      try {
        const clip = await navigator.clipboard.readText();
        if (clip && clip.trim().length > 3) {
          textToAudit = clip.trim();
        }
      } catch (e) {}
    }

    if (!textToAudit) {
      const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user' && m.text && m.text.length > 5);
      if (lastUserMsg) {
        textToAudit = lastUserMsg.text;
      }
    }

    if (!textToAudit) {
      setInputText('Audit this assignment against all of my memories and writing rules: ');
      return;
    }

    setInputText('');
    const command = `[COMPREHENSIVE MEMORY & WRITING RULES AUDIT]:
Please audit this text against 100% of my connected memories, coursework rubrics, and writing rules:

DRAFT TO AUDIT:
"${textToAudit}"

AUDIT CRITERIA (CHECK ALL OF MY MEMORIES AUTOMATICALLY):
- Check my 8 writing rules (10th-grade vocabulary, short plain sentences, explain reasoning as you go, authentic phrases like "putting pen to paper", "ins and outs", zero AI slop).
- Check active coursework (Empowered Learner habits of success, SMART goals, managing schedule).
- Check academic context (algebra formatting, astrophysics interest, 32-year-old business degree student in Dallas).
- Provide:
  1. "### 🛡️ Memory & Writing Rules Audit" (detailed checklist of what passed and what needs adjustment).
  2. "### 💡 Suggested Polished Draft" (in my authentic voice, ready for college submission).`;

    handleSendMessage(command);
  };

  // Quick Action 3: Humanize Essay (Purge AI Fluff)
  const handleHumanizeDraft = async (customText?: string) => {
    let textToHumanize = (customText || inputText).trim();

    if (!textToHumanize && typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      try {
        const clip = await navigator.clipboard.readText();
        if (clip && clip.trim().length > 3) {
          textToHumanize = clip.trim();
        }
      } catch (e) {}
    }

    if (!textToHumanize) {
      const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user' && m.text && m.text.length > 5);
      if (lastUserMsg) {
        textToHumanize = lastUserMsg.text;
      }
    }

    if (!textToHumanize) {
      setInputText('Humanize this draft and remove all robotic AI fluff: ');
      return;
    }

    setInputText('');
    const command = `[HUMANIZE ESSAY - ZERO AI FLUFF]:
Please rewrite this draft into my authentic human voice, completely eliminating robotic AI buzzwords:

ORIGINAL TEXT:
"${textToHumanize}"

STRICT REQUIREMENTS (GOING OFF ALL MY CONNECTED MEMORIES):
- Banish all robotic AI words ("delve", "tapestry", "crucial beacon", "vital facet", "testament", "in conclusion", "furthermore", "paramount").
- Use short plain sentences with 10th-grade everyday vocabulary.
- Explain reasoning as you go, with natural phrasing ("putting pen to paper", "ins and outs", "big push to keep going").
- Clean paragraph spacing ready for college portal submission.
- Output:
  1. "### 📝 Humanized Submission Draft"
  2. "### 🛡️ Voice Audit" (Notes on how the robotic words were purged).`;

    handleSendMessage(command);
  };

  // Quick Action 4: Algebra & Exponents Solver / Formatter
  const handleAlgebraFormat = async (customText?: string) => {
    let mathText = (customText || inputText).trim();

    if (!mathText && typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      try {
        const clip = await navigator.clipboard.readText();
        if (clip && clip.trim().length > 1) {
          mathText = clip.trim();
        }
      } catch (e) {}
    }

    if (!mathText) {
      setInputText('Solve and format this algebra expression with negative exponents: ');
      return;
    }

    setInputText('');
    const command = `[ALGEBRA SUBMISSION & EXPONENTS SOLVER]:
Please solve, explain, and format this math problem step-by-step for my online college submission portal (checking my memory on negative exponents and algebraic expressions):

PROBLEM / EXPRESSION:
"${mathText}"

REQUIREMENTS:
- Step-by-step breakdown explaining the reasoning as you go.
- Clear formatting ready for online college math submission portals.
- Plain english breakdown so I master the concept.`;

    handleSendMessage(command);
  };

  // Quick Action 5: 2-Minute College Video Presentation Coach & Teleprompter Studio
  const handleVideoPresentationCoach = (customText?: string) => {
    setShowVideoStudioModal(true);
  };

  // Send message with optional text and attachment overrides (supports direct camera photo upload)
  const handleSendMessage = async (
    overrideText?: string,
    overrideAttachment?: ChatAttachment | null
  ) => {
    const textToSend = overrideText !== undefined ? overrideText : inputText;
    const attachmentToSend =
      overrideAttachment !== undefined ? overrideAttachment : attachment;
    const trimmed = textToSend.trim();
    if (!trimmed && !attachmentToSend) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      attachment: attachmentToSend ? { ...attachmentToSend } : null,
      timestamp: Date.now(),
    };

    const newMessages = dedupeChatList([...messages, userMessage]);
    lastSourceRef.current = 'local';
    setMessages(newMessages);
    setInputText('');
    setAttachment(null);
    setShowAttachmentMenu(false);
    setIsLoading(true);

    // Instantly persist and broadcast user's message so phone and laptop stay in sync in real time
    fetch(`/api/database/chat/${room}/append`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
    }).catch((e) => console.warn('Instant sync error:', e));

    try {
      const apiMessages = newMessages
        .filter((m) => m.id !== 'msg-init')
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          text: m.text,
          attachment: m.attachment,
        }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room,
          messages: apiMessages,
          userMessage,
          thinkingMode: isDeepThinking ? 'deep' : 'standard',
          webSearch: isWebSearchEnabled,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      if (data.intelligence) setIntelligence(data.intelligence);
      const replyText = data.text || "I'm right here with you. Let's keep working.";
      const groundingMetadata = data.grounding || null;

      lastSourceRef.current = 'server';

      if (Array.isArray(data.messages) && data.messages.length > 0) {
        const cleanServerList = dedupeChatList(data.messages);
        setMessages(cleanServerList);
        try {
          localStorage.setItem(`chat_history_${room}`, JSON.stringify(cleanServerList));
        } catch (e) {}
      } else {
        const aiMessage: ChatMessage = data.message || {
          id: `msg-${Date.now() + 1}`,
          sender: 'ai',
          text: replyText,
          timestamp: Date.now(),
          groundingMetadata,
          modelUsed: data.modelUsed,
        };

        setMessages((prev) => dedupeChatList([...prev, aiMessage]));
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const fallbackAiMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text:
          "I have your database memory loaded. I'm ready to answer anything you ask with real independent reasoning.",
        timestamp: Date.now(),
      };
      setMessages((prev) => dedupeChatList([...prev, fallbackAiMessage]));
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts =
    room === 'einstein'
      ? [
          '🎓 Format for College Submission',
          '📖 Empowered Learner Reflection',
          '✍️ Polish Draft (10th-Grade Voice)',
          '🔍 Research Academic Sources',
        ]
      : room === 'godmode'
        ? [
            'Texas business requirements & laws',
            'Break down the strategy and numbers',
            'Search market competitors & pricing',
            'Tech architecture & code review',
          ]
        : [
            'Search the internet for the latest news on this',
            'Research and find cool facts about this',
            'What are people saying online about this?',
            'Give me your honest thoughts on this',
          ];

  return (
    <div
      className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-[#121212] z-30"
      style={{
        backgroundImage: `url('${backgroundImage}')`,
        backgroundSize: bgSize,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Background tint overlay */}
      <div className="absolute inset-0 bg-[#0b071a]/70 pointer-events-none -z-10" />

      {/* Hidden File Inputs - styled offscreen so iOS Safari and Android won't block programmatic clicks */}
      <input
        ref={fileCameraRef}
        type="file"
        accept="image/*"
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }}
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFileChange}
      />
      <input
        ref={filePhotoRef}
        type="file"
        accept="image/*"
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }}
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFileChange}
      />
      <input
        ref={fileDocRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md,.json"
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }}
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFileChange}
      />

      {/* Header */}
      <header className="px-3 sm:px-5 py-2 sm:py-3 bg-[#0e0a1f] border-b border-cyan-500/20 shrink-0 z-10 shadow-lg">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <button
            onClick={onOpenSidebar}
            className="p-1.5 sm:p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center font-orbitron cursor-pointer shrink-0"
            title="Open Menu"
          >
            <Menu size={20} className="sm:w-[22px] sm:h-[22px]" />
          </button>

          <div className="text-center min-w-0 px-2 flex-1">
            <h2 className="font-orbitron text-sm sm:text-lg md:text-xl font-bold tracking-wider text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] truncate">
              {title}
            </h2>
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-0.5 text-[9px] sm:text-[10px] font-mono flex-wrap">
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                <Brain size={11} className="text-cyan-400" />
                <span>Level {intelligence?.level || 2}: {intelligence?.levelTitle || 'Memory Bank'}</span>
              </span>
              <span className="hidden xs:inline text-gray-500">•</span>
              <span className="text-amber-300 font-medium">
                Tone: "{intelligence?.currentTone?.mood || 'Determined & Focused'}"
              </span>
              <span className="hidden xs:inline text-gray-500">•</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]"></span>
                Gemini 3.1
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {room === 'einstein' && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAutoFormatForCollege()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-orbitron text-[10px] sm:text-xs text-amber-300 hover:text-white bg-gradient-to-r from-amber-500/25 to-fuchsia-500/25 hover:from-amber-500/40 hover:to-fuchsia-500/40 transition-all cursor-pointer border border-amber-400/40 shadow-sm shrink-0 active:scale-95"
                  title="Automatically format rough draft checking 100% of Grayson's memory bank"
                >
                  <GraduationCap size={13} className="text-amber-400" />
                  <span className="hidden xs:inline">Auto-Format</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEinsteinMemoryModal(true)}
                  className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-xl font-mono text-[10px] text-emerald-300 hover:text-white bg-emerald-950/50 hover:bg-emerald-900/70 transition-colors cursor-pointer border border-emerald-500/30 shrink-0"
                  title="View all memories and writing rules Einstein automatically checks"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                  <span>{einsteinMemories.length || 10} Memories</span>
                </button>
              </div>
            )}

            <button
              onClick={handleSyncVoiceTalks}
              disabled={isSyncingVoice}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl font-orbitron text-[10px] sm:text-xs text-cyan-300 hover:text-white bg-cyan-950/50 hover:bg-cyan-900/70 transition-colors cursor-pointer border border-cyan-500/30 shrink-0"
              title="Sync & import any voice discussions from Voice Vault into this chat box"
            >
              <RefreshCw size={12} className={isSyncingVoice ? 'animate-spin text-cyan-400' : ''} />
              <span className="hidden xs:inline">Sync Voice</span>
            </button>

            <button
              onClick={onBack}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl font-orbitron text-xs sm:text-sm text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/10 shrink-0"
            >
              <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden xs:inline">Back</span>
            </button>
          </div>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 min-h-0">
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-3">
        {dedupeChatList(messages).map((msg) => {
          const isAi = msg.sender === 'ai';
          const isMemorySaved = savedMemoryId === msg.id;
          const isVoiceMessage = Boolean(msg.isVoice || (msg.id && msg.id.includes('voice')));

          return (
            <div
              key={msg.id}
              className={`max-w-[90%] sm:max-w-[80%] md:max-w-[75%] rounded-2xl p-3 sm:p-3.5 md:p-4 text-xs sm:text-sm md:text-base font-mono leading-relaxed transition-all relative group select-text ${
                isAi
                  ? 'self-start bg-white/15 backdrop-blur-md border border-white/30 text-white shadow-lg'
                  : 'self-end bg-blue-600/75 backdrop-blur-md border border-blue-400/40 text-white shadow-xl'
              }`}
              style={{
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              {/* Spoken Voice Note Badge */}
              {isVoiceMessage && (
                <div className="flex items-center gap-1.5 text-[10px] font-orbitron text-cyan-300 mb-2 bg-black/40 px-2 py-0.5 rounded-md w-fit border border-cyan-500/30">
                  <Mic size={11} className="text-cyan-400 shrink-0" />
                  <span>Spoken Voice Note</span>
                  {msg.audioData && (
                    <button
                      onClick={() => handleSpeak(msg.text)}
                      className="ml-1 text-[9px] text-cyan-200 hover:text-white flex items-center gap-0.5 cursor-pointer underline"
                      title="Play Audio"
                    >
                      <Volume2 size={10} />
                      <span>Replay</span>
                    </button>
                  )}
                </div>
              )}
              {/* Attachment Display */}
              {msg.attachment && (
                <div className="mb-2.5 overflow-hidden rounded-xl">
                  {msg.attachment.isImage ? (
                    <div
                      className="relative group/img cursor-pointer inline-block"
                      onClick={() => setPreviewImage(msg.attachment?.data || null)}
                      title="Click to view full photo"
                    >
                      <img
                        src={msg.attachment.data}
                        alt={msg.attachment.name}
                        className="max-h-72 sm:max-h-80 rounded-xl object-contain bg-black/50 border border-white/20 transition-transform hover:scale-[1.01]"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-sm text-white/90 text-[10px] font-mono px-2 py-0.5 rounded-md opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center gap-1 border border-white/20">
                        <Maximize2 size={12} />
                        <span>View</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 bg-black/40 rounded-xl border border-white/20 text-xs">
                      <FileText size={18} className="text-cyan-400" />
                      <span className="truncate">{msg.attachment.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Message Text */}
              {msg.text && (
                <div className="whitespace-pre-wrap break-words select-text cursor-text">
                  {msg.text}
                </div>
              )}

              {/* Deep Research Footnote - DeepSeek Style (Unobtrusive & Collapsed by Default) */}
              {msg.groundingMetadata && (
                <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[10px] text-cyan-300 font-mono">
                      <Globe size={11} className="text-cyan-400 shrink-0" />
                      <span>Deep Web Research Informed</span>
                    </div>

                    {msg.groundingMetadata.sources && msg.groundingMetadata.sources.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleSources(msg.id)}
                        className="text-[10px] text-gray-400 hover:text-cyan-300 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 hover:border-cyan-500/40 transition-all cursor-pointer font-sans"
                        title="Toggle consulted web sources"
                      >
                        <span>{msg.groundingMetadata.sources.length} sources consulted</span>
                        {expandedSources[msg.id] ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </button>
                    )}
                  </div>

                  {/* Collapsed References Drawer: Only opens if user explicitly taps to view footnote links */}
                  {expandedSources[msg.id] && msg.groundingMetadata.sources && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5 animate-in fade-in duration-150">
                      {msg.groundingMetadata.sources.map((src, idx) => {
                        let domain = '';
                        try {
                          domain = new URL(src.url).hostname.replace(/^www\./, '');
                        } catch {
                          domain = 'Web';
                        }
                        return (
                          <a
                            key={idx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-black/60 hover:bg-cyan-950/60 border border-white/10 hover:border-cyan-400/40 rounded text-[9px] text-gray-300 hover:text-cyan-200 transition-colors"
                            title={src.title}
                          >
                            <ExternalLink size={9} className="text-cyan-400 shrink-0" />
                            <span className="truncate max-w-[160px] font-sans">{src.title}</span>
                            <span className="text-gray-500 font-mono shrink-0">[{domain}]</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Actions Footer */}
              <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-300">
                <span className="flex items-center gap-1.5">
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isAi && (
                    <span className="text-[9px] text-emerald-400 font-mono opacity-80">
                      • Gemini 3.1
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                  {!isAi && (
                    <button
                      onClick={() => {
                        setIsWebSearchEnabled(true);
                        handleSendMessage(`Research the internet and give me the verified facts on: "${msg.text}"`);
                      }}
                      className="p-1 hover:text-cyan-300 transition-colors flex items-center gap-1 text-[10px] text-gray-300 hover:bg-cyan-500/10 px-1.5 py-0.5 rounded cursor-pointer"
                      title="Research this question on the internet"
                    >
                      <Globe size={12} className="text-cyan-400" />
                      <span className="hidden xs:inline">Research</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleSaveToMemory(msg)}
                    className="p-1 hover:text-cyan-400 transition-colors flex items-center gap-1"
                    title="Save to Memory Bank"
                  >
                    {isMemorySaved ? (
                      <BookmarkCheck size={14} className="text-emerald-400" />
                    ) : (
                      <Brain size={14} className="text-gray-300 hover:text-cyan-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer border ${
                      copiedId === msg.id
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 font-bold shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                        : 'bg-white/10 hover:bg-white/20 border-white/15 text-gray-200 hover:text-white'
                    }`}
                    title="Copy this message to clipboard"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  {isAi && (
                    <button
                      onClick={() => handleSpeak(msg.text)}
                      className="p-1 hover:text-fuchsia-400 transition-colors"
                      title="Read aloud"
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Typing Indicator */}
        {isLoading && (
          <div className="self-start bg-white/15 backdrop-blur-md border border-white/30 text-white rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-mono flex items-center gap-2 shadow-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <span>
              {isWebSearchEnabled
                ? `${title} is searching the internet & synthesizing verified research...`
                : `${title} is thinking independently & formulating real answers...`}
            </span>
          </div>
        )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Chat Input Console */}
      <footer className="p-2 sm:p-3 md:p-5 shrink-0 z-20 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="relative max-w-3xl mx-auto bg-[#1e1e1e]/95 backdrop-blur-md border border-white/20 rounded-2xl sm:rounded-3xl p-2 sm:p-3 md:p-4 shadow-2xl">
          {/* Attachment Popup Menu */}
          {showAttachmentMenu && (
            <div className="absolute bottom-16 sm:bottom-20 left-2 sm:left-4 bg-gray-800/95 border border-fuchsia-500/40 rounded-2xl p-1.5 sm:p-2 shadow-2xl flex flex-col gap-1 z-30 min-w-48 sm:min-w-56 backdrop-blur-md">
              <button
                type="button"
                onClick={() => openInAppCamera('environment')}
                className="flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-orbitron text-white rounded-xl hover:bg-white/15 transition-all text-left cursor-pointer active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Camera size={16} />
                </div>
                <div>
                  <div className="font-semibold text-white">In-App Camera</div>
                  <div className="text-[10px] text-gray-300 font-sans">Snap photo inside app</div>
                </div>
              </button>
              <button
                type="button"
                onClick={openPhotoGallery}
                className="flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-orbitron text-white rounded-xl hover:bg-white/15 transition-all text-left cursor-pointer active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
                  <ImageIcon size={16} />
                </div>
                <div>
                  <div className="font-semibold text-white">Photo Gallery</div>
                  <div className="text-[10px] text-gray-300 font-sans">Choose from library</div>
                </div>
              </button>
              <button
                type="button"
                onClick={openDocumentPicker}
                className="flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-orbitron text-white rounded-xl hover:bg-white/15 transition-all text-left cursor-pointer active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <FileText size={16} />
                </div>
                <div>
                  <div className="font-semibold text-white">Document</div>
                  <div className="text-[10px] text-gray-300 font-sans">PDF, doc, notes</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsWebSearchEnabled(true);
                  setShowAttachmentMenu(false);
                  if (!inputText.trim()) {
                    setInputText('Research: ');
                  }
                }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-orbitron text-white rounded-xl hover:bg-white/15 transition-all text-left cursor-pointer active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Globe size={16} />
                </div>
                <div>
                  <div className="font-semibold text-white">Internet Research</div>
                  <div className="text-[10px] text-gray-300 font-sans">Search online for facts & news</div>
                </div>
              </button>
            </div>
          )}

          {/* Attachment Preview Chip */}
          {attachment && (
            <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-gray-800/80 rounded-xl border border-white/20 text-xs text-gray-200 w-fit max-w-full">
              {attachment.isImage ? (
                <img
                  src={attachment.data}
                  alt={attachment.name}
                  className="w-7 h-7 rounded object-cover cursor-pointer"
                  onClick={() => setPreviewImage(attachment.data)}
                />
              ) : (
                <FileText size={18} className="text-cyan-400 shrink-0" />
              )}
              <span className="truncate max-w-[200px]">{attachment.name}</span>
              <button
                onClick={() => setAttachment(null)}
                className="p-1 rounded-full text-red-400 hover:text-red-300 hover:bg-white/10"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {/* Input Row */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Ask ${title} anything...`}
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400 text-xs sm:text-sm md:text-base px-1 sm:px-2 py-0.5 sm:py-1 font-sans select-text"
            />
            {/* Quick Paste Button */}
            <button
              type="button"
              onClick={handlePasteToInput}
              className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-gray-200 hover:text-cyan-300 text-xs font-mono flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-sm"
              title="Paste text from clipboard"
            >
              <ClipboardPaste size={14} className="text-cyan-400" />
              <span className="hidden xs:inline">Paste</span>
            </button>
          </div>

          {/* Bottom Icons Row */}
          <div className="flex items-center justify-between pt-1.5 sm:pt-2 mt-1 border-t border-white/10 flex-wrap gap-y-1.5">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowAttachmentMenu((prev) => !prev)}
                className={`w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                  showAttachmentMenu
                    ? 'bg-fuchsia-500/30 text-fuchsia-400'
                    : 'text-white hover:bg-white/10'
                }`}
                title="Add attachment"
              >
                <Plus size={16} className="sm:w-5 sm:h-5" />
              </button>

              {/* Web Research Toggle Button */}
              <button
                type="button"
                onClick={() => setIsWebSearchEnabled((prev) => !prev)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-orbitron flex items-center gap-1 transition-all cursor-pointer border shrink-0 ${
                  isWebSearchEnabled
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.45)]'
                    : 'bg-white/5 border-white/15 text-gray-400 hover:text-gray-200'
                }`}
                title={
                  isWebSearchEnabled
                    ? 'Live Web Research Active: Searches the internet for facts & news'
                    : 'Click to enable Live Web Research'
                }
              >
                <Globe size={11} className={isWebSearchEnabled ? 'text-cyan-400 animate-spin-slow' : 'text-gray-400'} />
                <span>
                  {isWebSearchEnabled ? 'Web: ON' : 'Web'}
                </span>
              </button>

              {/* Autonomous Thinking Toggle Button */}
              <button
                type="button"
                onClick={() => setIsDeepThinking((prev) => !prev)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-orbitron flex items-center gap-1 transition-all cursor-pointer border shrink-0 ${
                  isDeepThinking
                    ? 'bg-fuchsia-950/60 border-fuchsia-400 text-fuchsia-300 shadow-[0_0_10px_rgba(217,70,239,0.4)]'
                    : 'bg-white/5 border-white/15 text-gray-400 hover:text-gray-200'
                }`}
                title={
                  isDeepThinking
                    ? 'Gemini 3.1 Deep Thinking Active: Maximum 2048 Reasoning Tokens'
                    : 'Gemini 3.1 Fast Reasoning Active: 1024 Reasoning Tokens'
                }
              >
                <Brain size={11} className={isDeepThinking ? 'text-fuchsia-400' : 'text-gray-400'} />
                <span>
                  {isDeepThinking ? 'Deep (2048)' : 'Fast (1024)'}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
              <button
                type="button"
                onClick={toggleListening}
                disabled={voiceProcessing}
                className={`p-1.5 sm:p-2 rounded-full transition-all cursor-pointer ${
                  isListening
                    ? 'text-fuchsia-400 animate-mic-pulse bg-fuchsia-500/20'
                    : voiceProcessing
                      ? 'text-cyan-400 bg-cyan-500/20'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
                title={voiceProcessing ? 'Transcribing voice...' : isListening ? 'Listening (tap to stop)...' : 'Voice Input'}
              >
                {voiceProcessing ? (
                  <Loader2 size={16} className="sm:w-5 sm:h-5 animate-spin text-cyan-400" />
                ) : (
                  <Mic size={16} className="sm:w-5 sm:h-5" />
                )}
              </button>

              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || (!inputText.trim() && !attachment)}
                className={`w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                  inputText.trim() || attachment
                    ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:opacity-90 active:scale-95'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                }`}
                title="Send Message"
              >
                <Send size={14} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Full-Screen In-App Camera Viewfinder & Photo Capture */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-150">
          {capturedPhoto ? (
            /* Review & Upload Mode - Full View */
            <div className="relative w-full h-full flex flex-col justify-between bg-[#121214] p-3 sm:p-5">
              {/* Top Bar */}
              <div className="flex items-center justify-between z-10 pt-[max(0.5rem,env(safe-area-inset-top))]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Camera size={16} />
                  </div>
                  <div>
                    <h3 className="font-orbitron font-semibold text-white text-sm sm:text-base">
                      Photo Captured
                    </h3>
                    <p className="text-[11px] text-gray-400 font-sans">
                      Sending directly to <span className="text-cyan-300 font-medium">{title}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeCameraModal}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer"
                  title="Close Camera"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Full Image Preview */}
              <div className="flex-1 my-2 relative rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-white/10 min-h-0">
                <img
                  src={capturedPhoto}
                  alt="Captured snapshot"
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-md text-cyan-300 text-[10px] font-mono px-2.5 py-1 rounded-full border border-cyan-500/30 shadow-lg">
                  {cameraZoom > 1 ? `${cameraZoom}x Zoom Photo` : 'High Definition Photo'}
                </div>
              </div>

              {/* Bottom Actions Container */}
              <div className="flex flex-col gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {/* Quick Action Suggestion Chips */}
                <div className="w-full flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {(room === 'einstein'
                    ? [
                        'Review & explain this homework',
                        'Check my answers on this page',
                        'Solve/break down this problem',
                        'Summarize these study notes',
                      ]
                    : room === 'godmode'
                      ? [
                          'Analyze this business concept',
                          'Audit this code/diagram',
                          'Identify revenue opportunities',
                          'Breakdown execution steps',
                        ]
                      : [
                          'What do you think of this?',
                          'Check this out!',
                          'Can you read/transcribe this?',
                          'Give me your honest thoughts',
                        ]
                  ).map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleUploadCapturedPhoto(chip)}
                      className="text-[10px] sm:text-[11px] whitespace-nowrap px-2.5 py-1 bg-white/5 hover:bg-white/15 border border-cyan-500/30 hover:border-cyan-400 rounded-full text-gray-200 transition-all cursor-pointer font-sans shrink-0 active:scale-95"
                    >
                      "{chip}"
                    </button>
                  ))}
                </div>

                {/* Optional Caption Input */}
                <div className="w-full relative">
                  <input
                    type="text"
                    value={capturedCaption}
                    onChange={(e) => setCapturedCaption(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUploadCapturedPhoto();
                      }
                    }}
                    placeholder={`Ask ${title} a question about this picture...`}
                    className="w-full bg-white/10 border border-white/20 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-400 outline-none font-sans"
                  />
                </div>

                {/* Primary Action Buttons */}
                <div className="w-full flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setCapturedPhoto(null);
                      startCameraStream();
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 font-orbitron text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <RefreshCw size={15} />
                    <span>Retake</span>
                  </button>

                  <button
                    onClick={() => handleUploadCapturedPhoto()}
                    className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-fuchsia-500 hover:opacity-95 text-white font-orbitron font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.45)] cursor-pointer active:scale-95"
                  >
                    <Upload size={16} />
                    <span>Upload to Chat</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Live Camera Feed & Viewfinder - Whole Screen Immersive View */
            <div
              className="relative w-full h-full flex flex-col justify-between bg-black overflow-hidden"
              onTouchStart={handlePinchTouchStart}
              onTouchMove={handlePinchTouchMove}
              onTouchEnd={handlePinchTouchEnd}
            >
              {/* Hidden In-Camera File Input: lets users select photo directly inside the camera modal without leaving app */}
              <input
                ref={inCameraFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleInCameraFileSelect}
              />

              {/* Full Camera Video Layer */}
              <div
                className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center bg-black cursor-pointer select-none"
                onClick={handleViewfinderClick}
              >
                {/* Screen Ring Light / Fill Light for low light or selfies */}
                {isRingLightOn && (
                  <div className="absolute inset-0 pointer-events-none z-30 border-[12px] sm:border-[22px] border-white/95 shadow-[inset_0_0_80px_25px_rgba(255,255,255,0.9)] animate-pulse" />
                )}

                {/* Tap-to-Focus Reticle */}
                {focusTapCoord && (
                  <div
                    className="absolute pointer-events-none w-14 h-14 border-2 border-cyan-400 rounded-full -translate-x-1/2 -translate-y-1/2 animate-ping z-40 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.9)]"
                    style={{ left: focusTapCoord.x, top: focusTapCoord.y }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-300" />
                  </div>
                )}

                {cameraError ? (
                  <div className="w-full max-w-sm py-8 px-5 text-center flex flex-col items-center gap-3 bg-red-950/40 border border-red-500/30 rounded-2xl mx-4 z-40">
                    <Camera size={36} className="text-red-400 animate-pulse" />
                    <p className="text-xs sm:text-sm text-gray-200 font-sans">
                      {cameraError}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => startCameraStream('environment')}
                        className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-orbitron font-medium cursor-pointer transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <RefreshCw size={13} />
                        <span>Retry Rear Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => startCameraStream('user')}
                        className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-orbitron font-medium cursor-pointer transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <SwitchCamera size={13} />
                        <span>Try Front Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => inCameraFileRef.current?.click()}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white rounded-xl text-xs font-orbitron font-medium cursor-pointer shadow-lg active:scale-95 flex items-center gap-1.5"
                      >
                        <ImageIcon size={14} />
                        <span>Select Photo In-App</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      ref={attachStreamToVideo}
                      autoPlay
                      playsInline
                      muted
                      // @ts-ignore
                      webkit-playsinline="true"
                      x5-playsinline="true"
                      disablePictureInPicture
                      className={`w-full h-full transition-all duration-150 ${
                        cameraViewMode === 'whole' ? 'object-contain' : 'object-cover'
                      }`}
                      style={{
                        filter:
                          clarityMode === 'hdr'
                            ? 'contrast(106%) saturate(108%) brightness(102%)'
                            : clarityMode === 'document'
                            ? 'contrast(125%) brightness(105%) saturate(90%)'
                            : clarityMode === 'lowlight'
                            ? 'brightness(118%) contrast(102%) saturate(104%)'
                            : 'none',
                        transform: `${cameraFacingMode === 'user' ? 'scaleX(-1) ' : ''}scale(${cameraZoom})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.08s ease-out, filter 0.2s ease',
                      }}
                    />

                    {/* Visual Shutter Flash Effect */}
                    {isShutterFlashing && (
                      <div className="absolute inset-0 bg-white z-40 pointer-events-none animate-in fade-in duration-75" />
                    )}

                    {/* Viewfinder Target Framing Overlay */}
                    <div className="absolute inset-4 sm:inset-10 pointer-events-none border border-white/15 rounded-2xl flex items-center justify-center">
                      <div className="w-10 sm:w-16 h-10 sm:h-16 border-t-2 border-l-2 border-cyan-400 absolute top-2 left-2 rounded-tl-lg" />
                      <div className="w-10 sm:w-16 h-10 sm:h-16 border-t-2 border-r-2 border-cyan-400 absolute top-2 right-2 rounded-tr-lg" />
                      <div className="w-10 sm:w-16 h-10 sm:h-16 border-b-2 border-l-2 border-cyan-400 absolute bottom-2 left-2 rounded-bl-lg" />
                      <div className="w-10 sm:w-16 h-10 sm:h-16 border-b-2 border-r-2 border-cyan-400 absolute bottom-2 right-2 rounded-br-lg" />
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400/80 animate-ping" />
                    </div>

                    {/* Floating Double Tap & Zoom Reset Hint */}
                    {cameraZoom > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCameraZoom(1);
                        }}
                        className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/75 backdrop-blur-md rounded-full border border-cyan-400 text-[11px] font-mono text-cyan-300 shadow-xl cursor-pointer hover:bg-black flex items-center gap-1.5 active:scale-95 z-30"
                        title="Click to reset zoom to 1x"
                      >
                        <ZoomOut size={12} className="text-cyan-400" />
                        <span>{cameraZoom.toFixed(1)}x Zoom (Tap to Reset)</span>
                      </button>
                    )}

                    {isCameraStarting && (
                      <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center gap-2.5 text-cyan-300 font-orbitron text-xs sm:text-sm">
                        <Loader2 size={24} className="animate-spin text-cyan-400" />
                        <span>Optimizing HD camera feed...</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Floating Top Bar Overlay */}
              <div className="relative z-30 w-full pt-[max(0.75rem,env(safe-area-inset-top))] px-3 sm:px-4 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/50 to-transparent pb-6 gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={closeCameraModal}
                  className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/90 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
                  title="Close Camera"
                >
                  <X size={20} />
                </button>

                {/* Center Badges: Resolution + View Mode */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Live Quality Badge */}
                  <div className="px-2.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-cyan-400/40 text-[11px] font-orbitron text-cyan-300 flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold">{cameraQualityBadge}</span>
                  </div>

                  {/* View Mode Toggle: Whole Camera View vs Fill Screen */}
                  <button
                    type="button"
                    onClick={() => setCameraViewMode((prev) => (prev === 'whole' ? 'fill' : 'whole'))}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-orbitron flex items-center gap-1.5 backdrop-blur-md border transition-all cursor-pointer shadow-lg active:scale-95 ${
                      cameraViewMode === 'whole'
                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.45)] font-semibold'
                        : 'bg-black/60 border-white/20 text-gray-300 hover:text-white'
                    }`}
                    title={
                      cameraViewMode === 'whole'
                        ? 'Current: Whole Camera View (100% Uncropped). Tap to switch to Fill Screen.'
                        : 'Current: Fill Screen. Tap to switch to Whole Camera View (100% Uncropped).'
                    }
                  >
                    {cameraViewMode === 'whole' ? (
                      <>
                        <Maximize2 size={13} className="text-cyan-400" />
                        <span className="hidden xs:inline">Whole View</span>
                      </>
                    ) : (
                      <>
                        <Minimize2 size={13} className="text-gray-300" />
                        <span className="hidden xs:inline">Fill Screen</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right Quick Controls: Torch (Flashlight), Ring Light, Flip Camera */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Torch / Flashlight Button (if hardware torch is supported) */}
                  {hasTorch && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 ${
                        isTorchOn
                          ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.9)] font-bold'
                          : 'bg-black/60 border-white/20 text-yellow-300 hover:text-white hover:bg-black/90'
                      }`}
                      title={isTorchOn ? 'Turn Off Flashlight (Torch)' : 'Turn On Flashlight (Torch)'}
                    >
                      <Flashlight size={18} />
                    </button>
                  )}

                  {/* Ring Light / Screen Fill Light Button */}
                  <button
                    type="button"
                    onClick={() => setIsRingLightOn((prev) => !prev)}
                    className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 ${
                      isRingLightOn
                        ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.9)]'
                        : 'bg-black/60 border-white/20 text-gray-300 hover:text-white hover:bg-black/90'
                    }`}
                    title={isRingLightOn ? 'Turn Off Ring Light (Screen Flash)' : 'Turn On Ring Light (Screen Flash)'}
                  >
                    <Sun size={18} />
                  </button>

                  {/* Flip Front/Back Camera */}
                  <button
                    type="button"
                    onClick={switchCameraFacing}
                    disabled={isCameraStarting || !!cameraError}
                    className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-cyan-400 hover:text-white hover:bg-black/90 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-40"
                    title="Flip Camera (Front/Rear)"
                  >
                    <SwitchCamera size={19} />
                  </button>
                </div>
              </div>

              {/* Middle Viewfinder & Zoom Controls */}
              <div className="relative z-30 w-full flex flex-col items-center justify-end pb-2 px-4 gap-2 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-6">
                {!cameraError && (
                  <div className="flex flex-col items-center gap-2 w-full max-w-sm">
                    {/* Clarity Enhancement Mode Selector */}
                    <div className="flex items-center justify-center gap-1 bg-black/70 backdrop-blur-md p-1 rounded-full border border-white/20 shadow-xl overflow-x-auto no-scrollbar max-w-full">
                      <button
                        type="button"
                        onClick={() => setClarityMode('hdr')}
                        className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-orbitron transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap active:scale-95 ${
                          clarityMode === 'hdr'
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        title="Studio HDR: Enhanced micro-contrast & edge sharpness"
                      >
                        <Sparkles size={11} className={clarityMode === 'hdr' ? 'text-yellow-300' : ''} />
                        <span>Studio HDR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setClarityMode('document')}
                        className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-orbitron transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap active:scale-95 ${
                          clarityMode === 'document'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold shadow-[0_0_12px_rgba(217,70,239,0.6)]'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        title="Document Mode: High contrast for crisp reading of homework, books & diagrams"
                      >
                        <FileText size={11} />
                        <span>Document</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setClarityMode('lowlight')}
                        className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-orbitron transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap active:scale-95 ${
                          clarityMode === 'lowlight'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        title="Night Boost: Elevates dark areas & reduces shadow grain"
                      >
                        <Moon size={11} />
                        <span>Night Boost</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setClarityMode('natural')}
                        className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-orbitron transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap active:scale-95 ${
                          clarityMode === 'natural'
                            ? 'bg-white/25 text-white font-bold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        title="Natural: Raw unedited camera sensor feed"
                      >
                        <span>Natural</span>
                      </button>
                    </div>

                    {/* Preset Zoom Pills: 1x, 1.5x, 2x, 3x, 5x, 8x */}
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 sm:py-1.5 rounded-full border border-white/20 shadow-xl overflow-x-auto no-scrollbar">
                      {[1, 1.5, 2, 3, 5, 8].map((z) => (
                        <button
                          key={z}
                          type="button"
                          onClick={() => updateCameraZoom(z)}
                          className={`min-w-8 h-7 sm:min-w-9 sm:h-7.5 px-2 rounded-full text-[11px] sm:text-xs font-orbitron font-semibold transition-all cursor-pointer flex items-center justify-center active:scale-90 ${
                            Math.abs(cameraZoom - z) < 0.15
                              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.6)] font-bold scale-105'
                              : 'text-gray-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {z}x
                        </button>
                      ))}
                    </div>

                    {/* Fine Zoom Slider with Tactile Steppers */}
                    <div className="w-full flex items-center gap-2.5 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg">
                      <button
                        type="button"
                        onClick={() => updateCameraZoom(cameraZoom - 0.2)}
                        className="text-gray-300 hover:text-cyan-300 p-1 cursor-pointer active:scale-90 transition-all"
                        title="Zoom Out (-)"
                      >
                        <ZoomOut size={16} />
                      </button>

                      <input
                        type="range"
                        min="1"
                        max="8"
                        step="0.1"
                        value={cameraZoom}
                        onChange={(e) => updateCameraZoom(parseFloat(e.target.value))}
                        className="flex-1 accent-cyan-400 cursor-pointer h-1.5 rounded-lg bg-white/20"
                        title="Camera Zoom Level"
                      />

                      <button
                        type="button"
                        onClick={() => updateCameraZoom(cameraZoom + 0.2)}
                        className="text-gray-300 hover:text-cyan-300 p-1 cursor-pointer active:scale-90 transition-all"
                        title="Zoom In (+)"
                      >
                        <ZoomIn size={16} />
                      </button>

                      <span className="text-[11px] font-mono text-cyan-300 min-w-10 text-right font-bold">
                        {cameraZoom.toFixed(1)}x
                      </span>
                    </div>
                  </div>
                )}

                {/* Bottom Camera Action Bar */}
                <div className="w-full max-w-sm flex items-center justify-between pt-1.5 pb-[max(1rem,env(safe-area-inset-bottom))] px-6">
                  {/* In-App Gallery / Photo Picker (Stays in App) */}
                  <button
                    type="button"
                    onClick={() => inCameraFileRef.current?.click()}
                    className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 flex flex-col items-center justify-center text-cyan-300 hover:text-white transition-all cursor-pointer shadow-lg active:scale-90"
                    title="Select Photo Inside App"
                  >
                    <ImageIcon size={20} />
                  </button>

                  {/* High-Visibility Circular Shutter Button */}
                  <button
                    type="button"
                    onClick={takeCameraSnapshot}
                    disabled={isCameraStarting || !!cameraError}
                    className="w-20 h-20 rounded-full p-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.7)] hover:scale-105 active:scale-90 transition-all cursor-pointer disabled:opacity-40"
                    title="Take Photo"
                  >
                    <div className="w-full h-full rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-colors">
                      <div className="w-14 h-14 rounded-full border-2 border-black/30 flex items-center justify-center">
                        <Camera size={26} className="text-gray-950" />
                      </div>
                    </div>
                  </button>

                  {/* Flip Front/Back Camera */}
                  <button
                    type="button"
                    onClick={switchCameraFacing}
                    disabled={isCameraStarting || !!cameraError}
                    className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 flex flex-col items-center justify-center text-cyan-400 hover:text-cyan-300 transition-all cursor-pointer shadow-lg active:scale-90 disabled:opacity-40"
                    title="Switch Camera (Front/Rear)"
                  >
                    <SwitchCamera size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Einstein Connected Memory Bank Modal */}
      {showEinsteinMemoryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-[#120d24] border border-amber-500/40 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-[0_0_35px_rgba(245,158,11,0.25)] overflow-hidden">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Brain size={20} />
                </div>
                <div>
                  <h3 className="font-orbitron font-bold text-sm sm:text-base text-white flex items-center gap-2">
                    <span>Einstein's Connected Memory Bank</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] text-emerald-300 font-mono">
                      Auto-Auditing Active
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-300 font-sans">
                    Einstein automatically checks and builds off of all {einsteinMemories.length || 10} connected memories & writing rules on every message.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEinsteinMemoryModal(false)}
                className="p-1.5 sm:p-2 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-white/10 px-4 pt-2 bg-black/20 gap-2">
              <button
                type="button"
                onClick={() => setEinsteinMemoryTab('memories')}
                className={`pb-2 px-3 text-xs font-orbitron font-semibold transition-all border-b-2 cursor-pointer ${
                  einsteinMemoryTab === 'memories'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                School & Coursework Memories ({einsteinMemories.length || 10})
              </button>
              <button
                type="button"
                onClick={() => setEinsteinMemoryTab('rules')}
                className={`pb-2 px-3 text-xs font-orbitron font-semibold transition-all border-b-2 cursor-pointer ${
                  einsteinMemoryTab === 'rules'
                    ? 'border-fuchsia-400 text-fuchsia-300'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Grayson's Writing Rules ({einsteinWritingRules.length || 8})
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col gap-2.5">
              {einsteinMemoryTab === 'memories' ? (
                <>
                  {(einsteinMemories.length > 0 ? einsteinMemories : [
                    { id: 'm1', category: 'school', title: 'Algebraic Proficiency', content: 'Grayson is currently working on algebraic expressions involving exponents and requires assistance with formatting answers for an online submission system.' },
                    { id: 'm2', category: 'school', title: 'Algebra Assignment', content: 'Grayson is currently working on an assignment involving the simplification of algebraic expressions with negative exponents.' },
                    { id: 'm3', category: 'school', title: 'Active Courses & Assignments', content: 'Enrolled in Empowered Learner (Habits of Success, SMART goals, coping with overwhelming schedules) and Effective Communication Skills.' },
                    { id: 'm4', category: 'school', title: 'Writing Style & Grammar Rules', content: 'Writing style: 10th-grade vocabulary, short plain sentences, explain reasoning as you go, keep natural phrases like "putting pen to paper" and "ins and outs".' },
                    { id: 'm5', category: 'school', title: 'Academic Interest in Astrophysics', content: 'Grayson is currently enrolled in college coursework and has an active academic interest in black holes and gravitational waves.' },
                    { id: 'm6', category: 'school', title: 'Paper Writing', content: 'Grayson is currently working on writing a paper.' },
                    { id: 'm7', category: 'identity', title: 'Grayson Profile & Background', content: '32-year-old from Dallas, Texas. Balancing online college courses with life grind. Family-oriented. Working every single day to break generational cycles.' },
                    { id: 'm8', category: 'goal', title: 'Wealth Creation & Degree', content: 'Grayson is actively focused on achieving long-term generational wealth through his current academic and professional efforts.' }
                  ]).map((m: any, idx: number) => (
                    <div
                      key={m.id || idx}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/40 transition-colors flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {m.category || 'School'}
                          </span>
                          <span className="font-orbitron font-semibold text-xs sm:text-sm text-white">
                            {m.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 shrink-0">
                          <Check size={11} />
                          <span>Auto-Checked</span>
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 font-sans leading-relaxed select-text">
                        {m.content}
                      </p>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="p-2.5 rounded-xl bg-fuchsia-950/30 border border-fuchsia-500/30 text-xs text-fuchsia-200">
                    These writing rules protect Grayson's real human voice. Einstein automatically enforces every rule without generic AI rewriting.
                  </div>
                  {(einsteinWritingRules.length > 0 ? einsteinWritingRules : [
                    'Short, plain sentences',
                    'Explain reasoning as you go',
                    'Use everyday phrasing: "ins and outs", "putting pen to paper", "big push to keep going"',
                    '10th-grade vocabulary level',
                    'Fix grammar and organize into clean paragraphs without erasing natural voice',
                    'Include real personal details without forcing them',
                    'Never sugarcoat, always tell the truth',
                    'Use \'overstood\' as Grayson\'s slang meaning \'okay, alright, I get it\'—use naturally when fitting, not in every reference, and never with asterisks'
                  ]).map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5 text-xs text-gray-200"
                    >
                      <span className="w-5 h-5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 flex items-center justify-center font-mono text-[10px] shrink-0 font-bold">
                        {idx + 1}
                      </span>
                      <span className="flex-1 font-sans select-text">{rule}</span>
                      <span className="text-[10px] text-emerald-400 font-mono shrink-0">Enforced</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-3 sm:p-4 border-t border-white/10 bg-black/40 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] text-gray-400 font-mono">
                Memory Connected • All items automatically checked
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEinsteinMemoryModal(false);
                    handleAutoFormatForCollege();
                  }}
                  className="px-3 py-1.5 rounded-xl font-orbitron text-xs font-bold bg-gradient-to-r from-amber-500 to-fuchsia-500 text-white hover:opacity-90 transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <GraduationCap size={14} />
                  <span>Format Draft with All Memory</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Full Size Lightbox Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            title="Close Preview"
          >
            <X size={24} />
          </button>
          <img
            src={previewImage}
            alt="Full size view"
            className="max-w-full max-h-[88vh] object-contain rounded-xl shadow-2xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 2-Minute College Video Presentation & Teleprompter Studio Modal */}
      <VideoPresentationStudio
        isOpen={showVideoStudioModal}
        onClose={() => setShowVideoStudioModal(false)}
        onSendToEinstein={(scriptText) => {
          setShowVideoStudioModal(false);
          handleSendMessage(
            `[2-MINUTE VIDEO PRESENTATION SPEECH]:\nPlease review and audit this 2-minute spoken script against my college coursework rubric and writing rules:\n\n"${scriptText}"`
          );
        }}
      />
    </div>
  );
};
