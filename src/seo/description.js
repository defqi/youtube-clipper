/**
 * SEO Description Generator for YouTube Shorts
 * Optimized for engagement and discoverability
 */

const VIRAL_HASHTAGS = [
  '#viral', '#viralvideo', '#viralreels', '#trending', '#trendingvideo',
  '#fyp', '#foryou', '#foryoupage', '#fypシ', '#fypage',
  '#shorts', '#youtubeshorts', '#youtubeshort', '#youtuber',
  '#amazing', '#insane', '#crazy', '#wow', '#omg',
  '#entertainment', '#funny', '#funnyvideo', '#comedy', '#laugh',
  '#mindblown', '#knowledge', '#facts', '#didyouknow', '#learn',
  '#tips', '#tricks', '#hack', '#lifehack', '#hacks',
  '#motivation', '#inspiration', '#goals', '#success', '#mindset',
  '#gaming', '#gamer', '#gta', '#minecraft', '#roblox',
  '#music', '#song', '#beats', '#dance', '#tiktok',
  '#sports', '#football', '#soccer', '#basketball',
  '#food', '#foodie', '#cooking', '#recipe', '#yummy',
  '#travel', '#adventure', '#explore', '#nature',
  '#fitness', '#workout', '#gym', '#health',
  '#beauty', '#makeup', '#skincare', '#fashion',
  '#tech', '#technology', '#ai', '#coding', '#programming',
];

const NICHE_HASHTAGS = {
  gaming: ['#gaming', '#gamer', '#gta', '#minecraft', '#roblox', '#fortnite', '#valorant', '#pubg', '#cod', '#apexlegends'],
  music: ['#music', '#song', '#singer', '#singing', '#cover', '#lyrics', '#newmusic'],
  comedy: ['#comedy', '#funny', '#funnyvideo', '#humor', '#jokes', '#laugh', '#comedyvideo'],
  education: ['#education', '#learn', '#knowledge', '#facts', '#science', '#history', '#math', '#tutorial'],
  sports: ['#sports', '#football', '#soccer', '#basketball', '#nba', '#fifa', '#uefa'],
  food: ['#food', '#foodie', '#cooking', '#recipe', '#yummy', '#delicious', '#foodporn'],
  tech: ['#tech', '#technology', '#ai', '#coding', '#programming', '#developer', '#python', '#javascript'],
  fitness: ['#fitness', '#workout', '#gym', '#health', '#fitnessmotivation', '#gymlife'],
  beauty: ['#beauty', '#makeup', '#skincare', '#fashion', '#style', '#ootd'],
  travel: ['#travel', '#adventure', '#explore', '#nature', '#travelgram', '#vacation'],
};

const CALL_TO_ACTIONS = [
  'Follow for more!',
  'Like and follow for more content!',
  'Follow for daily content!',
  'Don\'t forget to like and follow!',
  'Hit follow for more!',
  'Like & follow for more!',
  'Follow for more amazing content!',
  'Double tap to follow!',
  'Like if you enjoyed this!',
  'Follow for more!',
  'Turn on post notifications!',
  'Follow for daily uploads!',
  'Like and subscribe!',
  'Follow for the next one!',
  'Don\'t miss the next post!',
];

const ENGAGEMENT_QUESTIONS = [
  'Did you know about this?',
  'Did you like this?',
  'Who else relates?',
  'Comment your thoughts!',
  'What do you think?',
  'Agree or disagree?',
  'Let me know in the comments!',
  'Tag a friend who needs to see this!',
  'Share with your friends!',
  'Who else wants more?',
  'Did this help you?',
  'Was this useful?',
  'Drop a fire if you agree!',
  'Comment below!',
  'Tag someone!',
];

// Indonesian CTAs
const ID_CALL_TO_ACTIONS = [
  'Follow untuk lebih banyak!',
  'Like dan follow untuk konten lebih banyak!',
  'Follow untuk daily content!',
  'Jangan lupa like dan follow!',
  'Klik follow untuk lebih banyak!',
  'Like & follow ya!',
  'Follow untuk konten menarik lainnya!',
  'Double tap untuk follow!',
  'Like jika suka!',
  'Follow untuk lebih banyak!',
  'Nyalakan notifikasi post!',
  'Follow untuk upload harian!',
  'Like dan subscribe!',
  'Follow untuk selanjutnya!',
  'Jangan miss post selanjutnya!',
];

// Indonesian engagement questions
const ID_ENGAGEMENT_QUESTIONS = [
  'Tau tentang ini?',
  'Suka?',
  'Siapa yang relate?',
  'Komentar pendapatmu!',
  'Apa pendapatmu?',
  'Setuju atau tidak?',
  'Tulis di komentar!',
  'Tag teman yang perlu lihat ini!',
  'Share ke teman!',
  'Siapa yang mau lebih banyak?',
  'Ini membantu?',
  'Berguna?',
  'Komen fire kalau setuju!',
  'Komen di bawah!',
  'Tag seseorang!',
];

