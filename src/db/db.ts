import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

export interface MemoryItem {
  id: string;
  category: 'school' | 'personal' | 'business' | 'family' | 'identity' | 'goal' | 'milestone' | 'growth';
  title: string;
  content: string;
  source: 'base' | 'system' | 'user' | 'voice_extracted' | 'grown';
  createdAt: number;
  updatedAt: number;
}

export interface VoiceDialogueTurn {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
  audioData?: string;
  room?: 'buzz' | 'einstein' | 'godmode' | 'general';
}

export interface VoiceConversation {
  id: string;
  title: string;
  transcript: string;
  aiResponse?: string;
  dialogue?: VoiceDialogueTurn[];
  summary: string;
  room: 'buzz' | 'einstein' | 'godmode' | 'general';
  duration: number; // in seconds
  audioData?: string; // base64 audio
  keyTakeaways: string[];
  timestamp: number;
}

export interface StoredChatRoom {
  room: 'buzz' | 'einstein' | 'godmode';
  messages: Array<{
    id: string;
    sender: 'user' | 'ai';
    text: string;
    attachment?: any;
    timestamp: number;
  }>;
  updatedAt: number;
}

export interface UserNeedItem {
  id: string;
  need: string;
  category: 'school' | 'business' | 'personal' | 'growth';
  status: 'active' | 'in_progress' | 'resolved';
  timestamp: number;
  room?: string;
}

export interface UserStatementItem {
  id: string;
  quote: string;
  context?: string;
  timestamp: number;
  room?: string;
}

export interface UserToneProfile {
  mood: string;
  energy: 'high' | 'focused' | 'calm' | 'reflective' | 'intense';
  toneDirective: string;
  lastUpdated: number;
  summary: string;
}

export interface IntelligenceState {
  level: number;
  levelTitle: string;
  xp: number;
  totalInsightsLearned: number;
  currentTone: UserToneProfile;
  recentNeeds: UserNeedItem[];
  coreStatements: UserStatementItem[];
}

export interface DatabaseSchema {
  version: number;
  profile: {
    name: string;
    age: number;
    location: string;
    degree: string;
    longTermGoal: string;
    writingRules: string[];
  };
  memories: MemoryItem[];
  intelligenceState?: IntelligenceState;
  voiceConversations: VoiceConversation[];
  chatHistory: {
    buzz: any[];
    einstein: any[];
    godmode: any[];
  };
  tasks?: { [dateKey: string]: string[] };
  projects?: Array<{ id: string; text: string; createdAt: number }>;
  gallery?: string[];
}

const INITIAL_DATABASE: DatabaseSchema = {
  version: 1,
  profile: {
    name: 'Grayson Morris Russell',
    age: 32,
    location: 'Dallas, Texas',
    degree: 'B.S. in Business (Online)',
    longTermGoal: 'Own independent businesses and create generational wealth for family',
    writingRules: [
      'Short, plain sentences',
      'Explain reasoning as you go',
      'Use everyday phrasing: ins and outs, putting pen to paper, big push to keep going',
      '10th-grade vocabulary level',
      'Fix grammar and organize into clean paragraphs without erasing natural voice',
      'Include real personal details without forcing them',
      'Never sugarcoat, always tell the truth',
    ],
  },
  memories: [
    {
      id: 'mem-1',
      category: 'identity',
      title: 'Grayson Profile & Background',
      content:
        '32-year-old from Dallas, Texas. Balancing online college courses with life grind. Family-oriented. Working every single day to break generational cycles.',
      source: 'base',
      createdAt: Date.now() - 86400000 * 10,
      updatedAt: Date.now() - 86400000 * 10,
    },
    {
      id: 'mem-2',
      category: 'school',
      title: 'Writing Style & Grammar Rules',
      content:
        'Writing style: 10th-grade vocabulary, short plain sentences, explain reasoning as you go, keep natural phrases like "putting pen to paper" and "ins and outs". College encourages Grammarly for mechanics, but avoid AI magic-pen rewriting.',
      source: 'base',
      createdAt: Date.now() - 86400000 * 9,
      updatedAt: Date.now() - 86400000 * 9,
    },
    {
      id: 'mem-3',
      category: 'school',
      title: 'Active Courses & Assignments',
      content:
        'Enrolled in Empowered Learner (Habits of Success, SMART goals, coping with overwhelming schedules) and Effective Communication Skills (communication maps, ad reflections, NASA article evaluation, instructor replies).',
      source: 'base',
      createdAt: Date.now() - 86400000 * 8,
      updatedAt: Date.now() - 86400000 * 8,
    },
    {
      id: 'mem-4',
      category: 'goal',
      title: 'Business & Generational Wealth Mission',
      content:
        'Long-term goal is owning independent businesses. Creating wealth for future generations. Never allowing doubts to get in the way.',
      source: 'base',
      createdAt: Date.now() - 86400000 * 7,
      updatedAt: Date.now() - 86400000 * 7,
    },
    {
      id: 'mem-5',
      category: 'personal',
      title: 'Personal Strength & Support Network',
      content:
        'Late-night FaceTime calls with cousin provide encouragement when stressed. Direct and honest about challenges, PO visits, Texas driving, and medication refills.',
      source: 'base',
      createdAt: Date.now() - 86400000 * 6,
      updatedAt: Date.now() - 86400000 * 6,
    },
    {
      id: 'mem-6',
      category: 'business',
      title: 'AI Assistants Roles',
      content:
        'Buzz is primary personal assistant and memory bank. Einstein is strictly for schoolwork and essay polish. God Mode is unfiltered truth, strategy, and life reflection.',
      source: 'base',
      createdAt: Date.now() - 86400000 * 5,
      updatedAt: Date.now() - 86400000 * 5,
    },
  ],
  voiceConversations: [
    {
      id: 'voice-init-1',
      title: 'Welcome Voice Note & Goals',
      transcript:
        'Welcome to my personal voice vault. This is Grayson Russell. We are staying on top of schoolwork, organizing the day, and building businesses.',
      summary: 'Initial orientation on goals, daily planning, and schoolwork focus.',
      room: 'general',
      duration: 18,
      keyTakeaways: ['Focus on weekly college goals', 'Keep pushing toward business ownership'],
      timestamp: Date.now() - 86400000,
    },
  ],
  chatHistory: {
    buzz: [],
    einstein: [],
    godmode: [],
  },
  tasks: {},
  projects: [
    { id: 'p1', text: 'Business Plan Draft - Q4 2026', createdAt: Date.now() },
    { id: 'p2', text: 'Empowered Learner Final Assignment', createdAt: Date.now() },
  ],
  gallery: [],
};

