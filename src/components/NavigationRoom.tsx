import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectItem } from '../types';
import {
  Plus,
  Trash2,
  Calendar,
  Briefcase,
  Clock,
  ArrowLeft,
  Image as ImageIcon,
  Upload,
  Landmark,
} from 'lucide-react';
import { useCloudSync, SyncEventPayload } from '../hooks/useCloudSync';
import { PWAInstallButton } from './PWAInstallBanner';

interface NavigationRoomProps {
  onBack: () => void;
  onOpenTexasBusiness?: () => void;
}

export const NavigationRoom: React.FC<NavigationRoomProps> = ({ onBack, onOpenTexasBusiness }) => {
  // Calendar state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Tasks state: { [dateString]: string[] }
  const [tasks, setTasks] = useState<{ [dateKey: string]: string[] }>(() => {
    try {
      const saved = localStorage.getItem('user_tasks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [taskInput, setTaskInput] = useState('');

  // Projects state
  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    try {
      const saved = localStorage.getItem('user_projects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item, idx) =>
            typeof item === 'string'
              ? { id: `proj-${idx}-${Date.now()}`, text: item, createdAt: Date.now() }
              : item
          );
        }
      }
      return [
        { id: 'p1', text: 'Business Plan Draft - Q4 2026', createdAt: Date.now() },
        { id: 'p2', text: 'Empowered Learner Final Assignment', createdAt: Date.now() },
      ];
    } catch {
      return [];
    }
  });
  const [projectInput, setProjectInput] = useState('');

  // Gallery state: array of base64 data URLs
  const [gallery, setGallery] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('user_gallery');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Cross-device sync guards
  const hasHydratedRef = useRef(false);
  const lastSourceRef = useRef<'server' | 'local'>('local');

  // Hydrate authoritatively from backend on mount
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch('/api/database/tasks').then((r) => r.json()).catch(() => null),
      fetch('/api/database/projects').then((r) => r.json()).catch(() => null),
      fetch('/api/database/gallery').then((r) => r.json()).catch(() => null),
    ]).then(([tData, pData, gData]) => {
      if (!isMounted) return;
      if (tData?.success && tData.tasks && typeof tData.tasks === 'object') {
        lastSourceRef.current = 'server';
        setTasks(tData.tasks);
        localStorage.setItem('user_tasks', JSON.stringify(tData.tasks));
      }
      if (pData?.success && Array.isArray(pData.projects)) {
        lastSourceRef.current = 'server';
        setProjects(pData.projects);
        localStorage.setItem('user_projects', JSON.stringify(pData.projects));
      }
      if (gData?.success && Array.isArray(gData.gallery)) {
        lastSourceRef.current = 'server';
        setGallery(gData.gallery);
        localStorage.setItem('user_gallery', JSON.stringify(gData.gallery));
      }
      hasHydratedRef.current = true;
    }).catch(() => {
      hasHydratedRef.current = true;
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time live synchronization (Phone & Laptop link)
  useCloudSync(
    useCallback((event: SyncEventPayload) => {
      if (event.type === 'TASKS_UPDATED' && event.tasks) {
        lastSourceRef.current = 'server';
        setTasks(event.tasks);
        localStorage.setItem('user_tasks', JSON.stringify(event.tasks));
      }
      if (event.type === 'PROJECTS_UPDATED' && Array.isArray(event.projects)) {
        lastSourceRef.current = 'server';
        setProjects(event.projects);
        localStorage.setItem('user_projects', JSON.stringify(event.projects));
      }
      if (event.type === 'GALLERY_UPDATED' && Array.isArray(event.gallery)) {
        lastSourceRef.current = 'server';
        setGallery(event.gallery);
        localStorage.setItem('user_gallery', JSON.stringify(event.gallery));
      }
    }, [])
  );

  // Sync tasks changes to cloud database and localStorage
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (lastSourceRef.current === 'server') {
      lastSourceRef.current = 'local';
      return;
    }
    localStorage.setItem('user_tasks', JSON.stringify(tasks));
    fetch('/api/database/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks }),
    }).catch((err) => console.warn('Tasks sync error:', err));
  }, [tasks]);

  // Sync projects changes to cloud database and localStorage
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (lastSourceRef.current === 'server') {
      lastSourceRef.current = 'local';
      return;
    }
    localStorage.setItem('user_projects', JSON.stringify(projects));
    fetch('/api/database/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects }),
    }).catch((err) => console.warn('Projects sync error:', err));
  }, [projects]);

  // Sync gallery changes to cloud database and localStorage
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (lastSourceRef.current === 'server') {
      lastSourceRef.current = 'local';
      return;
    }
    localStorage.setItem('user_gallery', JSON.stringify(gallery));
    fetch('/api/database/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gallery }),
    }).catch((err) => console.warn('Gallery sync error:', err));
  }, [gallery]);

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(year, month + delta, 1));
  };

  const selectedDateKey = selectedDate.toDateString();
  const selectedDayTasks = tasks[selectedDateKey] || [];

  const handleAddTask = () => {
    if (!taskInput.trim()) return;
    const currentList = tasks[selectedDateKey] || [];
    setTasks({
      ...tasks,
      [selectedDateKey]: [...currentList, taskInput.trim()],
    });
    setTaskInput('');
  };

  const handleDeleteTask = (index: number) => {
    const currentList = tasks[selectedDateKey] || [];
    const updated = currentList.filter((_, i) => i !== index);
    const newTasks = { ...tasks };
    if (updated.length === 0) {
      delete newTasks[selectedDateKey];
    } else {
      newTasks[selectedDateKey] = updated;
    }
    setTasks(newTasks);
  };

  // Projects actions
  const handleAddProject = () => {
    if (!projectInput.trim()) return;
    const newProj: ProjectItem = {
      id: `proj-${Date.now()}`,
      text: projectInput.trim(),
      createdAt: Date.now(),
    };
    setProjects((prev) => [newProj, ...prev]);
    setProjectInput('');
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  // Gallery actions
  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      console.warn('Note: Image is large (>2MB). Compressing or using optimized images is recommended.');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      if (res) {
        setGallery((prev) => [res, ...prev]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteImage = (index: number) => {
    setGallery((prev) => prev.filter((_, i) => i !== index));
  };

  // Reminders calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingReminders: { date: Date; text: string }[] = [];
  Object.keys(tasks).forEach((dateKey) => {
    const d = new Date(dateKey);
    d.setHours(0, 0, 0, 0);
    if (d >= today) {
      tasks[dateKey].forEach((t) => {
        upcomingReminders.push({ date: d, text: t });
      });
    }
  });
  upcomingReminders.sort((a, b) => a.date.getTime() - b.date.getTime());

  const todayStr = new Date().toDateString();
  const todayTaskCount = tasks[todayStr]?.length || 0;

  return (
    <div
      className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] overflow-y-auto bg-cover bg-center bg-no-repeat p-3 sm:p-5 md:p-6 flex flex-col gap-3 sm:gap-4 text-white z-20 pb-[max(1rem,env(safe-area-inset-bottom))]"
      style={{
        backgroundImage: `url('https://i.postimg.cc/Dy6xxLm9/Screenshot-20260930-133327-Google.jpg')`,
        backgroundColor: 'rgba(11, 7, 26, 0.75)',
        backgroundBlendMode: 'overlay',
      }}
    >
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col gap-3 sm:gap-4">
        {/* Top Header */}
        <header className="glass-panel py-2.5 sm:py-3.5 px-3 sm:px-6 shrink-0 border border-fuchsia-500/50 shadow-[0_0_20px_rgba(217,70,239,0.3)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <PWAInstallButton variant="button" />
          </div>

          <h1 className="font-orbitron text-sm sm:text-2xl md:text-3xl font-black tracking-wide sm:tracking-widest text-gradient-neon uppercase text-center flex-1 px-1 truncate">
            Let's get to the bag
          </h1>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenTexasBusiness && (
              <button
                onClick={onOpenTexasBusiness}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-300 text-xs font-orbitron font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.25)] shrink-0 active:scale-95"
                title="Open Texas Businesses & Generational Wealth Playbook"
              >
                <Landmark size={14} className="text-amber-400" />
                <span className="hidden sm:inline">TX Business Playbook</span>
                <span className="sm:hidden">Playbook</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-5 flex-1 min-h-0">
          {/* Left Column: Profile Card & Reminders */}
          <div className="lg:col-span-3 glass-panel-neon p-4 sm:p-5 flex flex-col items-center gap-3 sm:gap-4 min-h-[340px] lg:h-full">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.5)] shrink-0">
              <img
                src="https://i.postimg.cc/xTWNKK7X/home-bg-jpg.jpg"
                alt="Grayson"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="text-center font-orbitron font-bold text-sm sm:text-base tracking-wider text-gradient-neon uppercase">
              What we doing today
            </div>

            {/* Stat Row */}
            <div className="flex gap-2 w-full justify-center">
              <div className="flex-1 bg-white/5 border border-white/20 rounded-xl p-2 sm:p-2.5 text-center">
                <div className="font-orbitron font-bold text-cyan-400 text-base sm:text-lg">{projects.length}</div>
                <div className="text-[10px] sm:text-[11px] text-gray-300 font-sans">Projects</div>
              </div>
              <div className="flex-1 bg-white/5 border border-white/20 rounded-xl p-2 sm:p-2.5 text-center">
                <div className="font-orbitron font-bold text-fuchsia-400 text-base sm:text-lg">{gallery.length}</div>
                <div className="text-[10px] sm:text-[11px] text-gray-300 font-sans">Images</div>
              </div>
              <div className="flex-1 bg-white/5 border border-white/20 rounded-xl p-2 sm:p-2.5 text-center">
                <div className="font-orbitron font-bold text-amber-400 text-base sm:text-lg">{todayTaskCount}</div>
                <div className="text-[10px] sm:text-[11px] text-gray-300 font-sans">Tasks</div>
              </div>
            </div>

            {/* Reminders Section */}
            <div className="w-full flex-1 flex flex-col min-h-0 pt-2 border-t border-cyan-500/30">
              <div className="font-orbitron text-xs text-cyan-400 text-center pb-2 uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Clock size={14} />
                <span>Upcoming Reminders</span>
              </div>
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-0">
                {upcomingReminders.length === 0 ? (
                  <div className="text-gray-400 text-xs text-center py-4">No upcoming reminders</div>
                ) : (
                  upcomingReminders.slice(0, 8).map((rem, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 border-l-3 border-fuchsia-500 rounded-lg p-2 text-xs"
                    >
                      <div className="text-cyan-400 font-bold text-[11px]">
                        {rem.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-gray-200 mt-0.5 break-words">{rem.text}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Center Column: Projects & Gallery */}
          <div className="lg:col-span-5 glass-panel-neon p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 min-h-[360px] lg:h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0">
              {/* My Projects */}
              <div className="flex flex-col bg-white/5 border border-white/15 rounded-2xl p-3.5 sm:p-4 min-h-[220px] md:min-h-0">
                <div className="font-orbitron text-sm text-cyan-400 text-center mb-3 flex items-center justify-center gap-1.5 font-bold">
                  <Briefcase size={16} />
                  <span>My Projects</span>
                </div>
                <div className="flex gap-1.5 mb-3">
                  <input
                    type="text"
                    value={projectInput}
                    onChange={(e) => setProjectInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
                    placeholder="Add a project..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={handleAddProject}
                    className="bg-fuchsia-600 hover:bg-fuchsia-500 px-3 rounded-xl text-white font-bold text-sm cursor-pointer transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-0">
                  {projects.length === 0 ? (
                    <div className="text-gray-400 text-xs text-center py-6">No projects yet</div>
                  ) : (
                    projects.map((proj) => (
                      <div
                        key={proj.id}
                        className="bg-white/5 border-l-3 border-fuchsia-500 rounded-xl p-2.5 text-xs flex items-center justify-between gap-2"
                      >
                        <span className="break-words flex-1">{proj.text}</span>
                        <button
                          onClick={() => handleDeleteProject(proj.id)}
                          className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Gallery */}
              <div className="flex flex-col bg-white/5 border border-white/15 rounded-2xl p-4 min-h-0">
                <div className="font-orbitron text-sm text-cyan-400 text-center mb-3 flex items-center justify-center gap-1.5 font-bold">
                  <ImageIcon size={16} />
                  <span>Gallery</span>
                </div>
                <label className="flex items-center justify-center gap-2 mb-3 bg-fuchsia-600/80 hover:bg-fuchsia-600 py-1.5 px-3 rounded-xl text-xs font-orbitron cursor-pointer transition-colors text-white">
                  <Upload size={14} />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                </label>
                <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 gap-2 content-start min-h-0">
                  {gallery.length === 0 ? (
                    <div className="col-span-2 text-gray-400 text-xs text-center py-6">
                      No images yet
                    </div>
                  ) : (
                    gallery.map((imgSrc, idx) => (
                      <div
                        key={idx}
                        className="relative h-24 rounded-xl overflow-hidden border border-white/20 group bg-black/40"
                      >
                        <img src={imgSrc} alt="Gallery item" className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleDeleteImage(idx)}
                          className="absolute top-1 right-1 p-1 bg-black/70 text-red-400 hover:text-red-300 rounded-full cursor-pointer"
                          title="Delete image"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Calendar & Day Tasks */}
          <div className="lg:col-span-4 glass-panel-neon p-5 flex flex-col gap-3 h-full min-h-[420px]">
            {/* Calendar Header */}
            <div className="flex items-center justify-between font-orbitron text-sm text-cyan-400 border-b border-white/10 pb-2">
              <button
                onClick={() => changeMonth(-1)}
                className="text-fuchsia-400 hover:text-fuchsia-300 px-2 py-1 cursor-pointer font-bold"
              >
                ◀
              </button>
              <span className="font-bold tracking-wider">
                {monthNames[month]} {year}
              </span>
              <button
                onClick={() => changeMonth(1)}
                className="text-fuchsia-400 hover:text-fuchsia-300 px-2 py-1 cursor-pointer font-bold"
              >
                ▶
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-mono">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-gray-400 font-bold py-1">
                  {day}
                </div>
              ))}
              {/* Empty offset days */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="py-1" />
              ))}
              {/* Month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dNum = i + 1;
                const thisDate = new Date(year, month, dNum);
                const thisDateStr = thisDate.toDateString();
                const isToday =
                  new Date().getDate() === dNum &&
                  new Date().getMonth() === month &&
                  new Date().getFullYear() === year;
                const isSelected = selectedDate.toDateString() === thisDateStr;
                const hasTasks = (tasks[thisDateStr]?.length || 0) > 0;

                return (
                  <button
                    key={dNum}
                    onClick={() => setSelectedDate(thisDate)}
                    className={`relative py-1.5 rounded-full transition-all cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-fuchsia-500 text-white font-bold shadow-[0_0_12px_rgba(217,70,239,0.8)] scale-105'
                        : isToday
                        ? 'bg-cyan-500/80 text-white font-bold'
                        : 'hover:bg-white/10 text-gray-200'
                    }`}
                  >
                    <span>{dNum}</span>
                    {hasTasks && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Day Tasks Header */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-orbitron text-cyan-400">
              <span>
                Tasks for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}:
              </span>
            </div>

            {/* Task Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Add a task for this date..."
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
              />
              <button
                onClick={handleAddTask}
                className="bg-fuchsia-600 hover:bg-fuchsia-500 px-3 rounded-xl text-white font-bold text-sm cursor-pointer"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-0">
              {selectedDayTasks.length === 0 ? (
                <div className="text-gray-400 text-xs text-center py-4">No tasks for this day</div>
              ) : (
                selectedDayTasks.map((t, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 border-l-3 border-cyan-400 rounded-xl p-2 text-xs flex items-center justify-between gap-2"
                  >
                    <span className="break-words flex-1">{t}</span>
                    <button
                      onClick={() => handleDeleteTask(idx)}
                      className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Back to Home Button */}
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
