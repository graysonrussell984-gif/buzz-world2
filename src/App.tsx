import React, { useState, useEffect } from 'react';
import { RoomType } from './types';
import { ParticlesBackground } from './components/ParticlesBackground';
import { Sidebar } from './components/Sidebar';
import { ChatRoom } from './components/ChatRoom';
import { NavigationRoom } from './components/NavigationRoom';
import { LibraryRoom } from './components/LibraryRoom';
import { MemoryBrainRoom } from './components/MemoryBrainRoom';
import { VoiceVaultRoom } from './components/VoiceVaultRoom';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { VideoPresentationStudio } from './components/VideoPresentationStudio';
import { TexasBusinessModal } from './components/TexasBusinessModal';
import { PWAInstallButton } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { getDailyFruitForThought, getFormattedTodayString } from './data/fruitForThought';
import {
  Menu,
  Compass,
  BookOpen,
  Sparkles,
  GraduationCap,
  Bot,
  Zap,
  Brain,
  Mic,
  Flame,
  Volume2,
  VolumeX,
  RefreshCw,
  Award,
  RotateCcw,
  Clapperboard,
  Landmark,
} from 'lucide-react';

import { useCloudSync } from './hooks/useCloudSync';

export default function App() {
  const { syncStatus, connectedDevices } = useCloudSync();

  // Always open up directly on the home screen as requested
  const [currentRoom, setCurrentRoom] = useState<RoomType>('homepage');

  useEffect(() => {
    try {
      localStorage.setItem('current_room', 'homepage');
    } catch (e) {
      console.error(e);
    }
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [videoStudioOpen, setVideoStudioOpen] = useState(false);
  const [texasBusinessOpen, setTexasBusinessOpen] = useState(false);
  const [particlesEnabled, setParticlesEnabled] = useState(true);

  const [thoughtOffset, setThoughtOffset] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fft_offset');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [isSpeakingThought, setIsSpeakingThought] = useState(false);

  const dailyThought = getDailyFruitForThought(thoughtOffset);
  const formattedDate = getFormattedTodayString();

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleThoughtSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeakingThought) {
      window.speechSynthesis.cancel();
      setIsSpeakingThought(false);
      return;
    }
    window.speechSynthesis.cancel();
    const textToRead = `${dailyThought.headline}. ${dailyThought.speech}. Remember this: ${dailyThought.remembrance}. Today's action: ${dailyThought.actionCall}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    try {
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel') ||
            v.name.includes('Alex'))
      );
      if (naturalVoice) utterance.voice = naturalVoice;
    } catch {}

    utterance.onend = () => setIsSpeakingThought(false);
    utterance.onerror = () => setIsSpeakingThought(false);
    setIsSpeakingThought(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleNextThought = () => {
    if (isSpeakingThought && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingThought(false);
    }
    setThoughtOffset((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem('fft_offset', String(next));
      } catch {}
      return next;
    });
  };

  const handleResetToToday = () => {
    if (isSpeakingThought && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingThought(false);
    }
    setThoughtOffset(0);
    try {
      localStorage.removeItem('fft_offset');
    } catch {}
  };


  // Sync room changes to localStorage
  const navigateTo = (room: RoomType) => {
    setCurrentRoom(room);
    try {
      localStorage.setItem('current_room', room);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSendVoiceToChat = (room: 'buzz' | 'einstein' | 'godmode', transcript: string) => {
    // Save to target room's persistent database safely via append without risk of array clobbering
    try {
      const newMsg = {
        id: `msg-voice-${Date.now()}`,
        sender: 'user',
        text: `[Voice Note]: ${transcript}`,
        timestamp: Date.now(),
        isVoice: true,
      };

      // Safely append to cloud database & broadcast across devices
      fetch(`/api/database/chat/${room}/append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMsg }),
      }).catch((e) => console.warn('Voice to chat DB sync:', e));
    } catch (e) {
      console.warn(e);
    }
    navigateTo(`${room}-room` as RoomType);
  };

  return (
    <div className="relative min-h-screen text-white select-text">
      {/* Background Particles */}
      {particlesEnabled && <ParticlesBackground />}

      {/* Slide-out Navigation Drawer */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={navigateTo}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenVideoStudio={() => setVideoStudioOpen(true)}
        onOpenTexasBusiness={() => setTexasBusinessOpen(true)}
      />

      {/* Profile & Settings Modals */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        particlesEnabled={particlesEnabled}
        onToggleParticles={() => setParticlesEnabled((p) => !p)}
      />

      {/* 2-Minute College Video Presentation & Teleprompter Studio */}
      <VideoPresentationStudio
        isOpen={videoStudioOpen}
        onClose={() => setVideoStudioOpen(false)}
        onSendToEinstein={(script) => {
          setVideoStudioOpen(false);
          // Append to einstein chat
          const newMsg = {
            id: `msg-video-${Date.now()}`,
            sender: 'user',
            text: `[2-MINUTE VIDEO PRESENTATION SPEECH]:\nPlease review and audit this 2-minute spoken script against my college coursework rubric and writing rules:\n\n"${script}"`,
            timestamp: Date.now(),
          };
          fetch('/api/database/chat/einstein/append', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: newMsg }),
          }).catch((e) => console.warn(e));
          navigateTo('einstein-room');
        }}
        onSaveToProjects={(title) => {
          fetch('/api/database/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project: {
                id: `proj-${Date.now()}`,
                text: title,
                createdAt: Date.now(),
              },
            }),
          }).catch((e) => console.warn(e));
        }}
      />

      {/* Texas Businesses & Generational Wealth Playbook Modal */}
      <TexasBusinessModal
        isOpen={texasBusinessOpen}
        onClose={() => setTexasBusinessOpen(false)}
      />

      {/* ========================================================= */}
      {/* HOMEPAGE VIEW */}
      {/* ========================================================= */}
      {currentRoom === 'homepage' && (
        <div className="relative min-h-[100dvh] flex flex-col p-3 sm:p-5 md:p-6 gap-3 sm:gap-4 max-w-7xl mx-auto w-full pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* Main Space Wallpaper */}
          <div
            className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat -z-20"
            style={{
              backgroundImage: `url('https://i.postimg.cc/5ywKpzvD/Screenshot-20260929-094937-Google.jpg')`,
              backgroundColor: 'rgba(11, 7, 26, 0.45)',
              backgroundBlendMode: 'overlay',
            }}
          />

          {/* Header */}
          <header className="glass-panel min-h-[4.5rem] sm:min-h-[5.5rem] py-3 px-3.5 sm:px-6 md:px-10 w-full flex items-center justify-between border border-fuchsia-500/40 shadow-[0_0_25px_rgba(217,70,239,0.25)] shrink-0">
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 sm:p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/20 text-cyan-400 hover:text-white transition-all cursor-pointer font-orbitron shrink-0"
                title="Open Navigation"
              >
                <Menu size={20} className="sm:w-6 sm:h-6" />
              </button>
              <div
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-emerald-500/30 text-[11px] font-orbitron tracking-wider text-emerald-300"
                title={connectedDevices > 1 ? `${connectedDevices} devices linked live` : 'Real-time cloud sync active'}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    syncStatus === 'connected'
                      ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                      : 'bg-amber-400 animate-ping'
                  }`}
                />
                <span>{syncStatus === 'connected' ? 'Cloud Synced' : 'Syncing'}</span>
              </div>
            </div>

            <h1 className="font-orbitron text-xs xs:text-sm sm:text-xl md:text-2xl lg:text-3xl font-black tracking-wide sm:tracking-widest text-gradient-neon text-center uppercase flex-1 px-2 sm:px-4 leading-tight">
              Welcome Now let's get down to business
            </h1>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <PWAInstallButton variant="button" />
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 sm:p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/20 text-fuchsia-400 hover:text-white transition-all cursor-pointer shrink-0"
                title="Settings"
              >
                <Sparkles size={20} className="sm:w-[22px] sm:h-[22px]" />
              </button>
            </div>
          </header>

          {/* Fruit for Thought Card (Clean Hero Banner without cluttered bubbles) */}
          <div className="w-full">
            <div className="glass-panel px-4 py-4 sm:px-6 sm:py-5 border border-amber-500/30 bg-gradient-to-br from-black/60 via-amber-950/15 to-purple-950/25 shadow-[0_0_25px_rgba(245,158,11,0.15)] flex flex-col gap-3">
              {/* Header Row: Fruit for Thought Badge + Date & Audio / Shuffle Controls */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-fuchsia-500/25 border border-amber-400/50 text-[10px] sm:text-xs uppercase tracking-[0.22em] text-amber-300 font-orbitron font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(251,191,36,0.25)]">
                    <Flame size={13} className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                    <span>Fruit for Thought</span>
                  </span>
                  <span className="text-[10px] sm:text-xs font-mono text-cyan-300/90 font-medium">
                    • {formattedDate}
                  </span>
                  {thoughtOffset !== 0 && (
                    <span className="text-[9px] font-mono text-fuchsia-300 bg-fuchsia-500/20 px-2 py-0.5 rounded-full border border-fuchsia-400/30">
                      Daily Word #{dailyThought.dayNumber}
                    </span>
                  )}
                </div>

                {/* Audio Read-Out & Next Thought Controls */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={toggleThoughtSpeech}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] sm:text-xs font-orbitron font-semibold transition-all cursor-pointer shadow-md active:scale-95 ${
                      isSpeakingThought
                        ? 'bg-fuchsia-600/30 border-fuchsia-400 text-fuchsia-200 shadow-[0_0_12px_rgba(217,70,239,0.5)]'
                        : 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/30 hover:border-cyan-300'
                    }`}
                    title={isSpeakingThought ? 'Stop audio speech' : "Listen to today's speech aloud"}
                  >
                    {isSpeakingThought ? (
                      <VolumeX size={13} className="text-fuchsia-400" />
                    ) : (
                      <Volume2 size={13} className="text-cyan-400" />
                    )}
                    <span>{isSpeakingThought ? 'Stop Voice' : 'Listen'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextThought}
                    className="p-1.5 sm:p-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-all cursor-pointer shadow-md active:scale-90"
                    title="Get another uplifting thought / speech"
                  >
                    <RefreshCw size={13} />
                  </button>

                  {thoughtOffset !== 0 && (
                    <button
                      type="button"
                      onClick={handleResetToToday}
                      className="p-1.5 sm:p-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 transition-all cursor-pointer shadow-md active:scale-90"
                      title="Return to today's scheduled thought"
                    >
                      <RotateCcw size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Daily Speech Headline */}
              <h2 className="text-base sm:text-lg md:text-xl font-orbitron font-black tracking-wide text-white leading-snug">
                "{dailyThought.headline}"
              </h2>

              {/* Encouraging & Action-Oriented Speech Text */}
              <p className="text-xs sm:text-sm md:text-base leading-relaxed text-slate-200/95 font-sans select-text">
                {dailyThought.speech}
              </p>
            </div>
          </div>



          {/* Download App to Phone Install Banner */}
          <PWAInstallButton variant="banner" />

          {/* Quick Action Hub: Navigation Hub, Memory Bank & Voice Conversations */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <nav
              onClick={() => navigateTo('navigation-room')}
              className="glass-panel h-12 sm:h-14 flex items-center justify-center font-orbitron text-xs sm:text-sm font-bold tracking-wider text-white hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.6)] transition-all cursor-pointer border border-white/30"
            >
              <div className="flex items-center gap-2">
                <Compass size={18} className="text-cyan-400" />
                <span>Navigation Menu</span>
              </div>
            </nav>

            <div
              onClick={() => navigateTo('memory-room')}
              className="glass-panel h-12 sm:h-14 flex items-center justify-center font-orbitron text-xs sm:text-sm font-bold tracking-wider text-white hover:border-fuchsia-400 hover:shadow-[0_0_15px_rgba(217,70,239,0.6)] transition-all cursor-pointer border border-fuchsia-500/40 bg-fuchsia-950/20"
            >
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-fuchsia-400" />
                <span>Memory Database</span>
              </div>
            </div>

            <div
              onClick={() => navigateTo('voice-room')}
              className="glass-panel h-12 sm:h-14 flex items-center justify-center font-orbitron text-xs sm:text-sm font-bold tracking-wider text-white hover:border-amber-400 hover:shadow-[0_0_15px_rgba(245,158,11,0.6)] transition-all cursor-pointer border border-amber-500/40 bg-amber-950/20"
            >
              <div className="flex items-center gap-2">
                <Mic size={18} className="text-amber-400" />
                <span>Live Voice Studio</span>
              </div>
            </div>
          </div>

          {/* Quick Launchers: 2-Minute College Video Studio & Texas Businesses Playbook */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <button
              onClick={() => setVideoStudioOpen(true)}
              className="glass-panel px-4 py-2.5 flex items-center justify-between border border-amber-400/50 bg-gradient-to-r from-amber-500/15 via-fuchsia-500/15 to-cyan-500/15 hover:border-amber-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all cursor-pointer group rounded-2xl text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-amber-500/25 border border-amber-400/50 text-amber-300 shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_10px_rgba(245,158,11,0.4)]">
                  <Clapperboard size={18} />
                </div>
                <div className="min-w-0">
                  <div className="font-orbitron font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                    <span>Video Presentation Studio</span>
                    <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-400/40 px-1.5 py-0.2 rounded-full">
                      5-Min & 2-Min
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 font-sans truncate">
                    5:00 / 2:00 Rehearsal Timer • Slower Teleprompter • Rubric Coach
                  </p>
                </div>
              </div>
              <span className="text-amber-400 font-orbitron text-xs shrink-0 ml-2 group-hover:translate-x-1 transition-transform">
                Launch →
              </span>
            </button>

            <button
              onClick={() => setTexasBusinessOpen(true)}
              className="glass-panel px-4 py-2.5 flex items-center justify-between border border-cyan-400/50 bg-gradient-to-r from-cyan-500/15 via-purple-500/15 to-fuchsia-500/15 hover:border-cyan-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all cursor-pointer group rounded-2xl text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-cyan-500/25 border border-cyan-400/50 text-cyan-300 shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                  <Landmark size={18} />
                </div>
                <div className="min-w-0">
                  <div className="font-orbitron font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                    <span>Texas Business & Wealth Playbook</span>
                    <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-400/40 px-1.5 py-0.2 rounded-full">
                      Dallas, TX
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 font-sans truncate">
                    Carpentry • Bar • Food Truck • TFER Health Rules • Banking
                  </p>
                </div>
              </div>
              <span className="text-cyan-400 font-orbitron text-xs shrink-0 ml-2 group-hover:translate-x-1 transition-transform">
                View →
              </span>
            </button>
          </div>

          {/* Main 3 AI Assistants Grid */}
          <main className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5 w-full flex-1 min-h-[300px]">
            {/* Einstein Box */}
            <div
              onClick={() => navigateTo('einstein-room')}
              className="glass-panel p-4 sm:p-6 flex flex-col items-center justify-center text-center gap-3 sm:gap-4 hover:border-fuchsia-400 hover:shadow-[0_0_25px_rgba(217,70,239,0.6)] hover:-translate-y-1 transition-all cursor-pointer border border-white/30 group"
            >
              <div className="relative">
                <img
                  src="https://i.postimg.cc/q68vzNnY/einstein-profile-jpg.jpg"
                  alt="Einstein"
                  className="w-24 h-24 xs:w-28 xs:h-28 sm:w-30 sm:h-30 md:w-32 md:h-32 rounded-full object-cover border-3 border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.5)] group-hover:scale-105 transition-transform"
                />
                <span className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 p-1.5 sm:p-2 rounded-full bg-fuchsia-600 text-white shadow-lg">
                  <GraduationCap size={16} className="sm:w-[18px] sm:h-[18px]" />
                </span>
              </div>
              <div>
                <span className="font-orbitron text-lg sm:text-xl font-bold tracking-wider text-white group-hover:text-cyan-400 transition-colors">
                  Einstein
                </span>
                <p className="text-xs text-gray-300 font-mono mt-1">
                  Schoolwork, rough drafts & humanized essays
                </p>
              </div>
            </div>

            {/* Buzz Box */}
            <div
              onClick={() => navigateTo('buzz-room')}
              className="glass-panel p-4 sm:p-6 flex flex-col items-center justify-center text-center gap-3 sm:gap-4 hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] hover:-translate-y-1 transition-all cursor-pointer border border-white/30 group"
            >
              <div className="relative">
                <img
                  src="https://i.postimg.cc/gnFwmW8W/buzz-profile-jpg.jpg"
                  alt="Buzz"
                  className="w-24 h-24 xs:w-28 xs:h-28 sm:w-30 sm:h-30 md:w-32 md:h-32 rounded-full object-cover border-3 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] group-hover:scale-105 transition-transform"
                />
                <span className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 p-1.5 sm:p-2 rounded-full bg-cyan-600 text-white shadow-lg">
                  <Bot size={16} className="sm:w-[18px] sm:h-[18px]" />
                </span>
              </div>
              <div>
                <span className="font-orbitron text-lg sm:text-xl font-bold tracking-wider text-white group-hover:text-cyan-400 transition-colors">
                  Buzz
                </span>
                <p className="text-xs text-gray-300 font-mono mt-1">
                  Primary assistant & eternal memory bank
                </p>
              </div>
            </div>

            {/* God Mode Box */}
            <div
              onClick={() => navigateTo('godmode-room')}
              className="glass-panel p-4 sm:p-6 flex flex-col items-center justify-center text-center gap-3 sm:gap-4 hover:border-amber-400 hover:shadow-[0_0_25px_rgba(245,158,11,0.6)] hover:-translate-y-1 transition-all cursor-pointer border border-white/30 group"
            >
              <div className="relative">
                <img
                  src="https://i.postimg.cc/Th9wMDdK/libray-backgrond.jpg"
                  alt="God Mode"
                  className="w-24 h-24 xs:w-28 xs:h-28 sm:w-30 sm:h-30 md:w-32 md:h-32 rounded-full object-cover border-3 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] group-hover:scale-105 transition-transform"
                />
                <span className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 p-1.5 sm:p-2 rounded-full bg-amber-600 text-white shadow-lg">
                  <Zap size={16} className="sm:w-[18px] sm:h-[18px]" />
                </span>
              </div>
              <div>
                <span className="font-orbitron text-lg sm:text-xl font-bold tracking-wider text-white group-hover:text-amber-400 transition-colors">
                  God mode
                </span>
                <p className="text-xs text-gray-300 font-mono mt-1">
                  Unfiltered truth, life goals & deep strategy
                </p>
              </div>
            </div>
          </main>

          {/* Footer: Library */}
          <footer
            onClick={() => navigateTo('library-room')}
            className="glass-panel h-14 sm:h-16 w-full flex items-center justify-center font-orbitron text-xs sm:text-sm md:text-base font-bold tracking-widest text-white hover:border-fuchsia-400 hover:shadow-[0_0_20px_rgba(217,70,239,0.6)] transition-all cursor-pointer border border-white/30 shrink-0"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <BookOpen size={18} className="text-fuchsia-400 sm:w-5 sm:h-5" />
              <span>Library Room</span>
              <span className="text-[11px] text-gray-400 font-mono hidden sm:inline">
                (View All Saved Conversations)
              </span>
            </div>
          </footer>
        </div>
      )}

      {/* ========================================================= */}
      {/* NAVIGATION HUB ROOM */}
      {/* ========================================================= */}
      {currentRoom === 'navigation-room' && (
        <NavigationRoom
          onBack={() => navigateTo('homepage')}
          onOpenTexasBusiness={() => setTexasBusinessOpen(true)}
        />
      )}

      {/* ========================================================= */}
      {/* MEMORY DATABASE ROOM */}
      {/* ========================================================= */}
      {currentRoom === 'memory-room' && (
        <MemoryBrainRoom
          onBack={() => navigateTo('homepage')}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      )}

      {/* ========================================================= */}
      {/* VOICE CONVERSATIONS VAULT ROOM */}
      {/* ========================================================= */}
      {currentRoom === 'voice-room' && (
        <VoiceVaultRoom
          onBack={() => navigateTo('homepage')}
          onOpenSidebar={() => setSidebarOpen(true)}
          onSendToChat={handleSendVoiceToChat}
        />
      )}

      {/* ========================================================= */}
      {/* BUZZ ROOM */}
      {/* ========================================================= */}
      {currentRoom === 'buzz-room' && (
        <ChatRoom
          room="buzz"
          title="Buzz"
          initialGreeting="I am Buzz. I remember everything. How can I help you today?"
          backgroundImage="https://i.postimg.cc/T3CnqV2x/Screenshot-20260930-194303-Pinterest.jpg"
          bgSize="contain"
          onBack={() => navigateTo('homepage')}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      )}

      {/* ========================================================= */}
      {/* EINSTEIN ROOM */}
      {/* ========================================================= */}
      {currentRoom === 'einstein-room' && (
        <ChatRoom
          room="einstein"
          title="Einstein"
          initialGreeting="I am Einstein. I am strictly for school. Let's fix that grammar."
          backgroundImage="https://i.postimg.cc/NMYVtnpv/Screenshot-20260930-221454-Google.jpg"
          bgSize="contain"
          onBack={() => navigateTo('homepage')}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      )}

      {/* ========================================================= */}
      {/* GOD MODE ROOM */}
      {/* ========================================================= */}
      {currentRoom === 'godmode-room' && (
        <ChatRoom
          room="godmode"
          title="God Mode"
          initialGreeting="I am God Mode. How can I help you today?"
          backgroundImage="https://i.postimg.cc/VkVdkDLn/Dragon-ball.jpg"
          bgSize="cover"
          onBack={() => navigateTo('homepage')}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      )}

      {/* ========================================================= */}
      {/* LIBRARY ROOM */}
      {/* ========================================================= */}
      {currentRoom === 'library-room' && (
        <LibraryRoom
          onBack={() => navigateTo('homepage')}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      )}

      {/* Offline Status Toast Indicator */}
      <OfflineIndicator />
    </div>
  );
}