// Indonesian hashtags
const ID_HASHTAGS = [
  '#viral', '#viralindo', '#trending', '#trendingindo', '#fyp', '#fypk',
  '#youtubeshorts', '#youtubeshortsindo', '#youtuber', '#youtuberindo',
  '#lucu', '#kocak', '#komedi', '#humor', '#ngakak', '#ketawa',
  '#minding', '#fakta', '#pengetahuan', '#didyouknow', '#belajar',
  '#tips', '#trik', '#hack', '#lifehack', '#hacks',
  '#motivasi', '#inspirasi', '#goals', '#sukses', '#mindset',
  '#gaming', '#gamer', '#gta', '#minecraft', '#roblox',
  '#musik', '#lagu', '#nyanyi', '#cover', '#dance',
  '#sports', '#bola', '#sepakbola', '#basket',
  '#makan', '#foodie', '#masak', '#resep', '#enak',
  '#travel', '#jelajah', '#eksplor', '#alam',
  '#fitness', '#gym', '#workout', '#kesehatan',
  '#beauty', '#makeup', '#skincare', '#fashion', '#style',
  '#tech', '#teknologi', '#ai', '#coding', '#programming',
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function detectCategory(title) {
  const titleLower = title.toLowerCase();
  const categoryKeywords = {
    gaming: ['game', 'gaming', 'play', 'gamer', 'minecraft', 'gta', 'fortnite', 'roblox', 'valorant', 'pubg', 'cod'],
    music: ['music', 'song', 'sing', 'cover', 'lyrics', 'album', 'band', 'artist', 'rap', 'beat'],
    comedy: ['funny', 'comedy', 'laugh', 'joke', 'humor', 'prank'],
    education: ['learn', 'fact', 'knowledge', 'science', 'history', 'math', 'tutorial', 'how to'],
    sports: ['sport', 'football', 'soccer', 'basketball', 'nba', 'fifa', 'match', 'player', 'team'],
    food: ['food', 'cook', 'recipe', 'eat', 'yummy', 'delicious', 'foodie', 'restaurant'],
    tech: ['tech', 'technology', 'ai', 'code', 'programming', 'developer', 'software', 'app', 'computer'],
    fitness: ['fitness', 'gym', 'workout', 'exercise', 'health', 'training', 'muscle', 'body'],
    beauty: ['beauty', 'makeup', 'skincare', 'fashion', 'style', 'clothes', 'outfit'],
    travel: ['travel', 'trip', 'vacation', 'adventure', 'explore', 'nature', 'tourist'],
  };
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (titleLower.includes(keyword)) {
        return category;
      }
    }
  }
  return 'general';
}

function getCategoryHashtags(category) {
  return NICHE_HASHTAGS[category] || VIRAL_HASHTAGS.slice(0, 10);
}

function generateDescription(originalTitle, videoId, options = {}) {
  const {
    language = 'id',
    includeCTA = true,
    includeQuestion = true,
    maxHashtags = 15,
  } = options;

  const category = detectCategory(originalTitle);
  const keywords = originalTitle
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 5);

  let description = '';

  if (language === 'id') {
    description += '📌 Clip highlights dari video asli\n\n';
  } else {
    description += '📌 Original video highlights\n\n';
  }

  description += `Original: https://youtube.com/watch?v=${videoId}\n\n`;

  if (keywords.length > 0) {
    description += 'Tags: ';
    description += keywords.map(k => '#' + k.replace(/\s+/g, '')).join(' ');
    description += '\n\n';
  }

  let hashtagList = language === 'id' ? ID_HASHTAGS : VIRAL_HASHTAGS;

  const categoryTags = getCategoryHashtags(category);
  const selectedTags = categoryTags.slice(0, 5);
  description += selectedTags.join(' ') + '\n\n';

  const viralTags = hashtagList.slice(0, 8);
  description += viralTags.join(' ') + '\n\n';

  if (includeQuestion) {
    const question = language === 'id' ? randomFrom(ID_ENGAGEMENT_QUESTIONS) : randomFrom(ENGAGEMENT_QUESTIONS);
    description += '💬 ' + question + '\n\n';
  }

  if (includeCTA) {
    const cta = language === 'id' ? randomFrom(ID_CALL_TO_ACTIONS) : randomFrom(CALL_TO_ACTIONS);
    description += '✉ ' + cta;
  }

  return description;
}

function generateShortDescription(videoId, language = 'id') {
  const tags = language === 'id' ? ID_HASHTAGS : VIRAL_HASHTAGS;
  const cta = language === 'id' ? ID_CALL_TO_ACTIONS : CALL_TO_ACTIONS;
  return tags.slice(0, 8).join(' ') + '\n\n' + randomFrom(cta);
}

function generateABDescriptions(videoId, originalTitle, count = 3) {
  const descriptions = [];
  for (let i = 0; i < count; i++) {
    descriptions.push(generateDescription(originalTitle, videoId, {
      includeCTA: i % 2 === 0,
      includeQuestion: i % 2 === 1,
      maxHashtags: 10 + i * 2,
    }));
  }
  return descriptions;
}

module.exports = {
  generateDescription,
  generateShortDescription,
  generateABDescriptions,
  detectCategory,
  getCategoryHashtags,
  VIRAL_HASHTAGS,
  CALL_TO_ACTIONS,
  ENGAGEMENT_QUESTIONS,
  ID_HASHTAGS,
  ID_CALL_TO_ACTIONS,
  ID_ENGAGEMENT_QUESTIONS,
};