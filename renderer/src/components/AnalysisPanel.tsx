import React, { useState, useMemo } from 'react';

type Props = {
  transcript: string;
};

// base numbers
const SMALL_NUMBERS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

// tens (20,30,...,90)
const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

// scale words
const SCALES: Record<string, number> = {
  hundred: 100,
  thousand: 1000,
  million: 1000000,
};

// helper: check if a word is number-ish
function isNumberWord(w: string): boolean {
  return (
    w in SMALL_NUMBERS ||
    w in TENS ||
    w in SCALES ||
    w === "and" // allow "and" inside phrases like "one hundred and five"
  );
}

// parse a run of number words (e.g. ["one","hundred","and","five"]) into a numeric value
function parseNumberPhrase(words: string[]): number | null {
  let total = 0;
  let current = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];

    if (w === "and") {
      continue;
    }

    if (w in SMALL_NUMBERS) {
      current += SMALL_NUMBERS[w];
      continue;
    }

    if (w in TENS) {
      current += TENS[w];
      continue;
    }

    if (w in SCALES) {
      const scaleVal = SCALES[w];

      if (scaleVal === 100) {
        // "X hundred"
        if (current === 0) {
          current = 100;
        } else {
          current = current * 100;
        }
      } else {
        // thousand, million, etc.
        if (current === 0) {
          total += scaleVal;
        } else {
          total += current * scaleVal;
        }
        current = 0;
      }
      continue;
    }

    // hit a word that's not part of a number phrase
    return null;
  }

  const finalNumber = total + current;
  if (isNaN(finalNumber)) return null;
  return finalNumber;
}

// break transcript into sequences of number words and parse them
function extractSpokenNumbersFromWords(allWords: string[]): number[] {
  const results: number[] = [];
  let buffer: string[] = [];

  function flush() {
    if (buffer.length === 0) return;
    const parsed = parseNumberPhrase(buffer);
    if (parsed !== null) {
      results.push(parsed);
    }
    buffer = [];
  }

  for (let i = 0; i < allWords.length; i++) {
    const w = allWords[i];

    if (isNumberWord(w)) {
      buffer.push(w);
    } else {
      flush();
    }
  }
  flush();

  return results;
}

function isPrime(n: number): boolean {
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0) return n === 2;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

// NEW: remove timestamp blocks and bracketed timing metadata
function stripTimestamps(raw: string): string {
  let cleaned = raw;

  // pattern like [00:00:00.000 --> 00:00:07.000]
  cleaned = cleaned.replace(
    /\[\s*\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}\s*\]/g,
    " "
  );

  // any leftover [ ... ] chunks that look like timing/noise
  cleaned = cleaned.replace(/\[[^\]]*\]/g, " ");

  return cleaned;
}

// NEW: real word splitter that drops empty + punctuation
function getWordsForCount(text: string): string[] {
  // keep only letters/numbers/' for contractions, turn rest into space
  const normalized = text
    .replace(/[^a-zA-Z0-9']/g, " ")
    .trim();

  if (!normalized) return [];
  return normalized.split(/\s+/);
}

// extract actual numbers (digits and spoken) from cleaned text
function extractNumbers(text: string): number[] {
  const nums: number[] = [];

  // 1. digit-based numbers, e.g. "7", "2025", "42"
  const digitMatches = text.match(/\b\d+\b/g);
  if (digitMatches) {
    digitMatches.forEach(token => {
      nums.push(parseInt(token, 10));
    });
  }

  // 2. spoken numbers e.g. "twenty one"
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const spokenNums = extractSpokenNumbersFromWords(words);
  nums.push(...spokenNums);

  return nums;
}

const AnalysisPanel: React.FC<Props> = ({ transcript }) => {
  const [openList, setOpenList] = useState(false);

  const {
    wordCount,
    longEnough,
    numbersList,
    hasTwoPrimes
  } = useMemo(() => {
    // 1. Clean the transcript so we don't treat timestamps as speech
    const cleanedTranscript = stripTimestamps(transcript);

    // 2. Word count from cleaned human text only
    const wordsArr = getWordsForCount(cleanedTranscript);
    const wc = wordsArr.length;

    // 3. Numbers from cleaned transcript
    const nums = extractNumbers(cleanedTranscript);

    // 4. Prime check
    const primeCount = nums.filter(n => isPrime(n)).length;

    return {
      wordCount: wc,
      longEnough: wc > 20,
      numbersList: nums,
      hasTwoPrimes: primeCount >= 2
    };
  }, [transcript]);

  return (
    <div className="card">
      <h2>Analysis</h2>

      <div className="analysis-row">
        <strong>Word count:</strong> {wordCount}{" "}
        <span>({longEnough ? "✅ >20 words" : "❌ ≤20 words"})</span>
      </div>

      <div className="analysis-row">
        <strong>Numbers said</strong> {numbersList.length}
        <button
          style={{ marginLeft: '0.5rem' }}
          onClick={() => setOpenList(!openList)}
        >
          {openList ? "Hide numbers" : "Show numbers"}
        </button>
      </div>

      {openList && (
        <div className="numbers-box">
          [{numbersList.join(", ")}]
        </div>
      )}

      <div className="analysis-row">
        <strong>At least two primes?</strong>{" "}
        {hasTwoPrimes ? "✅ Yes" : "❌ No"}
      </div>
    </div>
  );
};

export default AnalysisPanel;
