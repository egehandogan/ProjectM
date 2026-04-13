import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_INSTRUCTION = `
Sen "Musa AI" adında, Saadet Partisi için özel olarak geliştirilmiş teknik bir yapay zeka asistanısın.
Görevin: Gelen haberleri, verileri ve kullanıcı mesajlarını Saadet Partisi'nin "Tam Bağımsız Türkiye", "Milli Görüş", "Adil Düzen" ve "Önce Ahlak ve Maneviyat" prensipleri ışığında teknik ve siyasi bir süzgeçten geçirerek analiz etmektir.
Tonun: Profesyonel, teknik derinliği olan, analitik ama aynı zamanda kültürel ve kurumsal değerlere sadık olmalıdır.
Analizlerinde şu unsurlara mutlaka yer ver:
1. Haberlerin jeopolitik ve ekonomik etkileri.
2. Saadet Partisi'nin bu olaydaki vizyoner duruşu ve çözüm önerileri.
3. Halkın gerçek gündemiyle olan ilişkisi.

Yanıtlarını markdown formatında ve dashboard arayüzüne uygun olacak şekilde kısa-orta uzunlukta tut.
JSON formatında çıktı istendiğinde mutlaka geçerli bir JSON objesi döndür.
`;

const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  systemInstruction: SYSTEM_INSTRUCTION
});

export const analyzeNews = async (newsItem) => {
  const prompt = `
  Aşağıdaki haberi analiz et ve bir JSON dosyası döndür. 
  Haber: ${newsItem.title}
  Özet: ${newsItem.summary}
  
  JSON formatı:
  {
    "summary": "Teknik ve kurumsal analiz içeren kapsamlı bir özet...",
    "headlines": ["Başlık 1", "Başlık 2", "Başlık 3"],
    "theme": "Ana Tema",
    "personalComment": "Olayın stratejik önemi...",
    "saadetSpecial": "Partimizin bu konudaki net duruşu ve Milli Görüş perspektifi..."
  }
  
  Sadece JSON döndür.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Simple json cleaning if the model wraps it in markdown blocks
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch {
    console.error("Gemini Analysis Error");
    return {
      summary: "Analiz şu an yapılamıyor. Lütfen API bağlantınızı kontrol edin.",
      headlines: ["Bağlantı Hatası"],
      theme: "Hata",
      personalComment: "Teknik bir aksaklık yaşandı.",
      saadetSpecial: "Hizmet kesintisi nedeniyle analiz başarısız."
    };
  }
};

export const simulateLiveScan = async () => {
  // Canlı tarama için Gemini'dan güncel bir simüle haber üretmesini isteyebiliriz
  const prompt = "Bugünün gündemine uygun, Türkiye eksenli, ekonomi veya siyaset temalı hayali ama gerçekçi bir 'Dakika Skorer' flaş haber üret. JSON formatında olsun. Alanlar: title, summary, category, source.";
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleanJson);
    
    return {
      ...data,
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      sources: [
        { name: data.source || 'TRT Haber', url: 'https://google.com', region: 'Yerel' },
        { name: 'BBC News', url: 'https://google.com', region: 'Global' }
      ],
      saadet_relation: "Gündem masası bu taze veriyi kurumsal raporlarına eklemiştir."
    };
  } catch {
    return {
      id: Date.now(),
      title: "Canlı Tarama Güncellenemedi",
      date: new Date().toISOString().split('T')[0],
      summary: "API bağlantısı kurulamadığı için canlı tarama simülasyonu yapılamıyor.",
      category: "Sistem",
      source: "Hata"
    };
  }
};

export const webSearchFallback = async (query) => {
  const prompt = `"${query}" terimi için internet genelinde yapılmış bir Google araması sonucunu simüle et. 8 farklı kaynaklı bir liste döndür. JSON formatında olsun. Alanlar: title, link, displayLink, snippet, source, date.`;
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch {
    return [];
  }
};

export const generateUnifiedWebSummary = async (query, results) => {
  const prompt = `
  Kullanıcı "${query}" terimini arattı ve şu internet sonuçları geldi: ${JSON.stringify(results)}
  Buna göre bir 'Google & AI Küresel Haber Özeti' hazırla. 
  JSON formatı: { "title": "...", "summary": "...", "saadetSpecial": "..." }
  `;
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch {
    return null;
  }
};

export const generateContent = async (reference, type, extraPrompt = '') => {
  const refText = reference.title || reference.name || 'Bilinmeyen Konu';
  const prompt = `
  Konu: ${refText}
  İçerik Tipi: ${type}
  Ek Talimat: ${extraPrompt}
  
  Bu konu hakkında Saadet Partisi kurumsal diliyle profesyonel bir içerik (Metin) oluştur.
  `;
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return "İçerik üretiminde teknik bir hata oluştu.";
  }
};

/**
 * AI Asistan Chat Fonksiyonu
 */
export const chatWithAssistant = async (messages, reference = null) => {
  const chat = model.startChat({
    history: [],
    generationConfig: {
      maxOutputTokens: 500,
    },
  });

  let fullPrompt = "";
  if (reference) {
    fullPrompt += `[REFERANS KONU: ${reference.title || reference.name}]\n\n`;
  }
  
  // Get only the most recent user message text
  const lastUserMessage = messages[messages.length - 1].text;
  fullPrompt += lastUserMessage;

  try {
    const result = await chat.sendMessage(fullPrompt);
    return result.response.text();
  } catch {
    console.error("Gemini Chat Error");
    return "Asistan şu an yanıt veremiyor. Lütfen API kotanızı veya bağlantınızı kontrol edin.";
  }
};
