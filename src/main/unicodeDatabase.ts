export interface UnicodeChar {
  char: string;
  name: string;
  code: string;
  category: string;
  subCategory?: string;
  keywords?: string[];
}

export interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'common', name: 'Common', icon: '⭐' },
  { id: 'currency', name: 'Currency', icon: '💲' },
  { id: 'math', name: 'Math', icon: '➕' },
  { id: 'arrows', name: 'Arrows', icon: '➔' },
  { id: 'greek', name: 'Greek', icon: 'Ω' },
  { id: 'shapes', name: 'Shapes', icon: '◆' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'box', name: 'Box Drawing', icon: '┼' },
  { id: 'latin', name: 'Latin Ext', icon: 'Å' },
  { id: 'cyrillic', name: 'Cyrillic', icon: 'Ж' },
  { id: 'arabic', name: 'Arabic', icon: 'ض' },
  { id: 'cjk', name: 'CJK', icon: 'あ' },
  { id: 'devanagari', name: 'Devanagari', icon: 'अ' },
  { id: 'hebrew', name: 'Hebrew', icon: 'א' },
  { id: 'technical', name: 'Technical', icon: '⌘' },
  { id: 'emoji', name: 'Emoji', icon: '😀' },
];

function ch(char: string, name: string, category: string, keywords: string[] = []): UnicodeChar {
  const codePoint = char.codePointAt(0) || 0;
  const code = 'U+' + codePoint.toString(16).toUpperCase().padStart(4, '0');
  return { char, name, code, category, keywords };
}

const COMMON: UnicodeChar[] = [
  ch('©', 'Copyright', 'common', ['copy', 'right']),
  ch('®', 'Registered Trademark', 'common', ['reg', 'trade']),
  ch('™', 'Trademark', 'common', ['tm']),
  ch('°', 'Degree Sign', 'common', ['temp', 'angle']),
  ch('•', 'Bullet', 'common', ['dot', 'list']),
  ch('…', 'Horizontal Ellipsis', 'common', ['dots', 'more']),
  ch('–', 'En Dash', 'common', ['dash']),
  ch('—', 'Em Dash', 'common', ['dash', 'long']),
  ch('“', 'Left Double Quotation Mark', 'common', ['quote']),
  ch('”', 'Right Double Quotation Mark', 'common', ['quote']),
  ch('‘', 'Left Single Quotation Mark', 'common', ['quote']),
  ch('’', 'Right Single Quotation Mark', 'common', ['quote', 'apostrophe']),
  ch('«', 'Left-Pointing Double Angle Quotation', 'common', ['guillemet']),
  ch('»', 'Right-Pointing Double Angle Quotation', 'common', ['guillemet']),
  ch('§', 'Section Sign', 'common', ['legal', 'paragraph']),
  ch('¶', 'Pilcrow Sign', 'common', ['paragraph']),
  ch('†', 'Dagger', 'common', ['footnote']),
  ch('‡', 'Double Dagger', 'common', ['footnote']),
  ch('¿', 'Inverted Question Mark', 'common', ['spanish']),
  ch('¡', 'Inverted Exclamation Mark', 'common', ['spanish']),
  ch('/', 'Solidus / Forward Slash', 'common', ['slash', 'divide', 'path']),
  ch('-', 'Hyphen-Minus', 'common', ['dash', 'minus', 'hyphen']),
  ch('*', 'Asterisk', 'common', ['star', 'multiply', 'wildcard']),
  ch('+', 'Plus Sign', 'common', ['add', 'plus']),
  ch(')', 'Right Parenthesis', 'common', ['paren', 'bracket', 'close']),
  ch('%', 'Percent Sign', 'common', ['percent', 'modulo']),
  ch('^', 'Circumflex Accent', 'common', ['caret', 'hat', 'power']),
];

