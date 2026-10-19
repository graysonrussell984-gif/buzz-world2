import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MemoryItem,
  IntelligenceState,
  UserNeedItem,
  UserStatementItem,
} from '../types';
import { useCloudSync, SyncEventPayload } from '../hooks/useCloudSync';
import {
  Brain,
  Plus,
  Trash2,
  Search,
  ArrowLeft,
  Menu,
  GraduationCap,
  Briefcase,
  Target,
  User,
  Heart,
  Sparkles,
  X,
  RefreshCw,
  CheckCircle2,
  Quote,
  Activity,
  Flame,
  Zap,
  Copy,
  Check,
  Layers,
} from 'lucide-react';

interface MemoryBrainRoomProps {
  onBack: () => void;
  onOpenSidebar: () => void;
}

interface CategoryTabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

const CATEGORY_TABS: CategoryTabConfig[] = [
  { id: 'all', label: 'All Memories', icon: Brain, color: 'from-cyan-500 to-fuchsia-600' },
  { id: 'goal', label: 'Goals & Growth', icon: Target, color: 'from-amber-500 to-orange-600' },
  { id: 'school', label: 'Schools', icon: GraduationCap, color: 'from-fuchsia-500 to-purple-600' },
  { id: 'statements', label: "Things I've Said", icon: Quote, color: 'from-emerald-500 to-teal-600' },
  { id: 'needs', label: 'Things I Need', icon: Zap, color: 'from-amber-400 to-yellow-600' },
  { id: 'business', label: 'Business & Tech', icon: Briefcase, color: 'from-cyan-500 to-blue-600' },
  { id: 'personal', label: 'Personal & Life', icon: Heart, color: 'from-pink-500 to-rose-600' },
  { id: 'identity', label: 'Identity & Rules', icon: User, color: 'from-indigo-500 to-purple-600' },
];

