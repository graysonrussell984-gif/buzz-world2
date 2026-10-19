import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Camera,
  CameraOff,
  Copy,
  Check,
  Sparkles,
  GraduationCap,
  Clapperboard,
  Timer,
  Sliders,
  Type,
  ShieldCheck,
  Briefcase,
  X,
  Volume2,
  VolumeX,
  Download,
  Share2,
  Film,
  Video,
  VideoOff,
  Trash2,
  SwitchCamera,
  FileVideo,
  Layers,
  Eye,
  CheckCircle2,
  BookOpen,
  Edit3,
  Save,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface VideoPresentationStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToEinstein?: (scriptText: string) => void;
  onSaveToProjects?: (scriptTitle: string) => void;
}

interface ScriptPreset {
  id: string;
  title: string;
  course: string;
  durationEst: string;
  targetMins: number;
  wordCount: number;
  sections: {
    timestamp: string;
    label: string;
    speakerNotes: string;
    text: string;
  }[];
}

interface RecordedVideoTake {
  id: string;
  url: string;
  blob: Blob;
  durationSeconds: number;
  timestamp: number;
  title: string;
  sizeBytes: number;
  mimeType: string;
}

const DEFAULT_PRESETS: ScriptPreset[] = [
  // 5-MINUTE PRESENTATIONS (Default)
  {
    id: 'college-success-5min',
    title: 'College Success: Time Management, Degree Goals & Generational Purpose (5-Min)',
    course: 'General College Coursework (Any Course)',
    durationEst: '4m 58s (628 words)',
    targetMins: 5,
    wordCount: 628,
    sections: [
      {
        timestamp: '0:00 - 0:45',
        label: 'Hook & Introduction',
        speakerNotes: 'Look straight at camera. Natural posture. Warm, confident greeting.',
        text: "Hello everyone, my name is Grayson Russell. I am thirty-two years old, living right here in Dallas, Texas. Balancing adult responsibilities with an online college degree is a serious commitment, but it has taught me one undeniable truth: time management is not about doing a hundred things at once. It is about protecting what matters most and aligning your daily actions with your purpose.",
      },
      {
        timestamp: '0:45 - 2:00',
        label: 'Core Strategy & Habits of Success',
        speakerNotes: 'Steady cadence. Explain reasoning clearly step-by-step.',
        text: "In my coursework, we studied the Habits of Success. For me, implementing these habits meant treating my education with the same level of discipline I bring to work every single day. I had to look at my schedule honestly. Instead of waiting for free time to magically appear, I began blocking off dedicated focus windows—putting my phone away and putting pen to paper.\n\nWhen large research papers or complex business math concepts feel overwhelming, I break them into SMART milestones. Completing one concrete step at a time keeps anxiety away and builds real momentum.",
      },
      {
        timestamp: '2:00 - 3:15',
        label: 'Overcoming Real-World Obstacles',
        speakerNotes: 'Honest and realistic about the grit required.',
        text: 'Building generational wealth is about breaking old patterns and staying disciplined when excitement wears off. In business and in life, unexpected challenges will arise—supply chain delays, permit holdups, or financial hurdles. What matters is having a systematic approach: assessing the numbers objectively, making adjustments quickly, and keeping moving forward.\n\nSuccess is rarely about luck; it is about who can execute the basics consistently day in and day out. That is the same discipline I bring to every single exam, paper, and project.',
      },
      {
        timestamp: '3:15 - 4:15',
        label: 'Building Generational Wealth',
        speakerNotes: 'Deep conviction. Emphasize family and long-term legacy.',
        text: 'Generational wealth isn’t just about money in a bank account. It is about building assets that continue to provide opportunities for your children and family long after you are gone. It is about teaching the next generation financial literacy, self-reliance, and work ethic.\n\nBy taking the time now to master business principles and complete my degree, I am demonstrating that no matter your age or starting point, you can rewrite your trajectory with focus and hard work.',
      },
      {
        timestamp: '4:15 - 5:00',
        label: 'Call to Action & Conclusion',
        speakerNotes: 'Strong eye contact. Decisive closing.',
        text: 'Every step taken today shapes tomorrow’s reality. I am committed to finishing this degree with excellence and turning these lessons into real Texas enterprises. Thank you for your support and time today.',
      },
    ],
  },
  {
    id: 'effective-communication-5min',
    title: 'Effective Communication: Leadership, Active Listening & Plain Speech (5-Min)',
    course: 'Communication Skills (Any Course)',
    durationEst: '4m 52s (612 words)',
    targetMins: 5,
    wordCount: 612,
    sections: [
      {
        timestamp: '0:00 - 0:45',
        label: 'Hook & Opening Thesis',
        speakerNotes: 'Establish direct eye contact. Speak with calm authority.',
        text: 'Good afternoon. My name is Grayson Russell. Today I want to address a common myth in modern business: the idea that effective communication requires complicated vocabulary or corporate jargon. In my experience balancing online college courses with building independent ventures here in Texas, the exact opposite is true. The most powerful communication is direct, honest, and plain-spoken.',
      },
      {
        timestamp: '0:45 - 2:00',
        label: 'Active Listening & Understanding',
        speakerNotes: 'Explain the difference between hearing and truly overstanding.',
        text: "Throughout my communication coursework, the concept of active listening stood out the most. Most people do not listen to understand; they listen to reply. When you pause, look the other person in the eye, and confirm what they are actually saying before offering your own opinion, conflicts dissolve and productivity doubles.\n\nWhether negotiating with a contractor or working through a group assignment with classmates, clear communication saves valuable time and ensures everyone is pulling in the same direction.",
      },
      {
        timestamp: '2:00 - 3:15',
        label: 'Communication Maps & Digital Clarity',
        speakerNotes: 'Discuss practical tools learned in coursework.',
        text: 'Using structured communication channels—knowing when to send a concise email versus when to pick up the phone—is crucial. Misunderstandings thrive in ambiguity. When I write, I follow a strict rule: keep sentences short, explain reasoning as I go, and state the exact next action required. This eliminates guesswork and creates professional accountability.',
      },
      {
        timestamp: '3:15 - 4:15',
        label: 'Leadership & Integrity in Business',
        speakerNotes: 'Connect to entrepreneurship and Texas business goals.',
        text: 'In business, your reputation is your currency. People do business with leaders they trust. When you tell the truth—even when it is uncomfortable—and follow through on your commitments, you build lasting goodwill. That is the standard of integrity I hold myself to as I prepare to launch independent Texas businesses.',
      },
      {
        timestamp: '4:15 - 5:00',
        label: 'Wrap-Up & Final Takeaway',
        speakerNotes: 'Decisive conclusion within target window.',
        text: 'Effective communication is not an academic theory; it is an everyday discipline. Thank you for your attention.',
      },
    ],
  },
  {
    id: 'business-strategy-5min',
    title: 'Business Strategy: Texas Enterprise, Contracts & Asset Growth (5-Min)',
    course: 'Business & Entrepreneurship (Any Course)',
    durationEst: '4m 50s (610 words)',
    targetMins: 5,
    wordCount: 610,
    sections: [
      {
        timestamp: '0:00 - 0:45',
        label: 'Hook & Introduction',
        speakerNotes: 'Confident, direct eye contact. Grounded Texas mindset.',
        text: 'Hello everyone, my name is Grayson Russell. Today I want to discuss the practical fundamentals of launching and sustaining independent businesses here in Texas. In business school, we analyze complex financial formulas and case studies, but in the real world, enterprise comes down to three bedrock pillars: clear value for customers, strict cash flow control, and contracts built on absolute integrity.',
      },
      {
        timestamp: '0:45 - 2:00',
        label: 'Market Positioning & Risk Assessment',
        speakerNotes: 'Steady pace, explain step-by-step reasoning.',
        text: "Every business starts with an honest assessment of the market. What problem are you solving that people are genuinely willing to pay for? In Texas, competition is fierce, but opportunity is abundant for operators who show up on time, do what they promised, and respect the customer's hard-earned dollar.\n\nRisk management is not about avoiding danger—it is about calculating the downside before you sign a lease or purchase inventory. By running conservative projections and keeping overhead low, you give your enterprise the runway it needs to survive the startup phase and become profitable.",
      },
      {
        timestamp: '2:00 - 3:15',
        label: 'Execution & Daily Discipline',
        speakerNotes: 'Relate coursework to real-world execution.',
        text: 'Great ideas are worthless without consistent daily execution. In my coursework, studying operational management reinforced that standard operating procedures are what separate a chaotic hobby from a scalable business. You have to track your numbers every single week—revenue, expenses, supplier costs, and margins. When you know your numbers, you make decisions based on facts rather than emotion.',
      },
      {
        timestamp: '3:15 - 4:15',
        label: 'Generational Wealth Through Tangible Assets',
        speakerNotes: 'Speak with conviction about family and legacy.',
        text: 'My long-term vision is not just to earn a living, but to build durable assets that create generational stability for my family. Real estate, service companies, and commercial operations provide lasting equity. When you build businesses with strong ethical foundations, you create jobs and leave behind something meaningful for the next generation.',
      },
      {
        timestamp: '4:15 - 5:00',
        label: 'Conclusion & Next Steps',
        speakerNotes: 'Decisive finish right at the 5-minute mark.',
        text: 'Applying these classroom principles to Texas commerce is how vision turns into reality. Thank you for your time and support.',
      },
    ],
  },

  // 3-MINUTE PRESENTATIONS
  {
    id: 'math-problem-solving-3min',
    title: 'Quantitative Reasoning: Breaking Down Complex Problems Step-by-Step (3-Min)',
    course: 'College Algebra & Problem Solving (Any Course)',
    durationEst: '2m 55s (375 words)',
    targetMins: 3,
    wordCount: 375,
    sections: [
      {
        timestamp: '0:00 - 0:35',
        label: 'Hook & Introduction',
        speakerNotes: 'Look straight at camera. Natural posture and warm greeting.',
        text: "Hello everyone, my name is Grayson Russell. Today I want to address how we tackle complex problems—whether in college mathematics, business finance, or daily life. When faced with a multi-step algebraic equation or a difficult financial challenge, our natural instinct is often to feel overwhelmed. But problem-solving is not about innate genius; it is about a disciplined, repeatable method.",
      },
      {
        timestamp: '0:35 - 1:45',
        label: 'Systematic Step-by-Step Method',
        speakerNotes: 'Steady pace, explain the process clearly.',
        text: 'In quantitative reasoning, the first rule is isolating the variables. You break the problem into smaller, manageable pieces. In algebra, when dealing with negative exponents or quadratic expressions, you don’t solve the whole equation in one leap. You apply properties step-by-step, verify each line, and keep your workspace organized.\n\nThat exact same logic applies to running a business in Texas. When operational expenses or inventory bottlenecks arise, you isolate the problem, test your assumptions against the data, and execute the solution methodically.',
      },
      {
        timestamp: '1:45 - 2:30',
        label: 'Persistence & Real-World Application',
        speakerNotes: 'Speak with conviction about habits of success.',
        text: 'Discipline in math builds mental toughness for life. Sitting down, putting away distractions, and working through difficult concepts until they click is the same mindset needed to negotiate business contracts and manage investments. Every hurdle mastered builds confidence for the next one.',
      },
      {
        timestamp: '2:30 - 3:00',
        label: 'Conclusion',
        speakerNotes: 'Strong eye contact. Wrap up right on the 3-minute mark.',
        text: 'When you respect the process and put in the work, complex problems always have a solution. Thank you for your time.',
      },
    ],
  },

  // 2-MINUTE EXPRESS PRESENTATIONS
  {
    id: 'express-speech-2min',
    title: 'Express Speech: Degree Goals, Personal Grit & Texas Vision (2-Min)',
    course: 'Quick Express Speech (Any Course)',
    durationEst: '1m 58s (262 words)',
    targetMins: 2,
    wordCount: 262,
    sections: [
      {
        timestamp: '0:00 - 0:25',
        label: 'Hook & Introduction',
        speakerNotes: 'Look straight at camera. Smile naturally. Clear, confident voice.',
        text: "Hello everyone, my name is Grayson Russell. I am thirty-two years old, living right here in Dallas, Texas. Balancing daily life with an online degree takes real commitment, but the biggest lesson I have learned is that time management isn't about doing more things—it is about protecting what matters most.",
      },
      {
        timestamp: '0:25 - 1:15',
        label: 'Core Strategy & Habits',
        speakerNotes: 'Speak at steady conversational pace. Explain reasoning step-by-step.',
        text: 'Success comes down to treating your goals like an uncompromised shift. I set a dedicated time each day to sit down, put my phone away, and lock in. When assignments or complex concepts feel heavy, I break them into concrete SMART milestones. Instead of looking at the whole mountain and feeling stressed, I take it one concrete step at a time.',
      },
      {
        timestamp: '1:15 - 1:45',
        label: 'Overcoming Obstacles',
        speakerNotes: 'Keep it honest. Genuine tone without robotic phrases.',
        text: 'There are days when life gets heavy and distractions pile up. What keeps me grounded is asking for help early, putting pen to paper every single day, and remembering my long-term purpose: owning independent Texas businesses and building generational wealth for my family.',
      },
      {
        timestamp: '1:45 - 2:00',
        label: 'Decisive Conclusion',
        speakerNotes: 'Strong eye contact. Clear wrap-up within the 2-minute mark.',
        text: 'Staying disciplined with your time is how you protect your future. Thank you for listening.',
      },
    ],
  },
];