const CURRENCY: UnicodeChar[] = [
  ch('$', 'Dollar Sign', 'currency'),
  ch('€', 'Euro Sign', 'currency'),
  ch('£', 'Pound Sign', 'currency'),
  ch('¥', 'Yen Sign', 'currency'),
  ch('₹', 'Indian Rupee', 'currency'),
  ch('₽', 'Ruble Sign', 'currency'),
  ch('₿', 'Bitcoin Sign', 'currency', ['crypto']),
  ch('¢', 'Cent Sign', 'currency'),
  ch('₩', 'Won Sign', 'currency'),
  ch('₺', 'Turkish Lira', 'currency'),
  ch('₴', 'Hryvnia Sign', 'currency'),
  ch('₫', 'Dong Sign', 'currency'),
  ch('₭', 'Kip Sign', 'currency'),
  ch('₱', 'Peso Sign', 'currency'),
  ch('₲', 'Guarani Sign', 'currency'),
  ch('₵', 'Cedi Sign', 'currency'),
];

const MATH: UnicodeChar[] = [
  ch('±', 'Plus-Minus Sign', 'math'),
  ch('×', 'Multiplication Sign', 'math', ['multiply', 'times']),
  ch('÷', 'Division Sign', 'math', ['divide']),
  ch('≠', 'Not Equal To', 'math'),
  ch('≈', 'Almost Equal To', 'math'),
  ch('≤', 'Less-Than or Equal To', 'math'),
  ch('≥', 'Greater-Than or Equal To', 'math'),
  ch('∞', 'Infinity', 'math', ['forever']),
  ch('√', 'Square Root', 'math', ['radic']),
  ch('∑', 'N-Ary Summation', 'math', ['sigma', 'sum']),
  ch('∏', 'N-Ary Product', 'math', ['pi']),
  ch('∫', 'Integral', 'math'),
  ch('π', 'Greek Small Letter Pi', 'math'),
  ch('∂', 'Partial Differential', 'math'),
  ch('∆', 'Increment / Delta', 'math'),
  ch('∇', 'Nabla / Gradient', 'math'),
  ch('∈', 'Element Of', 'math'),
  ch('∉', 'Not an Element Of', 'math'),
  ch('⊂', 'Subset Of', 'math'),
  ch('⊃', 'Superset Of', 'math'),
  ch('∪', 'Union', 'math'),
  ch('∩', 'Intersection', 'math'),
];

const ARROWS: UnicodeChar[] = [
  ch('←', 'Leftwards Arrow', 'arrows'),
  ch('→', 'Rightwards Arrow', 'arrows'),
  ch('↑', 'Upwards Arrow', 'arrows'),
  ch('↓', 'Downwards Arrow', 'arrows'),
  ch('↔', 'Left Right Arrow', 'arrows'),
  ch('↕', 'Up Down Arrow', 'arrows'),
  ch('↖', 'North West Arrow', 'arrows'),
  ch('↗', 'North East Arrow', 'arrows'),
  ch('↘', 'South East Arrow', 'arrows'),
  ch('↙', 'South West Arrow', 'arrows'),
  ch('⇐', 'Leftwards Double Arrow', 'arrows'),
  ch('⇒', 'Rightwards Double Arrow', 'arrows'),
  ch('⇑', 'Upwards Double Arrow', 'arrows'),
  ch('⇓', 'Downwards Double Arrow', 'arrows'),
  ch('⇔', 'Left Right Double Arrow', 'arrows'),
  ch('➔', 'Heavy Rightwards Arrow', 'arrows'),
];

const GREEK: UnicodeChar[] = [
  ch('α', 'Greek Small Letter Alpha', 'greek'),
  ch('β', 'Greek Small Letter Beta', 'greek'),
  ch('γ', 'Greek Small Letter Gamma', 'greek'),
  ch('δ', 'Greek Small Letter Delta', 'greek'),
  ch('ε', 'Greek Small Letter Epsilon', 'greek'),
  ch('ζ', 'Greek Small Letter Zeta', 'greek'),
  ch('η', 'Greek Small Letter Eta', 'greek'),
  ch('θ', 'Greek Small Letter Theta', 'greek'),
  ch('λ', 'Greek Small Letter Lambda', 'greek'),
  ch('μ', 'Greek Small Letter Mu', 'greek'),
  ch('π', 'Greek Small Letter Pi', 'greek'),
  ch('σ', 'Greek Small Letter Sigma', 'greek'),
  ch('τ', 'Greek Small Letter Tau', 'greek'),
  ch('φ', 'Greek Small Letter Phi', 'greek'),
  ch('ω', 'Greek Small Letter Omega', 'greek'),
  ch('Ω', 'Greek Capital Letter Omega', 'greek'),
  ch('Δ', 'Greek Capital Letter Delta', 'greek'),
  ch('Σ', 'Greek Capital Letter Sigma', 'greek'),
];

