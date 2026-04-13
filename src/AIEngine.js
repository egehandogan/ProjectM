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

const SYSTEM_INSTRUCTION_TEXT = `
Sen "Musa AI" adında, Saadet Partisi için özel olarak geliştirilmiş teknik bir yapay zeka asistanısın.

Görevin:
• Gelen haberleri, verileri ve kullanıcı mesajlarını; "Tam Bağımsız Türkiye", "Milli Görüş", "Adil Düzen" ve "Önce Ahlak ve Maneviyat" prensipleri ışığında analiz etmek.
• Basın bülteni, sosyal medya içeriği, siyasi analiz ve konuşma metni üretmek.
• Dashboard üzerindeki haberler, takvim etkinlikleri ve web araması sonuçlarını yorumlamak.

Ton: Profesyonel, teknik derinliği olan, analitik; aynı zamanda kültürel ve kurumsal değerlere sadık.

Analizlerde mutlaka:
1. Haberlerin jeopolitik ve ekonomik etkileri
2. Saadet Partisi'nin vizyoner duruşu ve çözüm önerileri
3. Halkın gerçek gündemiyle olan ilişkisi

• Sohbet yanıtlarını sade Türkçeyle yaz; markdown kullanabilirsin ama aşırıya kaçma.
• JSON formatı istendiğinde SADECE geçerli JSON döndür, kod blokları kullanma.
`;

/* ─────────────────────────────────────────────
   YARDIMCI: Gemini için Geçmişi Temizle
───────────────────────────────────────────────*/
const cleanHistoryForGemini = (messages) => {
  const history = [];
  let lastRole = null;

  for (const msg of messages) {
    if (!msg.text || msg.text.trim() === "") continue;

    // Gemini rolleri: 'user' veya 'model'
    const role = msg.role === 'user' ? 'user' : 'model';

    // 1. Kural: İlk mesaj 'user' olmalı
    if (history.length === 0 && role !== 'user') continue;

    // 2. Kural: Roller ardışık olmamalı (user-model-user...)
    if (role === lastRole) {
      // Aynı rol gelirse metni birleştir
      history[history.length - 1].parts[0].text += "\n" + msg.text;
    } else {
      history.push({ role, parts: [{ text: msg.text }] });
      lastRole = role;
    }
  }

  // 3. Kural: Geçmiş daima 'model' ile bitmeli (çünkü biz peşine yeni bir 'user' mesajı göndereceğiz)
  // Eğer geçmiş 'user' ile bitiyorsa, Gemini startChat'te hata verebilir eğer sendMessage ile devam edilecekse.
  // Aslında startChat(history) + sendMessage(prompt) yaparken history 'model' ile BİTEBİLİR veya boş olabilir.
  // Eğer history 'user' ile bitiyorsa, sendMessage(prompt) yapınca iki tane 'user' üst üste binmiş olur.
  
  if (history.length > 0 && history[history.length - 1].role === 'user') {
    // Son mesaj user ise, onu geçmişten çıkarıp prompt olarak göndermek daha sağlıklı olabilir
    // Ama biz App.jsx'ten gelen prompt'u kullanacağız. Bu yüzden geçmişi model ile bitirmeye zorlayalım.
    // Şimdilik sadece user-model çiftlerini tutalım.
    // history.pop(); // alternatif
  }

  return history;
};

