import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'banner' | 'sidebar';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'button',
}) => {
  const { isInstalled, isInstallable, install } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  // If already running as an installed standalone PWA, hide install prompts
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setModalOpen(true);
      }
    } else {
      setModalOpen(true);
    }
  };

  if (variant === 'sidebar') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-orbitron text-xs text-left bg-gradient-to-r from-cyan-500/20 via-fuchsia-500/20 to-amber-500/20 border border-cyan-400/50 hover:border-cyan-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer text-cyan-200 group ${className}`}
        >
          <Smartphone size={16} className="text-cyan-400 group-hover:scale-110 transition-transform" />
          <div className="flex flex-col">
            <span className="font-bold text-white">Download App to Phone</span>
            <span className="text-[9px] text-gray-300 font-sans">Install on Home Screen</span>
          </div>
        </button>

        <PWAInstallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  if (variant === 'banner') {
    return (
      <>
        <div
          onClick={handleClick}
          className={`glass-panel px-4 py-2.5 flex items-center justify-between border border-cyan-400/50 bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-fuchsia-950/40 hover:border-cyan-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all cursor-pointer group rounded-2xl ${className}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_10px_rgba(6,182,212,0.3)]">
              <Download size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-orbitron font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                <span>Download App to Phone</span>
                <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-400/40 px-1.5 py-0.2 rounded-full">
                  1-Tap Install
                </span>
              </div>
              <p className="text-[11px] text-gray-300 font-sans truncate">
                Add to your iPhone or Android home screen for full-screen access with zero browser bars.
              </p>
            </div>
          </div>
          <span className="text-cyan-400 font-orbitron text-xs shrink-0 ml-2 group-hover:translate-x-1 transition-transform">
            Install →
          </span>
        </div>

        <PWAInstallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/25 via-fuchsia-500/25 to-amber-500/25 border border-cyan-400/50 hover:border-cyan-300 hover:shadow-[0_0_12px_rgba(6,182,212,0.4)] text-cyan-200 hover:text-white font-orbitron text-xs font-bold transition-all cursor-pointer active:scale-95 ${className}`}
        title="Download app to your phone or desktop home screen"
      >
        <Smartphone size={14} className="text-cyan-400" />
        <span className="hidden xs:inline">Download to Phone</span>
        <span className="xs:hidden">Install</span>
      </button>

      <PWAInstallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