export const VideoPresentationStudio: React.FC<VideoPresentationStudioProps> = ({
  isOpen,
  onClose,
  onSendToEinstein,
  onSaveToProjects,
}) => {
  // Target duration (Default: 5 Minutes as requested)
  const [targetMinutes, setTargetMinutes] = useState<number>(5);
  const TOTAL_SECONDS = targetMinutes * 60;

  // Active Preset & Script Content
  const [selectedPresetId, setSelectedPresetId] = useState<string>('college-success-5min');
  const [activePreset, setActivePreset] = useState<ScriptPreset>(DEFAULT_PRESETS[0]);

  // Custom Speech Generator States (For Any Course or Topic)
  const [courseInput, setCourseInput] = useState<string>('');
  const [customTopicInput, setCustomTopicInput] = useState<string>('');
  const [customNotesInput, setCustomNotesInput] = useState<string>('');
  const [speechTone, setSpeechTone] = useState<'grounded' | 'academic' | 'inspirational'>('grounded');
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<boolean>(false);
  const [isEditingScript, setIsEditingScript] = useState<boolean>(false);
  const [showRubricAccordion, setShowRubricAccordion] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [savedProject, setSavedProject] = useState<boolean>(false);

  // Custom user speeches saved across sessions
  const [customSpeeches, setCustomSpeeches] = useState<ScriptPreset[]>(() => {
    try {
      const stored = localStorage.getItem('grayson_custom_speeches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // View Mode: Studio (Camera + Prompter together), Prompter Only, Saved Takes, Rubric/Speech Generator
  const [mobileTab, setMobileTab] = useState<'studio' | 'prompter' | 'takes' | 'rubric'>('studio');
  const [isPrompterOverlay, setIsPrompterOverlay] = useState<boolean>(false);

  // Timer & Rehearsal State
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [soundAlerts, setSoundAlerts] = useState<boolean>(true);

  // Teleprompter Display & Slower Auto-scroll State
  const [isPrompterScrolling, setIsPrompterScrolling] = useState<boolean>(false);
  const [scrollSpeedWpm, setScrollSpeedWpm] = useState<number>(70);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('large');
  const prompterBoxRef = useRef<HTMLDivElement>(null);
  const overlayPrompterRef = useRef<HTMLDivElement>(null);
  const scrollAnimRef = useRef<number | null>(null);

  // Camera Practice & Hardware Stream State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Video Recording Engine (MediaRecorder + File Export)
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [savedTakes, setSavedTakes] = useState<RecordedVideoTake[]>([]);
  const [latestRecordedTake, setLatestRecordedTake] = useState<RecordedVideoTake | null>(null);
  const [showTakeExportModal, setShowTakeExportModal] = useState<boolean>(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Update active preset when selection changes (from presets or custom generated speeches)
  useEffect(() => {
    const all = [...customSpeeches, ...DEFAULT_PRESETS];
    const found = all.find((p) => p.id === selectedPresetId);
    if (found) {
      setActivePreset(found);
      setTargetMinutes(found.targetMins);
      resetTimer();
    }
  }, [selectedPresetId, customSpeeches]);

  // Combined full text
  const fullScriptText = activePreset.sections.map((s) => s.text).join('\n\n');
  const totalWordCount = fullScriptText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  const estimatedSeconds = Math.round((totalWordCount / 125) * 60);
  const estMins = Math.floor(estimatedSeconds / 60);
  const estSecs = estimatedSeconds % 60;
  const formattedEstTime = `${estMins}m ${estSecs < 10 ? '0' : ''}${estSecs}s`;

  // Timer interval for rehearsal & recording
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => {
          if (prev + 1 >= TOTAL_SECONDS) {
            setIsTimerRunning(false);
            setIsPrompterScrolling(false);
            if (isRecording) {
              stopVideoRecording();
            }
            playBeep(880, 0.4);
            return TOTAL_SECONDS;
          }
          if (soundAlerts && prev + 1 === Math.max(10, TOTAL_SECONDS - 30)) {
            playBeep(587.33, 0.2);
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, soundAlerts, TOTAL_SECONDS, isRecording]);

  // Audio tone using Web Audio API
  const playBeep = (freq: number, duration: number) => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio autoplay handled
    }
  };

  // Teleprompter smooth auto-scrolling (at 70 WPM for a calm, comfortable pace)
  useEffect(() => {
    if (!isPrompterScrolling) {
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
      return;
    }

    const mainElement = prompterBoxRef.current;
    const overlayElement = overlayPrompterRef.current;
    const activeElements = [mainElement, overlayElement].filter(Boolean) as HTMLDivElement[];
    if (activeElements.length === 0) return;

    let lastTime = performance.now();

    const step = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // At 70 WPM, scrolls at ~13 pixels per second (calm & readable)
      const pixelsPerSec = (scrollSpeedWpm / 70) * 13;
      let hasRoomToScroll = false;

      for (const el of activeElements) {
        el.scrollTop += pixelsPerSec * delta;
        if (el.scrollTop + el.clientHeight < el.scrollHeight - 2) {
          hasRoomToScroll = true;
        }
      }

      if (hasRoomToScroll) {
        scrollAnimRef.current = requestAnimationFrame(step);
      } else {
        setIsPrompterScrolling(false);
      }
    };

    scrollAnimRef.current = requestAnimationFrame(step);
    return () => {
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
    };
  }, [isPrompterScrolling, scrollSpeedWpm]);

  // Camera Management
  const startCameraStream = async (targetFacing: 'user' | 'environment' = facingMode, withAudio = false): Promise<MediaStream | null> => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: targetFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: withAudio ? { echoCancellation: true, noiseSuppression: true } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setRecordingError(null);
      return stream;
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      // Fallback: Try video only if audio failed
      if (withAudio) {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: targetFacing },
            audio: false,
          });
          mediaStreamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.play().catch(() => {});
          }
          setCameraActive(true);
          return fallbackStream;
        } catch (innerErr) {
          setCameraActive(false);
          setRecordingError('Camera or microphone permission was denied. Please allow camera and microphone in your browser settings.');
          return null;
        }
      }
      setCameraActive(false);
      setRecordingError('Unable to access camera. Please allow camera permission.');
      return null;
    }
  };

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const flipCamera = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    if (cameraActive) {
      await startCameraStream(nextFacing, isRecording);
    }
  };

  const toggleCamera = async () => {
    if (cameraActive) {
      if (isRecording) {
        stopVideoRecording();
      }
      stopCameraStream();
    } else {
      await startCameraStream(facingMode, false);
    }
  };

  // Video Recording Engine (Record with MediaRecorder, Save to Takes, Export / Download)
  const getSupportedMimeType = (): string => {
    const types = [
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    for (const t of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  };

  const recordingSecondsRef = useRef(0);

  const startVideoRecording = async () => {
    try {
      setRecordingError(null);
      // 1. Ensure live camera stream has both video AND audio microphone tracks
      const stream = await startCameraStream(facingMode, true);
      if (!stream) {
        setRecordingError('Cannot start recording: Camera and microphone access is required.');
        return;
      }

      const mimeType = getSupportedMimeType();
      recordedChunksRef.current = [];

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalMime = mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: finalMime });
        const videoUrl = URL.createObjectURL(blob);
        const duration = recordingSecondsRef.current;

        const newTake: RecordedVideoTake = {
          id: `take-${Date.now()}`,
          url: videoUrl,
          blob,
          durationSeconds: duration,
          timestamp: Date.now(),
          title: `${targetMinutes}-Min Speech: ${activePreset.title}`,
          sizeBytes: blob.size,
          mimeType: finalMime,
        };

        setSavedTakes((prev) => [newTake, ...prev]);
        setLatestRecordedTake(newTake);
        setShowTakeExportModal(true);
      };

      recorder.start(500); // Collect chunk every 500ms
      mediaRecorderRef.current = recorder;

      // 2. Start recording timers and auto-roll teleprompter together!
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;

      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          recordingSecondsRef.current = next;
          if (next >= TOTAL_SECONDS) {
            stopVideoRecording();
          }
          return next;
        });
      }, 1000);

      // Also start rehearsal timer and teleprompter scrolling together
      setIsTimerRunning(true);
      setIsPrompterScrolling(true);
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setRecordingError(`Could not start video recording: ${err?.message || 'Permission denied'}`);
      setIsRecording(false);
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping recorder:', e);
      }
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setIsTimerRunning(false);
    setIsPrompterScrolling(false);
  };

  // Video File Download & Native Share/Export
  const handleDownloadVideo = (take: RecordedVideoTake) => {
    try {
      const ext = take.mimeType.includes('mp4') ? 'mp4' : 'webm';
      const cleanTitle = take.title
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, 40);
      const filename = `Grayson_Russell_${cleanTitle}_${new Date().toISOString().slice(0, 10)}.${ext}`;

      const a = document.createElement('a');
      a.href = take.url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleShareVideo = async (take: RecordedVideoTake) => {
    try {
      const ext = take.mimeType.includes('mp4') ? 'mp4' : 'webm';
      const cleanTitle = take.title
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, 40);
      const filename = `Grayson_Russell_${cleanTitle}.${ext}`;
      const file = new File([take.blob], filename, { type: take.blob.type || 'video/mp4' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Video Presentation: ${take.title}`,
          text: `Grayson Russell's ${targetMinutes}-Minute College Video Presentation for ${activePreset.course}`,
        });
        return;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share error, falling back to direct download:', err);
      } else {
        return;
      }
    }
    // Fallback: Trigger direct download
    handleDownloadVideo(take);
  };

  const handleDeleteTake = (id: string) => {
    setSavedTakes((prev) => prev.filter((t) => t.id !== id));
    if (latestRecordedTake?.id === id) {
      setLatestRecordedTake(null);
      setShowTakeExportModal(false);
    }
  };

  // Duration Switcher
  const handleDurationChange = (mins: number) => {
    setTargetMinutes(mins);
    const matching = DEFAULT_PRESETS.find((p) => p.targetMins === mins);
    if (matching) {
      setSelectedPresetId(matching.id);
    }
    resetTimer();
  };

  // Reset rehearsal & teleprompter
  const resetTimer = () => {
    setIsTimerRunning(false);
    setIsPrompterScrolling(false);
    setSecondsElapsed(0);
    if (isRecording) {
      stopVideoRecording();
    }
    if (prompterBoxRef.current) prompterBoxRef.current.scrollTop = 0;
    if (overlayPrompterRef.current) overlayPrompterRef.current.scrollTop = 0;
  };

  const toggleTimerAndPrompter = () => {
    const nextState = !isTimerRunning;
    setIsTimerRunning(nextState);
    setIsPrompterScrolling(nextState);
  };

  // AI Script Generation for Any Course, Topic, or Assignment
  const handleGenerateCustomScript = async () => {
    const courseName = courseInput.trim() || 'College Coursework';
    const topicName = customTopicInput.trim();
    const notesDetail = customNotesInput.trim();

    if (!topicName && !notesDetail) {
      setGenerationError('Please enter what you need to talk about (a topic or some bullet notes).');
      return;
    }

    setIsGeneratingScript(true);
    setGenerationError(null);
    setGenerationSuccess(false);

    const toneInstructions =
      speechTone === 'academic'
        ? 'Professional, analytical, clear college presentation tone. Use solid reasoning and evidence.'
        : speechTone === 'inspirational'
        ? 'Dynamic, inspiring, leadership tone with vision, drive, and motivating calls to action.'
        : 'Grounded, authentic, 10th-grade plain conversational vocabulary. Direct Texas honesty, zero corporate jargon or AI buzzwords.';

    const systemPromptText = `You are an elite speechwriter for Grayson Russell, a 32-year-old college student and independent entrepreneur in Dallas, Texas.
Grayson needs an authentic spoken presentation speech for online college coursework.

COURSE / SUBJECT: "${courseName}"
TOPIC / ASSIGNMENT: "${topicName || 'Key Principles & Practical Application'}"
LITTLE THINGS & SPECIFIC POINTS TO TALK ABOUT IN THE PROMPT:
${notesDetail || 'Time management, habits of success, Dallas roots, daily work ethic, and building generational wealth for my family.'}

TARGET DURATION: EXACTLY ${targetMinutes} Minutes (~${targetMinutes === 5 ? '625 words' : targetMinutes === 3 ? '375 words' : '260 words'} at 125 WPM spoken pace).

TONE & STYLE:
- ${toneInstructions}
- Zero AI buzzwords (never say "delve", "tapestry", "beacon", "testament", or "symphony").
- Speak in first-person ("I", "my experience", "in my coursework").
- Connect classroom principles with real-life grit, practical execution, and building generational wealth.
- Structure the speech into clean, timed speech sections with timestamps so Grayson can rehearse with the teleprompter.

OUTPUT FORMAT:
Format your response using these exact section markers:

[SECTION: Hook & Introduction | 0:00 - ${targetMinutes === 5 ? '0:45' : targetMinutes === 3 ? '0:35' : '0:25'} | Look straight at the camera. Natural posture, warm and confident opening greeting.]
(Write the spoken words for section 1 here)

[SECTION: Core Principles & Strategy | ${targetMinutes === 5 ? '0:45 - 2:00' : targetMinutes === 3 ? '0:35 - 1:45' : '0:25 - 1:15'} | Steady conversational pace. Break down the key points step-by-step.]
(Write the spoken words for section 2 here)

[SECTION: Real-World Obstacles & Application | ${targetMinutes === 5 ? '2:00 - 3:30' : targetMinutes === 3 ? '1:45 - 2:30' : '1:15 - 1:45'} | Honest and grounded. Speak about Dallas roots, daily life grind, and persistence.]
(Write the spoken words for section 3 here)

[SECTION: Generational Wealth & Conclusion | ${targetMinutes === 5 ? '3:30 - 5:00' : targetMinutes === 3 ? '2:30 - 3:00' : '1:45 - 2:00'} | Decisive closing eye contact. Finish right before the timer ends.]
(Write the spoken words for section 4 here)`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: 'einstein',
          messages: [{ role: 'user', text: systemPromptText }],
          prompt: systemPromptText,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned error code ${res.status}`);
      }

      const data = await res.json();
      const replyText: string = data.text || '';

      if (!replyText.trim()) {
        throw new Error('AI returned an empty response. Please try again.');
      }

      // Robust Section Parser
      const parsedSections: { timestamp: string; label: string; speakerNotes: string; text: string }[] = [];
      const sectionRegex = /\[SECTION:\s*([^|\]]+)(?:\|\s*([^|\]]+))?(?:\|\s*([^\]]+))?\]([\s\S]*?)(?=(?:\[SECTION:|$))/gi;
      let match;

      while ((match = sectionRegex.exec(replyText)) !== null) {
        const label = match[1]?.trim() || 'Key Point';
        const timestamp = match[2]?.trim() || `Part ${parsedSections.length + 1}`;
        const speakerNotes = match[3]?.trim() || 'Speak clearly with confidence.';
        const text = match[4]?.trim() || '';

        if (text) {
          parsedSections.push({
            timestamp,
            label,
            speakerNotes,
            text,
          });
        }
      }

      // Smart Fallback Parser if AI returned standard markdown/paragraphs without [SECTION: tags
      if (parsedSections.length === 0) {
        const cleanText = replyText.replace(/#+\s*/g, '').trim();
        const paragraphs = cleanText
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0);

        if (paragraphs.length >= 4) {
          const quarter = Math.ceil(paragraphs.length / 4);
          const p1 = paragraphs.slice(0, quarter).join('\n\n');
          const p2 = paragraphs.slice(quarter, quarter * 2).join('\n\n');
          const p3 = paragraphs.slice(quarter * 2, quarter * 3).join('\n\n');
          const p4 = paragraphs.slice(quarter * 3).join('\n\n');

          parsedSections.push(
            { timestamp: targetMinutes === 5 ? '0:00 - 0:45' : targetMinutes === 3 ? '0:00 - 0:35' : '0:00 - 0:25', label: 'Hook & Introduction', speakerNotes: 'Direct eye contact.', text: p1 },
            { timestamp: targetMinutes === 5 ? '0:45 - 2:00' : targetMinutes === 3 ? '0:35 - 1:45' : '0:25 - 1:15', label: 'Core Principles & Habits', speakerNotes: 'Steady conversational pace.', text: p2 },
            { timestamp: targetMinutes === 5 ? '2:00 - 3:30' : targetMinutes === 3 ? '1:45 - 2:30' : '1:15 - 1:45', label: 'Overcoming Obstacles & Dallas Vision', speakerNotes: 'Honest and grounded.', text: p3 },
            { timestamp: targetMinutes === 5 ? '3:30 - 5:00' : targetMinutes === 3 ? '2:30 - 3:00' : '1:45 - 2:00', label: 'Generational Wealth & Conclusion', speakerNotes: 'Decisive finish.', text: p4 }
          );
        } else if (paragraphs.length > 0) {
          parsedSections.push({
            timestamp: `0:00 - ${targetMinutes}:00`,
            label: topicName || 'Spoken Presentation Speech',
            speakerNotes: 'Speak at a steady 125 WPM pace.',
            text: paragraphs.join('\n\n'),
          });
        }
      }

      const totalWords = parsedSections.reduce((acc, s) => acc + s.text.split(/\s+/).filter(Boolean).length, 0);
      const displayTitle = topicName ? `${courseName}: ${topicName}` : `${courseName} Speech (${targetMinutes}-Min)`;

      const newSpeechPreset: ScriptPreset = {
        id: `custom-${Date.now()}`,
        title: displayTitle,
        course: courseName,
        durationEst: `${targetMinutes}m (~${totalWords} words)`,
        targetMins: targetMinutes,
        wordCount: totalWords,
        sections: parsedSections,
      };

      // Set active preset immediately
      setActivePreset(newSpeechPreset);
      setSelectedPresetId(newSpeechPreset.id);

      // Save to customSpeeches list and localStorage
      setCustomSpeeches((prev) => {
        const updated = [newSpeechPreset, ...prev.filter((p) => p.id !== newSpeechPreset.id)].slice(0, 20);
        try {
          localStorage.setItem('grayson_custom_speeches', JSON.stringify(updated));
        } catch {
          // ignore storage error
        }
        return updated;
      });

      resetTimer();
      setGenerationSuccess(true);
    } catch (err: any) {
      console.error('Failed generating video script:', err);
      setGenerationError(err?.message || 'Failed to generate speech. Please try again.');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Update a single section's text (for custom editing)
  const handleUpdateSectionText = (secIndex: number, newText: string) => {
    const updatedSections = activePreset.sections.map((sec, idx) => {
      if (idx === secIndex) {
        return { ...sec, text: newText };
      }
      return sec;
    });

    const updatedPreset: ScriptPreset = {
      ...activePreset,
      sections: updatedSections,
    };

    setActivePreset(updatedPreset);

    // If it's a custom speech, persist the edit
    if (activePreset.id.startsWith('custom-')) {
      setCustomSpeeches((prev) => {
        const updated = prev.map((s) => (s.id === updatedPreset.id ? updatedPreset : s));
        try {
          localStorage.setItem('grayson_custom_speeches', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  };

  // Delete a custom generated speech
  const handleDeleteCustomSpeech = (speechId: string) => {
    setCustomSpeeches((prev) => {
      const updated = prev.filter((s) => s.id !== speechId);
      try {
        localStorage.setItem('grayson_custom_speeches', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (selectedPresetId === speechId) {
      setSelectedPresetId(DEFAULT_PRESETS[0].id);
    }
  };

  const handleCopyScript = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(fullScriptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveToProjects = () => {
    if (onSaveToProjects) {
      onSaveToProjects(`${targetMinutes}-Min Video Presentation: ${activePreset.title}`);
      setSavedProject(true);
      setTimeout(() => setSavedProject(false), 2500);
    }
  };

  // Timer formatting
  const secondsLeft = Math.max(0, TOTAL_SECONDS - secondsElapsed);
  const timerMins = Math.floor(secondsElapsed / 60);
  const timerSecs = secondsElapsed % 60;
  const timerDisplay = `${timerMins < 10 ? '0' : ''}${timerMins}:${timerSecs < 10 ? '0' : ''}${timerSecs}`;

  const recMins = Math.floor(recordingSeconds / 60);
  const recSecs = recordingSeconds % 60;
  const recDisplay = `${recMins < 10 ? '0' : ''}${recMins}:${recSecs < 10 ? '0' : ''}${recSecs}`;

  const targetMinsFormatted = `${targetMinutes < 10 ? '0' : ''}${targetMinutes}:00`;
  const progressPercent = Math.min(100, (secondsElapsed / TOTAL_SECONDS) * 100);

  // Active section detection based on current percentage of elapsed time
  const getActiveSectionIndex = (pct: number) => {
    if (pct < 20) return 0;
    if (pct < 55) return 1;
    if (pct < 85) return 2;
    return 3;
  };
  const activeSectionIdx = getActiveSectionIndex(progressPercent);

  // Clean cleanup on modal close or unmount
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
      resetTimer();
    }
    return () => {
      stopCameraStream();
      clearInterval(recordingTimerRef.current);
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/90 backdrop-blur-md overflow-hidden">
      <div className="relative w-full max-w-6xl h-full sm:h-auto max-h-[100dvh] sm:max-h-[96dvh] bg-gradient-to-br from-[#0c081e] via-[#110c28] to-[#180a32] border-0 sm:border-2 border-fuchsia-500/60 rounded-none sm:rounded-3xl shadow-[0_0_50px_rgba(217,70,239,0.35)] flex flex-col overflow-hidden text-white">
        
        {/* ========================================================= */}
        {/* Top Header Bar */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-fuchsia-500/30 bg-black/60 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-br from-amber-500/30 to-fuchsia-500/30 border border-amber-400/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)] shrink-0">
              <Clapperboard size={18} className="sm:w-5 sm:h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-orbitron font-black text-xs sm:text-base md:text-lg text-gradient-neon uppercase tracking-wider truncate">
                  Video Presentation Studio
                </h2>
                {isRecording && (
                  <span className="text-[10px] font-mono text-red-300 bg-red-950/90 border border-red-500 px-2 py-0.5 rounded-full flex items-center gap-1.5 font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    REC {recDisplay}
                  </span>
                )}
                {savedTakes.length > 0 && !isRecording && (
                  <button
                    onClick={() => setMobileTab('takes')}
                    className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-400/50 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer hover:bg-cyan-900"
                    title="View and download recorded videos"
                  >
                    <Film size={11} className="text-cyan-400" />
                    <span>{savedTakes.length} Take{savedTakes.length > 1 ? 's' : ''} Saved</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-gray-300 font-sans truncate">
                {targetMinutes}-Min rehearsal timer, rolling teleprompter & video file recording.
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shrink-0 ml-2"
            title="Close Studio"
          >
            <X size={18} />
          </button>
        </div>

        {/* ========================================================= */}
        {/* Navigation & View Mode Switcher (Guarantees Mobile Prompter Visibility) */}
        {/* ========================================================= */}
        <div className="px-3 sm:px-6 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
          {/* Mobile & Desktop View Switcher */}
          <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/15 shrink-0">
            <button
              onClick={() => setMobileTab('studio')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-orbitron font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                mobileTab === 'studio'
                  ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.5)]'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Video size={13} className="text-cyan-300" />
              <span>Studio & Prompter</span>
            </button>

            <button
              onClick={() => setMobileTab('prompter')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-orbitron font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                mobileTab === 'prompter'
                  ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.5)]'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileVideo size={13} className="text-amber-300" />
              <span>Prompter Only</span>
            </button>

            <button
              onClick={() => setMobileTab('takes')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-orbitron font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                mobileTab === 'takes'
                  ? 'bg-gradient-to-r from-cyan-600 to-emerald-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Film size={13} className="text-emerald-300" />
              <span>My Takes ({savedTakes.length})</span>
            </button>

            <button
              onClick={() => setMobileTab('rubric')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-orbitron font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                mobileTab === 'rubric'
                  ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.5)]'
                  : 'text-amber-300 hover:text-white hover:bg-white/10 border border-amber-400/30'
              }`}
              title="Speech Generator for any course or topic"
            >
              <GraduationCap size={13} className="text-fuchsia-300" />
              <Sparkles size={11} className="text-amber-300 animate-pulse" />
              <span>Speech Generator</span>
            </button>
          </div>

          {/* Quick Target Duration (5m vs 3m vs 2m) */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/15 shrink-0 ml-auto">
            <span className="text-[10px] font-orbitron text-amber-300 font-bold px-1 hidden sm:inline">Target:</span>
            {[5, 3, 2].map((m) => (
              <button
                key={m}
                onClick={() => handleDurationChange(m)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-orbitron font-bold transition-all cursor-pointer ${
                  targetMinutes === m
                    ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        {/* Sub Header: Speed, Font Size & Audio Controls */}
        <div className="px-3 sm:px-6 py-2 bg-black/30 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Active Preset Title */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-orbitron text-cyan-300 font-semibold truncate max-w-[200px] sm:max-w-xs">
              {activePreset.title}
            </span>
          </div>

          {/* Teleprompter Roll Controls */}
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {/* Speed Presets */}
            <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-xl border border-white/15 text-[11px] font-mono text-gray-300">
              <Sliders size={12} className="text-amber-400" />
              <span className="text-amber-300 font-bold">{scrollSpeedWpm} WPM</span>
              <button
                onClick={() => setScrollSpeedWpm(50)}
                className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer ${
                  scrollSpeedWpm <= 55 ? 'bg-fuchsia-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
                title="Slow roll pace"
              >
                Slow
              </button>
              <button
                onClick={() => setScrollSpeedWpm(70)}
                className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer ${
                  scrollSpeedWpm > 55 && scrollSpeedWpm <= 85 ? 'bg-fuchsia-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
                title="Steady comfortable pace"
              >
                Steady
              </button>
              <button
                onClick={() => setScrollSpeedWpm(100)}
                className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer ${
                  scrollSpeedWpm > 85 ? 'bg-fuchsia-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
                title="Normal pace"
              >
                Normal
              </button>
            </div>

            {/* Font Size */}
            <div className="flex items-center gap-1 text-[11px] text-gray-300 font-mono bg-black/40 px-2 py-1 rounded-xl border border-white/15">
              <Type size={12} className="text-cyan-400" />
              <button
                onClick={() => setFontSize('normal')}
                className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer ${fontSize === 'normal' ? 'bg-cyan-500/40 text-cyan-200' : 'text-gray-400'}`}
              >
                Med
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer ${fontSize === 'large' ? 'bg-cyan-500/40 text-cyan-200' : 'text-gray-400'}`}
              >
                Lrg
              </button>
              <button
                onClick={() => setFontSize('xlarge')}
                className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer ${fontSize === 'xlarge' ? 'bg-cyan-500/40 text-cyan-200' : 'text-gray-400'}`}
              >
                XL
              </button>
            </div>

            {/* Sound alert */}
            <button
              onClick={() => setSoundAlerts((s) => !s)}
              className="p-1.5 rounded-lg bg-black/40 border border-white/15 text-gray-300 hover:text-white cursor-pointer"
              title={soundAlerts ? 'Audio chimes active at 30s remaining & finish' : 'Audio chimes muted'}
            >
              {soundAlerts ? <Volume2 size={14} className="text-emerald-400" /> : <VolumeX size={14} className="text-gray-500" />}
            </button>
          </div>
        </div>

        {/* Recording Notice / Error Banner */}
        {recordingError && (
          <div className="px-4 py-2 bg-red-950/80 border-b border-red-500/50 text-red-200 text-xs font-mono flex items-center justify-between shrink-0">
            <span>{recordingError}</span>
            <button onClick={() => setRecordingError(null)} className="text-red-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* Main Content Areas */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 min-h-0 flex flex-col gap-3 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>

          {/* ======================================================= */}
          {/* TAB 1: STUDIO RECORD (CAMERA + TELEPROMPTER TOGETHER) */}
          {/* ======================================================= */}
          {mobileTab === 'studio' && (
            <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-3 min-h-0">
              {/* Quick Speech Status & Topic Generator Switch Bar */}
              <div className="w-full lg:col-span-12 flex items-center justify-between p-2.5 rounded-xl bg-black/60 border border-fuchsia-500/40 gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded-lg bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 shrink-0">
                    <FileVideo size={14} className="text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-orbitron font-bold text-white truncate flex items-center gap-1.5">
                      <span className="text-gray-300 font-sans text-[11px]">Active Speech:</span>
                      <span className="text-cyan-300 truncate">{activePreset.title}</span>
                    </div>
                    <div className="text-[10px] text-gray-300 font-sans truncate">
                      Course: <span className="text-amber-300 font-semibold">{activePreset.course}</span> • {activePreset.durationEst}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setMobileTab('rubric')}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-600 hover:opacity-90 text-white font-orbitron font-bold text-[10px] sm:text-xs flex items-center gap-1.5 shrink-0 shadow-md cursor-pointer active:scale-95"
                  title="Create or select a speech for any new course"
                >
                  <Sparkles size={12} className="text-amber-300 animate-pulse" />
                  <span>Write New Speech</span>
                </button>
              </div>
              
              {/* TOP / LEFT: Live Camera Recording Viewfinder */}
              <div className="lg:col-span-6 flex flex-col gap-2 shrink-0">
                <div className="relative w-full aspect-video sm:aspect-[16/10] max-h-56 sm:max-h-80 rounded-2xl overflow-hidden bg-black border-2 border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.25)] flex items-center justify-center">
                  {/* Live Camera Video Feed */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${cameraActive ? 'block' : 'hidden'}`}
                  />

                  {/* Camera Off Placeholder */}
                  {!cameraActive && (
                    <div className="flex flex-col items-center justify-center text-center p-4 space-y-2 text-gray-400">
                      <Camera size={32} className="text-cyan-400/80 animate-pulse" />
                      <p className="text-xs font-orbitron font-bold text-white">Camera Mirror & Recorder Ready</p>
                      <button
                        onClick={toggleCamera}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white font-orbitron text-xs font-bold shadow-lg hover:opacity-90 active:scale-95 cursor-pointer"
                      >
                        Turn On Camera
                      </button>
                    </div>
                  )}

                  {/* Overlaid Eye-Level Guide Line */}
                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5 z-10">
                      <div className="w-full flex items-center justify-between text-[10px] font-mono text-cyan-300 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-cyan-400/30">
                        <div className="flex items-center gap-1.5">
                          <Eye size={12} className="text-cyan-400" />
                          <span>Eye-Level Focus Line</span>
                        </div>
                        {isRecording ? (
                          <span className="text-red-400 font-bold flex items-center gap-1 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            RECORDING {recDisplay} / {targetMinsFormatted}
                          </span>
                        ) : (
                          <span className="text-gray-300">Target: {targetMinsFormatted}</span>
                        )}
                      </div>

                      {/* Optical Eye Alignment Crosshair */}
                      <div className="w-full border-b border-dashed border-cyan-400/40 my-auto" />

                      {/* Camera Bottom Controls Inside Viewfinder */}
                      <div className="w-full flex items-center justify-between pointer-events-auto">
                        <button
                          onClick={flipCamera}
                          className="px-2.5 py-1 rounded-xl bg-black/70 hover:bg-black/90 border border-white/20 text-[11px] font-mono text-cyan-300 flex items-center gap-1 shadow-md cursor-pointer active:scale-95"
                          title="Flip camera front/rear"
                        >
                          <SwitchCamera size={13} />
                          <span>Flip</span>
                        </button>

                        <button
                          onClick={() => setIsPrompterOverlay((prev) => !prev)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-mono flex items-center gap-1 shadow-md cursor-pointer active:scale-95 ${
                            isPrompterOverlay
                              ? 'bg-fuchsia-600 text-white border border-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.5)]'
                              : 'bg-black/70 border border-white/20 text-gray-200'
                          }`}
                          title="Overlay scrolling teleprompter text directly on the camera screen"
                        >
                          <Layers size={13} />
                          <span>{isPrompterOverlay ? 'Overlay: ON' : 'Overlay Mode'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Overlaid Teleprompter Text (When isPrompterOverlay is ON) */}
                  {isPrompterOverlay && cameraActive && (
                    <div
                      ref={overlayPrompterRef}
                      onClick={toggleTimerAndPrompter}
                      className="absolute inset-0 bg-black/70 backdrop-blur-xs p-4 overflow-y-auto space-y-4 font-sans select-text leading-relaxed cursor-pointer z-20 text-white"
                      style={{
                        fontSize: fontSize === 'normal' ? '16px' : fontSize === 'large' ? '19px' : '23px',
                      }}
                    >
                      <div className="text-[10px] font-mono text-fuchsia-300 bg-fuchsia-950/80 px-2 py-0.5 rounded sticky top-0 inline-block mb-2">
                        📜 Eye-Level Prompter (Tap anywhere to pause/play)
                      </div>
                      {activePreset.sections.map((sec, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-black/40 border border-white/20">
                          <div className="text-[11px] font-mono text-amber-300 font-bold mb-1">
                            [{sec.timestamp}] {sec.label}
                          </div>
                          <p className="whitespace-pre-line text-white font-medium drop-shadow-md">
                            {sec.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Primary Action Buttons Bar (Record & Rehearse) */}
                <div className="flex items-center gap-2 p-2 rounded-2xl bg-black/50 border border-white/15 shrink-0">
                  {/* Big Video Record Button */}
                  {!isRecording ? (
                    <button
                      onClick={startVideoRecording}
                      className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-orbitron font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all cursor-pointer active:scale-95"
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-white animate-pulse" />
                      <span>Start Recording Video</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopVideoRecording}
                      className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-orbitron font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.6)] transition-all cursor-pointer active:scale-95 animate-pulse"
                    >
                      <div className="w-3.5 h-3.5 rounded bg-black" />
                      <span>Stop & Save Video ({recDisplay})</span>
                    </button>
                  )}

                  {/* Rehearsal Play / Pause */}
                  <button
                    onClick={toggleTimerAndPrompter}
                    className={`p-2.5 sm:p-3 rounded-xl font-orbitron text-xs sm:text-sm flex items-center justify-center transition-all cursor-pointer border ${
                      isTimerRunning
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                    title={isTimerRunning ? 'Pause Roll' : 'Play Roll'}
                  >
                    {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
                  </button>

                  {/* Reset Timer & Prompter */}
                  <button
                    onClick={resetTimer}
                    className="p-2.5 sm:p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300 hover:text-white transition-all cursor-pointer"
                    title="Reset timer and roll to start"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>

              {/* BOTTOM / RIGHT: The Dedicated Teleprompter View Box (100% VISIBLE ON PHONES) */}
              <div className="lg:col-span-6 flex-1 flex flex-col glass-panel rounded-2xl border-2 border-fuchsia-500/50 bg-black/75 p-3 sm:p-4 min-h-[260px] xs:min-h-[300px] sm:min-h-[360px] overflow-hidden shadow-[0_0_25px_rgba(217,70,239,0.2)]">
                {/* Teleprompter Box Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/15 mb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-orbitron font-bold text-xs sm:text-sm text-cyan-300 flex items-center gap-1.5">
                      <FileVideo size={15} className="text-cyan-400" />
                      <span>Teleprompter View Box</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40 font-semibold">
                      {isPrompterScrolling ? '● Rolling' : '❚❚ Paused'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCopyScript}
                      className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-mono flex items-center gap-1 text-gray-200 cursor-pointer"
                      title="Copy full script to clipboard"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar mapped to Target Duration */}
                <div className="flex flex-col gap-1 pb-2 border-b border-white/10 mb-2 shrink-0">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-white font-bold">{timerDisplay} / {targetMinsFormatted}</span>
                    <span className="text-amber-300 font-bold">{Math.floor(secondsLeft / 60)}:{(secondsLeft % 60) < 10 ? '0' : ''}{secondsLeft % 60} remaining</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative border border-white/15">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400 transition-all duration-300 ease-linear"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Scrolling Teleprompter Container */}
                <div
                  ref={prompterBoxRef}
                  onClick={toggleTimerAndPrompter}
                  className="flex-1 overflow-y-auto pr-2 space-y-3 font-sans select-text leading-relaxed cursor-pointer"
                  title="Tap anywhere to Play / Pause teleprompter roll"
                  style={{
                    fontSize: fontSize === 'normal' ? '15px' : fontSize === 'large' ? '18px' : '22px',
                  }}
                >
                  {activePreset.sections.map((sec, idx) => {
                    const isActive = activeSectionIdx === idx && isTimerRunning;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl transition-all border ${
                          isActive
                            ? 'bg-fuchsia-950/50 border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.35)]'
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        {/* Section timestamp badge & notes */}
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold ${
                                isActive ? 'bg-fuchsia-500 text-white' : 'bg-white/10 text-gray-300'
                              }`}
                            >
                              {sec.timestamp}
                            </span>
                            <span className="font-orbitron font-semibold text-cyan-300 text-[11px]">
                              {sec.label}
                            </span>
                          </div>
                          <span className="text-gray-400 text-[10px] hidden sm:inline italic">
                            {sec.speakerNotes}
                          </span>
                        </div>

                        {/* Script Body Text */}
                        <p className={`text-slate-100 whitespace-pre-line ${isActive ? 'font-medium' : ''}`}>
                          {sec.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* TAB 2: PROMPTER ONLY (FULLSCREEN REHEARSAL) */}
          {/* ======================================================= */}
          {mobileTab === 'prompter' && (
            <div className="flex-1 flex flex-col glass-panel rounded-2xl border border-fuchsia-500/40 bg-black/70 p-4 min-h-0 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/15 mb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-orbitron font-bold text-sm text-cyan-300">Fullscreen Teleprompter</span>
                  <span className="text-xs font-mono text-gray-400">({totalWordCount} words • ~{formattedEstTime})</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleTimerAndPrompter}
                    className={`px-3 py-1.5 rounded-xl font-orbitron font-bold text-xs flex items-center gap-1.5 cursor-pointer ${
                      isTimerRunning ? 'bg-amber-500 text-black' : 'bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white'
                    }`}
                  >
                    {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
                    <span>{isTimerRunning ? 'Pause' : 'Start Roll'}</span>
                  </button>

                  <button
                    onClick={resetTimer}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300 cursor-pointer"
                    title="Reset"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>

              <div
                onClick={toggleTimerAndPrompter}
                className="flex-1 overflow-y-auto pr-2 space-y-4 font-sans select-text leading-relaxed cursor-pointer"
                style={{
                  fontSize: fontSize === 'normal' ? '17px' : fontSize === 'large' ? '21px' : '25px',
                }}
              >
                {activePreset.sections.map((sec, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs font-mono text-amber-300 font-bold mb-1.5 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-white/10 text-white font-bold">{sec.timestamp}</span>
                      <span>{sec.label}</span>
                    </div>
                    <p className="whitespace-pre-line text-white font-medium leading-relaxed">
                      {sec.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* TAB 3: MY SAVED TAKES (PREVIEW, DOWNLOAD & SHARE VIDEO) */}
          {/* ======================================================= */}
          {mobileTab === 'takes' && (
            <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-white/15 shrink-0">
                <div>
                  <h3 className="font-orbitron font-bold text-sm sm:text-base text-cyan-300 flex items-center gap-2">
                    <Film size={18} className="text-cyan-400" />
                    <span>My Recorded Video Takes</span>
                  </h3>
                  <p className="text-xs text-gray-400 font-sans">
                    All recorded video files are preserved here. You can download the video file to your phone storage, save to Camera Roll, or export anywhere.
                  </p>
                </div>

                <button
                  onClick={() => setMobileTab('studio')}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-orbitron text-xs font-bold shadow-md cursor-pointer shrink-0"
                >
                  Record New Take
                </button>
              </div>

              {savedTakes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center glass-panel rounded-2xl border border-white/15 bg-black/40 space-y-3">
                  <Film size={40} className="text-gray-500" />
                  <p className="font-orbitron font-bold text-sm text-gray-300">No Recorded Takes Yet</p>
                  <p className="text-xs text-gray-400 max-w-sm">
                    Switch to the <strong>Studio & Prompter</strong> tab and tap <strong>"Start Recording Video"</strong>. Once finished, your video will be saved right here with a download button!
                  </p>
                  <button
                    onClick={() => setMobileTab('studio')}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-orbitron text-xs font-bold shadow-lg cursor-pointer"
                  >
                    Start Recording Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {savedTakes.map((take) => (
                    <div
                      key={take.id}
                      className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-cyan-500/40 bg-black/60 flex flex-col justify-between gap-3 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                    >
                      {/* Video Player */}
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/15">
                        <video
                          src={take.url}
                          controls
                          playsInline
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Video Info */}
                      <div>
                        <h4 className="font-orbitron font-bold text-xs sm:text-sm text-white line-clamp-1">
                          {take.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 mt-1 flex-wrap">
                          <span className="text-cyan-300 font-bold">
                            ⏱️ {Math.floor(take.durationSeconds / 60)}m {take.durationSeconds % 60}s
                          </span>
                          <span>•</span>
                          <span>📦 {(take.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                          <span>•</span>
                          <span>📅 {new Date(take.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      {/* Export & Download Buttons */}
                      <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                        {/* Download Video File */}
                        <button
                          onClick={() => handleDownloadVideo(take)}
                          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-orbitron font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                          title="Download video file (.mp4/.webm) to your phone or laptop"
                        >
                          <Download size={14} />
                          <span>Download File</span>
                        </button>

                        {/* Share / Save to Camera Roll */}
                        <button
                          onClick={() => handleShareVideo(take)}
                          className="py-2 px-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-orbitron font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                          title="Save to Camera Roll / Share sheet"
                        >
                          <Share2 size={14} />
                          <span>Share / Save</span>
                        </button>

                        {/* Delete Take */}
                        <button
                          onClick={() => handleDeleteTake(take.id)}
                          className="p-2 rounded-xl bg-white/10 hover:bg-red-500/30 text-gray-400 hover:text-red-300 border border-white/15 transition-all cursor-pointer"
                          title="Delete this take"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* TAB 4: SPEECH GENERATOR & SCRIPT STUDIO (FOR ANY COURSE) */}
          {/* ======================================================= */}
          {mobileTab === 'rubric' && (
            <div className="w-full flex flex-col gap-4 pb-16 touch-pan-y animate-fade-in">
              {/* Header Banner */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-fuchsia-950/70 via-indigo-950/60 to-cyan-950/70 border border-fuchsia-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-fuchsia-600 to-indigo-600 text-white shadow-md shrink-0">
                    <GraduationCap size={22} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-orbitron font-black text-sm sm:text-base text-white">
                        Speech Generator (Any Course or Topic)
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 font-bold flex items-center gap-1">
                        <Sparkles size={11} className="text-amber-300 animate-pulse" />
                        <span>Einstein AI</span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 font-sans mt-0.5">
                      Give it your course, topic, and any little bullet points. It writes the exact spoken speech and loads it straight into your teleprompter.
                    </p>
                  </div>
                </div>

                {/* Target Duration Selector in Generator */}
                <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/15 shrink-0 self-end sm:self-center">
                  <span className="text-[10px] font-orbitron text-amber-300 font-bold px-1.5">Length:</span>
                  {[5, 3, 2].map((m) => (
                    <button
                      key={m}
                      onClick={() => handleDurationChange(m)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-orbitron font-bold transition-all cursor-pointer ${
                        targetMinutes === m
                          ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {m} Min
                    </button>
                  ))}
                </div>
              </div>

              {/* Success Notification Banner */}
              {generationSuccess && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 shrink-0">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-orbitron font-bold text-white flex items-center gap-1.5">
                        <span>Speech Ready & Loaded Into Teleprompter!</span>
                      </div>
                      <p className="text-[11px] text-emerald-200 font-sans">
                        "{activePreset.title}" • {activePreset.wordCount} words formatted into {activePreset.sections.length} timed sections.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setMobileTab('studio')}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-orbitron font-black text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer active:scale-95"
                    >
                      <Video size={14} className="text-black" />
                      <span>Start Studio (Record)</span>
                    </button>
                    <button
                      onClick={() => setMobileTab('prompter')}
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-orbitron text-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <FileVideo size={14} className="text-amber-300" />
                      <span>Prompter Only</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {generationError && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-400 shrink-0" />
                    <span>{generationError}</span>
                  </div>
                  <button
                    onClick={() => setGenerationError(null)}
                    className="p-1 text-red-300 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* PRIMARY PROMPT BOX: WHAT DO YOU WANT TO TALK ABOUT? */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-black/85 via-[#130b2b] to-black/90 border-2 border-fuchsia-500/50 shadow-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-fuchsia-400 animate-pulse" />
                    <span className="font-orbitron font-black text-sm text-white">
                      Speech Topic & Prompt Box
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-400/30">
                    Works for any new class or speech
                  </span>
                </div>

                {/* 1. COURSE / CLASS NAME */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-orbitron font-bold text-gray-200 flex items-center justify-between">
                    <span>1. Course / Class Name (or Speech Type)</span>
                    <span className="text-[10px] text-gray-400 font-sans font-normal">Optional</span>
                  </label>
                  <input
                    type="text"
                    value={courseInput}
                    onChange={(e) => setCourseInput(e.target.value)}
                    placeholder="e.g. Business Law, College Algebra, Marketing, or General Presentation"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-gray-400 outline-none focus:border-cyan-400 focus:bg-white/15 font-sans transition-all"
                  />
                  {/* Quick-Pick Course Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] font-mono text-gray-400">Quick Pick:</span>
                    {[
                      'College Algebra',
                      'Business Law',
                      'Business Management',
                      'Communications',
                      'Marketing & Sales',
                      'Entrepreneurship',
                      'General Presentation',
                    ].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCourseInput(c)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                          courseInput === c
                            ? 'bg-cyan-500 text-black font-bold border-cyan-400'
                            : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/15 hover:text-white'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. SPEECH TOPIC */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-orbitron font-bold text-gray-200">
                    2. Speech Topic / Title
                  </label>
                  <input
                    type="text"
                    value={customTopicInput}
                    onChange={(e) => setCustomTopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerateCustomScript();
                      }
                    }}
                    placeholder="e.g. Solving negative exponents in algebra, or Why I am launching Texas enterprises..."
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-gray-400 outline-none focus:border-fuchsia-400 focus:bg-white/15 font-sans transition-all"
                  />
                </div>

                {/* 3. LITTLE THINGS & NOTES TO TALK ABOUT */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-orbitron font-bold text-gray-200 flex items-center justify-between">
                    <span>3. Little Things & Points You Need to Talk About</span>
                    <span className="text-[10px] text-fuchsia-300 font-mono">Inside the Prompt</span>
                  </label>
                  <textarea
                    rows={4}
                    value={customNotesInput}
                    onChange={(e) => setCustomNotesInput(e.target.value)}
                    placeholder={`Type in any specific points, formulas, or details you want covered:
• Dallas roots & balancing adult life with online degree
• SMART milestones and daily study discipline
• Formulas, concepts, or homework takeaways
• Building generational wealth and Texas business vision...`}
                    className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-base sm:text-sm text-white placeholder-gray-400 outline-none focus:border-fuchsia-400 focus:bg-white/15 font-sans leading-relaxed transition-all resize-y min-h-[95px]"
                  />

                  {/* Tap-to-add suggestion chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] font-mono text-gray-400">Tap to Add:</span>
                    {[
                      'Dallas, Texas Roots',
                      'Habits of Success',
                      'Time Management Windows',
                      'Generational Wealth',
                      'Overcoming Obstacles',
                      'Texas Enterprise Vision',
                      'Step-by-Step Problem Solving',
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setCustomNotesInput((prev) =>
                            prev ? `${prev.trim()}\n• ${chip}` : `• ${chip}`
                          );
                        }}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-fuchsia-950/40 hover:bg-fuchsia-900/60 border border-fuchsia-500/30 text-fuchsia-200 cursor-pointer flex items-center gap-1 transition-all"
                      >
                        <Plus size={10} className="text-fuchsia-400" />
                        <span>{chip}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. TONE SELECTION */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-white/10">
                  <div className="flex items-center gap-1 text-[11px] font-orbitron text-gray-300 font-semibold">
                    <span>Tone:</span>
                    <div className="flex items-center gap-1 ml-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSpeechTone('grounded')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                          speechTone === 'grounded'
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold shadow'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        Plain Texas Grounded (10th-grade)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSpeechTone('academic')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                          speechTone === 'academic'
                            ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold shadow'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        College Academic
                      </button>
                      <button
                        type="button"
                        onClick={() => setSpeechTone('inspirational')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                          speechTone === 'inspirational'
                            ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold shadow'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        Inspirational Leader
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-cyan-300 self-end sm:self-center">
                    Target: {targetMinutes} Min (~{Math.round(targetMinutes * 125)} words)
                  </div>
                </div>

                {/* GENERATE BUTTON */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <button
                    onClick={handleGenerateCustomScript}
                    disabled={isGeneratingScript || (!customTopicInput.trim() && !customNotesInput.trim())}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 disabled:opacity-50 text-white font-orbitron font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(217,70,239,0.5)] transition-all cursor-pointer active:scale-98"
                  >
                    {isGeneratingScript ? (
                      <>
                        <RefreshCw size={16} className="animate-spin text-white" />
                        <span>Writing Your {targetMinutes}-Min Spoken Speech...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} className="text-amber-300 animate-pulse" />
                        <span>Generate {targetMinutes}-Minute Speech (Einstein AI)</span>
                      </>
                    )}
                  </button>

                  {/* Reset prompt fields */}
                  {(customTopicInput || customNotesInput || courseInput) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTopicInput('');
                        setCustomNotesInput('');
                        setCourseInput('');
                        setGenerationSuccess(false);
                      }}
                      className="px-3 py-3 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white text-xs font-orbitron transition-all cursor-pointer"
                      title="Clear prompt fields"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* CURRENT ACTIVE SPEECH PREVIEW & EDIT SECTION */}
              <div className="p-4 rounded-2xl bg-black/60 border border-cyan-500/30 flex flex-col gap-3 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-orbitron font-bold text-sm text-cyan-300">
                        Current Active Speech
                      </span>
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                        {activePreset.course}
                      </span>
                      <span className="text-[10px] font-mono text-gray-300 bg-white/10 px-2 py-0.5 rounded">
                        {totalWordCount} words • ~{formattedEstTime}
                      </span>
                    </div>
                    <h4 className="font-orbitron font-bold text-xs text-white mt-1">
                      {activePreset.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
                    <button
                      onClick={() => setMobileTab('studio')}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-orbitron font-bold text-[11px] flex items-center gap-1 shadow cursor-pointer active:scale-95"
                    >
                      <Video size={13} />
                      <span>Start Studio</span>
                    </button>

                    <button
                      onClick={() => setIsEditingScript((prev) => !prev)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer ${
                        isEditingScript
                          ? 'bg-amber-500 text-black font-bold'
                          : 'bg-white/10 hover:bg-white/20 text-gray-200'
                      }`}
                      title="Edit speech words directly"
                    >
                      <Edit3 size={12} />
                      <span>{isEditingScript ? 'Done Editing' : 'Edit Words'}</span>
                    </button>

                    <button
                      onClick={handleCopyScript}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-mono flex items-center gap-1 text-gray-200 cursor-pointer"
                      title="Copy speech to clipboard"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    {onSendToEinstein && (
                      <button
                        onClick={() => onSendToEinstein(fullScriptText)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-mono text-amber-300 hover:text-white flex items-center gap-1 cursor-pointer"
                        title="Send script to Einstein chat for live feedback"
                      >
                        <GraduationCap size={13} className="text-amber-400" />
                        <span>Ask Einstein</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Cards */}
                <div className="space-y-2.5">
                  {activePreset.sections.map((sec, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-mono pb-1 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/40 text-[10px]">
                            {sec.timestamp}
                          </span>
                          <span className="font-orbitron font-semibold text-white text-[11px]">
                            {sec.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 italic">
                          {sec.speakerNotes}
                        </span>
                      </div>

                      {isEditingScript ? (
                        <textarea
                          rows={3}
                          value={sec.text}
                          onChange={(e) => handleUpdateSectionText(idx, e.target.value)}
                          className="w-full bg-black/50 border border-fuchsia-400/40 rounded-lg p-2 text-sm text-white font-sans outline-none focus:border-cyan-400 leading-relaxed resize-y"
                        />
                      ) : (
                        <p className="text-xs sm:text-sm text-gray-200 whitespace-pre-line leading-relaxed font-sans">
                          {sec.text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* MY CUSTOM GENERATED SPEECHES (IF ANY) */}
              {customSpeeches.length > 0 && (
                <div className="p-4 rounded-2xl bg-black/60 border border-purple-500/30 flex flex-col gap-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-orbitron font-bold text-sm text-purple-300 flex items-center gap-2">
                      <Sparkles size={16} className="text-purple-400" />
                      <span>My Generated Speeches ({customSpeeches.length})</span>
                    </h3>
                    <span className="text-[10px] font-mono text-gray-400">
                      Saved across sessions
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {customSpeeches.map((sp) => (
                      <div
                        key={sp.id}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                          selectedPresetId === sp.id
                            ? 'bg-purple-950/60 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div
                          onClick={() => {
                            setSelectedPresetId(sp.id);
                            setMobileTab('studio');
                          }}
                          className="cursor-pointer"
                        >
                          <div className="font-orbitron font-bold text-xs text-white line-clamp-1">
                            {sp.title}
                          </div>
                          <div className="text-[10px] font-mono text-cyan-300 mt-0.5">
                            {sp.course} • {sp.durationEst}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px] font-mono">
                          <button
                            onClick={() => {
                              setSelectedPresetId(sp.id);
                              setMobileTab('studio');
                            }}
                            className="text-cyan-300 hover:text-white font-bold cursor-pointer"
                          >
                            Load Into Studio →
                          </button>
                          <button
                            onClick={() => handleDeleteCustomSpeech(sp.id)}
                            className="text-gray-400 hover:text-red-400 cursor-pointer"
                            title="Delete this custom speech"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* READY-TO-USE COLLEGE SPEECH PRESETS (FOR ANY COURSE) */}
              <div className="p-4 rounded-2xl bg-black/60 border border-fuchsia-500/30 flex flex-col gap-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-orbitron font-bold text-sm text-fuchsia-300 flex items-center gap-2">
                    <BookOpen size={16} className="text-fuchsia-400" />
                    <span>Ready-to-Use Course Speeches ({targetMinutes} Minutes)</span>
                  </h3>
                  <span className="text-[10px] font-mono text-gray-400">
                    Pre-written templates
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DEFAULT_PRESETS.filter((p) => p.targetMins === targetMinutes).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPresetId(p.id);
                        setMobileTab('studio');
                      }}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        selectedPresetId === p.id
                          ? 'bg-fuchsia-950/60 border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.3)]'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-orbitron font-bold text-xs text-white line-clamp-1">{p.title}</div>
                      <div className="text-[10px] font-mono text-cyan-300 mt-0.5">{p.course} • {p.durationEst}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* COLLAPSIBLE COLLEGE PRESENTATION RUBRIC (NEVER BLOCKS THE SCREEN) */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col gap-2 shadow">
                <button
                  type="button"
                  onClick={() => setShowRubricAccordion((prev) => !prev)}
                  className="flex items-center justify-between text-xs font-orbitron font-bold text-gray-300 hover:text-white cursor-pointer w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>College Presentation Rubric Checklist</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-gray-400">
                    <span>{showRubricAccordion ? 'Hide' : 'Show Standards'}</span>
                    {showRubricAccordion ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {showRubricAccordion && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-white/10 animate-fade-in">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">Pacing & Timing</span>
                        <span className="text-gray-400 text-[11px]">Strictly within {targetMinutes}:00 limit. Aim for 125 WPM.</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">Authentic Delivery</span>
                        <span className="text-gray-400 text-[11px]">10th-grade plain vocabulary, grounded Texas honesty.</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">Core Principles</span>
                        <span className="text-gray-400 text-[11px]">Habits of success, time management, step-by-step problem solving.</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">Generational Wealth</span>
                        <span className="text-gray-400 text-[11px]">Dallas roots, balancing work grind, and family legacy.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ========================================================= */}
        {/* MODAL: RECORDED VIDEO REVIEW & EXPORT SHEET */}
        {/* ========================================================= */}
        {showTakeExportModal && latestRecordedTake && (
          <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in">
            <div className="relative w-full max-w-lg bg-gradient-to-br from-[#120a2a] via-[#1a0e38] to-[#0d0720] border-2 border-cyan-400 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(6,182,212,0.4)] flex flex-col gap-4 text-white">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/40">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-orbitron font-black text-sm sm:text-base text-white">
                      Video Recorded & Saved!
                    </h3>
                    <p className="text-[11px] text-gray-300 font-sans">
                      Duration: {Math.floor(latestRecordedTake.durationSeconds / 60)}m {latestRecordedTake.durationSeconds % 60}s • Size: {(latestRecordedTake.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowTakeExportModal(false)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Video Player Preview */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/20 shadow-inner">
                <video
                  src={latestRecordedTake.url}
                  controls
                  playsInline
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Action Buttons: Take Video Out */}
              <div className="flex flex-col gap-2.5 pt-1">
                {/* 1. Download Video File */}
                <button
                  onClick={() => handleDownloadVideo(latestRecordedTake)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-fuchsia-600 hover:opacity-90 text-white font-orbitron font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all cursor-pointer active:scale-95"
                >
                  <Download size={16} />
                  <span>Download Video File ({latestRecordedTake.mimeType.includes('mp4') ? '.mp4' : '.webm'})</span>
                </button>

                {/* 2. Save to Camera Roll / Native Share */}
                <button
                  onClick={() => handleShareVideo(latestRecordedTake)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-orbitron font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <Share2 size={15} className="text-cyan-400" />
                  <span>Save to Camera Roll / Share Video</span>
                </button>

                {/* Record Another Take */}
                <button
                  onClick={() => {
                    setShowTakeExportModal(false);
                    setMobileTab('studio');
                  }}
                  className="w-full py-2 px-4 rounded-xl text-gray-400 hover:text-white text-xs font-mono text-center cursor-pointer"
                >
                  Keep Practicing & Record Another Take
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