export const MemoryBrainRoom: React.FC<MemoryBrainRoomProps> = ({ onBack, onOpenSidebar }) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [intelligence, setIntelligence] = useState<IntelligenceState | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'base' | 'grown'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'memory' | 'need' | 'statement'>('memory');
  const [deleteModalItem, setDeleteModalItem] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisNotification, setSynthesisNotification] = useState<string | null>(null);

  const cardsSectionRef = useRef<HTMLDivElement | null>(null);
  const bottomSectionRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // New memory form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryItem['category']>('personal');
  const [newContent, setNewContent] = useState('');

  // New need form state
  const [newNeedText, setNewNeedText] = useState('');
  const [newNeedCategory, setNewNeedCategory] = useState<'school' | 'business' | 'personal' | 'growth'>('business');

  // New statement form state
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuoteContext, setNewQuoteContext] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/database/state');
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
        if (data.intelligenceState) {
          setIntelligence(data.intelligenceState);
        }
      }
    } catch (err) {
      console.error('Failed to load database state:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time live synchronization for memories & intelligence state (Phone & Laptop link)
  useCloudSync(
    useCallback((event: SyncEventPayload) => {
      if (event.type === 'MEMORIES_UPDATED') {
        if (Array.isArray(event.memories)) {
          setMemories(event.memories);
        }
        if (event.intelligence) {
          setIntelligence(event.intelligence);
        }
      }
    }, [])
  );

  const handleCopyText = async (text: string, id: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const scrollToTopGrid = () => {
    if (cardsSectionRef.current && scrollContainerRef.current) {
      const topPos = cardsSectionRef.current.offsetTop - 20;
      scrollContainerRef.current.scrollTo({ top: topPos, behavior: 'smooth' });
    }
  };

  const scrollToBottomExplorer = () => {
    if (bottomSectionRef.current && scrollContainerRef.current) {
      const topPos = bottomSectionRef.current.offsetTop - 20;
      scrollContainerRef.current.scrollTo({ top: topPos, behavior: 'smooth' });
    }
  };

  const handleSelectCategory = (catId: string, scrollToTop = false) => {
    setActiveCategory(catId);
    setSearchQuery('');
    setSourceFilter('all');
    if (scrollToTop) {
      scrollToTopGrid();
    }
  };

  const handleSynthesizeGrowth = async () => {
    setIsSynthesizing(true);
    setSynthesisNotification(null);
    try {
      const res = await fetch('/api/database/synthesize-growth', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        await loadData();
        setSynthesisNotification(
          data.learnedCount > 0
            ? `🌱 Success! Learned & recorded ${data.learnedCount} new memories from recent conversations.`
            : `All recent conversations are already synced with your knowledge base.`
        );
      }
    } catch (err) {
      console.error(err);
      setSynthesisNotification('Brain growth scan completed.');
    } finally {
      setIsSynthesizing(false);
      setTimeout(() => setSynthesisNotification(null), 5000);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      const res = await fetch('/api/database/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          category: newCategory,
          content: newContent.trim(),
          source: 'grown',
        }),
      });

      if (res.ok) {
        await loadData();
        setNewTitle('');
        setNewContent('');
        setIsAddModalOpen(false);
        setActiveCategory('all');
      }
    } catch (err) {
      console.error('Failed to save memory', err);
    }
  };

  const handleAddNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNeedText.trim()) return;

    try {
      const res = await fetch('/api/database/needs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          need: newNeedText.trim(),
          category: newNeedCategory,
        }),
      });

      if (res.ok) {
        await loadData();
        setNewNeedText('');
        setIsAddModalOpen(false);
        setActiveCategory('needs');
      }
    } catch (err) {
      console.error('Failed to add need', err);
    }
  };

  const handleToggleNeedStatus = async (needId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'resolved' ? 'active' : 'resolved';
    try {
      const res = await fetch(`/api/database/needs/${needId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Failed to update need status:', err);
    }
  };

  const handleAddStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteText.trim()) return;

    try {
      const res = await fetch('/api/database/statements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote: newQuoteText.trim(),
          context: newQuoteContext.trim() || 'Core conviction',
        }),
      });

      if (res.ok) {
        await loadData();
        setNewQuoteText('');
        setNewQuoteContext('');
        setIsAddModalOpen(false);
        setActiveCategory('statements');
      }
    } catch (err) {
      console.error('Failed to add statement', err);
    }
  };

  const requestDeleteItem = (item: any) => {
    setDeleteModalItem(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalItem) return;
    const item = deleteModalItem;
    setIsDeleting(true);

    try {
      // 1. Optimistic removal from local UI state immediately
      setMemories((prev) => prev.filter((m) => m.id !== item.id));
      if (intelligence) {
        setIntelligence({
          ...intelligence,
          recentNeeds: (intelligence.recentNeeds || []).filter((n) => n.id !== item.id),
          coreStatements: (intelligence.coreStatements || []).filter((s) => s.id !== item.id),
        });
      }

      // 2. Perform backend deletion
      if (item.isStatementObj) {
        await fetch(`/api/database/statements/${item.id}`, { method: 'DELETE' });
      } else if (item.isNeedObj) {
        await fetch(`/api/database/needs/${item.id}`, { method: 'DELETE' });
      } else {
        await fetch(`/api/database/memories/${item.id}`, { method: 'DELETE' });
      }

      // 3. Re-sync from database to guarantee accuracy
      await loadData();

      const shortTitle = item.title?.length > 28 ? item.title.slice(0, 28) + '...' : item.title || 'Item';
      setSynthesisNotification(`🗑️ Successfully deleted "${shortTitle}"`);
      setTimeout(() => setSynthesisNotification(null), 4000);
    } catch (err) {
      console.error('Failed to delete item:', err);
      setSynthesisNotification('❌ Deletion failed. Please try again.');
      setTimeout(() => setSynthesisNotification(null), 4000);
    } finally {
      setIsDeleting(false);
      setDeleteModalItem(null);
    }
  };

  const recentNeeds = intelligence?.recentNeeds || [];
  const coreStatements = intelligence?.coreStatements || [];
  const tone = intelligence?.currentTone || {
    mood: 'Determined & Focused',
    energy: 'focused',
    toneDirective: "Match Grayson's drive with direct truth, zero excuses, and concrete steps. Keep prose punchy and practical.",
    summary: 'Grayson is locked in on his degree, building businesses, and breaking generational cycles.',
  };

  // Category counts calculation
  const getCategoryCount = (catId: string): number => {
    if (catId === 'all') {
      return memories.length + coreStatements.length + recentNeeds.length;
    }
    if (catId === 'goal') {
      const memCount = memories.filter((m) => ['goal', 'growth', 'milestone'].includes(m.category)).length;
      const needCount = recentNeeds.filter((n) => n.category === 'growth').length;
      return memCount + needCount;
    }
    if (catId === 'school') {
      const memCount = memories.filter((m) => m.category === 'school').length;
      const needCount = recentNeeds.filter((n) => n.category === 'school').length;
      const stmtCount = coreStatements.filter(
        (s) =>
          s.context?.toLowerCase().includes('school') ||
          s.quote.toLowerCase().includes('school') ||
          s.quote.toLowerCase().includes('course')
      ).length;
      return memCount + needCount + stmtCount;
    }
    if (catId === 'statements') {
      return (
        coreStatements.length +
        memories.filter((m) => m.source === 'voice_extracted' || m.category === 'statement').length
      );
    }
    if (catId === 'needs') {
      return (
        recentNeeds.length +
        memories.filter((m) => m.category === 'need').length
      );
    }
    if (catId === 'business') {
      const memCount = memories.filter((m) => m.category === 'business').length;
      const needCount = recentNeeds.filter((n) => n.category === 'business').length;
      return memCount + needCount;
    }
    if (catId === 'personal') {
      const memCount = memories.filter((m) => ['personal', 'family'].includes(m.category)).length;
      const needCount = recentNeeds.filter((n) => n.category === 'personal').length;
      return memCount + needCount;
    }
    if (catId === 'identity') return memories.filter((m) => m.category === 'identity').length;
    return 0;
  };

  // Unified memory list for the chosen filter
  const displayItems = useMemo(() => {
    const formattedStatements = coreStatements.map((stmt) => ({
      id: stmt.id,
      category: 'statement' as const,
      title: `What Grayson Said: "${stmt.quote.length > 34 ? stmt.quote.slice(0, 34) + '...' : stmt.quote}"`,
      content: `"${stmt.quote}"\n\n[Principle & Context]: ${stmt.context || 'Authentic Conviction & Core Voice'}`,
      source: 'user' as const,
      createdAt: stmt.timestamp,
      updatedAt: stmt.timestamp,
      isStatementObj: true,
      rawQuote: stmt.quote,
      rawContext: stmt.context,
    }));

    const formattedNeeds = recentNeeds.map((need) => ({
      id: need.id,
      category: 'need' as const,
      title: `Need: "${need.need.length > 34 ? need.need.slice(0, 34) + '...' : need.need}"`,
      content: `Need / Goal: "${need.need}"\n\nStatus: ${need.status === 'resolved' ? '✅ Resolved' : '⚡ Active Focus'}\nArea: ${need.category.toUpperCase()}`,
      source: 'grown' as const,
      createdAt: need.timestamp,
      updatedAt: need.timestamp,
      isNeedObj: true,
      status: need.status,
      needObj: need,
      needCategory: need.category,
    }));

    let items: any[] = [];

    if (activeCategory === 'all') {
      let filteredMems = memories;
      if (sourceFilter === 'base') {
        filteredMems = memories.filter((m) => m.source === 'base' || m.source === 'system');
        items = [...filteredMems];
      } else if (sourceFilter === 'grown') {
        filteredMems = memories.filter((m) => m.source !== 'base');
        items = [...filteredMems, ...formattedStatements, ...formattedNeeds];
      } else {
        items = [...memories, ...formattedStatements, ...formattedNeeds];
      }
    } else if (activeCategory === 'statements') {
      const voiceMems = memories.filter((m) => m.source === 'voice_extracted' || m.category === 'statement');
      items = [...formattedStatements, ...voiceMems];
    } else if (activeCategory === 'needs') {
      const needMems = memories.filter((m) => m.category === 'need');
      items = [...formattedNeeds, ...needMems];
    } else if (activeCategory === 'school') {
      const schoolMems = memories.filter((m) => m.category === 'school');
      const schoolNeeds = formattedNeeds.filter((n) => n.needCategory === 'school');
      const schoolStmts = formattedStatements.filter(
        (s) =>
          s.rawContext?.toLowerCase().includes('school') ||
          s.rawQuote?.toLowerCase().includes('school') ||
          s.rawQuote?.toLowerCase().includes('course')
      );
      items = [...schoolMems, ...schoolNeeds, ...schoolStmts];
    } else if (activeCategory === 'goal') {
      const goalMems = memories.filter((m) => ['goal', 'growth', 'milestone'].includes(m.category));
      const goalNeeds = formattedNeeds.filter((n) => n.needCategory === 'growth');
      items = [...goalMems, ...goalNeeds];
    } else if (activeCategory === 'business') {
      const bizMems = memories.filter((m) => m.category === 'business');
      const bizNeeds = formattedNeeds.filter((n) => n.needCategory === 'business');
      items = [...bizMems, ...bizNeeds];
    } else if (activeCategory === 'personal') {
      const persMems = memories.filter((m) => ['personal', 'family'].includes(m.category));
      const persNeeds = formattedNeeds.filter((n) => n.needCategory === 'personal');
      items = [...persMems, ...persNeeds];
    } else if (activeCategory === 'identity') {
      items = memories.filter((m) => m.category === 'identity');
    } else {
      items = memories.filter((m) => m.category === activeCategory);
    }

    if (activeCategory !== 'all') {
      if (sourceFilter === 'base') {
        items = items.filter((m) => m.source === 'base' || m.source === 'system');
      } else if (sourceFilter === 'grown') {
        items = items.filter((m) => m.source !== 'base');
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.content?.toLowerCase().includes(q) ||
          (item.category && item.category.toLowerCase().includes(q))
      );
    }

    return items;
  }, [memories, coreStatements, recentNeeds, activeCategory, sourceFilter, searchQuery]);

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'school':
        return {
          icon: <GraduationCap size={13} />,
          label: 'Schools',
          className: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
        };
      case 'business':
        return {
          icon: <Briefcase size={13} />,
          label: 'Business',
          className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        };
      case 'goal':
      case 'growth':
      case 'milestone':
        return {
          icon: <Target size={13} />,
          label: 'Goals & Growth',
          className: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'identity':
        return {
          icon: <User size={13} />,
          label: 'Identity',
          className: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        };
      case 'statement':
        return {
          icon: <Quote size={13} />,
          label: "Things I've Said",
          className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
      case 'need':
        return {
          icon: <Zap size={13} />,
          label: 'Things I Need',
          className: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
        };
      default:
        return {
          icon: <Heart size={13} />,
          label: 'Personal',
          className: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        };
    }
  };

  const renderMemoryCard = (item: any, isBottomView = false) => {
    const badge = getCategoryBadge(item.category);
    const isBase = item.source === 'base' || item.source === 'system';
    const isVoice = item.source === 'voice_extracted';
    const isStatement = Boolean(item.isStatementObj);
    const isNeed = Boolean(item.isNeedObj);
    const isCopied = copiedId === item.id;

    return (
      <div
        key={`${isBottomView ? 'bottom-' : ''}${item.id}`}
        className={`border rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-3 transition-all group relative ${
          isStatement
            ? 'bg-gradient-to-br from-emerald-950/30 via-black/50 to-black/70 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:border-emerald-400'
            : isNeed
              ? 'bg-gradient-to-br from-amber-950/30 via-black/50 to-black/70 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:border-amber-400'
              : isBase
                ? 'bg-white/5 border-cyan-500/35 hover:border-cyan-400/70 shadow-[inset_0_0_15px_rgba(6,182,212,0.05)]'
                : isVoice
                  ? 'bg-purple-950/25 border-purple-500/40 hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                  : 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)]'
        }`}
      >
        <div>
          {/* Header Row: Category Badge & Source Origin */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-orbitron border ${badge.className}`}
            >
              {badge.icon}
              <span>{badge.label}</span>
            </span>

            <div className="flex items-center gap-1.5">
              {isNeed && (
                <button
                  type="button"
                  onClick={() => handleToggleNeedStatus(item.id, item.status)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono cursor-pointer border transition-all ${
                    item.status === 'resolved'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-400/40 hover:bg-amber-500/30'
                  }`}
                  title="Toggle need status between Active and Resolved"
                >
                  <CheckCircle2 size={11} />
                  <span>{item.status === 'resolved' ? 'Resolved' : 'Active Need'}</span>
                </button>
              )}

              <span
                className={`text-[9px] sm:text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                  isBase
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                    : isVoice
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : isStatement
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : isNeed
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {isBase
                  ? '🏛️ Base'
                  : isVoice
                    ? '🎙️ Voice Note'
                    : isStatement
                      ? '💬 Quote'
                      : isNeed
                        ? '⚡ Need'
                        : '🌱 Grown'}
              </span>
            </div>
          </div>

          {/* Card Title */}
          <h4 className="font-orbitron font-bold text-sm sm:text-base text-white group-hover:text-cyan-300 transition-colors leading-snug">
            {item.title}
          </h4>

          {/* Card Content */}
          <div className="mt-2 text-xs sm:text-sm text-slate-200 font-sans leading-relaxed whitespace-pre-line">
            {isStatement ? (
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 italic text-emerald-100 font-serif text-sm">
                "{item.content}"
              </div>
            ) : (
              <p>{item.content}</p>
            )}
          </div>
        </div>

        {/* Footer Row: Date, Copy, Delete */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-400 font-mono">
          <span>
            {isBase
              ? 'Permanent Baseline'
              : `Saved: ${new Date(item.createdAt).toLocaleDateString()}`}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleCopyText(item.content, item.id)}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Copy text"
            >
              {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>

            <button
              type="button"
              onClick={() => requestDeleteItem(item)}
              className="p-1.5 rounded-lg text-red-400 hover:text-red-200 hover:bg-red-500/20 border border-transparent hover:border-red-500/40 transition-all cursor-pointer active:scale-90"
              title="Delete memory item"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const activeCategoryMeta = CATEGORY_TABS.find((t) => t.id === activeCategory) || CATEGORY_TABS[0];

  return (
    <div
      ref={scrollContainerRef}
      className="fixed inset-0 w-full h-[100dvh] bg-[#0b071a] flex flex-col p-2.5 sm:p-4 md:p-6 text-white z-20 overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-3 sm:gap-4">
        {/* Top Header */}
        <header className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5 glass-panel border border-cyan-500/50 shrink-0">
          <button
            onClick={onOpenSidebar}
            className="p-1.5 sm:p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Menu"
          >
            <Menu size={20} className="sm:w-[22px] sm:h-[22px]" />
          </button>
          <div className="text-center min-w-0 px-2 flex-1">
            <h2 className="font-orbitron text-sm xs:text-base sm:text-xl md:text-2xl font-bold tracking-wider text-gradient-neon flex items-center justify-center gap-1.5 sm:gap-2 truncate">
              <Brain size={20} className="text-cyan-400 shrink-0 sm:w-6 sm:h-6" />
              <span className="truncate">Living Memory & Intelligence Matrix</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-fuchsia-400 font-mono hidden xs:block truncate">
              All Memories • Goals & Growth • Schools • Things I've Said • Things I Need
            </p>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-orbitron text-xs sm:text-sm text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/20 shrink-0"
          >
            <ArrowLeft size={16} />
            <span className="hidden xs:inline">Back</span>
          </button>
        </header>

        {/* Intelligence Progression HUD & Tone Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3.5 shrink-0">
          {/* Left Column: Intelligence Level & Progression Engine */}
          <div className="lg:col-span-7 glass-panel-neon p-3.5 sm:p-4.5 flex flex-col justify-between gap-3 border border-fuchsia-500/40 relative overflow-hidden">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-cyan-500 via-fuchsia-600 to-amber-500 flex items-center justify-center shadow-[0_0_20px_rgba(217,70,239,0.5)] shrink-0">
                  <Zap size={22} className="text-white animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-orbitron font-black text-sm sm:text-base text-white tracking-wide">
                      Level {intelligence?.level || 2}: {intelligence?.levelTitle || 'Strategic Synthesizer'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Living AI Memory Active
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                      <span>🏛️</span>
                      2+ Year Permanent Retention (Zero Decay)
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-gray-300 font-sans mt-0.5">
                    Your chatbots (Buzz, Einstein, God Mode) and Voice Studio store your needs, words, and goals into this permanent memory vault. 2 years or 10 years from now, everything discussed today stays remembered and synced across your phone and laptop.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSynthesizeGrowth}
                disabled={isSynthesizing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-fuchsia-600 hover:opacity-90 rounded-xl text-xs font-orbitron text-white cursor-pointer transition-all shadow-md disabled:opacity-50 shrink-0 active:scale-95"
                title="Scan all recent conversations and voice recordings for memory growth"
              >
                <RefreshCw size={13} className={isSynthesizing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{isSynthesizing ? 'Learning...' : 'Scan & Grow'}</span>
              </button>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10 text-center">
              <div className="bg-white/5 border border-white/10 rounded-xl p-1.5 sm:p-2">
                <div className="text-[10px] sm:text-xs text-gray-400 font-mono">Total XP</div>
                <div className="font-orbitron font-bold text-cyan-400 text-xs sm:text-sm">{intelligence?.xp || 200}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-1.5 sm:p-2">
                <div className="text-[10px] sm:text-xs text-gray-400 font-mono">Memories</div>
                <div className="font-orbitron font-bold text-fuchsia-400 text-xs sm:text-sm">{memories.length}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-1.5 sm:p-2">
                <div className="text-[10px] sm:text-xs text-gray-400 font-mono">Needs</div>
                <div className="font-orbitron font-bold text-amber-400 text-xs sm:text-sm">{recentNeeds.length}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-1.5 sm:p-2">
                <div className="text-[10px] sm:text-xs text-gray-400 font-mono">Quotes</div>
                <div className="font-orbitron font-bold text-emerald-400 text-xs sm:text-sm">{coreStatements.length}</div>
              </div>
            </div>
          </div>

          {/* Right Column: Tone of Voice & Mindset Evolution Card */}
          <div className="lg:col-span-5 glass-panel p-3.5 sm:p-4.5 border border-cyan-400/40 rounded-2xl flex flex-col justify-between gap-2.5 bg-gradient-to-br from-black/60 via-purple-950/20 to-black/60 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-orbitron font-bold text-cyan-300">
                <Activity size={15} className="text-cyan-400" />
                <span>Detected Tone of Voice & Mindset</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 uppercase">
                {tone.energy} energy
              </span>
            </div>

            <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="font-orbitron font-bold text-xs sm:text-sm text-white">
                  "{tone.mood}"
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-200 mt-1 font-sans leading-relaxed">
                {tone.summary}
              </p>
            </div>

            <div className="text-[10px] sm:text-[11px] text-fuchsia-300/90 font-mono flex items-start gap-1.5">
              <Flame size={13} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Building Off Your Tone:</strong> {tone.toneDirective}
              </span>
            </div>
          </div>
        </div>

        {/* Synthesis Toast Alert */}
        {synthesisNotification && (
          <div className="glass-panel p-3 text-xs font-mono text-cyan-200 border border-cyan-400/50 flex items-center justify-between animate-fade-in shrink-0 bg-cyan-950/40">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-cyan-400" />
              <span>{synthesisNotification}</span>
            </div>
            <button
              onClick={() => setSynthesisNotification(null)}
              className="text-gray-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* PRIMARY CONTROL & FILTER BAR (Top / Middle of room) */}
        <div ref={cardsSectionRef} className="glass-panel p-3 sm:p-4 border border-cyan-400/40 rounded-2xl flex flex-col gap-3 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-orbitron font-bold text-xs sm:text-sm text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={16} className="text-cyan-400" />
                <span>Memory Categories:</span>
              </span>
              <span className="text-[10px] sm:text-xs font-mono text-gray-400">
                Click any button to view matching memories
              </span>
            </div>

            {/* Search Input & Add Button */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-2xl px-3 py-1.5 flex-1 md:w-56">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in memories..."
                  className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-400 w-full"
                />
              </div>

              <button
                onClick={() => {
                  setModalTab('memory');
                  setIsAddModalOpen(true);
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:opacity-90 rounded-2xl font-orbitron text-xs font-bold text-white flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 active:scale-95"
              >
                <Plus size={15} />
                <span>Add Fact</span>
              </button>

              <button
                type="button"
                onClick={scrollToBottomExplorer}
                className="hidden sm:flex items-center gap-1 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl font-orbitron text-xs font-semibold text-cyan-200 cursor-pointer shrink-0 transition-all active:scale-95"
                title="Jump directly to the bottom memory explorer"
              >
                <span>⬇️ Bottom Explorer</span>
              </button>
            </div>
          </div>

          {/* MAIN CATEGORY BUTTONS ROW */}
          <div className="flex flex-wrap gap-2 items-center">
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeCategory === tab.id;
              const count = getCategoryCount(tab.id);

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectCategory(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-orbitron font-bold transition-all cursor-pointer shadow-md select-none border active:scale-95 ${
                    isActive
                      ? `bg-gradient-to-r ${tab.color} text-white border-white/60 shadow-[0_0_20px_rgba(6,182,212,0.6)] ring-2 ring-white/30 scale-105`
                      : 'bg-white/5 border-white/15 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/30'
                  }`}
                  title={`View ${tab.label} memories`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-cyan-400'} />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-black/40 text-white' : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Source Bedrock Filter Pill (All / Base / Grown) */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-mono text-[11px]">Source Bedrock:</span>
              <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/10 text-[10px] font-orbitron">
                <button
                  onClick={() => setSourceFilter('all')}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                    sourceFilter === 'all' ? 'bg-cyan-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  All Sources
                </button>
                <button
                  onClick={() => setSourceFilter('base')}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                    sourceFilter === 'base' ? 'bg-cyan-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🏛️ Base Bedrock
                </button>
                <button
                  onClick={() => setSourceFilter('grown')}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                    sourceFilter === 'grown' ? 'bg-emerald-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🌱 Grown & Learned
                </button>
              </div>
            </div>

            <div className="text-[11px] font-mono text-cyan-300 flex items-center gap-1.5">
              <span>Showing:</span>
              <strong className="text-white font-bold">{displayItems.length}</strong>
              <span>memories in</span>
              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 uppercase font-orbitron font-semibold">
                {activeCategoryMeta.label}
              </span>
              {activeCategory !== 'all' && (
                <button
                  onClick={() => setActiveCategory('all')}
                  className="ml-2 text-fuchsia-400 hover:underline cursor-pointer"
                >
                  (Reset to All)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* MEMORIES CARDS DISPLAY GRID */}
        <div className="space-y-3">
          {displayItems.length === 0 ? (
            <div className="glass-panel p-12 text-center text-gray-400 font-mono text-sm border border-white/10 rounded-2xl">
              <Brain size={32} className="mx-auto mb-2 text-gray-500 opacity-60" />
              <p>No memories found matching this filter ({activeCategoryMeta.label}).</p>
              <button
                onClick={() => {
                  setActiveCategory('all');
                  setSearchQuery('');
                  setSourceFilter('all');
                }}
                className="mt-3 px-4 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600 border border-cyan-400/40 text-cyan-200 font-orbitron text-xs cursor-pointer"
              >
                Show All Memories ({getCategoryCount('all')})
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {displayItems.map((item) => renderMemoryCard(item, false))}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* BOTTOM MEMORY EXPLORER & QUICK-FILTER BAR (At the bottom of the page) */}
        {/* ========================================================= */}
        <div
          ref={bottomSectionRef}
          className="glass-panel p-3.5 sm:p-5 border-2 border-cyan-400/60 rounded-2xl sm:rounded-3xl flex flex-col gap-3 shadow-[0_0_30px_rgba(6,182,212,0.25)] mt-3 shrink-0"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers size={17} className="text-cyan-400" />
                <h3 className="font-orbitron font-bold text-xs sm:text-sm text-cyan-300 uppercase tracking-wider">
                  Bottom Memory Explorer
                </h3>
              </div>
              <p className="text-[10px] sm:text-xs font-mono text-gray-300 mt-0.5">
                Click any button below to instantly show all memories right here
              </p>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <button
                type="button"
                onClick={scrollToTopGrid}
                className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-400/40 text-cyan-200 text-[11px] font-orbitron flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                title="Scroll back up to the top cards grid"
              >
                <span>⬆️ Jump to Top Grid</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalTab(
                    activeCategory === 'needs'
                      ? 'need'
                      : activeCategory === 'statements'
                        ? 'statement'
                        : 'memory'
                  );
                  setIsAddModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:opacity-90 text-white text-[11px] font-orbitron font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow"
              >
                <Plus size={13} />
                <span>+ Add Item</span>
              </button>
            </div>
          </div>

          {/* THE CATEGORY BUTTONS AT THE BOTTOM */}
          <div className="flex flex-wrap gap-2 items-center">
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeCategory === tab.id;
              const count = getCategoryCount(tab.id);

              return (
                <button
                  key={`bottom-${tab.id}`}
                  type="button"
                  onClick={() => handleSelectCategory(tab.id, false)}
                  className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-orbitron font-bold transition-all cursor-pointer shadow-md select-none border active:scale-95 ${
                    isActive
                      ? `bg-gradient-to-r ${tab.color} text-white border-white shadow-[0_0_20px_rgba(6,182,212,0.6)] ring-2 ring-white/40 scale-105`
                      : 'bg-white/5 border-white/15 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/30'
                  }`}
                  title={`Click to show ${tab.label}`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-cyan-400'} />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-black/50 text-white font-bold' : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* DEDICATED IN-PLACE MEMORIES LIST DISPLAYED RIGHT AT THE BOTTOM */}
          <div className="mt-2 pt-3 border-t border-cyan-500/30 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-cyan-300 flex items-center gap-1.5">
                  <span>Displaying:</span>
                  <strong className="text-white font-bold text-sm">{displayItems.length}</strong>
                  <span>memories in</span>
                  <span className="px-2 py-0.5 rounded-lg bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 uppercase font-orbitron font-bold">
                    {activeCategoryMeta.label}
                  </span>
                </span>
              </div>

              {activeCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => handleSelectCategory('all', false)}
                  className="text-xs text-fuchsia-400 hover:text-fuchsia-300 hover:underline cursor-pointer font-orbitron font-semibold"
                >
                  Show All Memories ({getCategoryCount('all')})
                </button>
              )}
            </div>

            {displayItems.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-mono text-xs border border-white/10 rounded-2xl bg-black/40">
                <Brain size={28} className="mx-auto mb-2 text-gray-500 opacity-60" />
                <p>No memories found in {activeCategoryMeta.label}.</p>
                <button
                  type="button"
                  onClick={() => handleSelectCategory('all', false)}
                  className="mt-2 px-3 py-1 rounded-xl bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 font-orbitron text-xs cursor-pointer"
                >
                  Reset to All Memories ({getCategoryCount('all')})
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-h-[70vh] overflow-y-auto pr-1">
                {displayItems.map((item) => renderMemoryCard(item, true))}
              </div>
            )}
          </div>
        </div>

        {/* Unified Add Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-lg bg-[#0b071a]/95 border border-cyan-500/50 rounded-3xl p-5 sm:p-6 shadow-[0_0_40px_rgba(6,182,212,0.3)] text-white">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Brain size={22} className="text-cyan-400" />
                  <h3 className="font-orbitron font-bold text-base text-white">
                    Grow Grayson's Intelligence
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="flex gap-1.5 p-1 bg-black/50 rounded-xl my-3 border border-white/10 text-xs font-orbitron">
                <button
                  type="button"
                  onClick={() => setModalTab('memory')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    modalTab === 'memory' ? 'bg-cyan-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Fact / Memory
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('need')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    modalTab === 'need' ? 'bg-amber-500 text-black font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Thing I Need
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('statement')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    modalTab === 'statement' ? 'bg-emerald-500 text-black font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Thing I've Said
                </button>
              </div>

              {modalTab === 'memory' ? (
                <form onSubmit={handleAddMemory} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-orbitron text-gray-300 block mb-1">
                      Topic / Fact Title:
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g., First DFW Client Target"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-orbitron text-gray-300 block mb-1">
                      Category:
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full bg-gray-900 border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-orbitron"
                    >
                      <option value="school">Schools & Coursework</option>
                      <option value="goal">Goals & Growth</option>
                      <option value="business">Business & Tech</option>
                      <option value="personal">Personal & Routine</option>
                      <option value="identity">Identity & Grounding</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-orbitron text-gray-300 block mb-1">
                      Detail / Insight To Remember:
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="What should Einstein, Buzz, and God Mode learn and remember from this?"
                      className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs text-white outline-none focus:border-cyan-400 font-sans leading-relaxed"
                    />
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 py-2 bg-white/10 hover:bg-white/15 rounded-xl font-orbitron text-xs font-bold text-gray-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:opacity-90 rounded-xl font-orbitron text-xs font-bold text-white shadow-lg cursor-pointer"
                    >
                      Add Memory (+25 XP)
                    </button>
                  </div>
                </form>
              ) : modalTab === 'need' ? (
                <form onSubmit={handleAddNeed} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-orbitron text-gray-300 block mb-1">
                      What do you need or need help solving?
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={newNeedText}
                      onChange={(e) => setNewNeedText(e.target.value)}
                      placeholder="e.g., Clear step-by-step breakdown of Texas LLC operating agreements, or homework outline for Empowered Learner unit 3"
                      className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-400 font-sans leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-orbitron text-gray-300 block mb-1">
                      Category:
                    </label>
                    <select
                      value={newNeedCategory}
                      onChange={(e) => setNewNeedCategory(e.target.value as any)}
                      className="w-full bg-gray-900 border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400 font-orbitron"
                    >
                      <option value="school">Schools & Assignments</option>
                      <option value="business">Business & Tech</option>
                      <option value="personal">Personal Routine & Life</option>
                      <option value="growth">Goals & Growth</option>
                    </select>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 py-2 bg-white/10 hover:bg-white/15 rounded-xl font-orbitron text-xs font-bold text-gray-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-orbitron text-xs font-bold shadow-lg cursor-pointer"
                    >
                      Save Need (+20 XP)
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleAddStatement} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-orbitron text-gray-300 block mb-1">
                      Authentic Quote / Statement:
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={newQuoteText}
                      onChange={(e) => setNewQuoteText(e.target.value)}
                      placeholder='e.g., "Putting pen to paper. Never allowing doubts to get in the way."'
                      className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400 font-sans leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-orbitron text-gray-300 block mb-1">
                      Context / Principle:
                    </label>
                    <input
                      type="text"
                      value={newQuoteContext}
                      onChange={(e) => setNewQuoteContext(e.target.value)}
                      placeholder="e.g., Work ethic, Texas family roots, or daily routine"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-400 font-sans"
                    />
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 py-2 bg-white/10 hover:bg-white/15 rounded-xl font-orbitron text-xs font-bold text-gray-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-orbitron text-xs font-bold shadow-lg cursor-pointer"
                    >
                      Save Statement (+20 XP)
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* In-App Delete Confirmation Modal (100% reliable, zero window.confirm reliance) */}
        {deleteModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-md bg-[#0e0922] border-2 border-red-500/60 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(239,68,68,0.35)] text-white flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5 text-red-400 font-orbitron font-bold text-base sm:text-lg">
                  <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400">
                    <Trash2 size={20} />
                  </div>
                  <span>Delete Memory Item?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteModalItem(null)}
                  className="p-1 rounded-full text-gray-400 hover:text-white cursor-pointer"
                  title="Cancel"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Warning description */}
              <p className="text-xs sm:text-sm text-gray-300 font-sans leading-relaxed">
                Are you sure you want to permanently delete this memory item from Grayson's living database? This action cannot be undone.
              </p>

              {/* Item Preview Card */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/15 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-orbitron uppercase text-cyan-300 px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30">
                    {deleteModalItem.category}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {deleteModalItem.isStatementObj
                      ? '💬 Authentic Quote'
                      : deleteModalItem.isNeedObj
                        ? '⚡ Goal / Need'
                        : '🏛️ Saved Memory'}
                  </span>
                </div>
                <h5 className="font-orbitron font-bold text-xs sm:text-sm text-white line-clamp-2">
                  {deleteModalItem.title}
                </h5>
                <p className="text-[11px] text-gray-300 font-mono line-clamp-3 italic">
                  "{deleteModalItem.content}"
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalItem(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 font-orbitron text-xs font-semibold text-gray-300 hover:text-white cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 border border-red-400 text-white font-orbitron text-xs font-bold shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <span>Deleting...</span>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Delete Permanently</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Back Button */}
        <div className="text-center pt-2 pb-4 shrink-0">
          <button
            onClick={onBack}
            className="glass-panel px-8 py-2.5 text-white font-orbitron tracking-wider text-xs sm:text-sm hover:border-cyan-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
