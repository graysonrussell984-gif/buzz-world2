import React from 'react';
import { X, Sparkles, Cpu, Download, RefreshCw, Trash2, Shield } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  particlesEnabled: boolean;
  onToggleParticles: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  particlesEnabled,
  onToggleParticles,
}) => {
  if (!isOpen) return null;

  const handleExportAll = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      tasks: JSON.parse(localStorage.getItem('user_tasks') || '{}'),
      projects: JSON.parse(localStorage.getItem('user_projects') || '[]'),
      galleryCount: JSON.parse(localStorage.getItem('user_gallery') || '[]').length,
      buzzHistoryCount: JSON.parse(localStorage.getItem('chat_history_buzz') || '[]').length,
      einsteinHistoryCount: JSON.parse(localStorage.getItem('chat_history_einstein') || '[]').length,
      godmodeHistoryCount: JSON.parse(localStorage.getItem('chat_history_godmode') || '[]').length,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `einstein_lab_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetAll = () => {
    if (
      window.confirm(
        'Are you sure you want to reset all tasks, projects, and gallery items? This cannot be undone.'
      )
    ) {
      localStorage.removeItem('user_tasks');
      localStorage.removeItem('user_projects');
      localStorage.removeItem('user_gallery');
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0b071a]/95 border border-cyan-500/50 rounded-3xl p-6 shadow-[0_0_40px_rgba(6,182,212,0.3)] text-white overflow-hidden max-h-[90vh] flex flex-col">
        {/* Glow */}
        <div className="absolute -top-16 -left-16 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <Cpu size={22} className="text-cyan-400" />
            <h2 className="font-orbitron text-lg font-bold text-white">System Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs md:text-sm text-gray-200">
          {/* AI Engine Status */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-emerald-400" />
              <div>
                <div className="font-orbitron font-bold text-white text-xs">AI Backend Engine</div>
                <div className="text-[11px] text-emerald-400">Gemini 3.8 Flash (Active)</div>
              </div>
            </div>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>

          {/* Particles Toggle */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles size={20} className="text-fuchsia-400" />
              <div>
                <div className="font-orbitron font-bold text-white text-xs">Particle Space Field</div>
                <div className="text-[11px] text-gray-400">Interactive neon background nodes</div>
              </div>
            </div>
            <button
              onClick={onToggleParticles}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                particlesEnabled ? 'bg-fuchsia-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  particlesEnabled ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Backup data */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="font-orbitron font-bold text-white text-xs">Backup Dashboard Data</div>
              <div className="text-[11px] text-gray-400">Download projects, tasks & stats</div>
            </div>
            <button
              onClick={handleExportAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-orbitron text-cyan-400 transition-colors"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
          </div>

          {/* Danger zone */}
          <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="font-orbitron font-bold text-red-400 text-xs">Reset All Local Storage</div>
              <div className="text-[11px] text-gray-400">Clear calendar, tasks & projects</div>
            </div>
            <button
              onClick={handleResetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/70 hover:bg-red-600 rounded-xl text-xs font-orbitron text-white transition-colors"
            >
              <Trash2 size={14} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-white/10 hover:bg-white/15 rounded-xl font-orbitron text-xs font-bold text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
