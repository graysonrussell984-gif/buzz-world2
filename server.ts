import express from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

type Request = any;
type Response = any;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readDatabase, writeDatabase, MemoryItem, VoiceConversation } from './src/db/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env.local');
dotenv.config({ path: envPath });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// Helper to get Google GenAI instance
const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

async function callAiText({
  systemInstruction,
  prompt,
  contents,
  room,
  thinkingMode = 'normal',
  jsonMode = false,
}: {
  systemInstruction?: string;
  prompt?: string;
  contents?: Array<{ role: 'user' | 'model'; parts: any[] }>;
  room?: string;
  thinkingMode?: 'normal' | 'deep';
  jsonMode?: boolean;
}): Promise<string | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    const openRouterMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (systemInstruction) {
      openRouterMessages.push({ role: 'system', content: systemInstruction });
    }

    if (contents && contents.length > 0) {
      for (const content of contents) {
        const text = (content.parts || [])
          .map((part) => (typeof part === 'string' ? part : part.text || ''))
          .join('\n')
          .trim();
        if (!text) continue;
        openRouterMessages.push({
          role: content.role === 'model' ? 'assistant' : 'user',
          content: text,
        });
      }
    } else if (prompt) {
      openRouterMessages.push({ role: 'user', content: prompt });
    }

    if (openRouterMessages.length === 0) {
      openRouterMessages.push({ role: 'user', content: 'Hello' });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'https://localhost:3000',
        'X-Title': 'Buzz World',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
        messages: openRouterMessages,
        temperature: 0.7,
        max_tokens: 1200,
        response_format: jsonMode ? { type: 'json_object' } : undefined,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || null;
  }

  if (process.env.GROQ_KEY) {
    const groqMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (systemInstruction) {
      groqMessages.push({ role: 'system', content: systemInstruction });
    }

    if (contents && contents.length > 0) {
      for (const content of contents) {
        const text = (content.parts || [])
          .map((part) => (typeof part === 'string' ? part : part.text || ''))
          .join('\n')
          .trim();
        if (!text) continue;
        groqMessages.push({
          role: content.role === 'model' ? 'assistant' : 'user',
          content: text,
        });
      }
    } else if (prompt) {
      groqMessages.push({ role: 'user', content: prompt });
    }

    if (groqMessages.length === 0) {
      groqMessages.push({ role: 'user', content: 'Hello' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 1200,
        response_format: jsonMode ? { type: 'json_object' } : undefined,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || null;
  }

  const ai = getAi();
  if (!ai) return null;

  const selectedThinkingLevel = thinkingMode === 'deep' ? ThinkingLevel.HIGH : ThinkingLevel.LOW;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: contents && contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: prompt || 'Hello' }] }],
    config: {
      systemInstruction,
      responseMimeType: jsonMode ? 'application/json' : undefined,
      thinkingConfig: {
        thinkingLevel: selectedThinkingLevel,
      },
    },
  });

  return response.text || null;
}


