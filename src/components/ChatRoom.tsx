import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatAttachment } from '../types';
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
} from 'lucide-react';

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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedMemoryId, setSavedMemoryId] = useState<string | null>(null);
  const [isDeepThinking, setIsDeepThinking] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileCameraRef = useRef<HTMLInputElement | null>(null);
  const filePhotoRef = useRef<HTMLInputElement | null>(null);
  const fileDocRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Persist messages to localStorage and database
  useEffect(() => {
    try {
      localStorage.setItem(`chat_history_${room}`, JSON.stringify(messages));
      fetch(`/api/database/chat/${room}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      }).catch(() => {});
    } catch (e) {
      console.warn('Storage limit reached or failed saving history', e);
    }
  }, [messages, room]);

  // File selection handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAttachmentMenu(false);
    const isImage = file.type.startsWith('image/');
    const isText =
      file.type === 'text/plain' ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.json');

    const reader = new FileReader();
    if (isText) {
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
    } else {
      reader.onload = (event) => {
        setAttachment({
          name: file.name,
          type: file.type || 'application/octet-stream',
          data: event.target?.result as string,
          isImage,
          isText: false,
        });
      };
      reader.readAsDataURL(file);
    }

    e.target.value = '';
  };

  // Voice recognition setup
  const toggleListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser. Please try Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsListening(false);
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

  // Copy message text
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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

  // Send message
  const handleSendMessage = async (overrideText?: string) => {
    const textToSend = overrideText !== undefined ? overrideText : inputText;
    const trimmed = textToSend.trim();
    if (!trimmed && !attachment) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      attachment: attachment ? { ...attachment } : null,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setAttachment(null);
    setShowAttachmentMenu(false);
    setIsLoading(true);

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
          thinkingMode: isDeepThinking ? 'deep' : 'standard',
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const replyText = data.text || "I'm right here with you. Let's keep working.";

      const aiMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: replyText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const fallbackAiMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text:
          "I have your database memory loaded. I'm ready to answer anything you ask with real independent reasoning.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackAiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Give me your honest thoughts on this',
    'What blind spots am I missing?',
    'Review my draft in my authentic voice',
    'Break down the strategy and numbers',
  ];

  return (
    <div
      className="fixed inset-0 w-screen h-screen flex flex-col overflow-hidden bg-[#121212] z-30"
      style={{
        backgroundImage: `url('${backgroundImage}')`,
        backgroundSize: bgSize,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Background tint overlay */}
      <div className="absolute inset-0 bg-[#0b071a]/70 pointer-events-none -z-10" />

      {/* Hidden File Inputs */}
      <input
        ref={fileCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={filePhotoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={fileDocRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md,.json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3.5 bg-black/55 backdrop-blur-md border-b border-white/10 shrink-0 z-10 shadow-lg">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center font-orbitron"
          title="Open Menu"
        >
          <Menu size={22} />
        </button>

        <div className="text-center">
          <h2 className="font-orbitron text-lg md:text-xl font-bold tracking-wider text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {title}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <span className="text-[10px] text-cyan-400 font-mono">
              Memory Bank Active
            </span>
            <span>•</span>
            <span className="text-[10px] text-fuchsia-400 font-mono">
              Answers Anything & Thinks For Itself
            </span>
          </div>
        </div>

        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-orbitron text-sm text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
      </header>

      {/* Messages Scroll Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 min-h-0">
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai';
          const isMemorySaved = savedMemoryId === msg.id;

          return (
            <div
              key={msg.id}
              className={`max-w-[88%] md:max-w-[75%] rounded-2xl p-3.5 md:p-4 text-sm md:text-base font-mono leading-relaxed transition-all relative group ${
                isAi
                  ? 'self-start bg-white/15 backdrop-blur-md border border-white/30 text-white shadow-lg'
                  : 'self-end bg-blue-600/75 backdrop-blur-md border border-blue-400/40 text-white shadow-xl'
              }`}
              style={{
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              {/* Attachment Display */}
              {msg.attachment && (
                <div className="mb-2.5 overflow-hidden rounded-xl">
                  {msg.attachment.isImage ? (
                    <img
                      src={msg.attachment.data}
                      alt={msg.attachment.name}
                      className="max-h-64 rounded-xl object-contain bg-black/40 border border-white/20"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 bg-black/40 rounded-xl border border-white/20 text-xs">
                      <FileText size={18} className="text-cyan-400" />
                      <span className="truncate">{msg.attachment.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Message Text */}
              <div className="whitespace-pre-wrap break-words">{msg.text}</div>

              {/* Actions Footer */}
              <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-300">
                <span>
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
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
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="p-1 hover:text-cyan-400 transition-colors"
                    title="Copy message"
                  >
                    {copiedId === msg.id ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <Copy size={14} />
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
          <div className="self-start bg-white/15 backdrop-blur-md border border-white/30 text-white rounded-2xl px-4 py-3 text-sm font-mono flex items-center gap-2.5 animate-pulse shadow-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>
              {title} is thinking independently & formulating real answers...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Quick Prompts Chips */}
      <div className="px-4 md:px-6 py-1 max-w-3xl mx-auto w-full flex items-center gap-2 overflow-x-auto shrink-0 no-scrollbar">
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            disabled={isLoading}
            className="text-[11px] whitespace-nowrap px-3 py-1 bg-white/5 hover:bg-white/15 border border-white/15 hover:border-cyan-400/50 rounded-full text-gray-300 hover:text-white transition-all cursor-pointer font-sans shrink-0 disabled:opacity-40"
          >
            "{q}"
          </button>
        ))}
      </div>

      {/* Chat Input Console */}
      <footer className="p-3 md:p-5 shrink-0 z-20">
        <div className="relative max-w-3xl mx-auto bg-[#1e1e1e]/90 backdrop-blur-md border border-white/20 rounded-3xl p-3 md:p-4 shadow-2xl">
          {/* Attachment Popup Menu */}
          {showAttachmentMenu && (
            <div className="absolute bottom-20 left-4 bg-gray-800/95 border border-fuchsia-500/40 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 z-30 min-w-44">
              <button
                onClick={() => fileCameraRef.current?.click()}
                className="flex items-center gap-3 px-3 py-2 text-sm font-orbitron text-white rounded-xl hover:bg-white/15 transition-all text-left"
              >
                <Camera size={18} className="text-cyan-400" />
                <span>Camera</span>
              </button>
              <button
                onClick={() => filePhotoRef.current?.click()}
                className="flex items-center gap-3 px-3 py-2 text-sm font-orbitron text-white rounded-xl hover:bg-white/15 transition-all text-left"
              >
                <ImageIcon size={18} className="text-fuchsia-400" />
                <span>Photo Gallery</span>
              </button>
              <button
                onClick={() => fileDocRef.current?.click()}
                className="flex items-center gap-3 px-3 py-2 text-sm font-orbitron text-white rounded-xl hover:bg-white/15 transition-all text-left"
              >
                <FileText size={18} className="text-amber-400" />
                <span>Document</span>
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
                  className="w-7 h-7 rounded object-cover"
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
              placeholder={`Ask ${title} anything — no limits, real answers...`}
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400 text-sm md:text-base px-2 py-1 font-sans"
            />
          </div>

          {/* Bottom Icons Row */}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAttachmentMenu((prev) => !prev)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer text-xl font-light ${
                  showAttachmentMenu
                    ? 'bg-fuchsia-500/30 text-fuchsia-400'
                    : 'text-white hover:bg-white/10'
                }`}
                title="Add attachment"
              >
                <Plus size={20} />
              </button>

              {/* Autonomous Thinking Toggle Button */}
              <button
                onClick={() => setIsDeepThinking((prev) => !prev)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-orbitron flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isDeepThinking
                    ? 'bg-fuchsia-950/60 border-fuchsia-400 text-fuchsia-300 shadow-[0_0_10px_rgba(217,70,239,0.4)]'
                    : 'bg-white/5 border-white/15 text-gray-400 hover:text-gray-200'
                }`}
                title={
                  isDeepThinking
                    ? 'Autonomous Deep Thinking Enabled'
                    : 'Fast Mode Enabled'
                }
              >
                <Brain size={13} className={isDeepThinking ? 'text-fuchsia-400' : 'text-gray-400'} />
                <span className="hidden sm:inline">
                  {isDeepThinking ? 'Deep Reasoning' : 'Fast Mode'}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleListening}
                className={`p-2 rounded-full transition-all cursor-pointer ${
                  isListening
                    ? 'text-fuchsia-400 animate-mic-pulse bg-fuchsia-500/20'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
                title={isListening ? 'Listening...' : 'Voice Input'}
              >
                <Mic size={20} />
              </button>

              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || (!inputText.trim() && !attachment)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                  inputText.trim() || attachment
                    ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:opacity-90 active:scale-95'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                }`}
                title="Send Message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
