export type RoomType =
  | 'homepage'
  | 'navigation-room'
  | 'buzz-room'
  | 'einstein-room'
  | 'godmode-room'
  | 'library-room'
  | 'memory-room'
  | 'voice-room';

export interface ChatAttachment {
  name: string;
  type: string;
  data: string; // Base64 data URL
  isImage: boolean;
  isText?: boolean;
  textContent?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  attachment?: ChatAttachment | null;
  timestamp: number;
}

export interface TaskItem {
  id: string;
  text: string;
  completed?: boolean;
}

export interface TasksByDate {
  [dateKey: string]: TaskItem[];
}

export interface ProjectItem {
  id: string;
  text: string;
  createdAt: number;
}

export interface MemoryItem {
  id: string;
  category: 'school' | 'personal' | 'business' | 'family' | 'identity' | 'goal' | 'milestone' | 'growth';
  title: string;
  content: string;
  source: 'base' | 'system' | 'user' | 'voice_extracted' | 'grown';
  createdAt: number;
  updatedAt: number;
}

export interface VoiceConversation {
  id: string;
  title: string;
  transcript: string;
  summary: string;
  room: 'buzz' | 'einstein' | 'godmode' | 'general';
  duration: number; // in seconds
  audioData?: string;
  keyTakeaways: string[];
  timestamp: number;
}
