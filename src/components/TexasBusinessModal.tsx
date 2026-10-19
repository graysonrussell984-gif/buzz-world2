import React, { useState } from 'react';
import {
  Hammer,
  Beer,
  Truck,
  Landmark,
  CreditCard,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Search,
  BookOpen,
  DollarSign,
  ShieldCheck,
  X,
  Building2,
  FileText,
} from 'lucide-react';
import {
  PLAYBOOK_MODULES,
  CHECKLIST_ITEMS,
  TEXAS_HEALTH_CODES,
  TEXAS_BANKING_GUIDE,
  PlaybookModule,
} from '../data/texasBusinessPlaybook';

interface TexasBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TexasBusinessModal: React.FC<TexasBusinessModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'guides' | 'milestones' | 'health' | 'banking'>('guides');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'carpentry' | 'bar' | 'foodtruck' | 'llc' | 'banking' | 'wealth'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedModules, setExpandedModules] = useState<{ [id: string]: boolean }>({
    carpentry: true,
    bar: true,
    foodtruck: true,
  });

  const [checklistCompleted, setChecklistCompleted] = useState<{ [id: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem('tx_business_checklist');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleChecklist = (id: string) => {
    setChecklistCompleted((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('tx_business_checklist', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const toggleModuleExpand = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!isOpen) return null;

  const filteredModules = PLAYBOOK_MODULES.filter((m) => {
    if (selectedCategory !== 'all' && m.id !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.summary.toLowerCase().includes(q) ||
      m.keySteps.some((s) => s.title.toLowerCase().includes(q) || s.detail.toLowerCase().includes(q)) ||
      m.regulations.some((r) => r.toLowerCase().includes(q))
    );
  });

  const completedCount = Object.values(checklistCompleted).filter(Boolean).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-gradient-to-br from-[#0e0922] via-[#140b2d] to-[#1c0d38] border-2 border-amber-400/50 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.35)] flex flex-col max-h-[95dvh] overflow-hidden text-white">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-amber-500/30 bg-black/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/30 to-fuchsia-500/30 border border-amber-400/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]">
              <Landmark size={20} className="text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-orbitron font-black text-sm sm:text-base md:text-lg text-gradient-neon uppercase tracking-wider">
                  Texas Businesses & Generational Wealth Playbook
                </h2>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 border border-amber-400/50 px-2 py-0.5 rounded-full font-bold">
                  Dallas, TX
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-300 font-sans">
                Real Texas requirements, LLC filing, TFER health codes, TABC bar rules & commercial banking roadmap.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/20 text-gray-300 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* View Switcher Tabs & Search Row */}
        <div className="px-4 sm:px-6 py-2.5 bg-white/5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setActiveTab('guides')}
              className={`px-3 py-1.5 rounded-xl text-xs font-orbitron font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'guides'
                  ? 'bg-amber-500 text-black font-bold shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              <BookOpen size={13} />
              <span>Business Guides</span>
            </button>

            <button
              onClick={() => setActiveTab('milestones')}
              className={`px-3 py-1.5 rounded-xl text-xs font-orbitron font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'milestones'
                  ? 'bg-amber-500 text-black font-bold shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              <CheckCircle2 size={13} />
              <span>Milestones ({completedCount}/{totalCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('health')}
              className={`px-3 py-1.5 rounded-xl text-xs font-orbitron font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'health'
                  ? 'bg-amber-500 text-black font-bold shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              <ShieldCheck size={13} />
              <span>Texas Health Code</span>
            </button>

            <button
              onClick={() => setActiveTab('banking')}
              className={`px-3 py-1.5 rounded-xl text-xs font-orbitron font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'banking'
                  ? 'bg-amber-500 text-black font-bold shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              <CreditCard size={13} />
              <span>Banking & Credit</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search regulations, steps..."
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-8 pr-3 py-1 text-xs text-white placeholder-gray-400 outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-0 space-y-4">
          {/* TAB 1: GUIDES */}
          {activeTab === 'guides' && (
            <div className="space-y-4">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'all', label: 'All Industries' },
                  { id: 'carpentry', label: 'Custom Carpentry' },
                  { id: 'bar', label: 'Bar Ownership' },
                  { id: 'foodtruck', label: 'Food Truck' },
                  { id: 'llc', label: 'Texas LLC' },
                  { id: 'banking', label: 'Commercial Banks' },
                  { id: 'wealth', label: 'Generational Wealth' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={`px-3 py-1 rounded-full text-xs font-mono transition-all shrink-0 ${
                      selectedCategory === cat.id
                        ? 'bg-amber-400 text-black font-bold shadow-md'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Module Cards */}
              <div className="space-y-3">
                {filteredModules.map((module) => {
                  const isExp = expandedModules[module.id] ?? true;
                  return (
                    <div
                      key={module.id}
                      className="glass-panel p-4 rounded-2xl border border-white/15 bg-black/40 hover:border-amber-400/50 transition-all"
                    >
                      <div
                        onClick={() => toggleModuleExpand(module.id)}
                        className="flex items-center justify-between cursor-pointer pb-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30">
                            {module.id === 'carpentry' ? (
                              <Hammer size={18} />
                            ) : module.id === 'bar' ? (
                              <Beer size={18} />
                            ) : module.id === 'foodtruck' ? (
                              <Truck size={18} />
                            ) : module.id === 'llc' ? (
                              <Building2 size={18} />
                            ) : module.id === 'banking' ? (
                              <CreditCard size={18} />
                            ) : (
                              <Landmark size={18} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-orbitron font-bold text-sm sm:text-base text-white">
                                {module.title}
                              </h3>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-cyan-300">
                                {module.badge}
                              </span>
                            </div>
                            <p className="text-xs text-gray-300 font-sans mt-0.5">
                              {module.summary}
                            </p>
                          </div>
                        </div>

                        <button className="text-gray-400 hover:text-white p-1">
                          {isExp ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>

                      {isExp && (
                        <div className="pt-3 border-t border-white/10 space-y-3">
                          {/* Key Steps */}
                          <div>
                            <h4 className="font-orbitron text-xs font-bold text-amber-300 mb-2 uppercase tracking-wider">
                              Key Execution Steps
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {module.keySteps.map((step) => (
                                <div
                                  key={step.step}
                                  className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs"
                                >
                                  <div className="text-amber-400 font-bold mb-1">
                                    Step {step.step}: {step.title}
                                  </div>
                                  <p className="text-gray-300 text-[11px] leading-relaxed">
                                    {step.detail}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Regulations & Permits */}
                          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3">
                            <h4 className="font-orbitron text-xs font-bold text-amber-300 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                              <ShieldCheck size={14} />
                              <span>Texas Regulations & Licenses</span>
                            </h4>
                            <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                              {module.regulations.map((reg, i) => (
                                <li key={i}>{reg}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Capital & Pro Tips */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-3">
                              <span className="font-orbitron font-bold text-cyan-300 block mb-1 flex items-center gap-1">
                                <DollarSign size={13} />
                                <span>Capital & Costs</span>
                              </span>
                              <ul className="text-gray-300 space-y-1 text-[11px]">
                                {module.capitalAndCosts.map((c, i) => (
                                  <li key={i}>• {c}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="bg-fuchsia-950/20 border border-fuchsia-500/30 rounded-xl p-3">
                              <span className="font-orbitron font-bold text-fuchsia-300 block mb-1 flex items-center gap-1">
                                <FileText size={13} />
                                <span>Grayson's Pro-Tips</span>
                              </span>
                              <ul className="text-gray-300 space-y-1 text-[11px]">
                                {module.proTips.map((tip, i) => (
                                  <li key={i}>• {tip}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: MILESTONES CHECKLIST */}
          {activeTab === 'milestones' && (
            <div className="space-y-4">
              <div className="glass-panel p-4 rounded-2xl border border-amber-400/40 bg-black/40 flex items-center justify-between gap-4">
                <div>
                  <span className="font-orbitron font-bold text-sm text-white block">
                    Execution Milestones ({completedCount} of {totalCount} Completed)
                  </span>
                  <span className="text-xs text-gray-300 font-sans">
                    Track real progress across formation, permitting, credit building, and wealth entity setup.
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-orbitron font-black text-2xl text-amber-400">{progressPct}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CHECKLIST_ITEMS.map((item) => {
                  const done = checklistCompleted[item.id] || false;
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleChecklist(item.id)}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        done
                          ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-100 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
                          : 'bg-white/5 border-white/10 hover:border-white/25 text-gray-200'
                      }`}
                    >
                      <button className="mt-0.5 text-amber-400">
                        {done ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Circle size={16} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-bold block ${done ? 'line-through text-gray-400' : 'text-white'}`}>
                          {item.label}
                        </span>
                        <span className="text-[11px] text-gray-400 mt-0.5 block">{item.detail}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: HEALTH CODE SUMMARY */}
          {activeTab === 'health' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/40 text-xs text-amber-200">
                <span className="font-bold">Texas Food Establishment Rules (TFER - 25 TAC 228):</span> All food trucks and bar operations serving ice, open mixers, or bar snacks in Texas must strictly adhere to state and Dallas City Health Department inspection protocols.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TEXAS_HEALTH_CODES.map((code, idx) => (
                  <div key={idx} className="glass-panel p-3.5 rounded-2xl border border-white/15 bg-black/40 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-orbitron font-bold text-amber-300">{code.title}</span>
                      <span className="text-[10px] font-mono text-cyan-300 bg-white/10 px-2 py-0.5 rounded-full">
                        {code.code}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 font-sans leading-relaxed">{code.requirement}</p>
                    <div className="text-[11px] text-fuchsia-300 font-mono bg-fuchsia-950/30 p-2 rounded-lg border border-fuchsia-500/30">
                      Critical Detail: {code.criticalDetail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: BANKING & CREDIT */}
          {activeTab === 'banking' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-400/40 text-xs text-cyan-200">
                <span className="font-bold">3-Account Business Banking System:</span> Operating Account (Daily Cash Flow), Tax Holding Account (Hold 25-30% of gross profits), and Capital Reserves (Emergency cushion & equipment purchasing).
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TEXAS_BANKING_GUIDE.map((step, idx) => (
                  <div key={idx} className="glass-panel p-4 rounded-2xl border border-white/15 bg-black/40 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-orbitron font-bold text-amber-300">{step.title}</span>
                        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30 shrink-0">
                          {step.tier}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 mb-3">{step.description}</p>
                      <div className="space-y-1">
                        <span className="text-[10px] font-orbitron text-gray-400 uppercase tracking-wider block">Action Items:</span>
                        <ul className="text-xs text-slate-200 space-y-1">
                          {step.actionItems.map((act, i) => (
                            <li key={i} className="text-[11px] text-gray-300">• {act}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-white/10 bg-black/60 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-400 font-mono">
            Grayson Russell • Generational Wealth Roadmap &copy; 2026
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-orbitron text-xs font-bold cursor-pointer transition-colors"
          >
            Close Playbook
          </button>
        </div>
      </div>
    </div>
  );
};
