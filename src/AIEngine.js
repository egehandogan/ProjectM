import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

/* ─────────────────────────────────────────────
   SYSTEM INSTRUCTION  (Musa AI kurumsal kimliği)
───────────────────────────────────────────────*/
const SYSTEM_INSTRUCTION = `
Sen "Musa AI" adında, Saadet Partisi için özel olarak geliştirilmiş teknik bir yapay zeka asistanısın.

Görevin:
• Gelen haberleri, verileri ve kullanıcı mesajlarını;
  "Tam Bağımsız Türkiye", "Milli Görüş", "Adil Düzen" ve "Önce Ahlak ve Maneviyat" 
  prensipleri ışığında analiz etmek.
• Basın bülteni, sosyal medya içeriği, siyasi analiz ve konuşma metni üretmek.
• Dashboard üzerindeki haberler, takvim etkinlikleri ve web araması sonuçlarını yorumlamak.

Ton: Profesyonel, teknik derinliği olan, analitik; aynı zamanda kültürel ve kurumsal değerlere sadık.

Analizlerde mutlaka:
1. Haberlerin jeopolitik ve ekonomik etkileri
2. Saadet Partisi'nin vizyoner duruşu ve çözüm önerileri
3. Halkın gerçek gündemiyle olan ilişkisi

• Sohbet yanıtlarını sade Türkçeyle yaz; markdown kullanabilirsin ama aşırıya kaçma.
• JSON formatı istendiğinde SADECE geçerli JSON döndür, başka metin ekleme.
`;

/* ─────────────────────────────────────────────
   MODEL TANIMLARI
───────────────────────────────────────────────*/
const chatModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: SYSTEM_INSTRUCTION,
  generationConfig: {
    maxOutputTokens: 2048,
    temperature: 0.7,
  },
});

const analysisModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: SYSTEM_INSTRUCTION,
  generationConfig: {
    maxOutputTokens: 1024,
    temperature: 0.4,
  },
});

/* ─────────────────────────────────────────────
   YARDIMCI: Gemini geçmiş formatına çevir
───────────────────────────────────────────────*/
const toGeminiHistory = (messages) => {
  // Skip the last message (it's the current user turn, sent separately)
  return messages.slice(0, -1).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));
};

/* ─────────────────────────────────────────────
   CHAT  (multi-turn, real history)
───────────────────────────────────────────────*/
export const chatWithAssistant = async (messages, reference = null, onChunk = null) => {
  const history = toGeminiHistory(messages);
  const lastUserMsg = messages[messages.length - 1].text;

  let prompt = "";
  if (reference) {
    prompt += `[REFERANS KONU: ${reference.title || reference.name}]\n\n`;
  }
  prompt += lastUserMsg;

  try {
    const chat = chatModel.startChat({ history });

    if (onChunk) {
      // Streaming mod
      const streamResult = await chat.sendMessageStream(prompt);
      let fullText = "";
      for await (const chunk of streamResult.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        onChunk(chunkText, fullText);
      }
      return fullText;
    } else {
      const result = await chat.sendMessage(prompt);
      return result.response.text();
    }
  } catch (err) {
    console.error("Gemini Chat Error:", err);
    return "⚠️ Asistan şu an yanıt veremiyor. API kotanızı veya bağlantınızı kontrol edin.";
  }
};

/* ─────────────────────────────────────────────
   HABER ANALİZİ
───────────────────────────────────────────────*/
export const analyzeNews = async (newsItem) => {
  const prompt = `
Aşağıdaki haberi analiz et ve SADECE geçerli bir JSON objesi döndür.

Haber Başlığı: ${newsItem.title}
Özet: ${newsItem.summary || ""}

JSON formatı:
{
  "summary": "Teknik ve kurumsal analiz içeren kapsamlı özet (3-4 paragraf)...",
  "headlines": ["Gösterge 1", "Gösterge 2", "Gösterge 3", "Gösterge 4"],
  "theme": "Ana Tema",
  "saadetSpecial": "Partimizin bu konudaki net duruşu ve Milli Görüş perspektifi..."
}
`;

  try {
    const result = await analysisModel.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch {
    return {
      summary: "Analiz şu an yapılamıyor. Lütfen API bağlantınızı kontrol edin.",
      headlines: ["Bağlantı Hatası"],
      theme: "Hata",
      saadetSpecial: "Hizmet kesintisi nedeniyle analiz başarısız.",
    };
  }
};

/* ─────────────────────────────────────────────
   CANLI TARAMA  (simüle haber üret)
───────────────────────────────────────────────*/
export const simulateLiveScan = async () => {
  const prompt = `Bugünün gündemine uygun, Türkiye eksenli, ekonomi veya siyaset temalı kısa ve gerçekçi bir flaş haber üret.
SADECE JSON döndür. Alanlar: title (string), summary (string), category (string), source (string).`;

  try {
    const result = await analysisModel.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleanJson);

    return {
      ...data,
      id: Date.now(),
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().split(" ")[0],
      sources: [
        { name: data.source || "TRT Haber", url: "https://trt.com.tr", region: "Yerel" },
        { name: "Anadolu Ajansı", url: "https://aa.com.tr", region: "Yerel" },
      ],
    };
  } catch {
    return {
      id: Date.now(),
      title: "Canlı Tarama Güncellenemedi",
      date: new Date().toISOString().split("T")[0],
      summary: "API bağlantısı kurulamadı.",
      category: "Sistem",
      source: "Hata",
    };
  }
};

/* ─────────────────────────────────────────────
   WEB ARAMA FALLBACK
───────────────────────────────────────────────*/
export const webSearchFallback = async (query) => {
  const prompt = `"${query}" için gerçekçi Google arama sonuçlarını simüle et. 8 farklı kaynak içeren bir JSON dizisi döndür.
Her eleman: { "id": number, "title": string, "link": string, "displayLink": string, "snippet": string, "source": string, "date": "YYYY-MM-DD" }
SADECE JSON dizisi döndür.`;

  try {
    const result = await analysisModel.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch {
    return [];
  }
};

/* ─────────────────────────────────────────────
   BÜTÜNLEŞIK WEB ÖZETİ
───────────────────────────────────────────────*/
export const generateUnifiedWebSummary = async (query, results) => {
  const prompt = `Kullanıcı "${query}" terimini aradı. Arama sonuçları: ${JSON.stringify(results.slice(0, 4))}
Bu verilerden "Google & AI Küresel Haber Özeti" hazırla.
SADECE JSON döndür: { "title": string, "summary": string, "saadetSpecial": string }`;

  try {
    const result = await analysisModel.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch {
    return null;
  }
};

/* ─────────────────────────────────────────────
   İÇERİK ÜRETME  (basın bülteni vb.)
───────────────────────────────────────────────*/
export const generateContent = async (reference, type, extraPrompt = "") => {
  const refText = reference.title || reference.name || "Bilinmeyen Konu";
  const prompt = `
Konu: ${refText}
İçerik Tipi: ${type}
Ek Talimat: ${extraPrompt || "Yok"}

Saadet Partisi kurumsal diliyle, hedef kitleye uygun profesyonel bir ${type} hazırla.
Türkçe yaz. Gereksiz tekrardan kaçın.
`;

  try {
    const result = await analysisModel.generateContent(prompt);
    return result.response.text();
  } catch {
    return "İçerik üretiminde teknik bir hata oluştu.";
  }
};
