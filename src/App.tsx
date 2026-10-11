import React, { useState } from 'react';
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
} from 'lucide-react';

export default function App() {
  const [currentRoom, setCurrentRoom] = useState<RoomType>(() => {
    try {
      const saved = localStorage.getItem('current_room');
      if (
        saved &&
        [
          'homepage',
          'navigation-room',
          'buzz-room',
          'einstein-room',
          'godmode-room',
          'library-room',
          'memory-room',
          'voice-room',
        ].includes(saved)
      ) {
        return saved as RoomType;
      }
    } catch (e) {
      console.error(e);
    }
    return 'homepage';
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [particlesEnabled, setParticlesEnabled] = useState(true);

  const focusPillars = [
    { label: 'Focus', value: '90%', tone: 'cyan' },
    { label: 'Momentum', value: 'Strong', tone: 'fuchsia' },
    { label: 'Reset', value: 'Today', tone: 'amber' },
  ];

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
    // Save to target room's input / storage and jump to that room
    try {
      const historyKey = `chat_history_${room}`;
      const existing = JSON.parse(localStorage.getItem(historyKey) || '[]');
      existing.push({
        id: `msg-voice-${Date.now()}`,
        sender: 'user',
        text: `[Voice Note]: ${transcript}`,
        timestamp: Date.now(),
      });
      localStorage.setItem(historyKey, JSON.stringify(existing));
    } catch (e) {
      console.warn(e);
    }
    navigateTo(`${room}-room` as RoomType);
  };

  return (
    <div className="relative min-h-screen text-white select-none">
      {/* Background Particles */}
      {particlesEnabled && <ParticlesBackground />}

      {/* Slide-out Navigation Drawer */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={navigateTo}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Profile & Settings Modals */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        particlesEnabled={particlesEnabled}
        onToggleParticles={() => setParticlesEnabled((p) => !p)}
      />

      {/* ========================================================= */}
      {/* HOMEPAGE VIEW */}
      {/* ========================================================= */}
      {currentRoom === 'homepage' && (
        <div className="relative min-h-screen flex flex-col p-4 md:p-6 gap-4">
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
          <header className="glass-panel h-24 md:h-28 w-full flex items-center justify-between px-6 md:px-10 border border-fuchsia-500/40 shadow-[0_0_25px_rgba(217,70,239,0.25)]">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/20 text-cyan-400 hover:text-white transition-all cursor-pointer font-orbitron"
              title="Open Navigation"
            >
              <Menu size={24} />
            </button>

            <h1 className="font-orbitron text-lg sm:text-2xl md:text-3xl font-black tracking-widest text-gradient-neon text-center uppercase flex-1 px-4">
              Welcome Now let's get down to business
            </h1>

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/20 text-fuchsia-400 hover:text-white transition-all cursor-pointer"
              title="Settings"
            >
              <Sparkles size={22} />
            </button>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-4">
            <div className="glass-panel px-5 py-4 md:px-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] md:text-xs uppercase tracking-[0.32em] text-cyan-300/80 font-orbitron">
                    Daily reset
                  </p>
                  <h2 className="mt-2 text-xl md:text-2xl font-orbitron font-black tracking-wide text-white">
                    You are doing better than you think.
                  </h2>
                </div>
                <button
                  onClick={() => navigateTo('navigation-room')}
                  className="self-start rounded-full border border-cyan-400/60 bg-cyan-500/10 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-cyan-100 transition-all hover:border-cyan-300 hover:bg-cyan-500/20"
                >
                  OPEN HUB
                </button>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200/90">
                Keep your attention on the next honest move, not the whole mountain. This space is built to organize your thoughts, your work, and your momentum without the noise.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {focusPillars.map((pillar) => (
                <div
                  key={pillar.label}
                  className={`glass-panel p-3 text-center ${
                    pillar.tone === 'cyan'
                      ? 'border-cyan-400/40 bg-cyan-500/5'
                      : pillar.tone === 'fuchsia'
                        ? 'border-fuchsia-400/40 bg-fuchsia-500/5'
                        : 'border-amber-400/40 bg-amber-500/5'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-300">{pillar.label}</div>
                  <div className="mt-2 font-orbitron text-lg font-black text-white">{pillar.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Hub: Navigation Hub, Memory Bank & Voice Conversations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <nav
              onClick={() => navigateTo('navigation-room')}
              className="glass-panel h-14 flex items-center justify-center font-orbitron text-xs md:text-sm font-bold tracking-wider text-white hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.6)] transition-all cursor-pointer border border-white/30"
            >
              <div className="flex items-center gap-2">
                <Compass size={18} className="text-cyan-400" />
                <span>Navigation Menu</span>
              </div>
            </nav>

            <div
              onClick={() => navigateTo('memory-room')}
              className="glass-panel h-14 flex items-center justify-center font-orbitron text-xs md:text-sm font-bold tracking-wider text-white hover:border-fuchsia-400 hover:shadow-[0_0_15px_rgba(217,70,239,0.6)] transition-all cursor-pointer border border-fuchsia-500/40 bg-fuchsia-950/20"
            >
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-fuchsia-400" />
                <span>Memory Database</span>
              </div>
            </div>

            <div
              onClick={() => navigateTo('voice-room')}
              className="glass-panel h-14 flex items-center justify-center font-orbitron text-xs md:text-sm font-bold tracking-wider text-white hover:border-amber-400 hover:shadow-[0_0_15px_rgba(245,158,11,0.6)] transition-all cursor-pointer border border-amber-500/40 bg-amber-950/20"
            >
              <div className="flex items-center gap-2">
                <Mic size={18} className="text-amber-400" />
                <span>Voice Conversations</span>
              </div>
            </div>
          </div>

          {/* Main 3 AI Assistants Grid */}
          <main className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full flex-1 min-h-[360px]">
            {/* Einstein Box */}
            <div
              onClick={() => navigateTo('einstein-room')}
              className="glass-panel p-6 flex flex-col items-center justify-center text-center gap-4 hover:border-fuchsia-400 hover:shadow-[0_0_25px_rgba(217,70,239,0.6)] hover:-translate-y-1 transition-all cursor-pointer border border-white/30 group"
            >
              <div className="relative">
                <img
                  src="https://i.postimg.cc/q68vzNnY/einstein-profile-jpg.jpg"
                  alt="Einstein"
                  className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-3 border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.5)] group-hover:scale-105 transition-transform"
                />
                <span className="absolute -bottom-2 -right-2 p-2 rounded-full bg-fuchsia-600 text-white shadow-lg">
                  <GraduationCap size={18} />
                </span>
              </div>
              <div>
                <span className="font-orbitron text-xl font-bold tracking-wider text-white group-hover:text-cyan-400 transition-colors">
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
              className="glass-panel p-6 flex flex-col items-center justify-center text-center gap-4 hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] hover:-translate-y-1 transition-all cursor-pointer border border-white/30 group"
            >
              <div className="relative">
                <img
                  src="https://i.postimg.cc/gnFwmW8W/buzz-profile-jpg.jpg"
                  alt="Buzz"
                  className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-3 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] group-hover:scale-105 transition-transform"
                />
                <span className="absolute -bottom-2 -right-2 p-2 rounded-full bg-cyan-600 text-white shadow-lg">
                  <Bot size={18} />
                </span>
              </div>
              <div>
                <span className="font-orbitron text-xl font-bold tracking-wider text-white group-hover:text-cyan-400 transition-colors">
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
              className="glass-panel p-6 flex flex-col items-center justify-center text-center gap-4 hover:border-amber-400 hover:shadow-[0_0_25px_rgba(245,158,11,0.6)] hover:-translate-y-1 transition-all cursor-pointer border border-white/30 group"
            >
              <div className="relative">
                <img
                  src="https://i.postimg.cc/Th9wMDdK/libray-backgrond.jpg"
                  alt="God Mode"
                  className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-3 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] group-hover:scale-105 transition-transform"
                />
                <span className="absolute -bottom-2 -right-2 p-2 rounded-full bg-amber-600 text-white shadow-lg">
                  <Zap size={18} />
                </span>
              </div>
              <div>
                <span className="font-orbitron text-xl font-bold tracking-wider text-white group-hover:text-amber-400 transition-colors">
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
            className="glass-panel h-16 w-full flex items-center justify-center font-orbitron text-sm md:text-base font-bold tracking-widest text-white hover:border-fuchsia-400 hover:shadow-[0_0_20px_rgba(217,70,239,0.6)] transition-all cursor-pointer border border-white/30"
          >
            <div className="flex items-center gap-3">
              <BookOpen size={20} className="text-fuchsia-400" />
              <span>Library Room</span>
              <span className="text-xs text-gray-400 font-mono hidden sm:inline">
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
        <NavigationRoom onBack={() => navigateTo('homepage')} />
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
    </div>
  );
}