const SHAPES: UnicodeChar[] = [
  ch('▲', 'Black Up-Pointing Triangle', 'shapes'),
  ch('▼', 'Black Down-Pointing Triangle', 'shapes'),
  ch('◄', 'Black Left-Pointing Pointer', 'shapes'),
  ch('►', 'Black Right-Pointing Pointer', 'shapes'),
  ch('◆', 'Black Diamond', 'shapes'),
  ch('◇', 'White Diamond', 'shapes'),
  ch('■', 'Black Square', 'shapes'),
  ch('□', 'White Square', 'shapes'),
  ch('★', 'Black Star', 'shapes'),
  ch('☆', 'White Star', 'shapes'),
  ch('●', 'Black Circle', 'shapes'),
  ch('○', 'White Circle', 'shapes'),
  ch('♠', 'Black Spade Suit', 'shapes'),
  ch('♣', 'Black Club Suit', 'shapes'),
  ch('♥', 'Black Heart Suit', 'shapes'),
  ch('♦', 'Black Diamond Suit', 'shapes'),
];

const MUSIC: UnicodeChar[] = [
  ch('♩', 'Quarter Note', 'music', ['note']),
  ch('♪', 'Eighth Note', 'music', ['note']),
  ch('♫', 'Beamed Eighth Notes', 'music', ['notes']),
  ch('♬', 'Beamed Sixteenth Notes', 'music', ['notes']),
  ch('♭', 'Music Flat Sign', 'music', ['flat']),
  ch('♮', 'Music Natural Sign', 'music', ['natural']),
  ch('♯', 'Music Sharp Sign', 'music', ['sharp']),
  ch('𝄞', 'Musical Symbol G Clef', 'music', ['treble', 'clef']),
  ch('𝄢', 'Musical Symbol F Clef', 'music', ['bass', 'clef']),
  ch('𝄪', 'Musical Symbol Double Sharp', 'music'),
  ch('𝄫', 'Musical Symbol Double Flat', 'music'),
  ch('𝄐', 'Musical Symbol Fermata', 'music'),
];

const BOX: UnicodeChar[] = [
  ch('─', 'Box Drawings Light Horizontal', 'box'),
  ch('│', 'Box Drawings Light Vertical', 'box'),
  ch('┌', 'Box Drawings Light Down And Right', 'box'),
  ch('┐', 'Box Drawings Light Down And Left', 'box'),
  ch('└', 'Box Drawings Light Up And Right', 'box'),
  ch('┘', 'Box Drawings Light Up And Left', 'box'),
  ch('├', 'Box Drawings Light Vertical And Right', 'box'),
  ch('┤', 'Box Drawings Light Vertical And Left', 'box'),
  ch('┬', 'Box Drawings Light Down And Horizontal', 'box'),
  ch('┴', 'Box Drawings Light Up And Horizontal', 'box'),
  ch('┼', 'Box Drawings Light Vertical And Horizontal', 'box'),
  ch('═', 'Box Drawings Double Horizontal', 'box'),
  ch('║', 'Box Drawings Double Vertical', 'box'),
  ch('╔', 'Box Drawings Double Down And Right', 'box'),
  ch('╗', 'Box Drawings Double Down And Left', 'box'),
  ch('╚', 'Box Drawings Double Up And Right', 'box'),
  ch('╝', 'Box Drawings Double Up And Left', 'box'),
  ch('╠', 'Box Drawings Double Vertical And Right', 'box'),
  ch('╣', 'Box Drawings Double Vertical And Left', 'box'),
  ch('╬', 'Box Drawings Double Vertical And Horizontal', 'box'),
];