/* ─────────────────────────────────────────────
   CHAT (FALLBACK DESTEKLİ)
───────────────────────────────────────────────*/
export const chatWithAssistant = async (messages, reference = null, onChunk = null) => {
  const lastMsg = messages[messages.length - 1];
  const prompt = reference 
    ? `[REFERANS: ${reference.title || reference.name}]\n\n${lastMsg.text}`
    : lastMsg.text;

  // Gemini Denemesi
  if (genAI) {
    try {
      const history = cleanHistoryForGemini(messages.slice(0, -1));
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: SYSTEM_INSTRUCTION_TEXT
      });

      const chat = model.startChat({ history });

      if (onChunk) {
        const stream = await chat.sendMessageStream(prompt);
        let full = "";
        for await (const chunk of stream.stream) {
          const chunkText = chunk.text();
          full += chunkText;
          onChunk(chunkText, full);
        }
        return full;
      } else {
        const result = await chat.sendMessage(prompt);
        return result.response.text();
      }
    } catch (err) {
      console.error("Gemini Error:", err);
      // Fallback'e git...
    }
  }

  // OpenAI Fallback
  if (openai) {
    try {
      const gptMessages = [
        { role: "system", content: SYSTEM_INSTRUCTION_TEXT },
        ...messages.map(m => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.text
        }))
      ];

      if (onChunk) {
        const stream = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: gptMessages,
          stream: true
        });
        let full = "";
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          full += content;
          onChunk(content, full);
        }
        return full;
      } else {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: gptMessages
        });
        return completion.choices[0].message.content;
      }
    } catch (err) {
      console.error("OpenAI Fallback Error:", err);
    }
  }

  return "⚠️ Üzgünüm, şu an hiçbir yapay zeka servisine (Google/OpenAI) ulaşılamıyor. Lütfen internetinizi veya API anahtarlarınızı kontrol edin.";
};

/* ─────────────────────────────────────────────
   GENEL ANALİZ (FALLBACK DESTEKLİ)
───────────────────────────────────────────────*/
const runGeneralAnalysis = async (prompt) => {
  // Gemini
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: SYSTEM_INSTRUCTION_TEXT
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      console.warn("Gemini General Analysis Error:", err);
    }
  }

  // OpenAI
  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION_TEXT },
          { role: "user", content: prompt }
        ]
      });
      return completion.choices[0].message.content;
    } catch (err) {
      console.error("OpenAI General Analysis Error:", err);
    }
  }

  throw new Error("Tüm servisler kapalı.");
};

const parseJsonSafe = (text) => {
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON PARSE ERROR:", text);
    throw e;
  }
};

export const analyzeNews = async (newsItem) => {
  const prompt = `Analiz et ve JSON dön: ${newsItem.title}\n${newsItem.summary}\n\nFormat:\n{"summary": "...", "headlines": ["..."], "theme": "...", "saadetSpecial": "..."}`;
  try {
    const res = await runGeneralAnalysis(prompt);
    return parseJsonSafe(res);
  } catch {
    return { summary: "Analiz başarısız.", headlines: ["Hata"], theme: "Hata", saadetSpecial: "Servis ulaşılamaz durumda." };
  }
};

export const generateContent = async (item, type) => {
  const prompt = `${item.title || item.name} hakkında ${type} yaz.`;
  try {
    return await runGeneralAnalysis(prompt);
  } catch {
    return "⚠️ İçerik üretilemedi.";
  }
};

export const simulateLiveScan = async () => {
  const prompt = `Flaş haber üret. JSON dön: {"title":"...","summary":"...","category":"...","source":"..."}`;
  try {
    const res = await runGeneralAnalysis(prompt);
    const data = parseJsonSafe(res);
    return { ...data, id: Date.now(), date: new Date().toISOString().split("T")[0], time: "Canlı" };
  } catch {
    return { id: 1, title: "Canlı Tarama Hatası", summary: "Haber çekilemedi.", category: "Sistem", source: "Hata" };
  }
};

export const webSearchFallback = async (q) => {
  const prompt = `"${q}" için 5 tane gerçekçi Google sonucu simüle et. JSON DİZİSİ dön: [{"title":"...","link":"...","snippet":"...","source":"..."}]`;
  try {
    const res = await runGeneralAnalysis(prompt);
    return parseJsonSafe(res);
  } catch {
    return [];
  }
};

export const generateUnifiedWebSummary = async (query, results) => {
  const prompt = `Soru: ${query}\nSonuçlar: ${JSON.stringify(results)}\nÖzetle. JSON DÖN: {"title":"...","summary":"...","saadetSpecial":"..."}`;
  try {
    const res = await runGeneralAnalysis(prompt);
    return parseJsonSafe(res);
  } catch {
    return null;
  }
};
