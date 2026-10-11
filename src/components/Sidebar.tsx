import React from 'react';
import { RoomType } from '../types';
import {
  Home,
  BookOpen,
  Compass,
  Bot,
  GraduationCap,
  Zap,
  User,
  Settings,
  X,
  Brain,
  Mic,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (room: RoomType) => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenProfile,
  onOpenSettings,
}) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 left-0 w-72 h-full z-50 flex flex-col p-6 transition-transform duration-300 ease-in-out bg-cover bg-center shadow-2xl shadow-black/80 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          backgroundImage: `url('https://i.postimg.cc/76npSNQf/HD-wallpaper-albert-einstein-funny-inteligent-science-space.jpg')`,
          backgroundColor: 'rgba(11, 7, 26, 0.85)',
          backgroundBlendMode: 'overlay',
        }}
      >
        <div className="flex items-center justify-between pb-6 border-b border-fuchsia-500/30">
          <h2 className="font-orbitron text-xl font-bold tracking-wider text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
            Einstein's Lab
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-5 flex flex-col gap-2 overflow-y-auto">
          <button
            onClick={() => {
              onNavigate('homepage');
              onClose();
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-orbitron text-xs text-left bg-white/5 border border-fuchsia-500/30 hover:bg-fuchsia-500/20 hover:border-fuchsia-400 hover:shadow-[0_0_15px_rgba(217,70,239,0.5)] transition-all cursor-pointer text-white"
          >
            <Home size={16} className="text-cyan-400" />
            <span>Home</span>
          </button>

          <button
            onClick={() => {
              onNavigate('navigation-room');
              onClose();
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-orbitron text-xs text-left bg-white/5 border border-fuchsia-500/30 hover:bg-fuchsia-500/20 hover:border-fuchsia-400 hover:shadow-[0_0_15px_rgba(217,70,239,0.5)] transition-all cursor-pointer text-white"
          >
            <Compass size={16} className="text-fuchsia-400" />
            <span>Navigation Hub</span>
          </button>

          {/* Database & Memory section */}
          <div className="pt-2 text-[10px] font-orbitron text-cyan-400 uppercase tracking-widest px-2">
            Database & Audio Vault
          </div>

          <button
            onClick={() => {
              onNavigate('memory-room');
              onClose();
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-orbitron text-xs text-left bg-cyan-950/40 border border-cyan-500/40 hover:bg-cyan-500/20 hover:border-cyan-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all cursor-pointer text-white"
          >
            <Brain size={16} className="text-cyan-400" />
            <span>Memory Bank</span>
          </button>

          <button
            onClick={() => {
              onNavigate('voice-room');
              onClose();
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-orbitron text-xs text-left bg-fuchsia-950/40 border border-fuchsia-500/40 hover:bg-fuchsia-500/20 hover:border-fuchsia-300 hover:shadow-[0_0_15px_rgba(217,70,239,0.5)] transition-all cursor-pointer text-white"
          >
            <Mic size={16} className="text-fuchsia-400" />
            <span>Voice Conversations</span>
          </button>

          <button
            onClick={() => {
              onNavigate('library-room');
              onClose();
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-orbitron text-xs text-left bg-white/5 border border-fuchsia-500/30 hover:bg-fuchsia-500/20 hover:border-fuchsia-400 hover:shadow-[0_0_15px_rgba(217,70,239,0.5)] transition-all cursor-pointer text-white"
          >
            <BookOpen size={16} className="text-amber-400" />
            <span>Library History</span>
          </button>

          <div className="pt-2 text-[10px] font-orbitron text-gray-400 uppercase tracking-widest px-2">
            AI Assistants
          </div>

          <button
            onClick={() => {
              onNavigate('buzz-room');
              onClose();
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-orbitron text-xs text-left bg-white/5 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all cursor-pointer text-white"
          >
            <Bot size={16} className="text-cyan-400" />
            <span>Buzz</span>
          </button>

          <button
            onClick={() => {
              onNavigate('einstein-room');
              onClose();
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-orbitron text-xs text-left bg-white/5 border border-fuchsia-500/30 hover:bg-fuchsia-500/20 hover:border-fuchsia-400 hover:shadow-[0_0_15px_rgba(217,70,239,0.5)] transition-all cursor-pointer text-white"
          >
            <GraduationCap size={16} className="text-fuchsia-400" />
            <span>Einstein</span>
          </button>

          <button
            onClick={() => {
              onNavigate('godmode-room');
              onClose();
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-orbitron text-xs text-left bg-white/5 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all cursor-pointer text-white"
          >
            <Zap size={16} className="text-amber-400" />
            <span>God Mode</span>
          </button>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            <button
              onClick={() => {
                onOpenProfile();
                onClose();
              }}
              className="flex items-center gap-3 px-4 py-2 rounded-xl font-orbitron text-xs text-left bg-white/5 border border-white/15 hover:bg-white/15 transition-all cursor-pointer text-gray-200 hover:text-white"
            >
              <User size={16} className="text-fuchsia-400" />
              <span>Profile</span>
            </button>

            <button
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
              className="flex items-center gap-3 px-4 py-2 rounded-xl font-orbitron text-xs text-left bg-white/5 border border-white/15 hover:bg-white/15 transition-all cursor-pointer text-gray-200 hover:text-white"
            >
              <Settings size={16} className="text-cyan-400" />
              <span>Settings</span>
            </button>
          </div>
        </nav>

        <div className="pt-3 text-center text-[10px] text-gray-400 font-mono">
          Grayson Morris Russell &copy; 2026
        </div>
      </aside>
    </>
  );
};