export const DEFAULT_INTELLIGENCE_STATE: IntelligenceState = {
  level: 2,
  levelTitle: 'Strategic Synthesizer',
  xp: 180,
  totalInsightsLearned: 6,
  currentTone: {
    mood: 'Determined & Focused',
    energy: 'focused',
    toneDirective: "Match Grayson's drive with direct truth, zero excuses, and concrete steps. Keep prose punchy and practical.",
    lastUpdated: Date.now(),
    summary: 'Grayson is locked in on his degree, building businesses, and breaking generational cycles.',
  },
  recentNeeds: [
    {
      id: 'need-1',
      need: 'Master Empowered Learner habits & communication course assignments with high marks',
      category: 'school',
      status: 'active',
      timestamp: Date.now() - 86400000 * 2,
      room: 'einstein',
    },
    {
      id: 'need-2',
      need: 'Structure Texas LLC and build independent business systems',
      category: 'business',
      status: 'active',
      timestamp: Date.now() - 86400000 * 3,
      room: 'godmode',
    },
    {
      id: 'need-3',
      need: 'Action-oriented daily schedule without feeling overwhelmed',
      category: 'personal',
      status: 'active',
      timestamp: Date.now() - 86400000 * 1,
      room: 'buzz',
    },
  ],
  coreStatements: [
    {
      id: 'stmt-1',
      quote: 'Putting pen to paper. Never allowing doubts to get in the way.',
      context: 'Core work ethic and life philosophy',
      timestamp: Date.now() - 86400000 * 4,
    },
    {
      id: 'stmt-2',
      quote: 'Balancing online college courses with the life grind every single day.',
      context: 'Daily routine and determination',
      timestamp: Date.now() - 86400000 * 3,
    },
    {
      id: 'stmt-3',
      quote: 'We are staying on top of schoolwork, organizing the day, and building businesses.',
      context: 'Opening declaration in Voice Vault',
      timestamp: Date.now() - 86400000 * 1,
    },
  ],
};

// Ensure data folder and file exists
function ensureDbExists(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ ...INITIAL_DATABASE, intelligenceState: DEFAULT_INTELLIGENCE_STATE }, null, 2), 'utf-8');
  }
}

export function readDatabase(): DatabaseSchema {
  ensureDbExists();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    // Ensure base tags exist for legacy entries
    if (parsed.memories && Array.isArray(parsed.memories)) {
      parsed.memories.forEach((m: any) => {
        if (!m.source || m.source === 'system') m.source = 'base';
      });
    }
    if (!parsed.intelligenceState) {
      parsed.intelligenceState = { ...DEFAULT_INTELLIGENCE_STATE };
    } else {
      if (!parsed.intelligenceState.currentTone) {
        parsed.intelligenceState.currentTone = { ...DEFAULT_INTELLIGENCE_STATE.currentTone };
      }
      if (!Array.isArray(parsed.intelligenceState.recentNeeds)) {
        parsed.intelligenceState.recentNeeds = [...DEFAULT_INTELLIGENCE_STATE.recentNeeds];
      }
      if (!Array.isArray(parsed.intelligenceState.coreStatements)) {
        parsed.intelligenceState.coreStatements = [...DEFAULT_INTELLIGENCE_STATE.coreStatements];
      }
      if (!parsed.intelligenceState.level) {
        parsed.intelligenceState.level = 2;
        parsed.intelligenceState.levelTitle = 'Strategic Synthesizer';
      }
    }
    if (!parsed.tasks || typeof parsed.tasks !== 'object') {
      parsed.tasks = {};
    }
    if (!Array.isArray(parsed.projects)) {
      parsed.projects = [
        { id: 'p1', text: 'Business Plan Draft - Q4 2026', createdAt: Date.now() },
        { id: 'p2', text: 'Empowered Learner Final Assignment', createdAt: Date.now() },
      ];
    }
    if (!Array.isArray(parsed.gallery)) {
      parsed.gallery = [];
    }
    return parsed;
  } catch (err) {
    console.error('Error reading database file, returning default:', err);
    return { ...INITIAL_DATABASE, intelligenceState: DEFAULT_INTELLIGENCE_STATE };
  }
}

export function writeDatabase(data: DatabaseSchema): void {
  ensureDbExists();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