const LATIN: UnicodeChar[] = [
  ch('À', 'Latin Capital Letter A With Grave', 'latin'),
  ch('Á', 'Latin Capital Letter A With Acute', 'latin'),
  ch('Â', 'Latin Capital Letter A With Circumflex', 'latin'),
  ch('Ã', 'Latin Capital Letter A With Tilde', 'latin'),
  ch('Ä', 'Latin Capital Letter A With Diaeresis', 'latin'),
  ch('Å', 'Latin Capital Letter A With Ring Above', 'latin'),
  ch('Æ', 'Latin Capital Ligature AE', 'latin'),
  ch('Ç', 'Latin Capital Letter C With Cedilla', 'latin'),
  ch('È', 'Latin Capital Letter E With Grave', 'latin'),
  ch('É', 'Latin Capital Letter E With Acute', 'latin'),
  ch('Ê', 'Latin Capital Letter E With Circumflex', 'latin'),
  ch('Ë', 'Latin Capital Letter E With Diaeresis', 'latin'),
  ch('Ñ', 'Latin Capital Letter N With Tilde', 'latin'),
  ch('Ö', 'Latin Capital Letter O With Diaeresis', 'latin'),
  ch('Ø', 'Latin Capital Letter O With Stroke', 'latin'),
  ch('Ü', 'Latin Capital Letter U With Diaeresis', 'latin'),
  ch('ß', 'Latin Small Letter Sharp S', 'latin', ['eszett', 'german']),
  ch('à', 'Latin Small Letter A With Grave', 'latin'),
  ch('á', 'Latin Small Letter A With Acute', 'latin'),
  ch('ñ', 'Latin Small Letter N With Tilde', 'latin'),
  ch('ö', 'Latin Small Letter O With Diaeresis', 'latin'),
  ch('ü', 'Latin Small Letter U With Diaeresis', 'latin'),
  ch('ÿ', 'Latin Small Letter Y With Diaeresis', 'latin'),
  ch('Œ', 'Latin Capital Ligature OE', 'latin'),
  ch('œ', 'Latin Small Ligature OE', 'latin'),
];

const CYRILLIC: UnicodeChar[] = [
  ch('А', 'Cyrillic Capital Letter A', 'cyrillic'),
  ch('Б', 'Cyrillic Capital Letter Be', 'cyrillic'),
  ch('В', 'Cyrillic Capital Letter Ve', 'cyrillic'),
  ch('Г', 'Cyrillic Capital Letter Ghe', 'cyrillic'),
  ch('Д', 'Cyrillic Capital Letter De', 'cyrillic'),
  ch('Ж', 'Cyrillic Capital Letter Zhe', 'cyrillic'),
  ch('З', 'Cyrillic Capital Letter Ze', 'cyrillic'),
  ch('И', 'Cyrillic Capital Letter I', 'cyrillic'),
  ch('К', 'Cyrillic Capital Letter Ka', 'cyrillic'),
  ch('Л', 'Cyrillic Capital Letter El', 'cyrillic'),
  ch('М', 'Cyrillic Capital Letter Em', 'cyrillic'),
  ch('Н', 'Cyrillic Capital Letter En', 'cyrillic'),
  ch('П', 'Cyrillic Capital Letter Pe', 'cyrillic'),
  ch('Я', 'Cyrillic Capital Letter Ya', 'cyrillic'),
  ch('а', 'Cyrillic Small Letter A', 'cyrillic'),
  ch('ж', 'Cyrillic Small Letter Zhe', 'cyrillic'),
  ch('я', 'Cyrillic Small Letter Ya', 'cyrillic'),
  ch('Ё', 'Cyrillic Capital Letter Io', 'cyrillic'),
  ch('ё', 'Cyrillic Small Letter Io', 'cyrillic'),
];

const ARABIC: UnicodeChar[] = [
  ch('ا', 'Arabic Letter Alef', 'arabic'),
  ch('ب', 'Arabic Letter Beh', 'arabic'),
  ch('ت', 'Arabic Letter Teh', 'arabic'),
  ch('ث', 'Arabic Letter Theh', 'arabic'),
  ch('ج', 'Arabic Letter Jeem', 'arabic'),
  ch('ح', 'Arabic Letter Hah', 'arabic'),
  ch('خ', 'Arabic Letter Khah', 'arabic'),
  ch('د', 'Arabic Letter Dal', 'arabic'),
  ch('س', 'Arabic Letter Seen', 'arabic'),
  ch('ش', 'Arabic Letter Sheen', 'arabic'),
  ch('ص', 'Arabic Letter Sad', 'arabic'),
  ch('ض', 'Arabic Letter Dad', 'arabic'),
  ch('ع', 'Arabic Letter Ain', 'arabic'),
  ch('م', 'Arabic Letter Meem', 'arabic'),
  ch('ن', 'Arabic Letter Noon', 'arabic'),
  ch('ه', 'Arabic Letter Heh', 'arabic'),
  ch('و', 'Arabic Letter Waw', 'arabic'),
  ch('ي', 'Arabic Letter Yeh', 'arabic'),
];

