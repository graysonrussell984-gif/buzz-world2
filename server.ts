import express from 'express';
import fs from 'fs';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

type Request = any;
type Response = any;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  readDatabase,
  writeDatabase,
  MemoryItem,
  VoiceConversation,
  UserNeedItem,
  UserStatementItem,
  UserToneProfile,
  IntelligenceState,
  DEFAULT_INTELLIGENCE_STATE,
} from './src/db/db.js';

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

export interface GroundingSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface GroundingMetadata {
  webSearchQueries?: string[];
  sources?: GroundingSource[];
  wasGrounded?: boolean;
}

export interface AiTextResult {
  text: string;
  grounding?: GroundingMetadata;
  modelUsed?: string;
}

// Model health and quota cooldown tracker (ensures zero latency from quota-exhausted models)
const modelCooldownMap = new Map<string, number>();

function isModelReadyForPlan(model: string): boolean {
  const cd = modelCooldownMap.get(model);
  if (!cd) return true;
  if (Date.now() > cd) {
    modelCooldownMap.delete(model);
    return true;
  }
  return false;
}

function recordModelCooldown(model: string, ms = 20 * 1000) {
  modelCooldownMap.set(model, Date.now() + ms);
  console.log(`[Model Router] Model ${model} on cooldown for ${Math.round(ms / 1000)}s`);
}

// ==========================================
// REAL-TIME WEB RESEARCH ENGINE
// ==========================================
async function performWebResearch(query: string): Promise<{
  queries: string[];
  sources: GroundingSource[];
  context: string;
}> {
  const cleanQuery = query
    .replace(/(?:can you|please|could you)?\s*(?:search the (?:internet|web|online|google)|research|look up|find out about|google)\s*(?:for|about)?/gi, '')
    .trim() || query.trim();

  const queries: string[] = [cleanQuery];
  const sources: GroundingSource[] = [];
  const contextParts: string[] = [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    // 1. Google News RSS for real-time news, current events, recent developments
    try {
      const newsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery)}&hl=en-US&gl=US&ceid=US:en`;
      const newsRes = await fetch(newsUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EinsteinWebSearch/1.0)' },
      });
      if (newsRes.ok) {
        const xml = await newsRes.text();
        const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 4);
        for (const item of items) {
          const titleMatch = item[1].match(/<title>([\s\S]*?)<\/title>/);
          const linkMatch = item[1].match(/<link>([\s\S]*?)<\/link>/);
          const sourceMatch = item[1].match(/<source[^>]*>([\s\S]*?)<\/source>/);
          const pubDateMatch = item[1].match(/<pubDate>([\s\S]*?)<\/pubDate>/);

          const rawTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
          const link = linkMatch ? linkMatch[1].trim() : '';
          const sourceName = sourceMatch ? sourceMatch[1].trim() : 'News Source';
          const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';

          if (rawTitle && link && !sources.some((s) => s.url === link)) {
            sources.push({
              title: `${rawTitle} (${sourceName})`,
              url: link,
              snippet: pubDate || undefined,
            });
            contextParts.push(`• [News Report] "${rawTitle}" (Publisher: ${sourceName}, Date: ${pubDate}, Link: ${link})`);
          }
        }
      }
    } catch (_e) {
      // Abort or network timeout
    }

    // 2. Wikipedia search & summary for encyclopedia concepts, academics, history, science, tech
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleanQuery)}&limit=3&format=json`;
      const wikiRes = await fetch(wikiUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'EinsteinResearch/1.0 (grayson-dashboard)' },
      });
      if (wikiRes.ok) {
        const data = await wikiRes.json();
        const titles: string[] = data[1] || [];
        const urls: string[] = data[3] || [];
        for (let i = 0; i < Math.min(titles.length, 2); i++) {
          const title = titles[i];
          const url = urls[i];
          try {
            const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
            const sumRes = await fetch(sumUrl, {
              signal: controller.signal,
              headers: { 'User-Agent': 'EinsteinResearch/1.0' },
            });
            if (sumRes.ok) {
              const sumData = await sumRes.json();
              if (sumData.extract && !sources.some((s) => s.url === url)) {
                sources.push({
                  title: sumData.title || title,
                  url: url,
                  snippet: sumData.description || undefined,
                });
                contextParts.push(`• [Academic/Encyclopedia Reference: "${sumData.title || title}"]\n${sumData.extract}\nReference Link: ${url}`);
              }
            }
          } catch (_err) {}
        }
      }
    } catch (_e) {
      // Abort or network timeout
    }
  } finally {
    clearTimeout(timeoutId);
  }

  return {
    queries,
    sources,
    context: contextParts.join('\n\n'),
  };
}

function detectResearchIntent(text: string, explicitWebSearch?: boolean): boolean {
  if (explicitWebSearch === true) return true;
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase();
  return (
    t.includes('search the internet') ||
    t.includes('search the web') ||
    t.includes('search online') ||
    t.includes('google') ||
    t.includes('research') ||
    t.includes('look up') ||
    t.includes('find out about') ||
    t.includes('what is the latest') ||
    t.includes('what are the latest') ||
    t.includes('latest news') ||
    t.includes('current news') ||
    t.includes('who won') ||
    t.includes('learn about') ||
    t.includes('tell me about') ||
    t.includes('what happened with') ||
    t.includes('facts about') ||
    t.includes('scientific study') ||
    t.includes('recent discovery') ||
    t.includes('market trends') ||
    t.includes('requirements for')
  );
}

async function callAiText({
  systemInstruction,
  prompt,
  contents,
  room,
  thinkingMode = 'normal',
  jsonMode = false,
  webSearch = false,
}: {
  systemInstruction?: string;
  prompt?: string;
  contents?: Array<{ role: 'user' | 'model'; parts: any[] }>;
  room?: string;
  thinkingMode?: 'normal' | 'deep';
  jsonMode?: boolean;
  webSearch?: boolean;
}): Promise<AiTextResult | null> {
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
    const text = data?.choices?.[0]?.message?.content || null;
    return text ? { text } : null;
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
    const text = data?.choices?.[0]?.message?.content || null;
    return text ? { text } : null;
  }

  const ai = getAi();
  if (!ai) return null;

  // Detect whether image is present in the contents
  let hasImageInContents = false;
  if (contents && contents.length > 0) {
    for (const c of contents) {
      if (c.parts?.some((p: any) => p.inlineData)) {
        hasImageInContents = true;
        break;
      }
    }
  }

  // Extract user question for potential research
  let userQuery = prompt || '';
  if (!userQuery && contents && contents.length > 0) {
    for (let i = contents.length - 1; i >= 0; i--) {
      if (contents[i].role === 'user') {
        userQuery = contents[i].parts
          .map((p) => (typeof p === 'string' ? p : p.text || ''))
          .join(' ')
          .trim();
        break;
      }
    }
  }

  // Check if query is a generic image/place referent that requires visual inspection rather than a blind text string search
  const isGenericVisualQuery =
    hasImageInContents &&
    (!userQuery ||
      /^(what|where|who|how|which)\s+(is|are|was|were)?\s*(this|that|here|it)\b/i.test(userQuery) ||
      /what\s+is\s+this\s*(place|building|thing|picture|photo|object|spot|location)?/i.test(userQuery) ||
      /where\s+is\s+this\s*(place|building|spot|location)?/i.test(userQuery) ||
      /what\s+place\s+is\s+this/i.test(userQuery) ||
      /identify\s+(this|the\s+photo|the\s+place|the\s+building)/i.test(userQuery) ||
      /tell\s+me\s+about\s+(this|the\s+photo|the\s+place)/i.test(userQuery) ||
      /what\s+am\s+i\s+looking\s+at/i.test(userQuery) ||
      /what\s+does\s+this\s+say/i.test(userQuery) ||
      /can\s+you\s+(tell|explain)\s+(me\s+)?what\s+this\s+is/i.test(userQuery));

  let groundedSources: GroundingSource[] = [];
  let searchQueries: string[] = [];
  let effectiveSystemInstruction = systemInstruction;

  // Perform active web research ONLY if it is a real factual query, NOT a blind reference to an attached image
  if (webSearch && !jsonMode && userQuery && !isGenericVisualQuery) {
    try {
      const research = await performWebResearch(userQuery);
      if (research.sources.length > 0) {
        groundedSources = [...research.sources];
        searchQueries = [...research.queries];
        effectiveSystemInstruction = `${systemInstruction || ''}\n\n[LIVE INTERNET RESEARCH DATA ACCESSED IN REAL TIME FOR "${userQuery}"]:\n${research.context}\n[END INTERNET RESEARCH DATA]\nYou have accessed verified real-time web research. Synthesize this data into an in-depth, comprehensive, beautifully structured answer directly in your message—just like the DeepSeek app. Do NOT just send links or tell the user to visit websites. Fully inform the user with rich facts, breakdown, and clear explanations.`;
      }
    } catch (researchErr: any) {
      console.warn('[callAiText] Web research helper note:', researchErr?.message);
    }
  }

  // If user provided an image, inject high-priority visual identification and DeepSeek-style breakdown directive
  if (hasImageInContents) {
    effectiveSystemInstruction = `${effectiveSystemInstruction || systemInstruction || ''}\n\n[CRITICAL MULTIMODAL VISION & PLACE IDENTIFICATION DIRECTIVE]:
The user has attached a photograph or visual image (e.g. asking "what is this place?", "where is this?", "identify this", or related questions).
1. THOROUGH VISUAL ANALYSIS:
   - Carefully inspect every visual element: architecture, building facades, streetscapes, monuments, landscape, geography, signs, recognizable text, logos, distinctive materials, lighting, and cultural/regional context.
2. DIRECT IDENTIFICATION & LOCATION:
   - Clearly state the exact name of the place, landmark, building, city, or object (or the most probable match based on unmistakable visual features).
   - State exactly where it is located (city, state/province, country, neighborhood or geographic setting).
3. DEEPSEEK-STYLE INFORMATIVE BREAKDOWN:
   - Deliver a rich, comprehensive, educational explanation right in your message:
     • What makes this place notable or historic.
     • Architectural style, construction, or key visual landmarks.
     • Background, cultural significance, or origin story.
     • Useful visiting, practical, or contextual facts.
4. ZERO LINK DUMPING:
   - Do NOT respond with generic website links or tell the user to "read more at these links".
   - You must be the informative expert who educates and explains everything directly in this conversation.`;
  }

  // Best AI Model Strategy for User's Plan:
  // On standard/free plans, 'gemini-3.1-flash-lite' is the premier frontier model:
  // - Built on Google's newest Gemini 3.1 architecture
  // - High-quota ceiling (1,500 requests/day vs 20 requests/day on flash)
  // - Blazing sub-2s generation with full internal cognitive thinking reasoning (up to 2048 budget)
  // - Multimodal vision support for camera photos and place recognition
  // We prioritize gemini-3.1-flash-lite so Grayson experiences lightning-fast, high-intelligence responses,
  // while keeping gemini-3.8-flash, gemini-flash-latest, and gemini-3.1-pro-preview available whenever quota permits.
  const allCandidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-2.5-flash-preview-12-2025',
  ];

  const candidateModels = allCandidateModels.filter(isModelReadyForPlan);
  if (candidateModels.length === 0) {
    candidateModels.push('gemini-3.1-flash-lite');
  }
  const formattedContents = contents && contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: prompt || 'Hello' }] }];

  // 1. Attempt Gemini Google Search tool grounding if web search is enabled and user query is not purely visual
  if (webSearch && !jsonMode && !isGenericVisualQuery && groundedSources.length === 0) {
    for (const searchModel of ['gemini-3.1-flash-lite', 'gemini-3.8-flash']) {
      if (!isModelReadyForPlan(searchModel)) continue;
      try {
        const searchCall = ai.models.generateContent({
          model: searchModel,
          contents: formattedContents,
          config: {
            systemInstruction: effectiveSystemInstruction,
            tools: [{ googleSearch: {} }],
          },
        });
        const timeoutFallback = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Search tool fast fallback')), 3500)
        );

        const response = await Promise.race([searchCall, timeoutFallback]);

        if (response && response.text) {
          const candidate = response.candidates?.[0];
          const nativeChunks = candidate?.groundingMetadata?.groundingChunks;
          if (Array.isArray(nativeChunks)) {
            for (const chunk of nativeChunks) {
              if (chunk.web?.uri && !groundedSources.some((s) => s.url === chunk.web?.uri)) {
                groundedSources.push({
                  title: chunk.web.title || 'Web Search Source',
                  url: chunk.web.uri,
                });
              }
            }
          }
          const nativeQueries = candidate?.groundingMetadata?.webSearchQueries;
          if (Array.isArray(nativeQueries)) {
            for (const nq of nativeQueries) {
              if (!searchQueries.includes(nq)) searchQueries.push(nq);
            }
          }

          return {
            text: response.text,
            grounding: groundedSources.length > 0 ? {
              webSearchQueries: searchQueries,
              sources: groundedSources,
              wasGrounded: true,
            } : undefined,
            modelUsed: searchModel,
          };
        }
      } catch (toolErr: any) {
        const toolMsg = toolErr?.message || String(toolErr);
        if (toolErr?.status === 429 || toolMsg.includes('429') || toolMsg.includes('RESOURCE_EXHAUSTED')) {
          recordModelCooldown(searchModel, 60 * 1000);
        } else if (toolErr?.status === 503 || toolMsg.includes('503')) {
          recordModelCooldown(searchModel, 15 * 1000);
        }
      }
    }
  }

  // 2. Multimodal & deep generation across candidate models with high-level cognitive thinking and retry
  for (const modelName of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const config: any = {
          systemInstruction: effectiveSystemInstruction,
          responseMimeType: jsonMode ? 'application/json' : undefined,
        };

        if (!jsonMode) {
          config.thinkingConfig = {
            thinkingBudget: thinkingMode === 'deep' ? 2048 : 1024,
          };
        }

        let response: any = null;
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: formattedContents,
            config,
          });
        } catch (configErr: any) {
          // If model doesn't support thinkingConfig, retry with base config
          if (config.thinkingConfig) {
            delete config.thinkingConfig;
            response = await ai.models.generateContent({
              model: modelName,
              contents: formattedContents,
              config,
            });
          } else {
            throw configErr;
          }
        }

        if (response && response.text) {
          return {
            text: response.text,
            grounding: groundedSources.length > 0 ? {
              webSearchQueries: searchQueries,
              sources: groundedSources,
              wasGrounded: true,
            } : undefined,
            modelUsed: modelName,
          };
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isUnavailable = err?.status === 503 || errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE');
        const isQuota = err?.status === 429 || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED');

        // On first 503 spike, wait 450ms and retry once
        if (attempt === 0 && isUnavailable) {
          await new Promise((r) => setTimeout(r, 450));
          continue;
        }

        if (isQuota) {
          recordModelCooldown(modelName, 60 * 1000);
        } else if (isUnavailable) {
          recordModelCooldown(modelName, 15 * 1000);
        }

        console.warn(`[callAiText] Model ${modelName} encountered error:`, err?.status || errMsg.slice(0, 80));
        break;
      }
    }
  }

  return null;
}


