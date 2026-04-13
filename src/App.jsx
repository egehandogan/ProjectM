import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Calendar as CalendarIcon, 
  Newspaper, 
  MessageSquare, 
  RefreshCw, 
  Search, 
  X,
  ExternalLink,
  Loader2,
  Send,
  Globe,
  ChevronRight,
  Info,
  TrendingUp,
  Bot,
  Sparkles,
  FileText
} from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, parseISO, isSameDay, startOfMonth, endOfMonth, isWithinInterval, getYear, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import Calendar from 'react-calendar';
import { TURKISH_SPECIAL_DAYS_2026, MOCK_NEWS } from './mockData';
import { analyzeNews, generateContent, simulateLiveScan, webSearchFallback, generateUnifiedWebSummary, chatWithAssistant } from './AIEngine';

const SOURCES = ['TRT Haber', 'Anadolu Ajansı', 'BBC News', 'CNN', 'Reuters', 'Bloomberg', 'Euronews', 'Al Jazeera'];

const App = () => {
  const [fullscreenPanel, setFullscreenPanel] = useState(null);
  const [news, setNews] = useState(() => {
    try {
      return [...MOCK_NEWS].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    } catch {
      return MOCK_NEWS;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [refreshTimer, setRefreshTimer] = useState(300);
  const [selectedCategory, setSelectedCategory] = useState('Hepsi');
  const [selectedYear] = useState('Hepsi');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState('Hepsi');
  const [searchQuery, setSearchQuery] = useState('');
  const [webResults, setWebResults] = useState([]);
  const [unifiedSummary, setUnifiedSummary] = useState(null);
  
  const [analysisModal, setAnalysisModal] = useState(null);
  const [analysisDetail, setAnalysisDetail] = useState(null);
  const [sourcesPopup, setSourcesPopup] = useState(null);
  const [assistantRef, setAssistantRef] = useState(null);
  const [assistantType, setAssistantType] = useState('Basın Bülteni');
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: `Merhaba! Ben **Milli AI**, Saadet Partisi'nin kurumsal yapay zeka asistanıyım.\n\nHaber analizi, içerik üretimi veya siyasi değerlendirme için bana yazabilirsiniz. Sol ve orta panelden "Asistana Gönder" butonuyla haber veya günleri doğrudan referans olarak ekleyebilirsiniz.` }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  
  // Calendar States
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 3, 13));
  const [activeStartDate, setActiveStartDate] = useState(new Date(2026, 3, 1));

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshTimer(prev => {
        if (prev <= 1) {
          handleAutoRefresh();
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAutoRefresh = async () => {
    setIsScanning(true);
    const newNews = await simulateLiveScan();
    setNews(prev => [newNews, ...prev]);
    setRefreshTimer(300);
    setTimeout(() => setIsScanning(false), 2000);
  };

  const handleManualRefresh = async () => {
    setIsLoading(true);
    await handleAutoRefresh();
    setIsLoading(false);
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setWebResults([]);
      setUnifiedSummary(null);
      return;
    }
    
    const localResults = news.filter(n => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.summary.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (localResults.length === 0) {
      setIsScanning(true);
      const results = await webSearchFallback(searchQuery);
      const summary = await generateUnifiedWebSummary(searchQuery, results);
      setWebResults(results);
      setUnifiedSummary(summary);
      setIsScanning(false);
    } else {
      setWebResults([]);
      setUnifiedSummary(null);
    }
  }, [searchQuery, news]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      handleSearch();
    }, 1000);
    return () => clearTimeout(delayDebounceFn);
  }, [handleSearch]);

  const scrollChatToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  useEffect(() => { scrollChatToBottom(); }, [chatMessages, scrollChatToBottom]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading || isStreaming) return;
    const currentInput = userInput;
    const updatedMessages = [...chatMessages, { role: 'user', text: currentInput }];
    
    setUserInput('');
    setChatMessages(updatedMessages);
    setIsStreaming(true);

    // Add empty AI message placeholder for streaming
    setChatMessages(prev => [...prev, { role: 'ai', text: '', streaming: true }]);

    try {
      await chatWithAssistant(
        updatedMessages,
        assistantRef,
        (_, fullText) => {
          setChatMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = { role: 'ai', text: fullText, streaming: true };
            return msgs;
          });
        }
      );
      // Mark streaming done
      setChatMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { role: 'ai', text: msgs[msgs.length - 1].text, streaming: false };
        return msgs;
      });
    } catch {
      setChatMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { role: 'ai', text: '⚠️ Üzgünüm, şu an bağlantı kuramıyorum.', streaming: false };
        return msgs;
      });
    }
    
    setIsStreaming(false);
  };

  const handleCreateContent = async () => {
    if (!assistantRef || isLoading || isStreaming) return;
    setIsLoading(true);
    const prompt = `[${assistantType.toUpperCase()}] ${assistantRef.title || assistantRef.name} konusunda içerik oluştur`;
    setChatMessages(prev => [...prev, { role: 'user', text: prompt }]);
    try {
      const content = await generateContent(assistantRef, assistantType);
      setChatMessages(prev => [...prev, { role: 'ai', text: content }]);
    } catch {
       setChatMessages(prev => [...prev, { role: 'ai', text: '⚠️ İçerik üretiminde bir sorun oluştu.' }]);
    }
    setIsLoading(false);
  };

  const toggleFullscreen = (panel) => {
    setFullscreenPanel(fullscreenPanel === panel ? null : panel);
  };

  const openAnalysis = async (item) => {
    setIsLoading(true);
    setAnalysisModal(item);
    const result = await analyzeNews(item);
    setAnalysisDetail(result);
    setIsLoading(false);
  };

  const closeAnalysis = () => {
    setAnalysisModal(null);
    setAnalysisDetail(null);
  };

  const safeFormatDate = (dateStr) => {
    try {
      if (!dateStr) return 'Güncel';
      const d = parseISO(dateStr);
      return isValid(d) ? format(d, 'dd MMMM yyyy', { locale: tr }) : 'Güncel';
    } catch {
      return 'Güncel';
    }
  };

  const filteredNews = news.filter(n => {
    try {
      const newsDate = parseISO(n.date);
      const matchesCat = selectedCategory === 'Hepsi' || n.category === selectedCategory;
      const matchesYear = selectedYear === 'Hepsi' || (isValid(newsDate) && getYear(newsDate).toString() === selectedYear);
      const matchesSource = selectedSourceFilter === 'Hepsi' || n.source === selectedSourceFilter;
      const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            n.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesYear && matchesSearch && matchesSource;
    } catch {
      return false;
    }
  });

  const getRemainingDays = (dateStr) => {
    try {
      const today = new Date(2026, 3, 13);
      const target = parseISO(dateStr);
      return isValid(target) ? differenceInDays(target, today) : 0;
    } catch {
      return 0;
    }
  };

  const getEventsForDate = (date) => {
    return TURKISH_SPECIAL_DAYS_2026.filter(event => isSameDay(parseISO(event.date), date));
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const hasEvent = TURKISH_SPECIAL_DAYS_2026.some(event => isSameDay(parseISO(event.date), date));
      if (hasEvent) return <div className="event-dot" />;
    }
    return null;
  };

  const displayEvents = TURKISH_SPECIAL_DAYS_2026
    .filter(event => {
      try {
        const eventDate = parseISO(event.date);
        const monthStart = startOfMonth(activeStartDate);
        const monthEnd = endOfMonth(activeStartDate);
        return isWithinInterval(eventDate, { start: monthStart, end: monthEnd }) || getRemainingDays(event.date) >= 0;
      } catch {
        return false;
      }
    })
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
    .slice(0, 15);

  return (
    <div className="app-container">
      <div className="loading-container">
        <div className={`loading-bar ${isLoading || isScanning ? 'active' : ''}`}></div>
      </div>

      <header className="app-header">
        <div className="brand"><div className="brand-dot"></div>Project M Live Sync Console</div>
        <div className="controls">
          <AnimatePresence>
            {isScanning && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ fontSize: '0.75rem', color: '#4285F4', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                <Globe size={14} className="animate-spin" /> Google ve Küresel Kaynaklar Taranıyor...
              </motion.div>
            )}
          </AnimatePresence>
          <div className="refresh-info"><RefreshCw size={14} className={isLoading || isScanning ? 'animate-spin' : ''} /> Yenileniyor: {Math.floor(refreshTimer / 60)}:{String(refreshTimer % 60).padStart(2, '0')}</div>
          <button className="btn-refresh" onClick={handleManualRefresh} disabled={isLoading || isScanning}>{isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Şimdi Yenile</button>
        </div>
      </header>

      <main className="main-content">
        {/* LEFT PANEL */}
        <AnimatePresence>
          {(fullscreenPanel === null || fullscreenPanel === 'left') && (
            <motion.section layout className={`panel ${fullscreenPanel === 'left' ? 'fullscreen' : ''}`}>
              <div className="panel-header"><h2 className="panel-title"><CalendarIcon size={18} /> TAKVİM VE ÖZEL GÜNLER</h2><button className="icon-btn" onClick={() => toggleFullscreen('left')}>{fullscreenPanel === 'left' ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button></div>
              <div className="panel-content">
                <div className="card" style={{ padding: '0.5rem' }}><Calendar onChange={setSelectedDate} value={selectedDate} locale="tr-TR" onActiveStartDateChange={({ activeStartDate }) => setActiveStartDate(activeStartDate)} tileContent={tileContent} /></div>
                <div style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{format(selectedDate, 'd MMMM yyyy', { locale: tr })} Günü Özel Durumlar</h3>
                  {getEventsForDate(selectedDate).length > 0 ? getEventsForDate(selectedDate).map((e, idx) => (
                    <div key={idx} className="card" style={{ borderLeft: '3px solid var(--saadet-red)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div><div style={{ fontWeight: 600 }}>{e.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{e.type}</div></div>
                      <button className="icon-btn" style={{ color: 'var(--saadet-red)' }} onClick={() => setAssistantRef(e)}>Asistana Gönder</button>
                    </div>
                  )) : <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Bu tarihte özel bir gün bulunmuyor.</p>}
                </div>
                <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>DİĞER ÖZEL GÜNLER</h3>
                <div className="event-list">
                  {displayEvents.map((event, idx) => {
                    const daysLeft = getRemainingDays(event.date);
                    return (
                      <div key={idx} className="card event-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: daysLeft < 0 ? 0.5 : 1 }}>
                        <div><div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{event.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{safeFormatDate(event.date)}</div></div>
                        <div style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: daysLeft === 0 ? 'var(--saadet-red)' : 'var(--glass)', fontSize: '0.7rem', fontWeight: 700 }}>{daysLeft < 0 ? 'GEÇTİ' : daysLeft === 0 ? 'BUGÜN' : `${daysLeft} GÜN`}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* CENTER PANEL */}
        <AnimatePresence>
          {(fullscreenPanel === null || fullscreenPanel === 'center') && (
            <motion.section layout className={`panel ${fullscreenPanel === 'center' ? 'fullscreen' : ''}`}>
              <div className="panel-header"><h2 className="panel-title"><Newspaper size={18} /> HABER ARŞİVİ VE CANLI TARAMA</h2><button className="icon-btn" onClick={() => toggleFullscreen('center')}>{fullscreenPanel === 'center' ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button></div>
              <div className="filter-area" style={{ padding: '1rem', borderBottom: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ position: 'relative', flex: 2 }}><Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} /><input type="text" placeholder="Arşivde veya internette ara..." style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', background: 'var(--bg-dark)', border: '1px solid var(--panel-border)', borderRadius: '8px', color: 'white' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                  <select style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--panel-border)', borderRadius: '8px', color: 'white' }} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}><option>Hepsi</option><option>Finans</option><option>Teknoloji</option><option>Siyaset</option><option>Toplum</option></select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                  <button onClick={() => setSelectedSourceFilter('Hepsi')} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', background: selectedSourceFilter === 'Hepsi' ? 'var(--saadet-red)' : 'var(--glass)', border: '1px solid var(--panel-border)', cursor: 'pointer', whiteSpace: 'nowrap' }}>Tüm Kaynaklar</button>
                  {SOURCES.map(src => <button key={src} onClick={() => setSelectedSourceFilter(src)} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', background: selectedSourceFilter === src ? 'var(--saadet-red)' : 'var(--glass)', border: '1px solid var(--panel-border)', cursor: 'pointer', whiteSpace: 'nowrap' }}>{src}</button>)}
                </div>
              </div>
              <div className="panel-content">
                {/* Unified Web Summary */}
                {unifiedSummary && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ background: '#1c1c24', borderLeft: '4px solid #4285F4', marginBottom: '2.5rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.1 }}><TrendingUp size={120} /></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#4285F4', marginBottom: '1.25rem' }}>
                      <Globe size={20} /> <span style={{ fontSize: '1rem', fontWeight: 800 }}>Google & AI Küresel Haber Özeti</span>
                    </div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>{unifiedSummary.title}</h4>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.7', whiteSpace: 'pre-wrap', marginBottom: '1.5rem', color: '#d1d1d1' }}>{unifiedSummary.summary}</p>
                    <div style={{ background: 'rgba(234, 67, 53, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(234, 67, 53, 0.2)' }}>
                      <span style={{ color: '#EA4335', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}><MessageSquare size={14} /> Milli AI Kurumsal Değerlendirme</span>
                      <p style={{ fontSize: '0.85rem', lineHeight: '1.6', fontStyle: 'italic', color: '#b0b0b0' }}>{unifiedSummary.saadetSpecial}</p>
                    </div>
                  </motion.div>
                )}

                {/* Google Search Style Results */}
                {webResults.length > 0 && (
                  <div style={{ marginBottom: '3rem' }}>
                    <div style={{ padding: '0 0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                      <Search size={14} /> <span style={{ fontSize: '0.75rem' }}>Google üzerinden yaklaşık 1.200.000 sonuç bulundu.</span>
                    </div>
                    {webResults.map(item => (
                      <div key={item.id} className="google-result-card" style={{ padding: '1.5rem', borderRadius: '12px', transition: 'all 0.3s', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#303134', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>{item.source[0]}</div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.85rem', color: '#bdc1c6', fontWeight: 400 }}>{item.source}</span>
                            <span style={{ fontSize: '0.7rem', color: '#9aa0a6' }}>{item.displayLink}</span>
                          </div>
                        </div>
                        <a href={item.link} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: '1.2rem', color: '#8ab4f8', textDecoration: 'none', marginBottom: '0.5rem', fontWeight: 400 }}>{item.title}</a>
                        <p style={{ fontSize: '0.9rem', color: '#bdc1c6', lineHeight: '1.5', margin: 0 }}>
                           <span style={{ color: '#9aa0a6' }}>{safeFormatDate(item.date)} — </span>
                           {item.snippet}
                        </p>
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                          <button onClick={() => setAssistantRef(item)} style={{ background: 'transparent', border: 'none', color: '#8ab4f8', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: 0 }}><Send size={12} /> Asistana Gönder</button>
                          <button onClick={() => openAnalysis(item)} style={{ background: 'transparent', border: 'none', color: '#9aa0a6', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: 0 }}><Info size={12} /> Detaylar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="news-feed">
                  {filteredNews.map(item => (
                    <div key={item.id} className="card news-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#8ab4f8', fontWeight: 600 }}>{item.category} | {item.source}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{safeFormatDate(item.date)}</span>
                      </div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>{item.title}</h4>
                      <div className="news-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-refresh" style={{ fontSize: '0.7rem', padding: '4px 8px' }} onClick={() => setSourcesPopup(item)}>Kaynaklar ({item.sources?.length || 1})</button>
                        <button className="btn-refresh" style={{ fontSize: '0.7rem', padding: '4px 8px' }} onClick={() => openAnalysis(item)}>Haber Özeti</button>
                        <button className="btn-refresh" style={{ fontSize: '0.7rem', padding: '4px 8px', color: 'var(--saadet-red)' }} onClick={() => setAssistantRef(item)}>Asistana Gönder</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* RIGHT PANEL — MUSA AI CHAT */}
        <AnimatePresence>
          {(fullscreenPanel === null || fullscreenPanel === 'right') && (
            <motion.section layout className={`panel ${fullscreenPanel === 'right' ? 'fullscreen' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Panel Header */}
              <div className="panel-header">
                <h2 className="panel-title">
                  <Bot size={18} style={{ color: 'var(--saadet-red)' }} />
                  MİLLİ AI ASİSTAN
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button className="icon-btn" title="Sohbeti Temizle" onClick={() => {
                    if (window.confirm('Sohbet geçmişi silinsin mi?')) {
                      setChatMessages([{ role: 'ai', text: `Merhaba! Ben **Musa AI**, Saadet Partisi'nin kurumsal yapay zeka asistanıyım.\n\nHaber analizi, içerik üretimi veya siyasi değerlendirme için bana yazabilirsiniz.` }]);
                    }
                  }}>
                    <RefreshCw size={16} />
                  </button>
                  <button className="icon-btn" onClick={() => toggleFullscreen('right')}>
                    {fullscreenPanel === 'right' ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                </div>
              </div>

              {/* Content Generator Bar */}
              <div className="ai-content-bar">
                <div className="ai-ref-chip">
                  {assistantRef ? (
                    <>
                      <FileText size={12} />
                      <span className="ai-ref-text">{assistantRef.title || assistantRef.name}</span>
                      <button className="ai-ref-clear" onClick={() => setAssistantRef(null)}><X size={12} /></button>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontStyle: 'italic' }}>Haber veya özel gün seçilmedi</span>
                  )}
                </div>
                <div className="ai-bar-actions">
                  <select className="ai-type-select" value={assistantType} onChange={(e) => setAssistantType(e.target.value)}>
                    <option>Basın Bülteni</option>
                    <option>Basılı İçerik</option>
                    <option>Dijital Paylaşım</option>
                    <option>Siyasi Analiz</option>
                    <option>Konuşma Metni</option>
                  </select>
                  <button className="btn-generate" onClick={handleCreateContent} disabled={!assistantRef || isLoading || isStreaming}>
                    <Sparkles size={14} />
                    {isLoading ? 'Üretiliyor...' : 'Üret'}
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="chat-scroll-area">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`chat-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}
                  >
                    <div className="bubble-meta">
                      {msg.role === 'ai' ? (
                        <><Bot size={11} style={{ color: 'var(--saadet-red)' }} /> Musa AI</>
                      ) : (
                        <>Kullanıcı</>
                      )}
                    </div>
                    <div className="bubble-text">
                      {msg.text || ''}
                      {msg.streaming && <span className="cursor-blink">▌</span>}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="chat-input-dock">
                <textarea
                  ref={textareaRef}
                  className="chat-textarea"
                  placeholder="Milli AI'ya yazın... (Enter → Gönder, Shift+Enter → Satır)"
                  rows="2"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  className="chat-send-btn"
                  onClick={handleSendMessage}
                  disabled={isLoading || isStreaming || !userInput.trim()}
                >
                  {(isLoading || isStreaming) ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Popups & Modals */}
      <AnimatePresence>
        {sourcesPopup && (
          <div className="modal-overlay" onClick={() => setSourcesPopup(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal" style={{ maxWidth: '450px' }} onClick={evt => evt.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}><h3 style={{ fontSize: '1rem', fontWeight: 600 }}>8 Kaynaklı Derin Teknik Veri</h3><button className="icon-btn" onClick={() => setSourcesPopup(null)}><X size={20} /></button></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {(sourcesPopup.sources || []).map((src, i) => (
                  <a key={i} href={src.url} target="_blank" rel="noreferrer" className="card" style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                    <div><div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{src.name}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{src.region} Haber Kaynağı</div></div>
                    <ExternalLink size={16} />
                  </a>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {analysisModal && (
          <div className="modal-overlay" onClick={closeAnalysis}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="modal" style={{ maxWidth: '750px' }} onClick={evt => evt.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Info size={24} style={{ color: 'var(--saadet-red)' }} /><h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Kapsamlı Veri Raporu</h3></div><button className="icon-btn" onClick={closeAnalysis}><X size={20} /></button></div>
              {!analysisDetail ? <div style={{ padding: '4rem', textAlign: 'center' }}><Loader2 size={42} className="animate-spin" style={{ margin: '0 auto 1.5rem', color: 'var(--saadet-red)' }} /><p>ANALİZ SÜRÜYOR...</p></div> : (
                <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--panel-border)', marginBottom: '1.5rem' }}><h4 style={{ color: 'var(--saadet-red)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: 700 }}>Analiz Raporu</h4><p style={{ fontSize: '1rem', lineHeight: '1.7' }}>{analysisDetail.summary}</p></div>
                  <div style={{ marginBottom: '2rem' }}><h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '1rem' }}>Sorgulanan Göstergeler</h4><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>{analysisDetail.headlines.map((h, i) => <div key={i} style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', fontSize: '0.85rem', background: 'var(--glass)', padding: '0.75rem', borderRadius: '8px' }}><ChevronRight size={14} style={{ color: 'var(--saadet-red)' }} />{h}</div>)}</div></div>
                  <div style={{ background: 'linear-gradient(135deg, #1e1e24 0%, #121216 100%)', padding: '1.5rem', borderRadius: '16px', borderLeft: '4px solid var(--saadet-red)' }}><h4 style={{ color: 'var(--saadet-red)', fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.5rem' }}>Saadet Partisi Özel Değerlendirme (Milli AI)</h4><p style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>{analysisDetail.saadetSpecial}</p></div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
