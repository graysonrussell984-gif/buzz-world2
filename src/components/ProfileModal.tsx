import React from 'react';
import { X, Award, MapPin, GraduationCap, Target, ShieldCheck, Heart } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0b071a]/95 border border-fuchsia-500/50 rounded-3xl p-4 sm:p-6 shadow-[0_0_40px_rgba(217,70,239,0.3)] text-white overflow-hidden max-h-[90dvh] flex flex-col">
        {/* Background glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.5)]">
              <img
                src="https://i.postimg.cc/xTWNKK7X/home-bg-jpg.jpg"
                alt="Grayson"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="font-orbitron text-lg font-bold text-gradient-neon">
                Grayson Morris Russell
              </h2>
              <p className="text-xs text-cyan-400 font-mono">Future Business Owner & Entrepreneur</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 font-sans text-xs md:text-sm text-gray-200">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-2.5">
              <MapPin size={18} className="text-cyan-400 shrink-0" />
              <div>
                <div className="text-[10px] text-gray-400 uppercase font-mono">Location</div>
                <div className="font-medium text-white">Dallas, Texas</div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-2.5">
              <GraduationCap size={18} className="text-fuchsia-400 shrink-0" />
              <div>
                <div className="text-[10px] text-gray-400 uppercase font-mono">Degree Program</div>
                <div className="font-medium text-white">B.S. in Business</div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 font-orbitron text-xs text-cyan-400 font-bold uppercase tracking-wider">
              <Target size={16} />
              <span>The Mission & Long-Term Vision</span>
            </div>
            <p className="leading-relaxed text-gray-300">
              Own and operate independent businesses, build generational wealth, break family cycles, and
              prove that perseverance and daily grind turn dreams into reality.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 font-orbitron text-xs text-fuchsia-400 font-bold uppercase tracking-wider">
              <Award size={16} />
              <span>Current Courses & Focus</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>Empowered Learner: Habits of Success</li>
              <li>Effective Communication Skills</li>
              <li>SMART Goal Execution & Daily Time Management</li>
            </ul>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 font-orbitron text-xs text-amber-400 font-bold uppercase tracking-wider">
              <ShieldCheck size={16} />
              <span>Core Values</span>
            </div>
            <p className="leading-relaxed text-gray-300">
              Honesty without sugarcoating. Deep family loyalty. Putting pen to paper. Never letting doubts
              stand in the way.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-fuchsia-600 rounded-xl font-orbitron text-xs font-bold text-white hover:opacity-90 transition-opacity"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
