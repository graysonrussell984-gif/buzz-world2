import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Share2,
  PlusSquare,
  Check,
  X,
  ExternalLink,
  Laptop,
  QrCode,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [activePlatformTab, setActivePlatformTab] = useState<'ios' | 'android' | 'qr'>(
    isIOS ? 'ios' : 'android'
  );

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setInstalling(true);
    const success = await install();
    setInstalling(false);
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2500);
    }
  };

  const appUrl = typeof window !== 'undefined' ? window.location.href : 'https://ai.studio';
  // Generates dynamic clean QR code for the current shared URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    appUrl
  )}&bgcolor=0b071a&color=22d3ee&qzone=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-gradient-to-br from-[#0c081e] via-[#120b29] to-[#1a0c36] border-2 border-cyan-400/50 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.35)] flex flex-col max-h-[95dvh] overflow-hidden text-white">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-cyan-500/30 bg-black/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/30 border border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Smartphone size={22} className="text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-orbitron font-black text-sm sm:text-base text-white uppercase tracking-wider">
                  Download App to Phone
                </h3>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-400/50 px-2 py-0.5 rounded-full font-bold">
                  PWA Standalone
                </span>
              </div>
              <p className="text-xs text-gray-300 font-sans mt-0.5">
                Install Einstein's Lab directly to your home screen with zero app store hassle.
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

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto min-h-0 space-y-4">
          {/* If already running in standalone mode */}
          {isInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(52,211,153,0.4)]">
                <Check size={24} />
              </div>
              <h4 className="font-orbitron font-bold text-white text-base">App Already Installed!</h4>
              <p className="text-xs text-emerald-200/90 font-sans">
                You are running Einstein's Lab in full-screen standalone mode. All features, cloud sync, and offline storage are active.
              </p>
            </div>
          ) : (
            <>
              {/* Chromium 1-Click Direct Install Button (If supported by browser) */}
              {isInstallable && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/50 via-purple-950/40 to-fuchsia-950/50 border border-cyan-400/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-orbitron font-bold text-xs uppercase tracking-wider text-cyan-300">
                      1-Tap Direct Install
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Chrome / Android Ready</span>
                  </div>
                  <button
                    onClick={handleInstallClick}
                    disabled={installing}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-fuchsia-600 to-amber-500 hover:from-cyan-400 hover:to-amber-400 text-white font-orbitron font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all cursor-pointer active:scale-98"
                  >
                    <Download size={18} />
                    <span>{installing ? 'Installing...' : 'Install App to Phone Now'}</span>
                  </button>
                </div>
              )}

              {/* Platform Tabs (iPhone/iPad vs Android vs Scan QR) */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10">
                <button
                  onClick={() => setActivePlatformTab('ios')}
                  className={`flex-1 py-2 rounded-xl text-xs font-orbitron font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activePlatformTab === 'ios'
                      ? 'bg-fuchsia-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.5)]'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <span>iPhone / iPad</span>
                </button>

                <button
                  onClick={() => setActivePlatformTab('android')}
                  className={`flex-1 py-2 rounded-xl text-xs font-orbitron font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activePlatformTab === 'android'
                      ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <span>Android</span>
                </button>

                <button
                  onClick={() => setActivePlatformTab('qr')}
                  className={`flex-1 py-2 rounded-xl text-xs font-orbitron font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activePlatformTab === 'qr'
                      ? 'bg-amber-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <QrCode size={13} />
                  <span>Scan to Phone</span>
                </button>
              </div>

              {/* TAB 1: IPHONE / IPAD (SAFARI INSTRUCTIONS) */}
              {activePlatformTab === 'ios' && (
                <div className="space-y-3 font-sans">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/15 space-y-2">
                    <span className="font-orbitron font-bold text-xs text-fuchsia-300 uppercase tracking-wider block">
                      How to Install on iPhone / iPad (Safari)
                    </span>
                    <div className="space-y-2.5 text-xs text-gray-200">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/40 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                          1
                        </div>
                        <div>
                          Open this link in <strong className="text-white">Safari</strong> (not inside Chrome or Instagram browser).
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/40 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                          2
                        </div>
                        <div>
                          Tap the <strong className="text-white">Share</strong> button{' '}
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 border border-white/20 font-mono text-[10px] mx-1">
                            <Share2 size={11} className="inline mr-1" /> Share
                          </span>{' '}
                          in the bottom toolbar of Safari.
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/40 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                          3
                        </div>
                        <div>
                          Scroll down the share menu and tap{' '}
                          <strong className="text-white">"Add to Home Screen"</strong>{' '}
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/10 text-amber-300 border border-white/20 font-mono text-[10px] mx-1">
                            <PlusSquare size={11} className="inline mr-1" /> Add
                          </span>.
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/40 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                          4
                        </div>
                        <div>
                          Tap <strong className="text-white">"Add"</strong> in the top right. The app will appear on your home screen just like an App Store app!
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ANDROID (CHROME INSTRUCTIONS) */}
              {activePlatformTab === 'android' && (
                <div className="space-y-3 font-sans">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/15 space-y-2">
                    <span className="font-orbitron font-bold text-xs text-cyan-300 uppercase tracking-wider block">
                      How to Install on Android (Chrome / Samsung Internet)
                    </span>
                    <div className="space-y-2.5 text-xs text-gray-200">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                          1
                        </div>
                        <div>
                          Tap the <strong className="text-white">three dots menu (⋮)</strong> in the top-right corner of Chrome.
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                          2
                        </div>
                        <div>
                          Tap <strong className="text-white">"Install app"</strong> or{' '}
                          <strong className="text-white">"Add to Home screen"</strong>.
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                          3
                        </div>
                        <div>
                          Confirm <strong className="text-white">Install</strong>. The app icon will be added to your app drawer and home screen.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SCAN QR CODE FROM LAPTOP */}
              {activePlatformTab === 'qr' && (
                <div className="space-y-3 flex flex-col items-center text-center font-sans">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/15 w-full flex flex-col items-center">
                    <span className="font-orbitron font-bold text-xs text-amber-300 uppercase tracking-wider mb-2">
                      Scan with Your Phone Camera
                    </span>
                    <div className="p-3 bg-[#0b071a] border-2 border-cyan-400/60 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                      <img
                        src={qrCodeUrl}
                        alt="Scan QR to open app on phone"
                        className="w-44 h-44 rounded-lg"
                      />
                    </div>
                    <p className="text-[11px] text-gray-300 mt-2.5 max-w-xs">
                      Point your iPhone or Android camera at the QR code above to immediately open Einstein's Lab on your phone.
                    </p>
                  </div>
                </div>
              )}

              {/* Standalone Features Checklist */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 text-[11px] text-gray-300">
                <div className="font-orbitron font-bold text-white text-xs mb-1 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-400" />
                  <span>Why Install as a Phone App?</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-400 shrink-0" />
                    <span>No browser URL bars (Full Screen)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-400 shrink-0" />
                    <span>Real-time cross-device sync</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-400 shrink-0" />
                    <span>Instant launch from home screen</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-400 shrink-0" />
                    <span>Works offline with cached data</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/60 flex items-center justify-between shrink-0">
          <div className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Encrypted Cloud Sync Active</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-orbitron text-xs font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
