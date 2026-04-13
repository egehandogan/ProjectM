export const TURKISH_SPECIAL_DAYS_2026 = [
  // Resmi Tatiller
  { date: '2026-01-01', name: 'Yılbaşı', type: 'Resmi Tatil' },
  { date: '2026-04-23', name: 'Ulusal Egemenlik ve Çocuk Bayramı', type: 'Resmi Tatil' },
  { date: '2026-05-01', name: 'Emek ve Dayanışma Günü', type: 'Resmi Tatil' },
  { date: '2026-05-19', name: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı', type: 'Resmi Tatil' },
  { date: '2026-07-15', name: 'Demokrasi ve Milli Birlik Günü', type: 'Resmi Tatil' },
  { date: '2026-08-30', name: 'Zafer Bayramı', type: 'Resmi Tatil' },
  { date: '2026-10-29', name: 'Cumhuriyet Bayramı', type: 'Resmi Tatil' },

  // Dini Bayramlar
  { date: '2026-03-19', name: 'Ramazan Bayramı Arifesi', type: 'Dini Gün' },
  { date: '2026-03-20', name: 'Ramazan Bayramı 1. Gün', type: 'Dini Bayram' },
  { date: '2026-03-21', name: 'Ramazan Bayramı 2. Gün', type: 'Dini Bayram' },
  { date: '2026-03-22', name: 'Ramazan Bayramı 3. Gün', type: 'Dini Bayram' },
  { date: '2026-05-26', name: 'Kurban Bayramı Arifesi', type: 'Dini Gün' },
  { date: '2026-05-27', name: 'Kurban Bayramı 1. Gün', type: 'Dini Bayram' },
  { date: '2026-05-28', name: 'Kurban Bayramı 2. Gün', type: 'Dini Bayram' },
  { date: '2026-05-29', name: 'Kurban Bayramı 3. Gün', type: 'Dini Bayram' },
  { date: '2026-05-30', name: 'Kurban Bayramı 4. Gün', type: 'Dini Bayram' },

  // Belirli Günler ve Haftalar (Genişletilmiş)
  { date: '2026-01-10', name: 'Çalışan Gazeteciler Günü', type: 'Mesleki' },
  { date: '2026-03-01', name: 'Yeşilay Haftası', type: 'STK' },
  { date: '2026-03-08', name: 'Dünya Kadınlar Günü', type: 'Özel Gün' },
  { date: '2026-03-14', name: 'Tıp Bayramı', type: 'Mesleki' },
  { date: '2026-04-02', name: 'Otizm Farkındalık Günü', type: 'Farkındalık' },
  { date: '2026-04-05', name: 'Avukatlar Günü', type: 'Mesleki' },
  { date: '2026-05-10', name: 'Engelliler Haftası', type: 'STK' },
  { date: '2026-11-24', name: 'Öğretmenler Günü', type: 'Mesleki' }
];

export const MOCK_NEWS = [
  // 2026 - GÜNCEL VE GELECEK
  {
    id: 1001,
    title: 'COP31 İklim Zirvesi İstanbul\'da Başladı: Küresel Karbon Kotası Gündemde',
    date: '2026-04-10',
    time: '10:00',
    category: 'Siyaset',
    source: 'TRT Haber',
    sources: [
      { name: 'TRT Haber', url: 'https://trthaber.com', region: 'Yerel' },
      { name: 'BBC News', url: 'https://bbc.com', region: 'Global' },
      { name: 'Reuters', url: 'https://reuters.com', region: 'Global' }
    ],
    summary: 'Dünya liderleri iklim değişikliğiyle mücadele için İstanbul\'da toplandı. Zirvede gelişmekte olan ülkelere yönelik yeşil enerji fonlarının artırılması ve 2030 karbon hedeflerinin güncellenmesi tartışılıyor.',
    theme: 'Çevre / Diplomasi',
    saadet_relation: 'Ekolojik dengenin korunması, emanet bilinciyle hareket edilmesini gerektirir. Adil bir dünya için zengin ülkelerin karbon sorumluluğunu üstlenmesi şarttır.'
  },
  {
    id: 1002,
    title: 'Kuantum İnternet Protokolü İlk Kez Test Edildi',
    date: '2026-03-15',
    time: '18:30',
    category: 'Teknoloji',
    source: 'Bloomberg',
    sources: [
      { name: 'Bloomberg', url: 'https://bloomberg.com', region: 'Global' },
      { name: 'Wired', url: 'https://wired.com', region: 'Global' },
      { name: 'Anadolu Ajansı', url: 'https://aa.com.tr', region: 'Yerel' }
    ],
    summary: 'Siber güvenlikte devrim yaratacak kuantum internet bağlantısı, Ankara ve İstanbul arasındaki özel fiber hattı üzerinden başarıyla gerçekleştirildi.',
    theme: 'Teknoloji / Güvenlik',
    saadet_relation: 'Millî güvenliğin dijital boyutu, yerli ve milli kuantum teknolojileriyle tahkim edilmelidir. Dışa bağımlılığı bitirecek her teknolojik adım değerlidir.'
  },

  // 2025 - SAVUNMA VE EKONOMİ
  {
    id: 2001,
    title: 'TCG Anadolu-2 Denize İndirildi: Mavi Vatan\'da Yeni Dönem',
    date: '2025-10-29',
    time: '14:00',
    category: 'Siyaset',
    source: 'Anadolu Ajansı',
    sources: [
      { name: 'Anadolu Ajansı', url: 'https://aa.com.tr', region: 'Yerel' },
      { name: 'Defense News', url: 'https://defensenews.com', region: 'Global' },
      { name: 'TRT World', url: 'https://trtworld.com', region: 'Global' }
    ],
    summary: 'Türkiye\'nin ikinci çok maksatlı amfibi hücum gemisi düzenlenen törenle denize indirildi. Gemi, yerli üretim hava araçları ve savunma sistemleriyle donatıldı.',
    theme: 'Milli Savunma',
    saadet_relation: 'Mavi Vatan stratejisi, şahsiyetli bir dış politikanın denizlerdeki kalesidir. Savunma sanayiindeki millileşme adımları siyaset üstü bir vizyonla desteklenmelidir.'
  },
  {
    id: 2002,
    title: 'D-8 Ekonomik İşbirliği Teşkilatı Yeni Para Birimi "D-Unit"i Tanıttı',
    date: '2025-06-15',
    time: '11:00',
    category: 'Finans',
    source: 'Al Jazeera',
    sources: [
      { name: 'Al Jazeera', url: 'https://aljazeera.com', region: 'Global' },
      { name: 'Dünya Gazetesi', url: 'https://dunya.com', region: 'Yerel' },
      { name: 'CNN', url: 'https://cnn.com', region: 'Global' }
    ],
    summary: 'Sekiz gelişmekte olan ülke (D-8), karşılıklı ticarette dolar yerine kullanılacak dijital tabanlı D-Unit para birimi üzerinde anlaşma sağladı.',
    theme: 'Ekonomi / İslam Birliği',
    saadet_relation: 'Erbakan Hocamızın mirası olan D-8 projesi, adil bir world order ekonomik motorudur. Sömürgeci finans sistemine karşı bu adım tarihi bir başarıdır.'
  },

  // 2024 - DEMOKRASİ VE KAOS
  {
    id: 3001,
    title: 'Suriye\'de Geçici Hükümet Kuruldu: Şam\'da Kutlamalar',
    date: '2024-12-25',
    time: '20:00',
    category: 'Siyaset',
    source: 'Euronews',
    sources: [
      { name: 'Euronews', url: 'https://euronews.com', region: 'Global' },
      { name: 'TRT Haber', url: 'https://trthaber.com', region: 'Yerel' },
      { name: 'BBC News', url: 'https://bbc.com', region: 'Global' }
    ],
    summary: 'Esad rejiminin ardından kurulan geçici hükümet, ulusal uzlaşı ve genel seçim hazırlıklarına başladı. Türkiye, bölgedeki insani yardım sürecine liderlik ediyor.',
    theme: 'Ortadoğu / Siyaset',
    saadet_relation: 'Suriye\'nin huzuru, Türkiye\'nin huzurudur. Komşu ülkelerle "Sıfır Sorun" değil, "Adil İşbirliği" temelinde kardeşçe bir gelecek inşa edilmelidir.'
  },

  // 2023 - ACI VE DAYANIŞMA
  {
    id: 401,
    title: 'Kahramanmaraş Depremi: 11 İlde Seferberlik İlan Edildi',
    date: '2023-02-06',
    time: '04:17',
    category: 'Toplum',
    source: 'TRT Haber',
    sources: [
      { name: 'TRT Haber', url: 'https://trthaber.com', region: 'Yerel' },
      { name: 'CNN', url: 'https://cnn.com', region: 'Global' },
      { name: 'Reuters', url: 'https://reuters.com', region: 'Global' },
      { name: 'Euronews', url: 'https://euronews.com', region: 'Global' }
    ],
    summary: 'Merkez üssü Kahramanmaraş olan ve 11 ili etkileyen 7.7 ve 7.6 büyüklüğündeki depremler sonrası tüm dünyadan yardım yağdı. Arama kurtarma çalışmaları sürüyor.',
    theme: 'Doğal Afet',
    saadet_relation: 'Yaşanan acı hepimizindir. İmar aflarının cinayet olduğu bu afetle bir kez daha görülmüştür. Ahlaklı ve dirençli kentler kurmak farzdır.'
  },

  // 2022 - SAVAŞ VE ENERJİ
  {
    id: 501,
    title: 'Rusya-Ukrayna Savaşı: Kiev Kuşatması Başladı',
    date: '2022-02-24',
    time: '05:45',
    category: 'Siyaset',
    source: 'Reuters',
    sources: [
      { name: 'Reuters', url: 'https://reuters.com', region: 'Global' },
      { name: 'BBC News', url: 'https://bbc.com', region: 'Global' },
      { name: 'Anadolu Ajansı', url: 'https://aa.com.tr', region: 'Yerel' }
    ],
    summary: 'Rus ordusu Ukrayna sınırlarını geçerek havadan ve karadan saldırı başlattı. Batı dünyası ağır yaptırım paketlerini devreye alıyor.',
    theme: 'Savaş / Jeopolitik',
    saadet_relation: 'Savaşlar sömürgeci güçlerin oyunudur. Bölgesel barış için arabulucu rolü güçlendirilmeli, milletler hukuku üstün tutulmalıdır.'
  }
];

// Many more items here to make it 100+
for (let i = 1; i <= 95; i++) {
  const year = 2022 + Math.floor(Math.random() * 5);
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  MOCK_NEWS.push({
    id: 5000 + i,
    title: `Arşiv Haberi #${i}: ${year} Yılı Stratejik Gelişmeler Raporu - Analiz ${i}`,
    date: dateStr,
    time: '12:00',
    category: i % 2 === 0 ? 'Siyaset' : 'Ekonomi',
    source: ['TRT Haber', 'Anadolu Ajansı', 'BBC News', 'CNN', 'Reuters', 'Bloomberg', 'Euronews', 'Al Jazeera'][Math.floor(Math.random() * 8)],
    sources: Array.from({length: Math.floor(Math.random() * 7) + 2}, (_, j) => ({
      name: ['TRT Haber', 'Anadolu Ajansı', 'BBC News', 'CNN', 'Reuters', 'Bloomberg', 'Euronews', 'Al Jazeera'][j],
      url: 'https://google.com',
      region: j < 2 ? 'Yerel' : 'Global'
    })),
    summary: `${year} yılında gerçekleşen bu olay, bölgenin sosyo-ekonomik yapısında köklü değişimlere yol açmıştır. Yapılan 8 kaynaklı tarama sonuçlarına göre, olayın etkileri günümüzde de hissedilmektedir.`,
    theme: 'Tarihsel Analiz / Arşiv',
    saadet_relation: 'Gelecek nesillere adil bir dünya bırakmak için geçmişin hatalarından ders çıkarmalıyız. Tarih boyunca her kriz, yeni bir uyanışın habercisidir.'
  });
}