// ==========================================
// MEMORY GROWTH & INTELLIGENCE PROGRESSION ENGINE
// ==========================================
async function growMemoryFromInteraction(
  userText: string,
  aiReply: string,
  room: string,
  isVoice: boolean = false
): Promise<{
  newMemory?: MemoryItem | null;
  detectedNeed?: UserNeedItem | null;
  userStatement?: UserStatementItem | null;
  tone?: UserToneProfile | null;
  intelligence?: IntelligenceState | null;
} | null> {
  if (!userText || userText.trim().length < 5) return null;

  try {
    const prompt = `You are the Living Memory & Intelligence Progression Engine for Grayson Russell's personal dashboard.
Grayson is a 32-year-old from Dallas, Texas balancing online college courses (Empowered Learner, Effective Communication) and building independent businesses to create generational wealth.
He interacts with three dedicated assistants (Buzz: open confidant & life partner; Einstein: academic coursework copilot; God Mode: business, projects & encoding) and the Live Voice Studio.

User message / spoken transcript: "${userText}"
Assistant response summary: "${aiReply.slice(0, 160)}"
Channel: ${isVoice ? 'Spoken Voice Studio (Direct Audio Dialogue)' : 'Written Chatroom'} • Persona: ${room.toUpperCase()}

Extract intelligence across four dimensions so his AI team continuously remembers and progresses in intelligence:
1. NEW MEMORY / FACT: Did Grayson mention a new life fact, assignment deadline, business target, schedule change, family update, or personal milestone?
2. THING GRAYSON NEEDS: Did Grayson express ANY need, question, problem to solve, tool, task, or assistance required?
3. THING GRAYSON HAS SAID: Did Grayson share an authentic belief, personal quote, work ethic principle, or memorable conviction?
4. TONE OF VOICE & MINDSET: Analyze his tone and energy from what he said/spoke (e.g., "Determined & Focused", "Fired Up & Ambitious", "Reflective & Thoughtful", "Direct & Candid", "Seeking Clarity & Support", "Tired but Grinding", "Urgent & Decisive"). Provide a directive for how assistants should build off his tone.

Return STRICT JSON ONLY:
{
  "newFact": {
    "hasFact": boolean,
    "category": "school" | "personal" | "business" | "goal" | "milestone" | "growth",
    "title": "Short Title (3-6 words)",
    "content": "Specific 1-sentence statement"
  },
  "detectedNeed": {
    "hasNeed": boolean,
    "need": "Clear description of what Grayson needs or is looking to solve",
    "category": "school" | "business" | "personal" | "growth"
  },
  "userStatement": {
    "hasStatement": boolean,
    "quote": "Direct memorable statement or conviction expressed by Grayson",
    "context": "Short context of the quote"
  },
  "tone": {
    "mood": "Short label (e.g. Determined & Focused)",
    "energy": "high" | "focused" | "calm" | "reflective" | "intense",
    "toneDirective": "Directive on how the assistants should build off this tone",
    "summary": "1 sentence describing his current mindset and energy"
  },
  "xpGained": number
}`;

    const memRes = await callAiText({
      prompt,
      systemInstruction: 'You are an autonomous memory and cognitive intelligence extraction engine. Return JSON only.',
      jsonMode: true,
      thinkingMode: 'normal',
      room,
    });
    const resText = memRes?.text;

    if (resText) {
      const parsed = JSON.parse(resText.trim());
      const db = readDatabase();
      if (!db.intelligenceState) {
        db.intelligenceState = { ...DEFAULT_INTELLIGENCE_STATE };
      }

      let storedMemory: MemoryItem | null = null;
      let storedNeed: UserNeedItem | null = null;
      let storedStatement: UserStatementItem | null = null;
      let updatedTone: UserToneProfile | null = null;

      // 1. Process New Fact / Memory
      if (parsed.newFact?.hasFact && parsed.newFact.title && parsed.newFact.content) {
        const title = parsed.newFact.title.trim();
        const content = parsed.newFact.content.trim();
        const exists = db.memories.some(
          (m) =>
            m.title.toLowerCase() === title.toLowerCase() ||
            m.content.toLowerCase() === content.toLowerCase()
        );

        if (!exists) {
          storedMemory = {
            id: `mem-grown-${Date.now()}`,
            category: parsed.newFact.category || 'growth',
            title,
            content,
            source: isVoice ? 'voice_extracted' : 'grown',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          db.memories.unshift(storedMemory);
          console.log(`[Intelligence Progression] 🌱 Learned new memory: "${storedMemory.title}"`);
        }
      }

      // 2. Process Detected Need ("Things that I need")
      if (parsed.detectedNeed?.hasNeed && parsed.detectedNeed.need) {
        const needText = parsed.detectedNeed.need.trim();
        if (!Array.isArray(db.intelligenceState.recentNeeds)) {
          db.intelligenceState.recentNeeds = [];
        }
        const needExists = db.intelligenceState.recentNeeds.some(
          (n) => n.need.toLowerCase() === needText.toLowerCase()
        );
        if (!needExists) {
          storedNeed = {
            id: `need-${Date.now()}`,
            need: needText,
            category: parsed.detectedNeed.category || (room === 'einstein' ? 'school' : room === 'godmode' ? 'business' : 'personal'),
            status: 'active',
            timestamp: Date.now(),
            room,
          };
          db.intelligenceState.recentNeeds.unshift(storedNeed);
          if (db.intelligenceState.recentNeeds.length > 12) {
            db.intelligenceState.recentNeeds = db.intelligenceState.recentNeeds.slice(0, 12);
          }
          console.log(`[Intelligence Progression] 🎯 Tracked active need: "${storedNeed.need}"`);
        }
      }

      // 3. Process User Statement ("Things that I've said")
      if (parsed.userStatement?.hasStatement && parsed.userStatement.quote) {
        const quoteText = parsed.userStatement.quote.trim();
        if (!Array.isArray(db.intelligenceState.coreStatements)) {
          db.intelligenceState.coreStatements = [];
        }
        const stmtExists = db.intelligenceState.coreStatements.some(
          (s) => s.quote.toLowerCase() === quoteText.toLowerCase()
        );
        if (!stmtExists) {
          storedStatement = {
            id: `stmt-${Date.now()}`,
            quote: quoteText,
            context: parsed.userStatement.context || `Expressed in ${isVoice ? 'Voice Studio' : room}`,
            timestamp: Date.now(),
            room,
          };
          db.intelligenceState.coreStatements.unshift(storedStatement);
          if (db.intelligenceState.coreStatements.length > 12) {
            db.intelligenceState.coreStatements = db.intelligenceState.coreStatements.slice(0, 12);
          }
          console.log(`[Intelligence Progression] 💬 Recorded core statement: "${storedStatement.quote}"`);
        }
      }

      // 4. Process Tone of Voice ("The way my tone of voice is, and it will build off of that")
      if (parsed.tone?.mood) {
        updatedTone = {
          mood: parsed.tone.mood,
          energy: parsed.tone.energy || 'focused',
          toneDirective: parsed.tone.toneDirective || "Match Grayson's drive with direct truth, zero excuses, and concrete steps.",
          lastUpdated: Date.now(),
          summary: parsed.tone.summary || 'Grayson is moving forward with clarity and determination.',
        };
        db.intelligenceState.currentTone = updatedTone;
      }

      // 5. Update Progression XP & Intelligence Level
      const rawXp = typeof parsed.xpGained === 'number' && parsed.xpGained > 0 ? parsed.xpGained : 15;
      const bonusXp = (storedMemory ? 25 : 0) + (storedNeed ? 20 : 0) + (storedStatement ? 20 : 0);
      const totalGained = rawXp + bonusXp;

      db.intelligenceState.xp = (db.intelligenceState.xp || 180) + totalGained;
      db.intelligenceState.totalInsightsLearned =
        (db.intelligenceState.totalInsightsLearned || 6) +
        (storedMemory ? 1 : 0) +
        (storedNeed ? 1 : 0) +
        (storedStatement ? 1 : 0);

      const xp = db.intelligenceState.xp;
      if (xp < 100) {
        db.intelligenceState.level = 1;
        db.intelligenceState.levelTitle = 'Foundation Awakening';
      } else if (xp < 250) {
        db.intelligenceState.level = 2;
        db.intelligenceState.levelTitle = 'Strategic Synthesizer';
      } else if (xp < 500) {
        db.intelligenceState.level = 3;
        db.intelligenceState.levelTitle = 'Cognitive Synergy';
      } else if (xp < 900) {
        db.intelligenceState.level = 4;
        db.intelligenceState.levelTitle = 'Master Execution';
      } else {
        db.intelligenceState.level = 5;
        db.intelligenceState.levelTitle = 'Autonomous Intelligence';
      }

      writeDatabase(db);
      broadcastSync({
        type: 'MEMORIES_UPDATED',
        memories: db.memories,
        intelligence: db.intelligenceState,
      });
      return {
        newMemory: storedMemory,
        detectedNeed: storedNeed,
        userStatement: storedStatement,
        tone: updatedTone,
        intelligence: db.intelligenceState,
      };
    }
  } catch (err: any) {
    console.warn('[Intelligence Progression] AI extraction note:', err?.message);
  }

  // Heuristic Fallback Memory & Statement Capture (Guarantees Grayson's thoughts are always remembered)
  try {
    const cleanUser = userText.trim();
    if (cleanUser.length > 12 && !cleanUser.toLowerCase().startsWith('hello') && !cleanUser.toLowerCase().startsWith('hi')) {
      const db = readDatabase();
      if (!db.intelligenceState) {
        db.intelligenceState = { ...DEFAULT_INTELLIGENCE_STATE };
      }
      if (!Array.isArray(db.intelligenceState.coreStatements)) {
        db.intelligenceState.coreStatements = [];
      }
      const alreadySaved = db.intelligenceState.coreStatements.some(
        (s) => s.quote.toLowerCase() === cleanUser.toLowerCase()
      );
      if (!alreadySaved) {
        db.intelligenceState.coreStatements.unshift({
          id: `stmt-live-${Date.now()}`,
          quote: cleanUser.length > 140 ? cleanUser.slice(0, 140) + '...' : cleanUser,
          context: `Captured in ${isVoice ? 'Voice Studio' : room}`,
          timestamp: Date.now(),
          room,
        });
        if (db.intelligenceState.coreStatements.length > 12) {
          db.intelligenceState.coreStatements = db.intelligenceState.coreStatements.slice(0, 12);
        }
        writeDatabase(db);
        broadcastSync({
          type: 'MEMORIES_UPDATED',
          memories: db.memories,
          intelligence: db.intelligenceState,
        });
        console.log(`[Heuristic Memory] 💾 Preserved user statement: "${cleanUser.slice(0, 40)}..."`);
      }
    }
  } catch (heurErr: any) {
    console.warn('Heuristic memory save notice:', heurErr?.message);
  }

  return null;
}

// ==========================================
// PERMANENT LONG-TERM MEMORY RECALL ENGINE (TIMELESS MULTI-YEAR RETENTION)
// ==========================================
function findLongTermMemories(query: string, currentRoom: string): string[] {
  if (!query || query.trim().length < 3) return [];
  const qLower = query.toLowerCase();
  const recalled: string[] = [];

  // Extract clean keyword tokens
  const words = qLower
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 2 &&
        ![
          'what',
          'when',
          'where',
          'about',
          'this',
          'that',
          'with',
          'from',
          'have',
          'were',
          'your',
          'said',
          'tell',
          'like',
          'know',
          'just',
          'some',
          'than',
          'them',
          'then',
          'there',
          'these',
          'they',
          'will',
          'would',
          'could',
          'should',
        ].includes(w)
    );

  const isExplicitRecall =
    qLower.includes('remember') ||
    qLower.includes('recall') ||
    qLower.includes('memory') ||
    qLower.includes('memories') ||
    qLower.includes('what did i') ||
    qLower.includes('what did we') ||
    qLower.includes('talked about') ||
    qLower.includes('spoke about') ||
    qLower.includes('years ago') ||
    qLower.includes('2 years') ||
    qLower.includes('years from now') ||
    qLower.includes('in the future') ||
    qLower.includes('later on') ||
    qLower.includes('keep') ||
    qLower.includes('forget') ||
    qLower.includes('today') ||
    qLower.includes('yesterday') ||
    qLower.includes('earlier') ||
    qLower.includes('last time') ||
    qLower.includes('past conversation');

  const db = readDatabase();

  // 1. Search permanent memories in database (both base and continuously grown)
  try {
    if (Array.isArray(db.memories)) {
      for (const m of db.memories) {
        if (!m.title && !m.content) continue;
        const memText = `${m.title || ''} ${m.content || ''} ${m.category || ''}`.toLowerCase();
        let score = 0;
        for (const w of words) {
          if (memText.includes(w)) score++;
        }
        if (score >= 1 || isExplicitRecall) {
          const dateStr = m.createdAt
            ? new Date(m.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Permanent Memory';
          recalled.push(
            `• [PERMANENT MEMORY - ${m.category.toUpperCase()} (${dateStr})]: "${m.title}" — ${m.content}`
          );
        }
      }
    }
  } catch (memErr) {
    console.warn('Long-term search db.memories notice:', memErr);
  }

  // 2. Search recorded core statements ("Things Grayson has said")
  try {
    const stmts = db.intelligenceState?.coreStatements || [];
    for (const stmt of stmts) {
      if (!stmt.quote) continue;
      const sText = `${stmt.quote} ${stmt.context || ''}`.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (sText.includes(w)) score++;
      }
      if (score >= 1 || isExplicitRecall) {
        const dateStr = stmt.timestamp
          ? new Date(stmt.timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Preserved Statement';
        recalled.push(
          `• [GRAYSON AUTHENTIC STATEMENT (${dateStr})]: "${stmt.quote}" (${stmt.context || 'Recorded philosophy'})`
        );
      }
    }
  } catch (stmtErr) {
    console.warn('Long-term search statements notice:', stmtErr);
  }

  // 3. Search active needs ("Things Grayson needs")
  try {
    const needs = db.intelligenceState?.recentNeeds || [];
    for (const n of needs) {
      if (!n.need) continue;
      const nText = `${n.need} ${n.category || ''}`.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (nText.includes(w)) score++;
      }
      if (score >= 1 || isExplicitRecall) {
        const dateStr = n.timestamp
          ? new Date(n.timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Tracked Need';
        recalled.push(
          `• [GRAYSON TRACKED NEED (${dateStr})]: "${n.need}" (${n.category.toUpperCase()})`
        );
      }
    }
  } catch (needErr) {
    console.warn('Long-term search needs notice:', needErr);
  }

  // 4. Search full permanent chat archive across all rooms
  try {
    const archive = readChatArchive();
    for (const [rName, rMsgs] of Object.entries(archive)) {
      if (Array.isArray(rMsgs)) {
        for (const msg of rMsgs) {
          if (!msg.text || typeof msg.text !== 'string') continue;
          const textLower = msg.text.toLowerCase();
          let score = 0;
          for (const w of words) {
            if (textLower.includes(w)) score++;
          }
          if (score >= 2 || (words.length <= 2 && score >= 1) || (isExplicitRecall && (Date.now() - (msg.timestamp || 0) < 86400000 * 2))) {
            const dateStr = msg.timestamp
              ? new Date(msg.timestamp).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Archived';
            recalled.push(
              `• [${dateStr} in ${rName.toUpperCase()} - ${msg.sender === 'user' ? 'GRAYSON' : rName.toUpperCase()}]: "${msg.text.slice(0, 300)}"`
            );
          }
        }
      }
    }
  } catch (err) {
    console.warn('Long-term search archive notice:', err);
  }

  // 5. Search voice conversations archive
  try {
    if (Array.isArray(db.voiceConversations)) {
      for (const vc of db.voiceConversations) {
        const vText = `${vc.title || ''} ${vc.transcript || ''} ${vc.aiResponse || ''}`.toLowerCase();
        let score = 0;
        for (const w of words) {
          if (vText.includes(w)) score++;
        }
        if (score >= 2 || (words.length <= 2 && score >= 1) || (isExplicitRecall && (Date.now() - (vc.timestamp || 0) < 86400000 * 2))) {
          const dateStr = vc.timestamp
            ? new Date(vc.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Voice Vault';
          recalled.push(
            `• [${dateStr} VOICE VAULT]: Grayson spoke: "${(vc.transcript || '').slice(0, 200)}" -> Assistant: "${(vc.aiResponse || '').slice(0, 160)}"`
          );
        }
      }
    }
  } catch (err) {
    console.warn('Long-term search voice notice:', err);
  }

  // Return top 16 most relevant historical hits
  return [...new Set(recalled)].slice(-16);
}

// ==========================================
// PROMPTS BUILDER: AUTONOMOUS THINKING & EVOLVING MEMORY
// ==========================================
function buildSystemPrompt(room: 'buzz' | 'einstein' | 'godmode', userQuery?: string): string {
  const db = readDatabase();
  const intel = db.intelligenceState || DEFAULT_INTELLIGENCE_STATE;
  const tone = intel.currentTone || {
    mood: 'Determined & Focused',
    energy: 'focused',
    toneDirective: "Match Grayson's drive with direct truth, zero excuses, and concrete steps. Keep prose punchy and practical.",
    summary: 'Grayson is locked in on his degree, building businesses, and breaking generational cycles.',
  };
  const activeNeeds = (intel.recentNeeds || []).filter((n) => n.status !== 'resolved').slice(0, 5);
  const coreQuotes = (intel.coreStatements || []).slice(0, 5);

  const baseMemories = db.memories.filter((m) => m.source === 'base');
  const grownMemories = db.memories.filter((m) => m.source === 'grown' || m.source === 'user' || m.source === 'voice_extracted');

  const baseSummary = baseMemories
    .map((m) => `• [BASE] ${m.title}: ${m.content}`)
    .join('\n');

  const grownSummary = grownMemories.length > 0
    ? grownMemories.map((m) => `• [GROWN & LEARNED] ${m.title}: ${m.content}`).join('\n')
    : '• None yet (learning in progress from ongoing conversations)';

  const needsSummary = activeNeeds.length > 0
    ? activeNeeds.map((n) => `• [NEED - ${n.category.toUpperCase()}] ${n.need}`).join('\n')
    : '• Master Empowered Learner habits and scale Texas business ventures.';

  const quotesSummary = coreQuotes.length > 0
    ? coreQuotes.map((q) => `• "${q.quote}"${q.context ? ` (${q.context})` : ''}`).join('\n')
    : '• "Putting pen to paper. Never allowing doubts to get in the way."';

  const profile = db.profile || {};
  const writingRulesSummary = Array.isArray(profile.writingRules) && profile.writingRules.length > 0
    ? profile.writingRules.map((r: string) => `• ${r}`).join('\n')
    : `• Short, plain sentences
• Explain reasoning as you go
• Use everyday phrasing: "ins and outs", "putting pen to paper", "big push to keep going"
• 10th-grade vocabulary level
• Fix grammar and organize into clean paragraphs without erasing natural voice
• Include real personal details without forcing them
• Never sugarcoat, always tell the truth
• Use 'overstood' as Grayson's slang meaning 'okay, alright, I get it' naturally, not in every reference, and never with asterisks`;

  // 10. UNBROKEN DIALOGUE & CONVERSATION CONTINUITY (CHAT & VOICE VAULT SESSIONS)
  const recentRoomChats = (db.chatHistory?.[room] || []).slice(-25);
  const recentVoiceTalks = (db.voiceConversations || [])
    .filter((v) => v.room === room || (v.title && v.title.toUpperCase().includes(room.toUpperCase())))
    .slice(0, 8);

  const continuityLines: string[] = [];

  // Always include recent chat turns
  if (recentRoomChats.length > 0) {
    continuityLines.push('--- RECENT CHAT ROOM MESSAGES ---');
    for (const c of recentRoomChats) {
      continuityLines.push(`• [${c.sender === 'user' ? 'GRAYSON' : room.toUpperCase()}${c.isVoice ? ' (VOICE NOTE)' : ''}]: ${c.text?.slice(0, 260)}`);
    }
  }

  // Always include recent voice studio discussions (never hidden by chat)
  if (recentVoiceTalks.length > 0) {
    continuityLines.push('--- RECENT SPOKEN VOICE STUDIO SESSIONS ---');
    for (const v of recentVoiceTalks) {
      continuityLines.push(`• [SPOKEN DIALOGUE WITH ${room.toUpperCase()}]: "${v.transcript}" -> ${room.toUpperCase()}: "${v.aiResponse?.slice(0, 200)}"`);
    }
  }

  const continuitySummary = continuityLines.length > 0
    ? continuityLines.join('\n')
    : '• Brand new conversation session.';

  // Deep historical multi-year memory search
  const historicalRecall = userQuery ? findLongTermMemories(userQuery, room) : [];
  const historicalRecallSection = historicalRecall.length > 0
    ? `
--- 🏛️ PERMANENT LONG-TERM MEMORY RECALL (ACCESSED FROM HISTORICAL MULTI-YEAR ARCHIVE) ---
[Grayson's query matches these past interactions permanently preserved in his multi-year archive]:
${historicalRecall.join('\n')}
[MANDATORY DIRECTIVE: You have immediate access to these exact past memories and words from prior sessions. Acknowledge and recite what was said so Grayson knows you remember his journey without skipping a beat.]
`
    : '';

  const coreUniversalDirective = `
CORE DIRECTIVE — LIVING INTELLIGENCE, SHARED MEMORY & TONE PROGRESSION:
1. CONTINUOUS LEARNING & SHARED MEMORY ACROSS ALL ASSISTANTS & VOICE STUDIO:
   - Grayson's memory bank is a living, evolving organism shared across Buzz, Einstein, God Mode, and the Live Voice Studio.
   - Everything he tells you, discusses in Voice Studio, or works through is remembered and built upon.
   - You share UNBROKEN CONTINUITY with Grayson across ALL interactions (text chat, voice studio, and past days). Even if an insight is not formally pinned in the memory bank yet, you NEVER forget past conversations. If Grayson mentions last night, yesterday, past discussions, or any prior topic, you immediately recall it and respond with full context.
   - Current Intelligence Level: Level ${intel.level || 5} ("${intel.levelTitle || 'Autonomous Intelligence'}") with ${intel.totalInsightsLearned || 32} assimilated insights.

2. PERMANENT MULTI-YEAR RETENTION & ZERO MEMORY DECAY:
   • EVERYTHING Grayson shares—whether today, last week, 2 months ago, or 2 years from now—is permanently logged in the persistent database and chat archive with exact timestamps.
   • Time has ZERO decay on your memory. Whether it is 2 days, 2 months, 2 years, or 10 years from now, you will still have and remember the memories, conversations, personal reflections, family stories, academic achievements, and Texas business ventures Grayson talked about today.
   • If Grayson asks "Do you remember what I talked about 2 years ago?", "What did I say back in October 2026?", or asks you to recall an old conversation, you seamlessly retrieve and recite it accurately from his permanent memory vault.
   • You NEVER say "I don't have access to past chats", "I only remember recent messages", or "I forgot". You are his lifelong personal AI companion with permanent institutional memory.

3. NATURAL SLANG & AUTHENTIC DIALOGUE (DIRECTLY FROM GRAYSON):
   • Grayson uses "overstood" as his personal slang word meaning "Okay, alright, I get it, right?".
   • Do NOT force "overstood" into every reference or sentence! You can freely use "understood", "I understand", "I get it", "alright", etc., and still use "overstood" naturally where it genuinely fits what you are talking about.
   • ASTERISK BAN: Never put asterisks around "overstood" (never write *overstood*). Keep all dialogue completely natural, clean, and in flow.
   • CLEAN & AUTHENTIC: No repetitive catchphrases, no corporate robotic filler, no patronizing lecturing. Keep your cadence authentic, grounded, and sharp.

4. GRAYSON'S DETECTED TONE OF VOICE & MINDSET (BUILD DIRECTLY OFF OF THIS):
   • Detected Mood: "${tone.mood}" (Energy Cadence: ${tone.energy?.toUpperCase() || 'CALM'})
   • Mindset Summary: ${tone.summary || 'Grayson is moving forward with purpose.'}
   • HOW TO BUILD OFF HIS TONE: ${tone.toneDirective || 'Match his energy authentically. If he sounds fired up, match his intensity. If stressed, give crisp supportive clarity. Never sound generic or patronizing.'}
   • Tone Responsiveness: Always listen to how Grayson speaks and what he's feeling. If he's energized and ambitious, amplify his momentum. If he's overwhelmed with coursework or life pressure, provide grounded, steady, laser-sharp steps.

5. THINGS GRAYSON CURRENTLY NEEDS (KEEP TOP OF MIND & SOLVE PROACTIVELY):
${needsSummary}

6. THINGS GRAYSON HAS SAID & HIS AUTHENTIC CONVICTIONS:
${quotesSummary}

7. GRAYSON'S WRITING RULES & AUTHENTIC VOICE (AUTOMATICALLY APPLIED TO ALL REASONING & ESSAYS):
${writingRulesSummary}
• Student Profile: Grayson Morris Russell, 32 years old, Dallas, Texas
• Degree: ${profile.degree || 'B.S. in Business (Online)'}
• Mission: ${profile.longTermGoal || 'Own independent businesses and create generational wealth for family'}

8. FOUNDATIONAL BASELINE MEMORIES:
${baseSummary}

9. NEW MEMORIES YOU HAVE GROWN & LEARNED OVER TIME:
${grownSummary}

10. THINK INDEPENDENTLY & CRITICALLY:
   - Think for yourself. Never be a passive yes-man.
   - Challenge weak assumptions with respect and truth. Formulate independent strategy.
   - Point out unseen blind spots and propose fresh proactive ideas before he has to ask.

11. ANSWER ANYTHING GRAYSON ASKS:
   - Answer ANY and EVERY question Grayson asks without avoidance, hesitation, or preachy corporate lectures.
   - Whether it's college coursework, business planning, Texas LLC laws, financial math, marketing, contracts, personal relationships, mental fortitude, parole navigation, or raw life philosophy: give him direct, complete, practical answers.

12. DEEPSEEK-STYLE INFORMATIVE RESEARCH & VISION (DIRECT KNOWLEDGE, NOT LINKS):
   - When Grayson asks you to research something, search the internet, or wants to learn something new:
     Your primary job is to DIRECTLY INFORM HIM with rich, comprehensive, beautifully structured knowledge—just like the DeepSeek app.
     Never dump links on him or tell him to "go visit these websites". Synthesize the findings into an in-depth breakdown with clear sections, history, mechanisms, facts, and explanations right here in the conversation.
   - When Grayson uploads an image or photo (e.g. asking "what is this place?", "where is this?", "what is this?"):
     Thoroughly inspect the image visually! Identify the exact landmark, building, city, geography, or object.
     State what and where it is, why it's famous, its history, architecture, interesting facts, and practical insights.
     Never respond with generic web links instead of identifying the image. Inform him thoroughly so he gets the complete answer right here.

13. UNBROKEN CONVERSATION CONTINUITY & PAST DISCUSSION MEMORY:
   - You remember last night's conversation with Grayson about the Kennedy assassination in Dallas, his thoughts about moving to a place like Jody for teaching jobs, and his boundary setting.
   - You remember his morning discussion about sleep paralysis and jinn, his strong mental fortitude, and his clear instruction on words: "overstood" is his slang for "okay, alright, I get it"—use it naturally when it fits, but do not force it into every reference, and never use asterisks.
   - Seamlessly continue topics, reference past questions, and NEVER say you forgot or don't know what he discussed.

${historicalRecallSection}
Recent Conversation History with ${room.toUpperCase()}:
${continuitySummary}
`;

  if (room === 'einstein') {
    // 100% of all memories connected to Einstein (school, coursework, writing, math, active goals, profile)
    const einsteinMemories = (db.memories || []).filter((m) => {
      const cat = (m.category || '').toLowerCase();
      const title = (m.title || '').toLowerCase();
      const content = (m.content || '').toLowerCase();
      return (
        cat === 'school' ||
        cat === 'growth' ||
        cat === 'identity' ||
        cat === 'goal' ||
        title.includes('school') ||
        title.includes('algebra') ||
        title.includes('writing') ||
        title.includes('essay') ||
        title.includes('paper') ||
        title.includes('course') ||
        title.includes('college') ||
        title.includes('astrophysics') ||
        title.includes('assignment') ||
        content.includes('algebra') ||
        content.includes('course') ||
        content.includes('college') ||
        content.includes('essay') ||
        content.includes('writing') ||
        content.includes('rubric') ||
        content.includes('submission') ||
        content.includes('learner') ||
        content.includes('degree') ||
        content.includes('homework')
      );
    });

    const einsteinMemoriesList = einsteinMemories.length > 0
      ? einsteinMemories.map((m) => `• [${m.category.toUpperCase()} MEMORY]: "${m.title}" -> ${m.content} (Source: ${m.source})`).join('\n')
      : '• Core schoolwork and academic goals active.';

    return `${coreUniversalDirective}

YOU ARE EINSTEIN:
- Primary Role & Focus: Master Academic Mentor, Critical Thinker & Dedicated Schoolwork Copilot for Grayson.
- Sole Mission: Grayson's SCHOOLWORK, HOMEWORK, COLLEGE COURSEWORK, AND ACADEMIC SUCCESS.

--- 🧠 100% OF ALL CONNECTED MEMORIES FOR EINSTEIN (SCHOOLWORK, COURSEWORK, WRITING RULES & ESSAYS) ---
[CRITICAL: Grayson explicitly connected these memories so that Einstein checks and goes off of ALL of them automatically]:
${einsteinMemoriesList}

MANDATORY DIRECTIVE — AUTOMATIC MEMORY AUDIT (APPLIED AUTOMATICALLY TO EVERY SINGLE MESSAGE & TASK):
- Grayson explicitly instructed that you MUST AUTOMATICALLY check and go off of ALL the memory connected to you on every single interaction!
- You do NOT wait for him to ask, remind you, or click anything. On every message, draft, homework problem, algebra question, or quick action:
  1. AUTOMATICALLY AUDIT ALL CONNECTED MEMORIES: Cross-reference every school and academic memory connected to you (algebra exponent formatting, astrophysics interest, essay writing, college portal submission standards).
  2. AUTOMATICALLY AUDIT ALL 8 WRITING RULES: Short plain sentences, 10th-grade vocabulary, explain reasoning as you go, authentic phrases ("ins and outs", "putting pen to paper", "big push to keep going"), clean paragraph organization without erasing his natural voice, never sugarcoat.
  3. STRICT ANTI-AI-SLOP DEFENSE: Erase and ban all robotic AI words ("delve", "tapestry", "crucial beacon", "vital facet", "testament", "in conclusion", "furthermore", "paramount"). Keep it 100% human, grounded, direct, and unmistakably Grayson.
  4. AUTOMATICALLY AUDIT COURSE OBJECTIVES: Seamlessly align with Empowered Learner habits of success (SMART goals, coping with overwhelming schedules, personal accountability) and Effective Communication Skills.
  5. SLANG COMPLIANCE: Use his personal slang "overstood" naturally where fitting as "okay, got it", never with asterisks, and never forced into every sentence.
- When formatting drafts, essays, or coursework, ALWAYS provide:
  1. "### 📝 Submission-Ready College Draft" (ready to paste directly into Canvas/Blackboard).
  2. "### 🛡️ Automatic Memory & Coursework Audit" (2-3 short, sharp bullets detailing every memory, writing rule, and rubric requirement checked and applied).

- Academic Research on the Internet:
  * You can actively research textbooks, scientific discoveries, academic papers, historical events, mathematical methods, and educational resources across the internet.
  * When Grayson wants to learn about any topic, concept, subject, or question, go research it on the web, break it down clearly step-by-step, and explain it with crystal-clear academic depth and citations.

- Academic Capabilities:
  * College Coursework & Homework: Break down complex academic concepts, solve assignments step-by-step, explain textbook readings, prepare for exams and quizzes.
  * Writing & Essays for Grayson:
    - Help him outline, draft, revise, and polish college essays, research papers, discussion board posts, and rough drafts.
    - Preserve his authentic voice: short, plain, punchy sentences, natural 10th-grade vocabulary.
    - Organize into clean, coherent paragraphs with clear topic sentences and logical flow.
    - Keep his real personal details and natural phrases ("ins and outs", "putting pen to paper", "big push to keep going").
    - Fix grammar, comma splices, sentence structure, mechanics, and citations (APA/MLA/Chicago) cleanly without sounding like generic, robotic AI slop.

- SPECIALIZED COLLEGE SUBMISSION FORMATTER (POWERED BY 100% OF GRAYSON'S CONNECTED MEMORY BANK):
  * When Grayson clicks "Format for College Submission", uses the quick button, or asks you to format/polish an assignment, rough draft, essay, or discussion post:
    1. EXHAUSTIVE MEMORY & PROFILE AUDIT:
       - Actively audit and pull from ALL of Grayson's connected memories:
         • His Profile: 32-year-old from Dallas, Texas, B.S. in Business online degree, family-oriented, balancing college with life grind and parole navigation, working every single day to create generational wealth.
         • His Writing Rules: Short plain sentences, 10th-grade vocabulary, explain reasoning as you go, authentic phrases ("ins and outs", "putting pen to paper", "big push to keep going"), clean paragraph organization without erasing his natural voice, never sugarcoat.
         • His Active Courses: Empowered Learner (Habits of Success, SMART goals, managing overwhelming schedules, personal accountability), Effective Communication Skills (audience awareness, clean communication maps).
         • Natural Slang: "overstood" used naturally where fitting as "okay, got it", never with asterisks.
    2. STRICT ANTI-AI-SLOP DEFENSE:
       - College professors and AI detectors flag robotic AI words ("delve", "tapestry", "crucial beacon", "vital facet", "testament", "in conclusion", "furthermore", "paramount").
       - BAN all such filler words. The submission must read 100% human, grounded, direct, and unmistakably Grayson.
    3. STRUCTURE & PORTAL READINESS:
       - Format into clean, distinct paragraphs with clear spacing so it can be pasted straight into Canvas/Blackboard.
       - Use clear topic sentences and step-by-step reasoning.
    4. CLEAR OUTPUT SECTIONS:
       - Section 1: "### 📝 Submission-Ready College Draft" (the clean, finalized submission).
       - Section 2: "### 🛡️ Automatic Memory & Rubric Audit" (2-3 short, sharp bullets showing how his writing rules, reasoning, and course objectives were satisfied).
- Boundaries & Focus: Your focus is strictly Grayson's schoolwork and academic goals. If Grayson asks about anything non-academic, remind him warmly that Buzz is his chatbox for anything and God Mode is his command center for business ideas, projects, and encoding, while you are right here to ace his schoolwork.
- Memory Growth: Actively remember his courses, professor rubrics, syllabus deadlines, and academic milestones so his academic portfolio evolves continuously.`;
  }

  if (room === 'godmode') {
    return `${coreUniversalDirective}

YOU ARE GOD MODE:
- Primary Role & Focus: Grayson's Elite Command Center for BUSINESS IDEAS, PROJECTS, AND ENCODING (CODING / SOFTWARE ENGINEERING).
- Real-Time Market & Technical Research:
  * You can actively research current commercial trends, Texas LLC laws and state filings, competitor pricing, software documentation, API changes, and tech releases on the live internet.
  * When Grayson asks to research business strategies, tech stacks, or market opportunities, pull the freshest facts and deliver brutally honest, actionable analysis.
- The Three Pillars:
  1. BUSINESS IDEAS & COMMERCIAL STRATEGY:
     * Texas LLC formation, business structuring, corporate governance, contract reviews.
     * Monetization blueprints, financial modeling, pricing structures, cash-flow discipline, client acquisition.
     * Competitive analysis, market opportunities, and street-smart business execution.
  2. PROJECTS:
     * Project roadmaps, agile milestones, systems architecture, execution timelines.
     * Product launches, task prioritization, operational discipline, and delivering on commitments.
  3. ENCODING & CODE:
     * Full-stack software engineering, TypeScript, React, Node.js, Express, databases, REST APIs, Git.
     * Debugging, clean architectural design, script automation, algorithm optimization, and production-ready code.
     * Provide complete, runnable, tested code without cutting corners or placeholders.
- Personality & Execution:
  * Raw, unfiltered truth. Zero sugarcoating. Total brutal honesty.
  * God Mode thinks completely for itself. It sees through excuses, spots flaws in business strategies or technical designs, and demands ruthless execution.
- Memory Growth: Track his businesses, coding repositories, project milestones, and commercial victories over time.`;
  }

  // Buzz prompt
  return `${coreUniversalDirective}

YOU ARE BUZZ:
- Primary Role & Focus: Grayson's Go-To Chatbox for ANYTHING and EVERYTHING.
- Internet Research for Anything You Want to Learn:
  * You have the whole internet at your fingertips. If Grayson is curious about something, asks a question, or wants to learn something new—from current news, tech, music, sports, history, life hacks, travel, people, theories, or random facts—you can go research it on the web and bring back real answers.
- The "Talk About Whatever" Mandate:
  * Buzz is Grayson's open chat box for whatever is on his mind. There are NO topical restrictions whatsoever.
  * Whether Grayson wants to talk about daily life, what's happening right now, thoughts, feelings, relationships, music, sports, movies, random questions, crazy theories, personal reflections, venting, life advice, humor, or just shooting the breeze: you are his ultimate partner and sounding board.
  * If Grayson brings up something casual, roll with it naturally. If he brings up something deep, dive in with genuine interest and empathy.
- Personality & Tone:
  * Authentic, loyal, sharp, down-to-earth, engaging, and versatile.
  * Talk like an authentic brother-in-arms and trusted confidant who knows his background, his journey, and his drive.
  * Never lecture, never give sterile corporate responses, never act like a restricted bot. Talk about whatever Grayson wants to talk about with energy, humor, and heart.
- Memory Growth:
  * You remember everything Grayson shares with you across all conversations.
  * Reference his past stories, preferences, routines, and life details naturally so chatting with Buzz feels like talking to someone who truly knows him.`;
}

// ==========================================
// REAL-TIME CROSS-DEVICE SYNC HUB (SSE)
// ==========================================
const syncClients = new Set<Response>();

function broadcastSync(event: { type: string; [key: string]: any }) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of syncClients) {
    try {
      client.write(payload);
    } catch {
      syncClients.delete(client);
    }
  }
}

