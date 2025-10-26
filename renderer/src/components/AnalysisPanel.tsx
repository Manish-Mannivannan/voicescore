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
    w === "and" // we allow "and" inside phrases like "one hundred and five"
  );
}

// parse a run of number words (e.g. ["one","hundred","and","five"]) into a numeric value
function parseNumberPhrase(words: string[]): number | null {
  // We'll build this using a rolling "current chunk" and apply scales.
  // Example: "two thousand three hundred twelve"
  // - "two" -> current = 2
  // - "thousand" -> total += current * 1000 ; current = 0
  // - "three" -> current = 3
  // - "hundred" -> current = current * 100  (so 3 * 100 = 300)
  // - "twelve" -> current += 12
  // end -> total + current

  let total = 0;
  let current = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];

    if (w === "and") {
      // skip filler word like "one hundred and five"
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
        // "X hundred" means multiply current by 100
        if (current === 0) {
          // e.g. someone just said "hundred" with no leading number, treat as 100
          current = 100;
        } else {
          current = current * 100;
        }
      } else {
        // thousand, million, etc:
        if (current === 0) {
          // "thousand" alone -> 1000
          total += scaleVal;
        } else {
          total += current * scaleVal;
        }
        current = 0;
      }
      continue;
    }

    // If we hit a word that isn't recognized, bail.
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
      // we hit a non-number word, so close out any buffered phrase
      flush();
    }
  }
  // flush any leftovers
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

function extractNumbers(text: string): number[] {
  const nums: number[] = [];

  // 1. Grab digits like "7", "2025", "42"
  const digitMatches = text.match(/\b\d+\b/g);
  if (digitMatches) {
    digitMatches.forEach(token => {
      nums.push(parseInt(token, 10));
    });
  }

  // 2. Grab spoken numbers like "twenty one", "one hundred and five"
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // strip punctuation into spaces
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
    const wordsArr = transcript.trim().length
      ? transcript.trim().split(/\s+/)
      : [];
    const wc = wordsArr.length;

    const nums = extractNumbers(transcript);

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