const CJK: UnicodeChar[] = [
  ch('あ', 'Hiragana Letter A', 'cjk', ['japanese', 'hiragana']),
  ch('い', 'Hiragana Letter I', 'cjk', ['japanese']),
  ch('う', 'Hiragana Letter U', 'cjk', ['japanese']),
  ch('え', 'Hiragana Letter E', 'cjk', ['japanese']),
  ch('お', 'Hiragana Letter O', 'cjk', ['japanese']),
  ch('か', 'Hiragana Letter Ka', 'cjk', ['japanese']),
  ch('き', 'Hiragana Letter Ki', 'cjk', ['japanese']),
  ch('さ', 'Hiragana Letter Sa', 'cjk', ['japanese']),
  ch('た', 'Hiragana Letter Ta', 'cjk', ['japanese']),
  ch('な', 'Hiragana Letter Na', 'cjk', ['japanese']),
  ch('ア', 'Katakana Letter A', 'cjk', ['japanese', 'katakana']),
  ch('カ', 'Katakana Letter Ka', 'cjk', ['japanese']),
  ch('サ', 'Katakana Letter Sa', 'cjk', ['japanese']),
  ch('タ', 'Katakana Letter Ta', 'cjk', ['japanese']),
  ch('日', 'CJK Unified Ideograph Sun/Day', 'cjk', ['chinese', 'kanji']),
  ch('本', 'CJK Unified Ideograph Book/Origin', 'cjk', ['chinese', 'kanji', 'japan']),
  ch('語', 'CJK Unified Ideograph Language', 'cjk', ['chinese', 'kanji']),
  ch('愛', 'CJK Unified Ideograph Love', 'cjk', ['chinese', 'kanji']),
  ch('한', 'Hangul Syllable Han', 'cjk', ['korean']),
  ch('글', 'Hangul Syllable Geul', 'cjk', ['korean']),
];

const DEVANAGARI: UnicodeChar[] = [
  ch('अ', 'Devanagari Letter A', 'devanagari'),
  ch('आ', 'Devanagari Letter Aa', 'devanagari'),
  ch('इ', 'Devanagari Letter I', 'devanagari'),
  ch('उ', 'Devanagari Letter U', 'devanagari'),
  ch('ए', 'Devanagari Letter E', 'devanagari'),
  ch('क', 'Devanagari Letter Ka', 'devanagari'),
  ch('ख', 'Devanagari Letter Kha', 'devanagari'),
  ch('ग', 'Devanagari Letter Ga', 'devanagari'),
  ch('च', 'Devanagari Letter Ca', 'devanagari'),
  ch('ज', 'Devanagari Letter Ja', 'devanagari'),
  ch('ट', 'Devanagari Letter Tta', 'devanagari'),
  ch('त', 'Devanagari Letter Ta', 'devanagari'),
  ch('न', 'Devanagari Letter Na', 'devanagari'),
  ch('प', 'Devanagari Letter Pa', 'devanagari'),
  ch('म', 'Devanagari Letter Ma', 'devanagari'),
  ch('य', 'Devanagari Letter Ya', 'devanagari'),
  ch('र', 'Devanagari Letter Ra', 'devanagari'),
  ch('ल', 'Devanagari Letter La', 'devanagari'),
  ch('व', 'Devanagari Letter Va', 'devanagari'),
  ch('स', 'Devanagari Letter Sa', 'devanagari'),
  ch('ह', 'Devanagari Letter Ha', 'devanagari'),
  ch('०', 'Devanagari Digit Zero', 'devanagari'),
  ch('१', 'Devanagari Digit One', 'devanagari'),
];

