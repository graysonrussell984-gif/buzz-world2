import React, { useState, useEffect } from 'react';
import { MemoryItem } from '../types';
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
  TrendingUp,
  Layers,
} from 'lucide-react';

interface MemoryBrainRoomProps {
  onBack: () => void;
  onOpenSidebar: () => void;
}

export const MemoryBrainRoom: React.FC<MemoryBrainRoomProps> = ({ onBack, onOpenSidebar }) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'base' | 'grown'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisNotification, setSynthesisNotification] = useState<string | null>(null);

  // New memory form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryItem['category']>('personal');
  const [newContent, setNewContent] = useState('');

  const loadMemories = async () => {
    try {
      const res = await fetch('/api/database/state');
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch (err) {
      console.error('Failed to load database memories:', err);
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  const handleSynthesizeGrowth = async () => {
    setIsSynthesizing(true);
    setSynthesisNotification(null);
    try {
      const res = await fetch('/api/database/synthesize-growth', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        await loadMemories();
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
        await loadMemories();
        setNewTitle('');
        setNewContent('');
        setIsAddModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to save memory', err);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (window.confirm('Delete this memory from the persistent database?')) {
      try {
        const res = await fetch(`/api/database/memories/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setMemories((prev) => prev.filter((m) => m.id !== id));
        }
      } catch (err) {
        console.error('Failed to delete memory', err);
      }
    }
  };

  // Stats calculation
  const baseCount = memories.filter((m) => m.source === 'base' || m.source === 'system').length;
  const grownCount = memories.filter((m) => m.source === 'grown' || m.source === 'voice_extracted' || m.source === 'user').length;

  // Filter memories
  const filteredMemories = memories.filter((m) => {
    const isBase = m.source === 'base' || m.source === 'system';
    const isGrown = m.source === 'grown' || m.source === 'voice_extracted' || m.source === 'user';

    const matchesSource =
      sourceFilter === 'all'
        ? true
        : sourceFilter === 'base'
        ? isBase
        : isGrown;

    const matchesCategory = activeCategory === 'all' || m.category === activeCategory;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      m.title.toLowerCase().includes(query) ||
      m.content.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query);

    return matchesSource && matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'school':
        return {
          icon: <GraduationCap size={13} />,
          className: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
        };
      case 'business':
        return {
          icon: <Briefcase size={13} />,
          className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        };
      case 'goal':
      case 'milestone':
        return {
          icon: <Target size={13} />,
          className: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'identity':
        return {
          icon: <User size={13} />,
          className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
      default:
        return {
          icon: <Heart size={13} />,
          className: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        };
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#0b071a] flex flex-col p-4 md:p-6 gap-4 text-white z-20 overflow-y-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-4 glass-panel border border-cyan-500/50 shrink-0">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Menu size={22} />
        </button>
        <div className="text-center">
          <h2 className="font-orbitron text-xl md:text-2xl font-bold tracking-wider text-gradient-neon flex items-center justify-center gap-2">
            <Brain size={24} className="text-cyan-400" />
            <span>Living Memory & Brain Engine</span>
          </h2>
          <p className="text-xs text-fuchsia-400 font-mono">
            Base Foundation • Continuous Learning • Autonomous Memory Growth
          </p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-orbitron text-sm text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/20"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </header>

      {/* Memory Growth Engine Banner */}
      <div className="glass-panel-neon p-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 border border-fuchsia-500/40">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-fuchsia-600 flex items-center justify-center shadow-[0_0_15px_rgba(217,70,239,0.5)] shrink-0">
            <TrendingUp size={24} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-orbitron text-sm font-bold text-white">
              <span>Memory Evolution Engine</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Auto-Learning Active
              </span>
            </div>
            <p className="text-xs text-gray-300 font-sans mt-0.5">
              Your memory is not frozen. The base is just your foundation—it absorbs new facts from conversations and voice notes automatically.
            </p>
          </div>
        </div>

        {/* Counters & Scan Action */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex gap-2">
            <div className="bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-center">
              <div className="font-orbitron font-bold text-cyan-400 text-sm">{baseCount}</div>
              <div className="text-[10px] text-gray-400 font-mono">Base Bedrock</div>
            </div>
            <div className="bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-center">
              <div className="font-orbitron font-bold text-emerald-400 text-sm">{grownCount}</div>
              <div className="text-[10px] text-gray-400 font-mono">Grown & Learned</div>
            </div>
          </div>

          <button
            onClick={handleSynthesizeGrowth}
            disabled={isSynthesizing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-fuchsia-600 hover:opacity-90 rounded-xl text-xs font-orbitron text-white cursor-pointer transition-all shadow-md disabled:opacity-50"
            title="Scan recent conversations for newly learned facts"
          >
            <RefreshCw size={14} className={isSynthesizing ? 'animate-spin' : ''} />
            <span>{isSynthesizing ? 'Synthesizing...' : 'Scan & Learn'}</span>
          </button>
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

      {/* Control Bar: Filter by Base vs Grown, Category Filters, Search */}
      <div className="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
        {/* Source Toggle: All / Base Bedrock / Grown */}
        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/15 text-xs font-orbitron">
          <button
            onClick={() => setSourceFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              sourceFilter === 'all'
                ? 'bg-fuchsia-600 text-white font-bold shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All ({memories.length})
          </button>
          <button
            onClick={() => setSourceFilter('base')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              sourceFilter === 'base'
                ? 'bg-cyan-600 text-white font-bold shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🏛️ Base Bedrock ({baseCount})
          </button>
          <button
            onClick={() => setSourceFilter('grown')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              sourceFilter === 'grown'
                ? 'bg-emerald-600 text-white font-bold shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🌱 Grown & Learned ({grownCount})
          </button>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1 items-center justify-center">
          {['all', 'school', 'personal', 'business', 'goal', 'identity'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-orbitron uppercase tracking-wider capitalize transition-all border cursor-pointer ${
                activeCategory === cat
                  ? 'bg-white/20 border-white text-white font-bold'
                  : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Add Memory Button */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-2xl px-3 py-1.5 flex-1 md:w-56">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge..."
              className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-400 w-full"
            />
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-2xl font-orbitron text-xs font-bold text-white flex items-center gap-1 shadow-md cursor-pointer shrink-0"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Add Fact</span>
          </button>
        </div>
      </div>

      {/* Memories Cards Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredMemories.length === 0 ? (
          <div className="text-center py-20 text-gray-400 font-mono text-sm">
            No memories match the filter. Chat with your assistants or click "+ Add Fact" to grow your memory!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMemories.map((mem) => {
              const badge = getCategoryBadge(mem.category);
              const isBase = mem.source === 'base' || mem.source === 'system';
              const isGrown = mem.source === 'grown';
              const isVoice = mem.source === 'voice_extracted';

              return (
                <div
                  key={mem.id}
                  className={`border rounded-3xl p-5 flex flex-col justify-between gap-3 transition-all group ${
                    isBase
                      ? 'bg-white/5 border-cyan-500/30 hover:border-cyan-400/60 shadow-[inset_0_0_15px_rgba(6,182,212,0.05)]'
                      : 'bg-emerald-950/15 border-emerald-500/40 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)]'
                  }`}
                >
                  <div>
                    {/* Header: Category Badge & Growth Source */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-orbitron border ${badge.className}`}
                      >
                        {badge.icon}
                        <span className="capitalize">{mem.category}</span>
                      </span>

                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                          isBase
                            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                            : isGrown
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : isVoice
                            ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
                            : 'bg-white/10 text-gray-300 border-white/20'
                        }`}
                      >
                        {isBase
                          ? '🏛️ Base Bedrock'
                          : isGrown
                          ? '🌱 Learned & Grown'
                          : isVoice
                          ? '🎙️ Voice Note'
                          : '✍️ User Added'}
                      </span>
                    </div>

                    <h3 className="font-orbitron font-bold text-sm text-white mb-2">{mem.title}</h3>
                    <p className="text-xs font-sans text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {mem.content}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                    <span>
                      {isBase
                        ? 'Permanent Baseline'
                        : `Learned: ${new Date(mem.createdAt).toLocaleDateString()}`}
                    </span>
                    <button
                      onClick={() => handleDeleteMemory(mem.id)}
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
                      title="Delete memory"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Memory Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0b071a]/95 border border-cyan-500/50 rounded-3xl p-6 shadow-[0_0_40px_rgba(6,182,212,0.3)] text-white">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Brain size={22} className="text-cyan-400" />
                <h3 className="font-orbitron font-bold text-base text-white">
                  Add to Growing Memory
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMemory} className="py-4 space-y-4">
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
                  <option value="business">Business & Ventures</option>
                  <option value="goal">Milestone / Goal</option>
                  <option value="school">School & Coursework</option>
                  <option value="personal">Personal Routine</option>
                  <option value="identity">Identity & Rules</option>
                  <option value="family">Family & Support</option>
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
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 rounded-xl font-orbitron text-xs font-bold text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:opacity-90 rounded-xl font-orbitron text-xs font-bold text-white shadow-lg"
                >
                  Add to Growing Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Back Button */}
      <div className="text-center pt-2 shrink-0">
        <button
          onClick={onBack}
          className="glass-panel px-8 py-3 text-white font-orbitron tracking-wider text-sm hover:border-cyan-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>
      </div>
    </div>
  );
};
