export interface HydrationQuote {
  text: string;
  topic: string;
}

export const HYDRATION_QUOTES: HydrationQuote[] = [
  {
    text: 'Segelas air di pagi hari membantu membangunkan metabolisme dan fokusmu lebih cepat.',
    topic: 'Energi Pagi',
  },
  {
    text: 'Dehidrasi ringan saja bisa bikin cepat lelah dan sulit konsentrasi. Yuk teguk air dulu!',
    topic: 'Fokus Otak',
  },
  {
    text: 'Minum air teratur sepanjang hari jauh lebih efektif daripada meneguk banyak sekaligus saat haus.',
    topic: 'Ritme Sehat',
  },
  {
    text: 'Kulit yang kenyal dan tampak segar berawal dari hidrasi yang terjaga dari dalam tubuh.',
    topic: 'Kulit Sehat',
  },
  {
    text: 'Saat merasa lapar mendadak di antara jam makan, coba minum segelas air dulu—sering kali itu rasa haus.',
    topic: 'Sinyal Tubuh',
  },
  {
    text: 'Air putih adalah bahan bakar paling sederhana tanpa kalori untuk menjaga staminamu seharian.',
    topic: 'Stamina Harian',
  },
  {
    text: 'Menunggu haus berarti tubuhmu sudah mulai kekurangan cairan. Biasakan minum sebelum haus datang.',
    topic: 'Pencegahan',
  },
  {
    text: 'Hidrasi yang cukup membantu menjaga suasana hati tetap stabil dan mengurangi rasa tegang.',
    topic: 'Suasana Hati',
  },
  {
    text: 'Otot yang terhidrasi bekerja lebih optimal dan membantu pemulihan tubuh lebih cepat setelah bergerak.',
    topic: 'Kebugaran',
  },
  {
    text: 'Satu teguk kecil setiap jam lebih mudah dijaga daripada mengejar target sekaligus di malam hari.',
    topic: 'Konsistensi',
  },
  {
    text: 'Minum air cukup membantu kerja ginjal menyaring zat sisa dan menjaga keseimbangan cairan tubuh.',
    topic: 'Kesehatan Organ',
  },
  {
    text: 'Sakit kepala ringan di siang hari sering reda setelah tubuh mendapat asupan air yang cukup.',
    topic: 'Kenyamanan',
  },
  {
    text: 'Menaruh botol minum di dekat meja kerja atau belajar adalah trik sederhana agar tidak lupa minum.',
    topic: 'Kebiasaan Baik',
  },
  {
    text: 'Sekitar 75% jaringan otak terdiri dari air—beri otakmu cairan cukup agar ide tetap mengalir lancar.',
    topic: 'Daya Pikir',
  },
  {
    text: 'Langkah kecil seperti menambah satu gelas hari ini sudah membawa dampak besar untuk kesehatan esok hari.',
    topic: 'Motivasi',
  },
];

const LAST_QUOTE_STORAGE_KEY = 'tetes:lastQuoteIdx';

export function pickDifferentQuoteIndex(
  total: number,
  prevIndex: number | null,
  randomFn: () => number = Math.random
): number {
  if (total <= 1) return 0;
  if (prevIndex === null || prevIndex < 0 || prevIndex >= total) {
    return Math.floor(randomFn() * total);
  }
  const offset = 1 + Math.floor(randomFn() * (total - 1));
  return (prevIndex + offset) % total;
}

function readLastQuoteIndex(): number | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(LAST_QUOTE_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isInteger(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeLastQuoteIndex(idx: number): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(LAST_QUOTE_STORAGE_KEY, String(idx));
  } catch {
    // Abaikan jika localStorage dinonaktifkan atau penuh
  }
}

let sessionQuoteIndex: number | null = null;

/**
 * Mengembalikan satu kutipan hidrasi per sesi buka aplikasi,
 * dijamin berganti dari kutipan sesi sebelumnya saat aplikasi dibuka ulang.
 */
export function getSessionHydrationQuote(): HydrationQuote {
  if (sessionQuoteIndex === null) {
    const prev = readLastQuoteIndex();
    sessionQuoteIndex = pickDifferentQuoteIndex(HYDRATION_QUOTES.length, prev);
    writeLastQuoteIndex(sessionQuoteIndex);
  }
  return HYDRATION_QUOTES[sessionQuoteIndex] ?? HYDRATION_QUOTES[0];
}
