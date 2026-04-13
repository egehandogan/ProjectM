import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

// API Keys
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
  console.error("❌ Her iki API Key (Gemini ve OpenAI) eksik! Lütfen .env dosyanızı veya Vercel ayarlarınızı kontrol edin.");
}

// Clients Initialize
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "MISSING_KEY");
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY || "MISSING_KEY",
  dangerouslyAllowBrowser: true, // we allow it in client for this project
});

/* ─────────────────────────────────────────────
   SYSTEM INSTRUCTION  (Musa AI kurumsal kimliği)
───────────────────────────────────────────────*/
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
• JSON formatı istendiğinde SADECE geçerli JSON döndür, kod blokları kullanmamaya özen göster (sadece saf JSON mantıklı).
`;

/* ─────────────────────────────────────────────
   FALLBACK DESTEKLİ CHAT FONKSİYONU
───────────────────────────────────────────────*/
export const chatWithAssistant = async (messages, reference = null, onChunk = null) => {
  const lastUserMsg = messages[messages.length - 1].text;
  let prompt = "";
  if (reference) {
    prompt += `[REFERANS KONU: ${reference.title || reference.name}]\n\n`;
  }
  prompt += lastUserMsg;

  try {
    // ---- 1. DENEME: GEMINI ----
    const historyGemini = messages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));
    
    const chatModel = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION_TEXT,
      generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
    });

    const chat = chatModel.startChat({ history: historyGemini });

    if (onChunk) {
      const streamResult = await chat.sendMessageStream(prompt);
      let fullText = "";
      for await (const chunk of streamResult.stream) {
        fullText += chunk.text();
        onChunk(chunk.text(), fullText);
      }
      return fullText;
    } else {
      const result = await chat.sendMessage(prompt);
      return result.response.text();
    }
  } catch (geminiError) {
    console.warn("⚠️ Gemini Hatası, OpenAI GPT-4o-mini'ye geçiliyor...", geminiError);

    try {
      // ---- 2. DENEME: OPENAI FALLBACK ----
      const historyOpenAI = messages.slice(0, -1).map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));
      historyOpenAI.push({ role: "user", content: prompt });

      if (onChunk) {
        const stream = await openai.chat.completions.create({
          model: "gpt-4o-mini", // fast and economical
          messages: [
            { role: "system", content: SYSTEM_INSTRUCTION_TEXT },
            ...historyOpenAI
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: 2000
        });

        let fullText = "";
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            fullText += content;
            onChunk(content, fullText);
          }
        }
        return fullText;
      } else {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_INSTRUCTION_TEXT },
            ...historyOpenAI
          ],
          temperature: 0.7,
        });
        return completion.choices[0].message.content;
      }
    } catch (openaiError) {
      console.error("OpenAI Hatası:", openaiError);
      return "⚠️ Asistan şu an her iki yapay zeka (Google & OpenAI) ile de iletişim kuramıyor.";
    }
  }
};

/* ─────────────────────────────────────────────
   FALLBACK DESTEKLİ YARDIMCI GENEL FONKSİYON
───────────────────────────────────────────────*/
const generateFallback = async (promptText) => {
  try {
    // 1. Gemini
    const analysisModel = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION_TEXT,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.4 },
    });
    const result = await analysisModel.generateContent(promptText);
    return result.response.text();
  } catch (err) {
    console.warn("Gemini content err, falling back to OpenAI", err);
    // 2. OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION_TEXT },
        { role: "user", content: promptText }
      ],
      temperature: 0.4,
    });
    return completion.choices[0].message.content;
  }
};

const cleanJsonParse = (text) => {
  try {
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch(e) {
    console.error("JSON PARSE ERROR", text);
    throw e;
  }
}

/* ─────────────────────────────────────────────
   ÖZEL FONKSİYONLAR
───────────────────────────────────────────────*/

export const analyzeNews = async (newsItem) => {
  const prompt = `
Aşağıdaki haberi analiz et ve SADECE geçerli bir JSON objesi döndür. Düz metin kullanma.
Haber Başlığı: ${newsItem.title}
Özet: ${newsItem.summary || ""}

JSON formatı:
{
  "summary": "Teknik ve kurumsal analiz içeren kapsamlı özet (3-4 paragraf)...",
  "headlines": ["Gösterge 1", "Gösterge 2", "Gösterge 3", "Gösterge 4"],
  "theme": "Ana Tema",
  "saadetSpecial": "Partimizin bu konudaki net duruşu ve Milli Görüş perspektifi..."
}`;

  try {
    const text = await generateFallback(prompt);
    return cleanJsonParse(text);
  } catch {
    return {
      summary: "Analiz şu an yapılamıyor. Her iki AI servisi de yanıt veremiyor.",
      headlines: ["Sistem Hatası"],
      theme: "Hata",
      saadetSpecial: "Hizmet kesintisi nedeniyle analiz başarısız.",
    };
  }
};

export const simulateLiveScan = async () => {
  const prompt = `Bugünün gündemine uygun, Türkiye eksenli, ekonomi veya siyaset temalı kısa ve gerçekçi bir flaş haber üret.
SADECE JSON döndür, araya markdown sokuşturma. 
Alanlar (hepsi ingilizce anahtar): "title" (string), "summary" (string), "category" (string), "source" (string).`;

  try {
    const text = await generateFallback(prompt);
    const data = cleanJsonParse(text);
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

export const webSearchFallback = async (query) => {
  const prompt = `"${query}" için gerçekçi Google arama sonuçlarını simüle et. 8 farklı kaynak içeren SADECE BİR JSON DİZİSİ döndür. Liste başlama veya bitiş işareti dışında metin koyma.
Her eleman şunları içermeli: { "id": number, "title": string, "link": string, "displayLink": string, "snippet": string, "source": string, "date": "YYYY-MM-DD" }`;

  try {
    const text = await generateFallback(prompt);
    return cleanJsonParse(text);
  } catch {
    return [];
  }
};

export const generateUnifiedWebSummary = async (query, results) => {
  const prompt = `Kullanıcı "${query}" terimini aradı. Arama sonuçları: ${JSON.stringify(results.slice(0, 4))}
Bu verilerden "Google & AI Küresel Haber Özeti" hazırla.
SADECE JSON döndür: { "title": string, "summary": string, "saadetSpecial": string }`;

  try {
    const text = await generateFallback(prompt);
    return cleanJsonParse(text);
  } catch {
    return null;
  }
};

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
    return await generateFallback(prompt);
  } catch {
    return "⚠️ İçerik üretiminde teknik bir hata oluştu (Google & OpenAI devre dışı).";
  }
};
