import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatMessage } from '../types';
import { Menu, ArrowLeft, Trash2, Download, Bot, GraduationCap, Zap, Search, X, ShieldCheck, Clock } from 'lucide-react';
import { useCloudSync, SyncEventPayload } from '../hooks/useCloudSync';

interface LibraryRoomProps {
  onBack: () => void;
  onOpenSidebar: () => void;
}

export const LibraryRoom: React.FC<LibraryRoomProps> = ({ onBack, onOpenSidebar }) => {
  const [buzzHistory, setBuzzHistory] = useState<ChatMessage[]>([]);
  const [einsteinHistory, setEinsteinHistory] = useState<ChatMessage[]>([]);
  const [godmodeHistory, setGodmodeHistory] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAllHistory = async () => {
    try {
      setBuzzHistory(JSON.parse(localStorage.getItem('chat_history_buzz') || '[]'));
      setEinsteinHistory(JSON.parse(localStorage.getItem('chat_history_einstein') || '[]'));
      setGodmodeHistory(JSON.parse(localStorage.getItem('chat_history_godmode') || '[]'));
    } catch (e) {
      console.error('Failed reading library local history', e);
    }

    try {
      const [resB, resE, resG] = await Promise.all([
        fetch('/api/database/chat/buzz').then((r) => r.json()).catch(() => null),
        fetch('/api/database/chat/einstein').then((r) => r.json()).catch(() => null),
        fetch('/api/database/chat/godmode').then((r) => r.json()).catch(() => null),
      ]);
      if (resB?.success && Array.isArray(resB.messages) && resB.messages.length > 0) {
        setBuzzHistory(resB.messages);
      }
      if (resE?.success && Array.isArray(resE.messages) && resE.messages.length > 0) {
        setEinsteinHistory(resE.messages);
      }
      if (resG?.success && Array.isArray(resG.messages) && resG.messages.length > 0) {
        setGodmodeHistory(resG.messages);
      }
    } catch (err) {
      console.warn('Library database sync notice:', err);
    }
  };

  useEffect(() => {
    loadAllHistory();
  }, []);

  // Real-time live synchronization for library archives (Phone & Laptop link)
  useCloudSync(
    useCallback((event: SyncEventPayload) => {
      if (event.type === 'CHAT_UPDATED') {
        if (event.room === 'buzz' && Array.isArray(event.messages)) setBuzzHistory(event.messages);
        if (event.room === 'einstein' && Array.isArray(event.messages)) setEinsteinHistory(event.messages);
        if (event.room === 'godmode' && Array.isArray(event.messages)) setGodmodeHistory(event.messages);
      }
    }, [])
  );

  const [confirmClearRoom, setConfirmClearRoom] = useState<'buzz' | 'einstein' | 'godmode' | null>(null);

  const clearHistory = async (room: 'buzz' | 'einstein' | 'godmode') => {
    localStorage.removeItem(`chat_history_${room}`);
    try {
      await fetch(`/api/database/chat/${room}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Could not clear DB history:', e);
    }
    loadAllHistory();
    setConfirmClearRoom(null);
  };

  const exportHistory = (room: 'buzz' | 'einstein' | 'godmode', name: string) => {
    const list = room === 'buzz' ? buzzHistory : room === 'einstein' ? einsteinHistory : godmodeHistory;
    const content = list
      .map(
        (m) =>
          `[${new Date(m.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ${m.sender.toUpperCase()}:\n${m.text}\n`
      )
      .join('\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.toLowerCase().replace(/\s+/g, '_')}_permanent_history_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filterList = (list: ChatMessage[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((m) => (m.text || '').toLowerCase().includes(q));
  };

  const filteredBuzz = useMemo(() => filterList(buzzHistory), [buzzHistory, searchQuery]);
  const filteredEinstein = useMemo(() => filterList(einsteinHistory), [einsteinHistory, searchQuery]);
  const filteredGodmode = useMemo(() => filterList(godmodeHistory), [godmodeHistory, searchQuery]);

  const totalArchivedCount = buzzHistory.length + einsteinHistory.length + godmodeHistory.length;

  const formatMessageTimestamp = (timestamp: number) => {
    const d = new Date(timestamp);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} • ${timeStr}`;
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-[#0b071a] flex flex-col p-3 sm:p-5 md:p-6 gap-3 sm:gap-4 text-white z-20 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col gap-3 sm:gap-4 min-h-0">
        {/* Header */}
        <header className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5 glass-panel border border-fuchsia-500/50 shrink-0 gap-2">
          <button
            onClick={onOpenSidebar}
            className="p-1.5 sm:p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Menu"
          >
            <Menu size={20} className="sm:w-[22px] sm:h-[22px]" />
          </button>

          <div className="text-center min-w-0 flex-1 px-2">
            <h2 className="font-orbitron text-base sm:text-xl md:text-2xl font-bold tracking-wider text-white truncate">
              Permanent Library Archive
            </h2>
            <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-mono text-emerald-300">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>Timeless Memory • Zero Expiration ({totalArchivedCount} Total Messages)</span>
            </div>
          </div>

          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-orbitron text-xs sm:text-sm text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/20 shrink-0"
          >
            <ArrowLeft size={16} />
            <span className="hidden xs:inline">Back</span>
          </button>
        </header>

        {/* Multi-Year Timeline Search Bar & Retention Assurance */}
        <div className="glass-panel p-3 sm:p-4 rounded-2xl border border-white/15 bg-black/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-80 flex items-center">
            <Search size={15} className="absolute left-3 text-cyan-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across all years & dates (e.g. food truck, algebra)..."
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-400 outline-none focus:border-cyan-400 font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 text-gray-400 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-gray-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
            <Clock size={13} className="text-amber-400" />
            <span>2-Year+ Multi-Year Recall Active</span>
          </div>
        </div>

        {/* 3 Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5 flex-1 min-h-0">
          {/* Buzz History */}
          <div className="flex flex-col bg-white/5 border border-white/15 rounded-3xl p-4 sm:p-5 overflow-hidden min-h-[340px] md:min-h-[400px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <h3 className="font-orbitron text-sm font-bold text-cyan-400 flex items-center gap-2">
                <Bot size={18} />
                <span>Buzz History</span>
              </h3>
              <span className="text-xs text-gray-400 font-mono">
                {filteredBuzz.length} / {buzzHistory.length} msgs
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 py-3 flex flex-col gap-2.5 min-h-0">
              {filteredBuzz.length === 0 ? (
                <div className="text-gray-500 text-xs text-center py-10 font-mono">
                  {searchQuery ? 'No matching messages found' : 'No history yet'}
                </div>
              ) : (
                filteredBuzz.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl text-xs font-mono break-words ${
                      m.sender === 'user'
                        ? 'bg-blue-600/30 border border-blue-400/30 self-end max-w-[90%]'
                        : 'bg-white/10 border border-white/20 self-start max-w-[90%]'
                    }`}
                  >
                    <div className="text-[10px] text-gray-400 mb-1 flex items-center justify-between gap-1">
                      <span>{formatMessageTimestamp(m.timestamp)}</span>
                      <span className="text-[9px] uppercase font-bold text-cyan-400/80">
                        {m.sender === 'user' ? 'Grayson' : 'Buzz'}
                      </span>
                    </div>
                    <div className="whitespace-pre-line text-slate-100">{m.text}</div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex gap-2 shrink-0">
              <button
                onClick={() => exportHistory('buzz', 'Buzz')}
                disabled={buzzHistory.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 py-2 rounded-xl text-xs font-orbitron text-gray-200 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>Export</span>
              </button>
              <button
                onClick={() => {
                  if (confirmClearRoom === 'buzz') {
                    clearHistory('buzz');
                  } else {
                    setConfirmClearRoom('buzz');
                    setTimeout(() => setConfirmClearRoom(null), 4000);
                  }
                }}
                disabled={buzzHistory.length === 0}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-orbitron text-white disabled:opacity-40 transition-all cursor-pointer ${
                  confirmClearRoom === 'buzz' ? 'bg-red-700 animate-pulse font-bold' : 'bg-red-600/70 hover:bg-red-600'
                }`}
              >
                <Trash2 size={14} />
                <span>{confirmClearRoom === 'buzz' ? 'Confirm?' : 'Clear'}</span>
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
                {filteredEinstein.length} / {einsteinHistory.length} msgs
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 py-3 flex flex-col gap-2.5 min-h-0">
              {filteredEinstein.length === 0 ? (
                <div className="text-gray-500 text-xs text-center py-10 font-mono">
                  {searchQuery ? 'No matching messages found' : 'No history yet'}
                </div>
              ) : (
                filteredEinstein.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl text-xs font-mono break-words ${
                      m.sender === 'user'
                        ? 'bg-fuchsia-600/30 border border-fuchsia-400/30 self-end max-w-[90%]'
                        : 'bg-white/10 border border-white/20 self-start max-w-[90%]'
                    }`}
                  >
                    <div className="text-[10px] text-gray-400 mb-1 flex items-center justify-between gap-1">
                      <span>{formatMessageTimestamp(m.timestamp)}</span>
                      <span className="text-[9px] uppercase font-bold text-fuchsia-400/80">
                        {m.sender === 'user' ? 'Grayson' : 'Einstein'}
                      </span>
                    </div>
                    <div className="whitespace-pre-line text-slate-100">{m.text}</div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex gap-2 shrink-0">
              <button
                onClick={() => exportHistory('einstein', 'Einstein')}
                disabled={einsteinHistory.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 py-2 rounded-xl text-xs font-orbitron text-gray-200 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>Export</span>
              </button>
              <button
                onClick={() => {
                  if (confirmClearRoom === 'einstein') {
                    clearHistory('einstein');
                  } else {
                    setConfirmClearRoom('einstein');
                    setTimeout(() => setConfirmClearRoom(null), 4000);
                  }
                }}
                disabled={einsteinHistory.length === 0}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-orbitron text-white disabled:opacity-40 transition-all cursor-pointer ${
                  confirmClearRoom === 'einstein' ? 'bg-red-700 animate-pulse font-bold' : 'bg-red-600/70 hover:bg-red-600'
                }`}
              >
                <Trash2 size={14} />
                <span>{confirmClearRoom === 'einstein' ? 'Confirm?' : 'Clear'}</span>
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
                {filteredGodmode.length} / {godmodeHistory.length} msgs
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 py-3 flex flex-col gap-2.5 min-h-0">
              {filteredGodmode.length === 0 ? (
                <div className="text-gray-500 text-xs text-center py-10 font-mono">
                  {searchQuery ? 'No matching messages found' : 'No history yet'}
                </div>
              ) : (
                filteredGodmode.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl text-xs font-mono break-words ${
                      m.sender === 'user'
                        ? 'bg-amber-600/30 border border-amber-400/30 self-end max-w-[90%]'
                        : 'bg-white/10 border border-white/20 self-start max-w-[90%]'
                    }`}
                  >
                    <div className="text-[10px] text-gray-400 mb-1 flex items-center justify-between gap-1">
                      <span>{formatMessageTimestamp(m.timestamp)}</span>
                      <span className="text-[9px] uppercase font-bold text-amber-400/80">
                        {m.sender === 'user' ? 'Grayson' : 'God Mode'}
                      </span>
                    </div>
                    <div className="whitespace-pre-line text-slate-100">{m.text}</div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex gap-2 shrink-0">
              <button
                onClick={() => exportHistory('godmode', 'God_Mode')}
                disabled={godmodeHistory.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 py-2 rounded-xl text-xs font-orbitron text-gray-200 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>Export</span>
              </button>
              <button
                onClick={() => {
                  if (confirmClearRoom === 'godmode') {
                    clearHistory('godmode');
                  } else {
                    setConfirmClearRoom('godmode');
                    setTimeout(() => setConfirmClearRoom(null), 4000);
                  }
                }}
                disabled={godmodeHistory.length === 0}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-orbitron text-white disabled:opacity-40 transition-all cursor-pointer ${
                  confirmClearRoom === 'godmode' ? 'bg-red-700 animate-pulse font-bold' : 'bg-red-600/70 hover:bg-red-600'
                }`}
              >
                <Trash2 size={14} />
                <span>{confirmClearRoom === 'godmode' ? 'Confirm?' : 'Clear'}</span>
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
    </div>
  );
};