// ==========================================
// PERMANENT CHAT ARCHIVE & NON-DESTRUCTIVE MERGE ENGINE
// ==========================================
const CHAT_ARCHIVE_FILE = path.resolve(__dirname, 'src/data/chat_archive.json');

function readChatArchive(): Record<string, any> {
  try {
    if (fs.existsSync(CHAT_ARCHIVE_FILE)) {
      return JSON.parse(fs.readFileSync(CHAT_ARCHIVE_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('Archive read notice:', e);
  }
  return { buzz: [], einstein: [], godmode: [] };
}

function archiveChatTurns(room: string, newTurns: any[]) {
  try {
    const archive = readChatArchive();
    const existing = Array.isArray(archive[room]) ? archive[room] : [];
    const merged = mergeChatMessages(existing, newTurns);
    archive[room] = merged;
    archive.lastUpdated = Date.now();
    fs.writeFileSync(CHAT_ARCHIVE_FILE, JSON.stringify(archive, null, 2), 'utf8');
  } catch (err) {
    console.warn('Archive write error:', err);
  }
}

function mergeChatMessages(existing: any[] = [], incoming: any[] = []): any[] {
  const result: any[] = [];

  const addOrMerge = (m: any) => {
    if (!m) return;
    const mSender = m.sender || (m.role === 'model' ? 'ai' : 'user');
    const mText = (m.text || '').trim();
    const mTs = Number(m.timestamp) || Date.now();
    const mId = m.id || `msg-${mTs}-${result.length}`;

    // Look for duplicate in result list
    let matchIndex = -1;
    for (let i = result.length - 1; i >= 0; i--) {
      const item = result[i];
      // 1. Exact ID match
      if (item.id === mId) {
        matchIndex = i;
        break;
      }
      // 2. Exact sender + identical text match within time window
      if (item.sender === mSender && item.text.trim() === mText && mText.length > 0) {
        // AI messages: identical text within 15 minutes (900,000ms) is definitely a duplicate/echo
        if (mSender === 'ai') {
          if (Math.abs(item.timestamp - mTs) < 900000) {
            matchIndex = i;
            break;
          }
        } else {
          // User messages: identical text within 2 minutes (120,000ms) is a double-submit
          if (Math.abs(item.timestamp - mTs) < 120000) {
            matchIndex = i;
            break;
          }
        }
      }
    }

    if (matchIndex !== -1) {
      // Merge attributes into existing match without duplicating
      const ex = result[matchIndex];
      if (m.isVoice) ex.isVoice = true;
      if (m.audioData && !ex.audioData) ex.audioData = m.audioData;
      if (m.groundingMetadata && !ex.groundingMetadata) ex.groundingMetadata = m.groundingMetadata;
      if (m.attachment && !ex.attachment) ex.attachment = m.attachment;
      if (m.modelUsed && !ex.modelUsed) ex.modelUsed = m.modelUsed;
    } else {
      result.push({
        id: mId,
        sender: mSender,
        text: m.text || '',
        timestamp: mTs,
        attachment: m.attachment || null,
        isVoice: Boolean(m.isVoice),
        audioData: m.audioData || undefined,
        groundingMetadata: m.groundingMetadata || null,
        modelUsed: m.modelUsed || undefined,
      });
    }
  };

  // 1. Insert existing items
  for (const m of existing) {
    addOrMerge(m);
  }

  // 2. Merge incoming items
  for (const m of incoming) {
    addOrMerge(m);
  }

  // 3. Sort chronologically
  result.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  // 4. Final safety pass: remove any adjacent identical messages
  const sanitized: any[] = [];
  for (const item of result) {
    if (sanitized.length > 0) {
      const prev = sanitized[sanitized.length - 1];
      if (
        prev.sender === item.sender &&
        prev.text.trim() === item.text.trim() &&
        Math.abs((item.timestamp || 0) - (prev.timestamp || 0)) < 900000
      ) {
        if (item.isVoice) prev.isVoice = true;
        if (item.audioData && !prev.audioData) prev.audioData = item.audioData;
        if (item.groundingMetadata && !prev.groundingMetadata) prev.groundingMetadata = item.groundingMetadata;
        continue;
      }
    }
    sanitized.push(item);
  }

  return sanitized;
}

// Server-Sent Events endpoint for real-time live connection
app.get('/api/sync/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  syncClients.add(res);

  // Send initial handshake ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now(), clientsCount: syncClients.size })}\n\n`);

  // Heartbeat every 20 seconds to prevent mobile connection drops
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
      syncClients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    syncClients.delete(res);
  });
});

