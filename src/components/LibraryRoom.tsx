import React, { useState, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Menu, ArrowLeft, Trash2, Download, Bot, GraduationCap, Zap } from 'lucide-react';

interface LibraryRoomProps {
  onBack: () => void;
  onOpenSidebar: () => void;
}

export const LibraryRoom: React.FC<LibraryRoomProps> = ({ onBack, onOpenSidebar }) => {
  const [buzzHistory, setBuzzHistory] = useState<ChatMessage[]>([]);
  const [einsteinHistory, setEinsteinHistory] = useState<ChatMessage[]>([]);
  const [godmodeHistory, setGodmodeHistory] = useState<ChatMessage[]>([]);

  const loadAllHistory = () => {
    try {
      setBuzzHistory(JSON.parse(localStorage.getItem('chat_history_buzz') || '[]'));
      setEinsteinHistory(JSON.parse(localStorage.getItem('chat_history_einstein') || '[]'));
      setGodmodeHistory(JSON.parse(localStorage.getItem('chat_history_godmode') || '[]'));
    } catch (e) {
      console.error('Failed reading library history', e);
    }
  };

  useEffect(() => {
    loadAllHistory();
  }, []);

  const clearHistory = (room: 'buzz' | 'einstein' | 'godmode', name: string) => {
    if (window.confirm(`Are you sure you want to clear all ${name} chat history? This cannot be undone.`)) {
      localStorage.removeItem(`chat_history_${room}`);
      loadAllHistory();
    }
  };

  const exportHistory = (room: 'buzz' | 'einstein' | 'godmode', name: string) => {
    const list = room === 'buzz' ? buzzHistory : room === 'einstein' ? einsteinHistory : godmodeHistory;
    const content = list
      .map(
        (m) =>
          `[${new Date(m.timestamp).toLocaleString()}] ${m.sender.toUpperCase()}:\n${m.text}\n`
      )
      .join('\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.toLowerCase().replace(/\s+/g, '_')}_history_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#0b071a] flex flex-col p-4 md:p-6 gap-4 text-white z-20 overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 glass-panel border border-fuchsia-500/50 shrink-0">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Menu size={22} />
        </button>
        <h2 className="font-orbitron text-xl md:text-2xl font-bold tracking-wider text-white">
          Library History
        </h2>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-orbitron text-sm text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/20"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </header>

      {/* 3 Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-1 min-h-0">
        {/* Buzz History */}
        <div className="flex flex-col bg-white/5 border border-white/15 rounded-3xl p-5 overflow-hidden min-h-[400px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
            <h3 className="font-orbitron text-sm font-bold text-cyan-400 flex items-center gap-2">
              <Bot size={18} />
              <span>Buzz History</span>
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              {buzzHistory.length} msgs
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 py-3 flex flex-col gap-2.5 min-h-0">
            {buzzHistory.length === 0 ? (
              <div className="text-gray-500 text-xs text-center py-10 font-mono">No history yet</div>
            ) : (
              buzzHistory.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl text-xs font-mono break-words ${
                    m.sender === 'user'
                      ? 'bg-blue-600/30 border border-blue-400/30 self-end max-w-[90%]'
                      : 'bg-white/10 border border-white/20 self-start max-w-[90%]'
                  }`}
                >
                  <div className="text-[10px] text-gray-400 mb-1">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div>{m.text}</div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-white/10 flex gap-2 shrink-0">
            <button
              onClick={() => exportHistory('buzz', 'Buzz')}
              disabled={buzzHistory.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 py-2 rounded-xl text-xs font-orbitron text-gray-200 disabled:opacity-40 transition-colors"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
            <button
              onClick={() => clearHistory('buzz', 'Buzz')}
              disabled={buzzHistory.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-600/70 hover:bg-red-600 py-2 rounded-xl text-xs font-orbitron text-white disabled:opacity-40 transition-colors"
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Einstein History */}
        <div className="flex flex-col bg-white/5 border border-white/15 rounded-3xl p-5 overflow-hidden min-h-[400px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
            <h3 className="font-orbitron text-sm font-bold text-fuchsia-400 flex items-center gap-2">
              <GraduationCap size={18} />
              <span>Einstein History</span>
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              {einsteinHistory.length} msgs
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 py-3 flex flex-col gap-2.5 min-h-0">
            {einsteinHistory.length === 0 ? (
              <div className="text-gray-500 text-xs text-center py-10 font-mono">No history yet</div>
            ) : (
              einsteinHistory.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl text-xs font-mono break-words ${
                    m.sender === 'user'
                      ? 'bg-blue-600/30 border border-blue-400/30 self-end max-w-[90%]'
                      : 'bg-white/10 border border-white/20 self-start max-w-[90%]'
                  }`}
                >
                  <div className="text-[10px] text-gray-400 mb-1">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div>{m.text}</div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-white/10 flex gap-2 shrink-0">
            <button
              onClick={() => exportHistory('einstein', 'Einstein')}
              disabled={einsteinHistory.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 py-2 rounded-xl text-xs font-orbitron text-gray-200 disabled:opacity-40 transition-colors"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
            <button
              onClick={() => clearHistory('einstein', 'Einstein')}
              disabled={einsteinHistory.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-600/70 hover:bg-red-600 py-2 rounded-xl text-xs font-orbitron text-white disabled:opacity-40 transition-colors"
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* God Mode History */}
        <div className="flex flex-col bg-white/5 border border-white/15 rounded-3xl p-5 overflow-hidden min-h-[400px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
            <h3 className="font-orbitron text-sm font-bold text-amber-400 flex items-center gap-2">
              <Zap size={18} />
              <span>God Mode History</span>
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              {godmodeHistory.length} msgs
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 py-3 flex flex-col gap-2.5 min-h-0">
            {godmodeHistory.length === 0 ? (
              <div className="text-gray-500 text-xs text-center py-10 font-mono">No history yet</div>
            ) : (
              godmodeHistory.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl text-xs font-mono break-words ${
                    m.sender === 'user'
                      ? 'bg-blue-600/30 border border-blue-400/30 self-end max-w-[90%]'
                      : 'bg-white/10 border border-white/20 self-start max-w-[90%]'
                  }`}
                >
                  <div className="text-[10px] text-gray-400 mb-1">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div>{m.text}</div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-white/10 flex gap-2 shrink-0">
            <button
              onClick={() => exportHistory('godmode', 'God_Mode')}
              disabled={godmodeHistory.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 py-2 rounded-xl text-xs font-orbitron text-gray-200 disabled:opacity-40 transition-colors"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
            <button
              onClick={() => clearHistory('godmode', 'God Mode')}
              disabled={godmodeHistory.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-600/70 hover:bg-red-600 py-2 rounded-xl text-xs font-orbitron text-white disabled:opacity-40 transition-colors"
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </button>
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