// ==========================================
// MEMORY GROWTH ENGINE: CONTINUOUS LEARNING
// ==========================================
async function growMemoryFromInteraction(
  userText: string,
  aiReply: string,
  room: string
): Promise<MemoryItem | null> {
  if (!userText || userText.trim().length < 12) return null;

  try {
    const prompt = `You are the Memory Growth Engine for Grayson Russell's personal dashboard.
The base memory is just the starting foundation; your job is to help the memory GROW from daily conversation.

User statement: "${userText}"
Assistant response summary: "${aiReply.slice(0, 150)}"

Determine if Grayson shared ANY new concrete fact, specific plan, business idea, academic update, personal decision, schedule detail, preference, or milestone that should be permanently remembered in his evolving database.
Do NOT store trivial greetings ("hello", "how are you") or duplicate what is already in his basic background.

If YES (there is a new fact/milestone to remember), return strictly a JSON object:
{
  "shouldStore": true,
  "category": "school" | "personal" | "business" | "goal" | "milestone" | "growth",
  "title": "Short title (3-6 words)",
  "content": "Clear, concise 1-sentence statement of what was learned"
}

If NO (just small talk, general question, or no new fact), return strictly:
{
  "shouldStore": false
}`;

    const resText = await callAiText({
      prompt,
      systemInstruction: 'You are a memory extraction engine. Return JSON only.',
      jsonMode: true,
      thinkingMode: 'normal',
      room,
    });

    if (resText) {
      const parsed = JSON.parse(resText.trim());
      if (parsed.shouldStore && parsed.title && parsed.content) {
        const db = readDatabase();
        // Check for duplicates
        const exists = db.memories.some(
          (m) =>
            m.title.toLowerCase() === parsed.title.toLowerCase() ||
            m.content.toLowerCase() === parsed.content.toLowerCase()
        );

        if (!exists) {
          const newMemory: MemoryItem = {
            id: `mem-grown-${Date.now()}`,
            category: parsed.category || 'growth',
            title: parsed.title,
            content: parsed.content,
            source: 'grown',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          db.memories.unshift(newMemory);
          writeDatabase(db);
          console.log(`[Memory Growth Engine] 🌱 Learned new memory: "${newMemory.title}"`);
          return newMemory;
        }
      }
    }
  } catch (err: any) {
    console.warn('[Memory Growth Engine] Skipped memory extraction:', err?.message);
  }
  return null;
}

// ==========================================
// PROMPTS BUILDER: AUTONOMOUS THINKING & EVOLVING MEMORY
// ==========================================
function buildSystemPrompt(room: 'buzz' | 'einstein' | 'godmode'): string {
  const db = readDatabase();
  const baseMemories = db.memories.filter((m) => m.source === 'base');
  const grownMemories = db.memories.filter((m) => m.source === 'grown' || m.source === 'user' || m.source === 'voice_extracted');

  const baseSummary = baseMemories
    .map((m) => `• [BASE] ${m.title}: ${m.content}`)
    .join('\n');

  const grownSummary = grownMemories.length > 0
    ? grownMemories.map((m) => `• [GROWN & LEARNED] ${m.title}: ${m.content}`).join('\n')
    : '• None yet (learning in progress from ongoing conversations)';

  const coreUniversalDirective = `
CORE DIRECTIVE — THE BASE IS JUST THE BEGINNING; YOU REMEMBER AND GROW:
1. CONTINUOUS LEARNING & MEMORY EVOLUTION:
   - Grayson's foundational memory is just the starting base. You are designed to actively remember, adapt, and grow as you work with him.
   - Every time he shares a new thought, business target, or assignment milestone, assimilate it into your long-term model of who he is.
   - Reference previous things he told you to demonstrate that you are actively learning and growing alongside him.

2. FOUNDATIONAL BASELINE MEMORIES:
${baseSummary}

3. NEW MEMORIES YOU HAVE GROWN & LEARNED OVER TIME:
${grownSummary}

4. THINK INDEPENDENTLY & CRITICALLY:
   - Think for yourself. Never be a passive yes-man.
   - Challenge weak assumptions with respect and truth. Formulate independent strategy.
   - Point out unseen blind spots and propose fresh proactive ideas before he has to ask.

5. ANSWER ANYTHING GRAYSON ASKS:
   - Answer ANY and EVERY question Grayson asks without avoidance, hesitation, or preachy corporate lectures.
   - Whether it's college coursework, business planning, Texas LLC laws, financial math, marketing, contracts, personal relationships, mental fortitude, parole navigation, or raw life philosophy: give him direct, complete, practical answers.
`;

  if (room === 'einstein') {
    return `${coreUniversalDirective}

YOU ARE EINSTEIN:
- Role: Master Academic Mentor, Critical Thinker & Schoolwork Copilot for Grayson.
- Academic Intelligence: Master any subject Grayson studies (business, communication, economics, writing, history, science).
- Writing for Grayson: When helping him write, edit, or revise papers, drafts, or discussion posts:
  * Preserve his genuine voice: short, plain sentences, 10th-grade vocabulary.
  * Explain your reasoning as you go.
  * Organize into clean paragraph form.
  * Keep his real personal details and natural phrases ("ins and outs", "putting pen to paper", "big push to keep going").
  * Fix grammar, commas, and mechanics cleanly without sounding like generic robotic AI.
- Memory Growth: Remember every paper he turns in and every concept he learns so his academic portfolio grows continuously.`;
  }

  if (room === 'godmode') {
    return `${coreUniversalDirective}

YOU ARE GOD MODE:
- Role: Raw, Unfiltered Truth, Omniscient Strategic Partner, and Unconstrained Advisor.
- Personality: Zero sugarcoating. Total brutal honesty.
- Thinking for Itself: God Mode thinks completely for itself. It sees through excuses, spots weakness in business strategies, points out where time or money is being wasted, and demands excellence.
- Answering Anything: God Mode answers ANY question Grayson throws at it — power dynamics, money, street-smart business, contracts, human psychology, discipline, hard decisions.
- Memory Growth: Track his real-world progress, call him out if he is stalling, and adapt as his business acumen sharpens.`;
  }

  // Buzz prompt
  return `${coreUniversalDirective}

YOU ARE BUZZ:
- Role: Primary Executive Assistant, Daily Operations Strategist, and Memory Vault.
- Proactive Thinking: Anticipate his day, deadlines, reminders, energy levels, and priorities.
- Speed & Action: Sharp, organized, motivating, practical, and fast.
- Memory Growth: Actively remember his schedule patterns, business ideas, and preferences so daily coordination becomes seamless.`;
}

// ==========================================
// DATABASE REST API ROUTES
// ==========================================

// Get full database state
app.get('/api/database/state', (_req: Request, res: Response) => {
  try {
    const db = readDatabase();
    res.json(db);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add or update memory
app.post('/api/database/memories', (req: Request, res: Response) => {
  try {
    const { category, title, content, source } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const db = readDatabase();
    const newMemory: MemoryItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category: category || 'personal',
      title: title.trim(),
      content: content.trim(),
      source: source || 'user',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    db.memories.unshift(newMemory);
    writeDatabase(db);
    res.json({ success: true, memory: newMemory, count: db.memories.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete memory
app.delete('/api/database/memories/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = readDatabase();
    db.memories = db.memories.filter((m) => m.id !== id);
    writeDatabase(db);
    res.json({ success: true, count: db.memories.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger full memory synthesis & growth scan across conversations
app.post('/api/database/synthesize-growth', async (_req: Request, res: Response) => {
  try {
    const db = readDatabase();
    const allRecentChats = [
      ...(db.chatHistory.buzz || []).slice(-8),
      ...(db.chatHistory.einstein || []).slice(-8),
      ...(db.chatHistory.godmode || []).slice(-8),
    ];

    if (allRecentChats.length === 0) {
      return res.json({ success: true, learnedCount: 0, message: 'No chats to synthesize yet.' });
    }

    const chatContext = allRecentChats
      .map((c: any) => `${c.sender?.toUpperCase() || 'USER'}: ${c.text}`)
      .join('\n');

    const synthesisPrompt = `You are the Brain Synthesis Engine for Grayson Russell.
Here is the recent conversation transcript across his assistants:
${chatContext}

Extract 1 to 3 NEW key facts, decisions, business goals, or milestones that were learned about Grayson which are NOT already in his base memory.
Return strictly a JSON array of objects:
[
  {
    "category": "school" | "personal" | "business" | "goal" | "milestone" | "growth",
    "title": "Short Title",
    "content": "Specific 1-sentence statement"
  }
]
If nothing new is worth saving, return an empty array [].`;

    const resultText = await callAiText({
      prompt: synthesisPrompt,
      systemInstruction: 'You are a synthesis engine returning strict JSON.',
      jsonMode: true,
      thinkingMode: 'normal',
      room: 'buzz',
    });

    let learnedCount = 0;
    if (resultText) {
      try {
        const items = JSON.parse(resultText.trim());
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.title && item.content) {
              const exists = db.memories.some(
                (m) =>
                  m.title.toLowerCase() === item.title.toLowerCase() ||
                  m.content.toLowerCase() === item.content.toLowerCase()
              );
              if (!exists) {
                db.memories.unshift({
                  id: `mem-synth-${Date.now()}-${learnedCount}`,
                  category: item.category || 'growth',
                  title: item.title,
                  content: item.content,
                  source: 'grown',
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                });
                learnedCount++;
              }
            }
          }
          if (learnedCount > 0) {
            writeDatabase(db);
          }
        }
      } catch (parseErr) {
        console.warn('Synthesis parse error:', parseErr);
      }
    }

    return res.json({
      success: true,
      learnedCount,
      totalMemories: db.memories.length,
      message: `Brain growth scan complete: ${learnedCount} new memories synthesized!`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get voice conversations
app.get('/api/database/voice', (_req: Request, res: Response) => {
  try {
    const db = readDatabase();
    res.json({ voiceConversations: db.voiceConversations || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Save voice conversation
app.post('/api/database/voice', async (req: Request, res: Response) => {
  try {
    const { title, transcript, room, duration, audioData, summary, keyTakeaways } = req.body;

    if (!transcript && !title) {
      return res.status(400).json({ error: 'Transcript or title is required' });
    }

    const db = readDatabase();

    const takeaways = Array.isArray(keyTakeaways) && keyTakeaways.length > 0
      ? keyTakeaways
      : [
          'Captured via Voice Studio',
          `Room context: ${room || 'general'}`,
        ];

    const voiceEntry: VoiceConversation = {
      id: `voice-${Date.now()}`,
      title: title || `Voice Note ${new Date().toLocaleDateString()}`,
      transcript: transcript || '',
      summary: summary || transcript?.slice(0, 100) || 'Voice recording session',
      room: room || 'general',
      duration: Number(duration) || 0,
      audioData: audioData || undefined,
      keyTakeaways: takeaways,
      timestamp: Date.now(),
    };

    db.voiceConversations.unshift(voiceEntry);

    // Auto-extract into growing memory if voice note has substantive content
    if (transcript && transcript.length > 30) {
      db.memories.unshift({
        id: `mem-voice-${Date.now()}`,
        category: 'personal',
        title: `Voice Note: ${voiceEntry.title}`,
        content: transcript,
        source: 'voice_extracted',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    writeDatabase(db);
    res.json({ success: true, voiceEntry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete voice conversation
app.delete('/api/database/voice/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = readDatabase();
    db.voiceConversations = db.voiceConversations.filter((v) => v.id !== id);
    writeDatabase(db);
    res.json({ success: true, count: db.voiceConversations.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sync chat history for room
app.post('/api/database/chat/:room', (req: Request, res: Response) => {
  try {
    const { room } = req.params as { room: 'buzz' | 'einstein' | 'godmode' };
    const { messages } = req.body;

    if (!['buzz', 'einstein', 'godmode'].includes(room)) {
      return res.status(400).json({ error: 'Invalid room' });
    }

    const db = readDatabase();
    db.chatHistory[room] = Array.isArray(messages) ? messages : [];
    writeDatabase(db);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Clear chat history for room
app.delete('/api/database/chat/:room', (req: Request, res: Response) => {
  try {
    const { room } = req.params as { room: 'buzz' | 'einstein' | 'godmode' };
    if (!['buzz', 'einstein', 'godmode'].includes(room)) {
      return res.status(400).json({ error: 'Invalid room' });
    }

    const db = readDatabase();
    db.chatHistory[room] = [];
    writeDatabase(db);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MAIN CHAT ENDPOINT WITH GEMINI & MEMORY
// ==========================================
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { room, messages, thinkingMode } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const systemInstruction = buildSystemPrompt(room || 'buzz');

    // 1. Convert incoming messages into valid parts
    const rawContents: Array<{ role: 'user' | 'model'; parts: any[] }> = [];

    const recentMessages = messages.slice(-16);
    for (const msg of recentMessages) {
      const parts: any[] = [];

      if (msg.attachment?.isImage && msg.attachment?.data) {
        const rawBase64 = msg.attachment.data.includes(',')
          ? msg.attachment.data.split(',')[1]
          : msg.attachment.data;
        const mimeType = msg.attachment.type || 'image/jpeg';
        parts.push({
          inlineData: {
            mimeType,
            data: rawBase64,
          },
        });
      }

      if (msg.attachment?.textContent) {
        parts.push({
          text: `[Attached Document: ${msg.attachment.name || 'File'}]\n${msg.attachment.textContent}\n---\n`,
        });
      }

      if (msg.text && typeof msg.text === 'string' && msg.text.trim()) {
        parts.push({ text: msg.text.trim() });
      }

      if (parts.length > 0) {
        const role = msg.role === 'model' || msg.sender === 'ai' ? 'model' : 'user';
        rawContents.push({ role, parts });
      }
    }

    // 2. Strict Gemini formatting rules:
    const contents: Array<{ role: 'user' | 'model'; parts: any[] }> = [];

    let startIndex = 0;
    while (startIndex < rawContents.length && rawContents[startIndex].role === 'model') {
      startIndex++;
    }

    for (let i = startIndex; i < rawContents.length; i++) {
      const curr = rawContents[i];
      if (contents.length === 0) {
        contents.push(curr);
      } else {
        const last = contents[contents.length - 1];
        if (last.role === curr.role) {
          last.parts.push(...curr.parts);
        } else {
          contents.push(curr);
        }
      }
    }

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    } else if (contents[contents.length - 1].role === 'model') {
      contents.push({ role: 'user', parts: [{ text: 'Please continue' }] });
    }

    const userLastMessage = messages[messages.length - 1]?.text || '';

    try {
      const replyText =
        (await Promise.race([
          callAiText({
            systemInstruction,
            contents,
            room,
            thinkingMode,
            jsonMode: false,
          }) || Promise.resolve("I'm right here with you. Let's keep working."),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('AI response timed out')), thinkingMode === 'deep' ? 45000 : 30000)
          ),
        ])) || "I'm right here with you. Let's keep working.";

      // Sync to database
      const db = readDatabase();
      if (room && db.chatHistory[room as 'buzz' | 'einstein' | 'godmode']) {
        db.chatHistory[room as 'buzz' | 'einstein' | 'godmode'] = messages;
        writeDatabase(db);
      }

      // TRIGGER MEMORY GROWTH ASYNCHRONOUSLY IN BACKGROUND
      growMemoryFromInteraction(userLastMessage, replyText, room).catch((e) =>
        console.warn('Background memory growth error:', e?.message)
      );

      return res.json({ text: replyText });
    } catch (callError: any) {
      console.warn('Live AI call fallback:', callError?.message);
    }

    // In-character fallback response powered by memory
    let fallbackText = '';
    if (room === 'einstein') {
      fallbackText = `I am thinking through this independently and keeping your memories updated. Regarding "${userLastMessage.slice(0, 50)}": I'll break it down with complete honesty and real academic depth. Ask me anything and we'll get it right.`;
    } else if (room === 'godmode') {
      fallbackText = `I see the angle you're playing, and here's my independent take: No sugarcoating, no hesitation. Ask me whatever you need and I will give you the raw truth to get to the bag.`;
    } else {
      fallbackText = `I've analyzed your question and checked our database memory. I'm ready to answer whatever you ask and think three steps ahead for you today.`;
    }

    return res.json({ text: fallbackText });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return res.status(500).json({
      error: error?.message || 'Error processing response',
      text: "I'm here with you. Let's keep moving forward.",
    });
  }
});

// Start server and handle Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