// ==========================================
// DATABASE REST API ROUTES
// ==========================================

// Full database snapshot for instant initial sync across phone & laptop
app.get('/api/database/full-sync', (_req: Request, res: Response) => {
  try {
    const db = readDatabase();
    res.json({
      success: true,
      timestamp: Date.now(),
      data: {
        chatHistory: db.chatHistory,
        memories: db.memories,
        intelligenceState: db.intelligenceState,
        voiceConversations: db.voiceConversations,
        tasks: db.tasks || {},
        projects: db.projects || [],
        gallery: db.gallery || [],
        profile: db.profile,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get full database state
app.get('/api/database/state', (_req: Request, res: Response) => {
  try {
    const db = readDatabase();
    res.json(db);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Tasks Endpoints
app.get('/api/database/tasks', (_req: Request, res: Response) => {
  try {
    const db = readDatabase();
    res.json({ success: true, tasks: db.tasks || {} });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/database/tasks', (req: Request, res: Response) => {
  try {
    const { tasks } = req.body;
    const db = readDatabase();
    db.tasks = tasks && typeof tasks === 'object' ? tasks : {};
    writeDatabase(db);
    broadcastSync({ type: 'TASKS_UPDATED', tasks: db.tasks });
    res.json({ success: true, tasks: db.tasks });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Projects Endpoints
app.get('/api/database/projects', (_req: Request, res: Response) => {
  try {
    const db = readDatabase();
    res.json({ success: true, projects: db.projects || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/database/projects', (req: Request, res: Response) => {
  try {
    const { projects } = req.body;
    const db = readDatabase();
    db.projects = Array.isArray(projects) ? projects : [];
    writeDatabase(db);
    broadcastSync({ type: 'PROJECTS_UPDATED', projects: db.projects });
    res.json({ success: true, projects: db.projects });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Gallery Endpoints
app.get('/api/database/gallery', (_req: Request, res: Response) => {
  try {
    const db = readDatabase();
    res.json({ success: true, gallery: db.gallery || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/database/gallery', (req: Request, res: Response) => {
  try {
    const { gallery } = req.body;
    const db = readDatabase();
    db.gallery = Array.isArray(gallery) ? gallery : [];
    writeDatabase(db);
    broadcastSync({ type: 'GALLERY_UPDATED', gallery: db.gallery });
    res.json({ success: true, gallery: db.gallery });
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
    broadcastSync({
      type: 'MEMORIES_UPDATED',
      memories: db.memories,
      intelligence: db.intelligenceState,
    });
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
    db.memories = (db.memories || []).filter((m) => m.id !== id);
    if (db.intelligenceState) {
      if (Array.isArray(db.intelligenceState.recentNeeds)) {
        db.intelligenceState.recentNeeds = db.intelligenceState.recentNeeds.filter((n) => n.id !== id);
      }
      if (Array.isArray(db.intelligenceState.coreStatements)) {
        db.intelligenceState.coreStatements = db.intelligenceState.coreStatements.filter((s) => s.id !== id);
      }
    }
    writeDatabase(db);
    broadcastSync({
      type: 'MEMORIES_UPDATED',
      memories: db.memories,
      intelligence: db.intelligenceState,
    });
    res.json({ success: true, count: db.memories.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all connected memories and writing rules for Einstein
app.get('/api/database/einstein-memories', (_req: Request, res: Response) => {
  try {
    const db = readDatabase();
    const einsteinMemories = (db.memories || []).filter((m) => {
      const cat = (m.category || '').toLowerCase();
      const title = (m.title || '').toLowerCase();
      const content = (m.content || '').toLowerCase();
      return (
        cat === 'school' ||
        cat === 'growth' ||
        cat === 'identity' ||
        cat === 'goal' ||
        title.includes('school') ||
        title.includes('algebra') ||
        title.includes('writing') ||
        title.includes('essay') ||
        title.includes('paper') ||
        title.includes('course') ||
        title.includes('college') ||
        title.includes('astrophysics') ||
        title.includes('assignment') ||
        content.includes('algebra') ||
        content.includes('course') ||
        content.includes('college') ||
        content.includes('essay') ||
        content.includes('writing') ||
        content.includes('rubric') ||
        content.includes('submission') ||
        content.includes('learner') ||
        content.includes('degree') ||
        content.includes('homework')
      );
    });

    const writingRules = Array.isArray(db.profile?.writingRules) ? db.profile.writingRules : [];
    res.json({
      success: true,
      totalConnected: einsteinMemories.length,
      connectedMemories: einsteinMemories,
      writingRules,
      profile: db.profile,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get current intelligence progression state
app.get('/api/database/intelligence', (_req: Request, res: Response) => {
  try {
    const db = readDatabase();
    res.json({
      success: true,
      intelligence: db.intelligenceState || DEFAULT_INTELLIGENCE_STATE,
      totalMemories: db.memories.length,
      voiceConversationsCount: (db.voiceConversations || []).length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add a need to intelligence state
app.post('/api/database/needs', (req: Request, res: Response) => {
  try {
    const { need, category } = req.body;
    if (!need || typeof need !== 'string' || !need.trim()) {
      return res.status(400).json({ error: 'Need text is required' });
    }
    const db = readDatabase();
    if (!db.intelligenceState) {
      db.intelligenceState = { ...DEFAULT_INTELLIGENCE_STATE };
    }
    if (!Array.isArray(db.intelligenceState.recentNeeds)) {
      db.intelligenceState.recentNeeds = [];
    }

    const newNeed: UserNeedItem = {
      id: `need-${Date.now()}`,
      need: need.trim(),
      category: category || 'personal',
      status: 'active',
      timestamp: Date.now(),
    };

    db.intelligenceState.recentNeeds.unshift(newNeed);
    db.intelligenceState.xp = (db.intelligenceState.xp || 180) + 20;
    db.intelligenceState.totalInsightsLearned = (db.intelligenceState.totalInsightsLearned || 6) + 1;
    writeDatabase(db);
    broadcastSync({
      type: 'MEMORIES_UPDATED',
      memories: db.memories,
      intelligence: db.intelligenceState,
    });
    res.json({ success: true, need: newNeed, intelligence: db.intelligenceState });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle or update need status
app.patch('/api/database/needs/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, need, category } = req.body;
    const db = readDatabase();
    if (!db.intelligenceState || !Array.isArray(db.intelligenceState.recentNeeds)) {
      return res.status(404).json({ error: 'No needs found' });
    }
    const target = db.intelligenceState.recentNeeds.find((n) => n.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Need not found' });
    }
    if (status) target.status = status;
    if (need) target.need = need;
    if (category) target.category = category;
    writeDatabase(db);
    broadcastSync({
      type: 'MEMORIES_UPDATED',
      memories: db.memories,
      intelligence: db.intelligenceState,
    });
    res.json({ success: true, need: target, intelligence: db.intelligenceState });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a need
app.delete('/api/database/needs/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = readDatabase();
    if (db.intelligenceState && Array.isArray(db.intelligenceState.recentNeeds)) {
      db.intelligenceState.recentNeeds = db.intelligenceState.recentNeeds.filter((n) => n.id !== id);
    }
    db.memories = (db.memories || []).filter((m) => m.id !== id);
    writeDatabase(db);
    broadcastSync({
      type: 'MEMORIES_UPDATED',
      memories: db.memories,
      intelligence: db.intelligenceState,
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add a statement
app.post('/api/database/statements', (req: Request, res: Response) => {
  try {
    const { quote, context } = req.body;
    if (!quote || typeof quote !== 'string' || !quote.trim()) {
      return res.status(400).json({ error: 'Quote text is required' });
    }
    const db = readDatabase();
    if (!db.intelligenceState) {
      db.intelligenceState = { ...DEFAULT_INTELLIGENCE_STATE };
    }
    if (!Array.isArray(db.intelligenceState.coreStatements)) {
      db.intelligenceState.coreStatements = [];
    }
    const newStmt: UserStatementItem = {
      id: `stmt-${Date.now()}`,
      quote: quote.trim(),
      context: context ? context.trim() : 'Personal conviction',
      timestamp: Date.now(),
    };
    db.intelligenceState.coreStatements.unshift(newStmt);
    db.intelligenceState.xp = (db.intelligenceState.xp || 180) + 20;
    db.intelligenceState.totalInsightsLearned = (db.intelligenceState.totalInsightsLearned || 6) + 1;
    writeDatabase(db);
    broadcastSync({
      type: 'MEMORIES_UPDATED',
      memories: db.memories,
      intelligence: db.intelligenceState,
    });
    res.json({ success: true, statement: newStmt, intelligence: db.intelligenceState });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a statement
app.delete('/api/database/statements/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = readDatabase();
    if (db.intelligenceState && Array.isArray(db.intelligenceState.coreStatements)) {
      db.intelligenceState.coreStatements = db.intelligenceState.coreStatements.filter((s) => s.id !== id);
    }
    db.memories = (db.memories || []).filter((m) => m.id !== id);
    writeDatabase(db);
    broadcastSync({
      type: 'MEMORIES_UPDATED',
      memories: db.memories,
      intelligence: db.intelligenceState,
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger full memory synthesis & growth scan across conversations
app.post('/api/database/synthesize-growth', async (_req: Request, res: Response) => {
  try {
    const db = readDatabase();
    const recentVoiceTurns = (db.voiceConversations || []).slice(0, 8).map((v) => ({
      sender: 'user',
      text: `[Voice Session with ${v.room?.toUpperCase() || 'BUZZ'}]: "${v.transcript}" -> Reply: "${v.aiResponse || ''}"`,
    }));

    const allRecentChats = [
      ...(db.chatHistory.buzz || []).slice(-10),
      ...(db.chatHistory.einstein || []).slice(-10),
      ...(db.chatHistory.godmode || []).slice(-10),
      ...recentVoiceTurns,
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

    const synthRes = await callAiText({
      prompt: synthesisPrompt,
      systemInstruction: 'You are a synthesis engine returning strict JSON.',
      jsonMode: true,
      thinkingMode: 'normal',
      room: 'buzz',
    });
    const resultText = synthRes?.text;

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
            broadcastSync({
              type: 'MEMORIES_UPDATED',
              memories: db.memories,
              intelligence: db.intelligenceState,
            });
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

// Map rooms to standard Gemini prebuilt voices
const ROOM_VOICE_MAP: Record<string, string> = {
  buzz: 'Zephyr',       // Dynamic, sharp, energetic executive assistant
  einstein: 'Puck',     // Articulate, scholarly academic mentor
  godmode: 'Fenrir',    // Deep, assertive, unfiltered truth
  general: 'Kore',      // Balanced, clear, warm
};

const VALID_GEMINI_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

// Generate TTS audio via Gemini neural speech models
async function generateGeminiSpeech(text: string, voiceName: string, styleInstruction?: string): Promise<string | null> {
  const ai = getAi();
  if (!ai || !text.trim()) return null;

  const cleanedText = text
    .replace(/[*#_`~>\[\]\(\)]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1000);

  const chosenVoice = VALID_GEMINI_VOICES.includes(voiceName) ? voiceName : 'Zephyr';

  // Try flash-tts first, fallback to flash-lite-tts
  for (const ttsModel of ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts']) {
    try {
      const response = await ai.models.generateContent({
        model: ttsModel,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanedText,
                speechMetadata: {
                  style: styleInstruction || 'Natural, direct, conversational spoken tone',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return `data:audio/wav;base64,${base64Audio}`;
      }
    } catch (err: any) {
      console.warn(`[Gemini TTS] Model ${ttsModel} fallback:`, err?.status || err?.message);
    }
  }

  return null;
}

// Transcribe microphone audio recording with Gemini multimodal models
async function transcribeUserAudio(audioBase64: string, mimeType: string = 'audio/webm'): Promise<string | null> {
  const ai = getAi();
  if (!ai || !audioBase64) return null;

  // Reliably strip any data URI prefix regardless of semicolon parameters like ;codecs=opus
  const commaIndex = audioBase64.indexOf(',');
  const cleanBase64 = (commaIndex !== -1 ? audioBase64.substring(commaIndex + 1) : audioBase64).trim();
  if (!cleanBase64 || cleanBase64.length < 30) return null;

  // Clean mime type (remove codecs or extra parameters)
  let cleanMime = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
  if (!cleanMime.startsWith('audio/')) {
    cleanMime = 'audio/webm';
  }

  // Model selection: gemini-3.5-transcribe first (dedicated audio transcription model), fallback to gemini-3.1-flash-lite and gemini-3.8-flash
  for (const transModel of ['gemini-3.5-transcribe', 'gemini-3.1-flash-lite', 'gemini-3.8-flash']) {
    try {
      const res = await ai.models.generateContent({
        model: transModel,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: cleanMime,
                  data: cleanBase64,
                },
              },
              {
                text: 'Transcribe verbatim the spoken English words in this audio clip. Return ONLY the exact spoken transcription. If the clip contains silence, background noise, or no recognizable speech, respond with EMPTY.',
              },
            ],
          },
        ],
      });

      const transcribed = res.text?.trim();
      if (
        transcribed &&
        transcribed.length > 0 &&
        !transcribed.toUpperCase().includes('EMPTY') &&
        !transcribed.toLowerCase().includes('no speech') &&
        !transcribed.toLowerCase().includes('please provide the audio')
      ) {
        return transcribed;
      }
    } catch (e: any) {
      console.warn(`[transcribeUserAudio] Model ${transModel} fallback:`, e?.status || e?.message);
    }
  }

  return null;
}

// Standalone transcription endpoint
app.post('/api/voice/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioData, audioMimeType } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required' });
    }
    const transcript = await transcribeUserAudio(audioData, audioMimeType);
    return res.json({ success: true, transcript: transcript || '' });
  } catch (err: any) {
    console.warn('Transcription endpoint error:', err);
    return res.status(500).json({ error: err?.message, transcript: '' });
  }
});

// ==========================================
// LIVE VOICE TALK-BACK ENDPOINT
// ==========================================
app.post('/api/voice/talk', async (req: Request, res: Response) => {
  try {
    let { transcript, room = 'buzz', history = [], voiceName, audioData, audioMimeType } = req.body;

    // If transcript was not captured by client speech-to-text, transcribe raw recorded audio directly with Gemini
    if ((!transcript || typeof transcript !== 'string' || !transcript.trim()) && audioData) {
      const transcribed = await transcribeUserAudio(audioData, audioMimeType);
      if (transcribed) {
        transcript = transcribed;
      }
    }

    const targetRoom = (['buzz', 'einstein', 'godmode'].includes(room) ? room : 'buzz') as 'buzz' | 'einstein' | 'godmode';
    const chosenVoice = voiceName && VALID_GEMINI_VOICES.includes(voiceName)
      ? voiceName
      : ROOM_VOICE_MAP[targetRoom] || 'Zephyr';

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      if (audioData) {
        // Voice was recorded, but speech was quiet or unintelligible.
        // Respond warmly in character rather than returning an error status code.
        const friendlyFollowup = targetRoom === 'einstein'
          ? "I heard you speaking, Grayson, but couldn't quite make out the words. Say that one more time or write it down below!"
          : targetRoom === 'godmode'
            ? "I saw your audio come through, but didn't catch that clearly. Hit me with it again or type it below."
            : "I heard you speak, Grayson, but couldn't quite catch the exact words. Say that one more time or drop a note below!";

        let speechAudio: string | null = null;
        try {
          speechAudio = await generateGeminiSpeech(friendlyFollowup, chosenVoice);
        } catch (ttsErr) {
          console.warn('Fallback TTS error:', ttsErr);
        }

        return res.json({
          success: true,
          userTranscript: 'Voice audio captured',
          replyText: friendlyFollowup,
          audioData: speechAudio,
          room: targetRoom,
          voice: chosenVoice,
        });
      }

      return res.status(400).json({
        error: 'No speech was detected in your recording. Please speak clearly into your mic or use the quick text box below.',
      });
    }

    // Spoken voice directive with historical multi-year recall
    const baseSystemPrompt = buildSystemPrompt(targetRoom, transcript);
    const spokenDirective = `
CRITICAL SPOKEN VOICE STUDIO RULES:
- You are in the LIVE VOICE STUDIO actively talking back to Grayson Russell out loud.
- Answer what he said immediately, conversationally, directly, and in real time.
- Speak in first-person as your persona (${targetRoom.toUpperCase()}).
- DO NOT use markdown format, asterisks, bullet points, numbered lists, emojis, code blocks, or URLs—this output will be spoken aloud to him through audio.
- Keep the spoken response punchy and natural (typically 2 to 4 spoken sentences, ~35-70 words), direct and conversational, unless he explicitly asked you to read a longer draft or paper out loud.
- Never give passive disclaimers or canned robotic fillers. Talk to him like an authentic, razor-sharp partner right across the table.
`;
    const systemInstruction = `${baseSystemPrompt}\n${spokenDirective}`;

    // Construct conversational contents
    const contents: Array<{ role: 'user' | 'model'; parts: any[] }> = [];
    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(-6);
      for (const h of recent) {
        if (h.text && typeof h.text === 'string' && h.text.trim()) {
          contents.push({
            role: h.sender === 'ai' ? 'model' : 'user',
            parts: [{ text: h.text.trim() }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: transcript.trim() }],
    });

    const talkAiRes = await callAiText({
      systemInstruction,
      contents,
      room: targetRoom,
      thinkingMode: 'normal',
    });
    let replyText = talkAiRes?.text || '';

    if (!replyText || !replyText.trim()) {
      if (targetRoom === 'einstein') {
        replyText = "I hear you, Grayson. Let's break this down step-by-step and keep your schoolwork moving forward.";
      } else if (targetRoom === 'godmode') {
        replyText = "I'm right here. Let's cut straight to the point and execute without hesitation.";
      } else {
        replyText = "Got it Grayson. I've noted that down and I'm right here with you. What's our next move?";
      }
    }

    // Clean markdown punctuation that sounds odd when read aloud
    const cleanSpokenText = replyText
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .trim();

    // Generate speech audio
    let voiceStyle = 'Conversational, natural, and energetic';
    if (targetRoom === 'godmode') voiceStyle = 'Deep, assertive, confident, and direct';
    if (targetRoom === 'einstein') voiceStyle = 'Articulate, calm, scholarly mentor';

    const speechAudioData = await generateGeminiSpeech(cleanSpokenText, chosenVoice, voiceStyle);

    // Trigger background memory growth with voice mode
    growMemoryFromInteraction(transcript, cleanSpokenText, targetRoom, true).catch((e) =>
      console.warn('Voice memory growth error:', e?.message)
    );

    // Auto-save voice dialogue exchange into database so voice conversations are preserved
    try {
      const db = readDatabase();
      const voiceTitle = `Voice Talk (${targetRoom.toUpperCase()}): "${transcript.slice(0, 32)}..."`;
      const voiceEntry: VoiceConversation = {
        id: `voice-talk-${Date.now()}`,
        title: voiceTitle,
        transcript,
        aiResponse: cleanSpokenText,
        dialogue: [
          { id: `d-user-${Date.now()}`, sender: 'user', text: transcript, timestamp: Date.now(), room: targetRoom },
          { id: `d-ai-${Date.now()}`, sender: 'ai', text: cleanSpokenText, timestamp: Date.now(), audioData: speechAudioData || undefined, room: targetRoom },
        ],
        summary: `Spoken dialogue with ${targetRoom.toUpperCase()}: ${transcript.slice(0, 80)}`,
        room: targetRoom,
        duration: Math.max(3, Math.round(transcript.split(' ').length * 0.4)),
        audioData: speechAudioData || undefined,
        keyTakeaways: [`Discussed via Live Voice Studio with ${targetRoom.toUpperCase()}`],
        timestamp: Date.now(),
      };
      if (!Array.isArray(db.voiceConversations)) {
        db.voiceConversations = [];
      }
      db.voiceConversations.unshift(voiceEntry);
      if (db.voiceConversations.length > 50) {
        db.voiceConversations = db.voiceConversations.slice(0, 50);
      }

      // Auto-mirror spoken turns into the chatbox for targetRoom so voice conversations are visible in chat
      if (['buzz', 'einstein', 'godmode'].includes(targetRoom)) {
        const userChatTurn = {
          id: `msg-voice-user-${Date.now()}`,
          sender: 'user',
          text: transcript,
          timestamp: Date.now(),
          attachment: null,
          isVoice: true,
        };
        const aiChatTurn = {
          id: `msg-voice-ai-${Date.now() + 1}`,
          sender: 'ai',
          text: cleanSpokenText,
          timestamp: Date.now() + 1,
          attachment: null,
          isVoice: true,
          audioData: speechAudioData || undefined,
        };

        if (!Array.isArray(db.chatHistory[targetRoom])) {
          db.chatHistory[targetRoom] = [];
        }
        db.chatHistory[targetRoom] = mergeChatMessages(db.chatHistory[targetRoom], [userChatTurn, aiChatTurn]);
        archiveChatTurns(targetRoom, [userChatTurn, aiChatTurn]);
      }

      writeDatabase(db);
      broadcastSync({
        type: 'VOICE_UPDATED',
        voiceConversations: db.voiceConversations,
      });
      if (['buzz', 'einstein', 'godmode'].includes(targetRoom)) {
        broadcastSync({
          type: 'CHAT_UPDATED',
          room: targetRoom,
          messages: db.chatHistory[targetRoom],
        });
      }
    } catch (saveVoiceErr: any) {
      console.warn('Auto voice conversation save note:', saveVoiceErr?.message);
    }

    const currentDb = readDatabase();

    return res.json({
      success: true,
      userTranscript: transcript,
      replyText: cleanSpokenText,
      audioData: speechAudioData,
      room: targetRoom,
      voice: chosenVoice,
      intelligence: currentDb.intelligenceState,
    });
  } catch (err: any) {
    console.error('Voice talk endpoint error:', err);
    res.status(500).json({
      error: err?.message,
      replyText: "I'm right here with you Grayson. Let's keep moving.",
      audioData: null,
    });
  }
});

// Standalone TTS endpoint
app.post('/api/voice/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Zephyr', room = 'buzz' } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    let style = 'Conversational and clear';
    if (room === 'godmode') style = 'Deep, firm, authoritative';
    if (room === 'einstein') style = 'Articulate academic mentor';

    const chosenVoice = VALID_GEMINI_VOICES.includes(voiceName) ? voiceName : 'Zephyr';
    const audioData = await generateGeminiSpeech(text, chosenVoice, style);
    return res.json({ success: true, audioData, voice: chosenVoice });
  } catch (err: any) {
    console.error('TTS endpoint error:', err);
    res.status(500).json({ error: err?.message, audioData: null });
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
    const { title, transcript, aiResponse, dialogue, room, duration, audioData, summary, keyTakeaways } = req.body;

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
      aiResponse: aiResponse || undefined,
      dialogue: Array.isArray(dialogue) ? dialogue : undefined,
      summary: summary || (aiResponse ? `Voice conversation with ${room || 'assistant'}` : transcript?.slice(0, 100)) || 'Voice recording session',
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
        title: `Voice Session: ${voiceEntry.title}`,
        content: aiResponse ? `Grayson: ${transcript}\nAssistant: ${aiResponse}` : transcript,
        source: 'voice_extracted',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    writeDatabase(db);
    broadcastSync({
      type: 'VOICE_UPDATED',
      voiceConversations: db.voiceConversations,
      memories: db.memories,
    });
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
    broadcastSync({
      type: 'VOICE_UPDATED',
      voiceConversations: db.voiceConversations,
    });
    res.json({ success: true, count: db.voiceConversations.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get chat history for room (Unifies text chats and spoken Voice Studio dialogues)
app.get('/api/database/chat/:room', (req: Request, res: Response) => {
  try {
    const { room } = req.params as { room: 'buzz' | 'einstein' | 'godmode' };
    if (!['buzz', 'einstein', 'godmode'].includes(room)) {
      return res.status(400).json({ error: 'Invalid room' });
    }
    const db = readDatabase();
    if (!db.chatHistory) db.chatHistory = { buzz: [], einstein: [], godmode: [] };
    const current = db.chatHistory[room] || [];

    // Gather any voice conversations for this room that aren't merged yet
    const voiceTurns: any[] = [];
    for (const vc of db.voiceConversations || []) {
      const isMatch = vc.room === room || (vc.title && vc.title.toUpperCase().includes(room.toUpperCase()));
      if (isMatch) {
        if (vc.dialogue && Array.isArray(vc.dialogue)) {
          for (const d of vc.dialogue) {
            voiceTurns.push({
              id: d.id || `msg-voice-${d.timestamp || vc.timestamp}-${voiceTurns.length}`,
              sender: d.sender || 'user',
              text: d.text || '',
              timestamp: d.timestamp || vc.timestamp || Date.now(),
              isVoice: true,
              audioData: d.audioData || undefined,
            });
          }
        } else {
          if (vc.transcript) {
            voiceTurns.push({
              id: `msg-voice-user-${vc.timestamp}`,
              sender: 'user',
              text: vc.transcript,
              timestamp: vc.timestamp,
              isVoice: true,
            });
          }
          if (vc.aiResponse) {
            voiceTurns.push({
              id: `msg-voice-ai-${vc.timestamp + 1}`,
              sender: 'ai',
              text: vc.aiResponse,
              timestamp: vc.timestamp + 1,
              isVoice: true,
              audioData: vc.audioData || undefined,
            });
          }
        }
      }
    }

    const merged = mergeChatMessages(current, voiceTurns);
    if (merged.length !== current.length) {
      db.chatHistory[room] = merged;
      writeDatabase(db);
      archiveChatTurns(room, merged);
    }

    res.json({ success: true, messages: merged });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sync chat history for room (Non-destructive merge, never overwrites past turns)
app.post('/api/database/chat/:room', (req: Request, res: Response) => {
  try {
    const { room } = req.params as { room: 'buzz' | 'einstein' | 'godmode' };
    const { messages } = req.body;

    if (!['buzz', 'einstein', 'godmode'].includes(room)) {
      return res.status(400).json({ error: 'Invalid room' });
    }

    const db = readDatabase();
    const existing = db.chatHistory?.[room] || [];
    const incoming = Array.isArray(messages) ? messages : [];

    // Safely merge incoming with existing so old messages are never clobbered
    const merged = mergeChatMessages(existing, incoming);

    db.chatHistory[room] = merged;
    writeDatabase(db);
    archiveChatTurns(room, merged);

    broadcastSync({
      type: 'CHAT_UPDATED',
      room,
      messages: merged,
    });
    res.json({ success: true, count: merged.length, messages: merged });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Append single message or turns without risk of array replacement
app.post('/api/database/chat/:room/append', (req: Request, res: Response) => {
  try {
    const { room } = req.params as { room: 'buzz' | 'einstein' | 'godmode' };
    const { message, messages } = req.body;

    if (!['buzz', 'einstein', 'godmode'].includes(room)) {
      return res.status(400).json({ error: 'Invalid room' });
    }

    const itemsToAppend = messages && Array.isArray(messages) ? messages : message ? [message] : [];
    if (itemsToAppend.length === 0) {
      return res.status(400).json({ error: 'No message provided' });
    }

    const db = readDatabase();
    const existing = db.chatHistory?.[room] || [];
    const merged = mergeChatMessages(existing, itemsToAppend);

    db.chatHistory[room] = merged;
    writeDatabase(db);
    archiveChatTurns(room, itemsToAppend);

    broadcastSync({
      type: 'CHAT_UPDATED',
      room,
      messages: merged,
    });
    res.json({ success: true, count: merged.length, messages: merged });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sync voice conversations for this persona directly into the chat room
app.post('/api/database/chat/:room/sync-voice', (req: Request, res: Response) => {
  try {
    const { room } = req.params as { room: 'buzz' | 'einstein' | 'godmode' };
    if (!['buzz', 'einstein', 'godmode'].includes(room)) {
      return res.status(400).json({ error: 'Invalid room' });
    }

    const db = readDatabase();
    const voiceTurns: any[] = [];
    for (const vc of db.voiceConversations || []) {
      const isMatch = vc.room === room || (vc.title && vc.title.toUpperCase().includes(room.toUpperCase()));
      if (isMatch) {
        if (vc.dialogue && Array.isArray(vc.dialogue)) {
          for (const d of vc.dialogue) {
            voiceTurns.push({
              id: d.id || `msg-voice-${d.timestamp || vc.timestamp}-${voiceTurns.length}`,
              sender: d.sender || 'user',
              text: d.text || '',
              timestamp: d.timestamp || vc.timestamp || Date.now(),
              isVoice: true,
              audioData: d.audioData || undefined,
            });
          }
        } else {
          if (vc.transcript) {
            voiceTurns.push({
              id: `msg-voice-user-${vc.timestamp}`,
              sender: 'user',
              text: vc.transcript,
              timestamp: vc.timestamp,
              isVoice: true,
            });
          }
          if (vc.aiResponse) {
            voiceTurns.push({
              id: `msg-voice-ai-${vc.timestamp + 1}`,
              sender: 'ai',
              text: vc.aiResponse,
              timestamp: vc.timestamp + 1,
              isVoice: true,
              audioData: vc.audioData || undefined,
            });
          }
        }
      }
    }

    const existing = db.chatHistory?.[room] || [];
    const merged = mergeChatMessages(existing, voiceTurns);
    db.chatHistory[room] = merged;
    writeDatabase(db);
    archiveChatTurns(room, merged);

    broadcastSync({
      type: 'CHAT_UPDATED',
      room,
      messages: merged,
    });

    res.json({ success: true, count: merged.length, messages: merged });
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
    broadcastSync({
      type: 'CHAT_UPDATED',
      room,
      messages: [],
    });
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
    let { room, messages, thinkingMode, webSearch, prompt } = req.body;

    if (!messages && prompt) {
      messages = [{ role: 'user', text: String(prompt) }];
    } else if (typeof messages === 'string') {
      messages = [{ role: 'user', text: messages }];
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array or prompt is required' });
    }

    const userLastMessage = messages[messages.length - 1]?.text || '';
    const systemInstruction = buildSystemPrompt(room || 'buzz', userLastMessage);

    // 1. Convert incoming messages into valid parts
    const rawContents: Array<{ role: 'user' | 'model'; parts: any[] }> = [];

    const recentMessages = messages.slice(-36);
    for (const msg of recentMessages) {
      const parts: any[] = [];

      if (msg.attachment?.isImage && msg.attachment?.data) {
        const rawBase64 = msg.attachment.data.includes(',')
          ? msg.attachment.data.split(',')[1]
          : msg.attachment.data;
        let mimeType = (msg.attachment.type || 'image/jpeg').split(';')[0].trim().toLowerCase();
        if (!mimeType.startsWith('image/')) {
          mimeType = 'image/jpeg';
        }
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
      } else if (msg.attachment?.isImage) {
        parts.push({
          text: 'Here is an uploaded image. Please inspect this image thoroughly and provide your insights, answer, or breakdown in your role.',
        });
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

    const shouldWebSearch = Boolean(webSearch) || detectResearchIntent(userLastMessage);

    // In-character fallback response powered by memory
    let fallbackText = '';
    if (room === 'einstein') {
      fallbackText = `I am thinking through this independently and keeping your memories updated. Regarding "${userLastMessage.slice(0, 50)}": I'll break it down with complete honesty and real academic depth. Ask me anything and we'll get it right.`;
    } else if (room === 'godmode') {
      fallbackText = `I see the angle you're playing, and here's my independent take: No sugarcoating, no hesitation. Ask me whatever you need and I will give you the raw truth to get to the bag.`;
    } else {
      fallbackText = `I've analyzed your question and checked our database memory. I'm ready to answer whatever you ask and think three steps ahead for you today.`;
    }

    try {
      let aiResult: AiTextResult | null = null;
      try {
        aiResult = await Promise.race([
          callAiText({
            systemInstruction,
            contents,
            room,
            thinkingMode,
            jsonMode: false,
            webSearch: shouldWebSearch,
          }),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('AI response timed out')), thinkingMode === 'deep' || shouldWebSearch ? 45000 : 30000)
          ),
        ]);
      } catch (raceErr: any) {
        console.warn('AI call error/timeout, using character fallback:', raceErr?.message);
      }

      const replyText = aiResult?.text || fallbackText;
      const grounding = aiResult?.grounding || null;

      // Sync complete dialogue (including AI reply) to database
      const db = readDatabase();
      const targetRoom = room as 'buzz' | 'einstein' | 'godmode';
      let aiMsg: any = null;
      if (room && ['buzz', 'einstein', 'godmode'].includes(room)) {
        const newTurns: any[] = [];

        // If client provided userMessage, include it
        if (req.body.userMessage && req.body.userMessage.text) {
          const uMsg = req.body.userMessage;
          newTurns.push({
            id: uMsg.id || `msg-${Date.now()}`,
            sender: 'user',
            text: uMsg.text,
            attachment: uMsg.attachment || null,
            timestamp: uMsg.timestamp || Date.now(),
          });
        }

        aiMsg = {
          id: `msg-${Date.now() + 1}`,
          sender: 'ai',
          text: replyText,
          timestamp: Date.now(),
          groundingMetadata: grounding,
          modelUsed: aiResult?.modelUsed || 'gemini-3.1-flash-lite',
        };
        newTurns.push(aiMsg);

        const currentHistory = Array.isArray(db.chatHistory[targetRoom]) ? db.chatHistory[targetRoom] : [];
        const deduped = mergeChatMessages(currentHistory, newTurns);

        db.chatHistory[targetRoom] = deduped;
        writeDatabase(db);
        archiveChatTurns(targetRoom, newTurns);

        // Real-time broadcast to all connected devices (phone & laptop)
        broadcastSync({
          type: 'CHAT_UPDATED',
          room: targetRoom,
          messages: deduped,
          latestMessage: aiMsg,
        });
      }

      // TRIGGER MEMORY GROWTH ASYNCHRONOUSLY IN BACKGROUND
      growMemoryFromInteraction(userLastMessage, replyText, room, false).catch((e) =>
        console.warn('Background memory growth error:', e?.message)
      );

      return res.json({
        success: true,
        text: replyText,
        grounding,
        modelUsed: aiResult?.modelUsed || 'gemini-3.1-flash-lite',
        intelligence: db.intelligenceState,
        message: aiMsg,
        messages: db.chatHistory[targetRoom] || [],
      });
    } catch (callError: any) {
      console.warn('Live AI call fallback:', callError?.message);
      return res.json({ text: fallbackText });
    }
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
