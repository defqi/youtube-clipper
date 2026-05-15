/**
 * SEO Title Generator for YouTube Shorts
 * Optimized for viral potential and SEO
 */

const VIRAL_HOOKS = [
  'WAIT for this...',
  'Nobody talks about this...',
  'This changed EVERYTHING',
  'POV:',
  'You need to see this',
  'Best part?',
  'The secret nobody tells you',
  '3 things you need to know',
  'This is insane',
  'Wait for it...',
  'The truth about',
  'How to',
  'Why is no one talking about this?',
  'This hack is insane',
  'Stop doing this!',
  'The REAL reason',
  'I wish I knew this sooner',
  'This makes no sense but it works',
  'Nobody believes me but',
  'Finally revealed!',
];

const EMOTIONAL_TRIGGERS = [
  'mind blown',
  'shocking',
  'unbelievable',
  'insane',
  'crazy',
  'amazing',
  'incredible',
  'wow',
  'omg',
  'no way',
  'literally',
  'absolutely',
  'totally',
  'completely',
];

const POWER_WORDS = [
  'Ultimate',
  'Perfect',
  'Best',
  'Secret',
  'Hidden',
  'Simple',
  'Easy',
  'Quick',
  'Fast',
  'Pro',
  'Master',
  'Expert',
  'Proven',
  'Real',
  'Actual',
];

const NUMBER_PATTERNS = [
  { number: 3, text: '3 Things' },
  { number: 5, text: '5 Tips' },
  { number: 7, text: '7 Ways' },
  { number: 10, text: '10 Secrets' },
  { number: 1, text: '1 Trick' },
  { number: 2, text: '2 Hacks' },
];

/**
 * Get random item from array
 */
function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Extract keywords from title
 */
function extractKeywords(title) {
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being'];
  
  const words = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.includes(w));
  
  return [...new Set(words)].slice(0, 5);
}

/**
 * Generate viral title
 * @param {string} originalTitle - Original video title
 * @param {number} clipIndex - Clip index number
 * @param {Object} options - Additional options
 */
function generateViralTitle(originalTitle, clipIndex = 1, options = {}) {
  const {
    includeNumber = true,
    useHook = true,
    language = 'id', // Default Indonesian
  } = options;

  // Use Indonesian if language is 'id'
  if (language === 'id') {
    return generateViralTitleID(originalTitle, clipIndex);
  }

  const keywords = extractKeywords(originalTitle);
  const mainKeyword = keywords[0] || 'this';
  
  let title = '';
  
  // Strategy 1: Hook + Number + Keyword
  if (useHook && Math.random() > 0.3) {
    const hook = randomFrom(VIRAL_HOOKS);
    title = hook + ' ';
  }
  
  // Add number pattern (high viral potential)
  if (includeNumber && Math.random() > 0.4) {
    const numPattern = randomFrom(NUMBER_PATTERNS);
    title += numPattern.text + ' ';
  }
  
  // Add power word
  if (Math.random() > 0.5) {
    title += randomFrom(POWER_WORDS) + ' ';
  }
  
  // Add main keyword
  title += mainKeyword;
  
  // Add emotional trigger
  if (Math.random() > 0.6) {
    title += ' ' + randomFrom(EMOTIONAL_TRIGGERS);
  }
  
  // Add part indicator
  title += ` (Part ${clipIndex})`;
  
  // Truncate if too long (YouTube max 100 chars for title)
  if (title.length > 100) {
    title = title.substring(0, 97) + '...';
  }
  
  return title;
}

/**
 * Generate Indonesian viral title
 */
function generateViralTitleID(originalTitle, clipIndex = 1) {
  const ID_HOOKS = [
    'TUNGGU dlu...',
    'Tidak ada yang bahas ini...',
    'Ini mengubah segalanya!',
    'POV:',
    'Kamu perlu lihat ini',
    'Bagian terbaik?',
    'Rahasia yang tidak ada yang tahu',
    '3 hal yang perlu kamu tahu',
    'GILA banget!',
    'Wait for it...',
    'Kebenaran tentang',
    'Cara mudah',
    'Kenapa tidak ada yang bahas ini?',
    'Trik ini gila',
    'HENTI melakukan ini!',
    'Alasan sebenarnya',
    'Wish aku tahu ini lebih awal',
    'Tidak masuk akal tapi berhasil',
    'Tidak ada yang percaya tapi',
    'Finally terungkap!',
  ];
  
  const ID_POWER_WORDS = [
    'Terbaik',
    'Sempurna',
    'Rahasia',
    'Tersembunyi',
    'Mudah',
    'Cepat',
    'Pro',
    'Ahli',
    'Bukti',
    'Nyata',
  ];
  
  const ID_EMOTIONAL = [
    'gila',
    'luar biasa',
    'mantap',
    'keren',
    'wow',
    'ga percaya',
    'banget',
    'nih',
  ];
  
  const keywords = extractKeywords(originalTitle);
  const mainKeyword = keywords[0] || 'ini';
  
  let title = '';
  
  // Hook
  if (Math.random() > 0.3) {
    title += randomFrom(ID_HOOKS) + ' ';
  }
  
  // Number
  if (Math.random() > 0.5) {
    const nums = ['3 Tips', '5 Cara', '7 Rahasia', '1 Trik', '2 Hack'];
    title += randomFrom(nums) + ' ';
  }
  
  // Power word
  if (Math.random() > 0.5) {
    title += randomFrom(ID_POWER_WORDS) + ' ';
  }
  
  // Main keyword
  title += mainKeyword;
  
  // Emotional
  if (Math.random() > 0.6) {
    title += ' ' + randomFrom(ID_EMOTIONAL);
  }
  
  // Part
  title += ` (Part ${clipIndex})`;
  
  if (title.length > 100) {
    title = title.substring(0, 97) + '...';
  }
  
  return title;
}

/**
 * Generate A/B test titles
 * @param {string} originalTitle - Original video title
 * @param {number} clipCount - Number of clips
 */
function generateABTitles(originalTitle, clipCount = 3) {
  const titles = [];
  
  for (let i = 1; i <= clipCount; i++) {
    // Generate different variations for A/B testing
    const variations = [
      generateViralTitle(originalTitle, i, { useHook: true, includeNumber: true }),
      generateViralTitle(originalTitle, i, { useHook: true, includeNumber: false }),
      generateViralTitle(originalTitle, i, { useHook: false, includeNumber: true }),
    ];
    
    titles.push(variations[i % variations.length]);
  }
  
  return titles;
}

module.exports = {
  generateViralTitle,
  generateViralTitleID,
  generateABTitles,
  VIRAL_HOOKS,
  POWER_WORDS,
  NUMBER_PATTERNS,
};