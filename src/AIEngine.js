import OpenAI from "openai";

// v2.0.1 - PURE REST IMPLEMENTATION (NO SDK)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const openai = OPENAI_API_KEY ? new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
}) : null;

const SYSTEM_INSTRUCTION_TEXT = `
Sen "Milli AI" adında, Saadet Partisi için özel olarak geliştirilmiş teknik bir yapay zeka asistanısın.
Görevin haberleri Milli Görüş prensipleriyle analiz etmek ve içerik üretmektir.
`;

const cleanHistoryForGemini = (messages) => {
  const history = [];
  let lastRole = null;
  for (const msg of messages) {
    if (!msg.text || msg.text.trim() === "") continue;
    const role = msg.role === 'user' ? 'user' : 'model';
    if (history.length === 0 && role !== 'user') continue;
    if (role === lastRole) {
      history[history.length - 1].parts[0].text += "\n" + msg.text;
    } else {
      history.push({ role, parts: [{ text: msg.text }] });
      lastRole = role;
    }
  }
  return history;
};

/* ─────────────────────────────────────────────
   PURE REST CALL (Direct to Google)
───────────────────────────────────────────────*/
const callGeminiDirect = async (prompt, history = [], model = "gemini-1.5-flash") => {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY eksik.");
  
  // v1beta sürümü flash-latest desteği için
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  
  const contents = [...history];
  contents.push({ role: "user", parts: [{ text: prompt }] });

  console.log(`[Milli AI REST] API ÇAĞRISI : ${model}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        contents,
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION_TEXT }] },
        generationConfig: { temperature: 0.7, topP: 0.95, topK: 40, maxOutputTokens: 2048 }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("[Milli AI REST] HATA:", data);
    throw new Error(data.error?.message || "Bağlantı hatası");
  }

  return data.candidates[0].content.parts[0].text;
};

/* ─────────────────────────────────────────────
   CHAT WITH ASSISTANT
───────────────────────────────────────────────*/
export const chatWithAssistant = async (messages, reference = null, onChunk = null) => {
  const lastMsg = messages[messages.length - 1];
  const promptPrefix = reference ? `[REFERANS: ${reference.title || reference.name}]\n\n` : "";
  const finalPrompt = promptPrefix + lastMsg.text;
  const history = cleanHistoryForGemini(messages.slice(0, -1));

  try {
     const result = await callGeminiDirect(finalPrompt, history, "gemini-1.5-flash");
     if (onChunk) onChunk(result, result);
     return result;
  } catch (err) {
     console.warn("[Milli AI] Flash başarısız, Pro deneniyor...", err);
     try {
        const result = await callGeminiDirect(finalPrompt, history, "gemini-pro");
        if (onChunk) onChunk(result, result);
        return result;
     } catch (err2) {
        console.error("[Milli AI] Tüm hatlar kapalı.");
        return "⚠️ Milli AI şu an ulaşılamıyor. Lütfen API anahtarınızı kontrol edin.";
     }
  }
};

/* ─────────────────────────────────────────────
   ANALYSIS / CONTENT / SCAN
───────────────────────────────────────────────*/
const runQuickAnalysis = async (prompt) => {
    try {
        return await callGeminiDirect(prompt, [], "gemini-1.5-flash");
    } catch {
        return await callGeminiDirect(prompt, [], "gemini-pro");
    }
};

const parseJsonSafe = (text) => {
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    } catch { return null; }
};

export const analyzeNews = async (newsItem) => {
  const prompt = `Haber Analizi JSON formatında dön: ${newsItem.title}\n${newsItem.summary}\nFormat: {"summary":"...","headlines":["..."],"theme":"...","saadetSpecial":"..."}`;
  try {
    const res = await runQuickAnalysis(prompt);
    return parseJsonSafe(res) || { summary: "Analiz yapılamadı.", headlines: ["Hata"], theme: "Bağlantı", saadetSpecial: "Hata" };
  } catch {
    return { summary: "Bağlantı hatası.", headlines: ["Hata"], theme: "Hata", saadetSpecial: "Hata" };
  }
};

export const generateContent = async (item, type) => {
  try {
    return await runQuickAnalysis(`${item.title || item.name} hakkında ${type} yaz.`);
  } catch {
    return "⚠️ İçerik üretilemedi.";
  }
};

export const simulateLiveScan = async () => {
  console.log("🔍 [Milli AI] v2.0.1 Haber Taraması...");
  try {
    const searchResults = await webSearchFallback("Türkiye son dakika haber");
    const prompt = `En güncel haberi seç ve JSON dön: ${JSON.stringify(searchResults.slice(0,2))}`;
    const aiRes = await runQuickAnalysis(prompt);
    const data = parseJsonSafe(aiRes);
    return { ...data, id: Date.now(), date: new Date().toISOString().split("T")[0] };
  } catch {
    return { id: 1, title: "Haber Çekilemedi", summary: "Bağlantı sorunu.", category: "Sistem", source: "Hata" };
  }
};

export const webSearchFallback = async (q) => {
  const prompt = `"${q}" için 3 gerçekçi haber sonucu simüle et. JSON DİZİSİ dön. [{"title":"...","source":"...","snippet":"...","link":"..."}]`;
  try {
    const res = await runQuickAnalysis(prompt);
    return parseJsonSafe(res) || [];
  } catch { return []; }
};

export const generateUnifiedWebSummary = async (query, results) => {
  const prompt = `Soru: ${query}\nSonuçlar: ${JSON.stringify(results)}\nJSON DÖN: {"title":"...","summary":"...","saadetSpecial":"..."}`;
  try {
    const res = await runQuickAnalysis(prompt);
    return parseJsonSafe(res);
  } catch { return null; }
};