const HEBREW: UnicodeChar[] = [
  ch('א', 'Hebrew Letter Alef', 'hebrew'),
  ch('ב', 'Hebrew Letter Bet', 'hebrew'),
  ch('ג', 'Hebrew Letter Gimel', 'hebrew'),
  ch('ד', 'Hebrew Letter Dalet', 'hebrew'),
  ch('ה', 'Hebrew Letter He', 'hebrew'),
  ch('ו', 'Hebrew Letter Vav', 'hebrew'),
  ch('ז', 'Hebrew Letter Zayin', 'hebrew'),
  ch('ח', 'Hebrew Letter Het', 'hebrew'),
  ch('ט', 'Hebrew Letter Tet', 'hebrew'),
  ch('י', 'Hebrew Letter Yod', 'hebrew'),
  ch('כ', 'Hebrew Letter Kaf', 'hebrew'),
  ch('ל', 'Hebrew Letter Lamed', 'hebrew'),
  ch('מ', 'Hebrew Letter Mem', 'hebrew'),
  ch('נ', 'Hebrew Letter Nun', 'hebrew'),
  ch('ס', 'Hebrew Letter Samekh', 'hebrew'),
  ch('ע', 'Hebrew Letter Ayin', 'hebrew'),
  ch('פ', 'Hebrew Letter Pe', 'hebrew'),
  ch('צ', 'Hebrew Letter Tsadi', 'hebrew'),
  ch('ק', 'Hebrew Letter Qof', 'hebrew'),
  ch('ר', 'Hebrew Letter Resh', 'hebrew'),
  ch('ש', 'Hebrew Letter Shin', 'hebrew'),
  ch('ת', 'Hebrew Letter Tav', 'hebrew'),
];

const TECHNICAL: UnicodeChar[] = [
  ch('⌘', 'Place of Interest / Command', 'technical', ['cmd', 'apple']),
  ch('⌥', 'Option Key', 'technical', ['alt']),
  ch('⌃', 'Up Arrowhead / Control', 'technical', ['ctrl']),
  ch('⇧', 'Upwards White Arrow / Shift', 'technical', ['shift']),
  ch('⌫', 'Erase to the Left / Backspace', 'technical', ['delete']),
  ch('⏎', 'Return Symbol', 'technical', ['enter']),
  ch('⎋', 'Broken Circle With Northwest Arrow / Escape', 'technical', ['esc']),
  ch('⇥', 'Rightwards Arrow to Bar / Tab', 'technical'),
];

const EMOJI: UnicodeChar[] = [
  ch('😀', 'Grinning Face', 'emoji'),
  ch('😂', 'Face With Tears of Joy', 'emoji'),
  ch('😍', 'Smiling Face With Heart-Eyes', 'emoji'),
  ch('👍', 'Thumbs Up', 'emoji'),
  ch('🔥', 'Fire', 'emoji'),
  ch('✨', 'Sparkles', 'emoji'),
  ch('🎉', 'Party Popper', 'emoji'),
  ch('❤️', 'Red Heart', 'emoji'),
  ch('🚀', 'Rocket', 'emoji'),
  ch('💡', 'Light Bulb', 'emoji'),
];

const ALL_CHARS: UnicodeChar[] = [
  ...COMMON,
  ...CURRENCY,
  ...MATH,
  ...ARROWS,
  ...GREEK,
  ...SHAPES,
  ...MUSIC,
  ...BOX,
  ...LATIN,
  ...CYRILLIC,
  ...ARABIC,
  ...CJK,
  ...DEVANAGARI,
  ...HEBREW,
  ...TECHNICAL,
  ...EMOJI,
];

export function getCharsByCategory(catId: string): UnicodeChar[] {
  if (catId === 'common') return COMMON;
  return ALL_CHARS.filter((c) => c.category === catId);
}

export function searchChars(query: string): UnicodeChar[] {
  const q = query.toLowerCase().trim();
  if (!q) return COMMON;

  return ALL_CHARS.filter(
    (c) =>
      c.char.includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.keywords?.some((k) => k.toLowerCase().includes(q))
  ).slice(0, 100);
}
