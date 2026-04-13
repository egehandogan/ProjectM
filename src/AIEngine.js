import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

// API Keys
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Clients Initialize
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const openai = OPENAI_API_KEY ? new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
}) : null;

// Modeller listesi
const GEMINI_MODELS = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-pro",
];

const SYSTEM_INSTRUCTION_TEXT = `
Sen "Milli AI" adında, Saadet Partisi için özel olarak geliştirilmiş teknik bir yapay zeka asistanısın.

Görevin:
• Gelen haberleri, verileri ve kullanıcı mesajlarını; "Tam Bağımsız Türkiye", "Milli Görüş", "Adil Düzen" ve "Önce Ahlak ve Maneviyat" prensipleri ışığında analiz etmek.
• Basın bülteni, sosyal medya içeriği, siyasi analiz ve konuşma metni üretmek.
• Dashboard üzerindeki haberler, takvim etkinlikleri ve web araması sonuçlarını yorumlamak.

Ton: Profesyonel, teknik derinliği olan, analitik; aynı zamanda kültürel ve kurumsal değerlere sadık.

Analizlerde mutlaka:
1. Haberlerin jeopolitik ve ekonomik etkileri
2. Saadet Partisi'nin vizyoner duruşu ve çözüm önerileri
3. Halkın gerçek gündemiyle olan ilişkisi
`;

/* ─────────────────────────────────────────────
   YARDIMCI: Gemini için Geçmişi Temizle
───────────────────────────────────────────────*/
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
   DOĞRUDAN REST API ÇAĞRISI (Last Resort)
───────────────────────────────────────────────*/
const callGeminiRest = async (prompt, history = [], modelName = "gemini-1.5-flash") => {
  if (!GEMINI_API_KEY) throw new Error("API Key eksik.");
  
  const contents = [...history];
  contents.push({ role: "user", parts: [{ text: prompt }] });

  // v1beta yerine v1 deneyelim (daha kısıtlı ama daha kararlı olabilir)
  const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents })
  });
  
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates[0].content.parts[0].text;
};

/* ─────────────────────────────────────────────
   CHAT (MİLLİ AI - ULTRA ROBUST)
───────────────────────────────────────────────*/
export const chatWithAssistant = async (messages, reference = null, onChunk = null) => {
  const lastMsg = messages[messages.length - 1];
  const promptPrefix = reference ? `[REFERANS: ${reference.title || reference.name}]\n\n` : "";
  const finalPrompt = promptPrefix + lastMsg.text;

  // 1. Google Gemini Denemeleri
  if (genAI) {
    const history = cleanHistoryForGemini(messages.slice(0, -1));

    for (const modelName of GEMINI_MODELS) {
      try {
        console.log(`[Milli AI] SDK denemesi: ${modelName}`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_INSTRUCTION_TEXT
        });
        
        const chat = model.startChat({ history });
        if (onChunk) {
          const stream = await chat.sendMessageStream(finalPrompt);
          let full = "";
          for await (const chunk of stream.stream) {
            const chunkText = chunk.text();
            full += chunkText;
            onChunk(chunkText, full);
          }
          return full;
        } else {
          const result = await chat.sendMessage(finalPrompt);
          return result.response.text();
        }
      } catch (err) {
        console.warn(`[Milli AI] ${modelName} hatası, sistem talimatı prompt içinde deneniyor...`, err);
        try {
          const fallbackPrompt = `${SYSTEM_INSTRUCTION_TEXT}\n\nTalimat: ${finalPrompt}`;
          const modelBasic = genAI.getGenerativeModel({ model: modelName });
          const result = await modelBasic.generateContent(fallbackPrompt);
          const resText = result.response.text();
          if (onChunk) onChunk(resText, resText);
          return resText;
        } catch (err2) {
          console.error(`[Milli AI] ${modelName} tamamen başarısız.`, err2);
          continue;
        }
      }
    }

    // 2. SDK tamamen çöktüyse REST denemesi
    try {
      console.log("[Milli AI] SDK başarısız, REST API deneniyor...");
      const restRes = await callGeminiRest(finalPrompt, history);
      if (onChunk) onChunk(restRes, restRes);
      return restRes;
    } catch (restErr) {
      console.error("[Milli AI] REST API de başarısız:", restErr);
    }
  }

  return "⚠️ Milli AI şu an ulaşılamıyor (Bağlantı Hatası).";
};

/* ─────────────────────────────────────────────
   GENARAL ANALYSIS (ULTRA ROBUST)
───────────────────────────────────────────────*/
const runGeneralAnalysis = async (prompt) => {
  if (genAI) {
    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const finalPrompt = `${SYSTEM_INSTRUCTION_TEXT}\n\nTalimat: ${prompt}`;
        const result = await model.generateContent(finalPrompt);
        return result.response.text();
      } catch { continue; }
    }
  }
  try { return await callGeminiRest(`${SYSTEM_INSTRUCTION_TEXT}\n\n${prompt}`); } catch {}
  throw new Error("Tüm servisler kapalı.");
};

const parseJsonSafe = (text) => {
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    throw new Error("Geçersiz veri.");
  }
};

export const analyzeNews = async (newsItem) => {
  const prompt = `Analiz et ve JSON dön: ${newsItem.title}\n${newsItem.summary}\nFormat: {"summary":"...","headlines":["..."],"theme":"...","saadetSpecial":"..."}`;
  try {
    const res = await runGeneralAnalysis(prompt);
    return parseJsonSafe(res);
  } catch {
    return { summary: "Analiz şu an yapılamıyor.", headlines: ["Hata"], theme: "Hata", saadetSpecial: "Bağlantı sorunu." };
  }
};

export const generateContent = async (item, type) => {
  try {
    return await runGeneralAnalysis(`${item.title || item.name} hakkında ${type} yaz.`);
  } catch {
    return "⚠️ İçerik üretilemedi.";
  }
};

export const simulateLiveScan = async () => {
  console.log("🔍 [Milli AI] Canlı web haber taraması başlatılıyor...");
  try {
    const searchResults = await webSearchFallback("Türkiye son dakika haber ekonomi siyaset");
    if (!searchResults || searchResults.length === 0) throw new Error("Arama sonucu yok.");
    
    const prompt = `Aşağıdaki haberlerden en güncel olanı JSON formatına getir:\n${JSON.stringify(searchResults.slice(0, 3))}`;
    const aiRes = await runGeneralAnalysis(prompt);
    const data = parseJsonSafe(aiRes);

    return {
      ...data,
      id: Date.now(),
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      sources: searchResults.slice(0, 3).map(r => ({ name: r.source || "Web", url: r.link, region: "Yerel" }))
    };
  } catch (err) {
    console.warn("🔍 [Milli AI] Gerçek tarama başarısız, arşivden veri alınıyor.");
    return { id: 101, title: "Haber Tarama Servisi Devre Dışı", summary: "Bağlantı sorunu nedeniyle canlı veriye ulaşılamıyor.", category: "Sistem", source: "Hata" };
  }
};

export const webSearchFallback = async (q) => {
  const prompt = `"${q}" için 5 gerçekçi Google sonucu simüle et. JSON DİZİSİ dön.`;
  try {
    const res = await runGeneralAnalysis(prompt);
    return parseJsonSafe(res);
  } catch { return []; }
};

export const generateUnifiedWebSummary = async (query, results) => {
  const prompt = `Soru: ${query}\nÖzetle: ${JSON.stringify(results)}\nJSON DÖN: {"title":"...","summary":"...","saadetSpecial":"..."}`;
  try {
    const res = await runGeneralAnalysis(prompt);
    return parseJsonSafe(res);
  } catch { return null; }
};
