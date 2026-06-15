export interface ClassificationResult {
  letter: string;
  confidence: number;
}

interface Landmark {
  x: number;
  y: number;
  z: number;
}

const dist = (a: Landmark, b: Landmark): number =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);

const dist2D = (a: Landmark, b: Landmark): number =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

// Is finger extended? Tip must be further from wrist than pip
const up = (lm: Landmark[], tip: number, pip: number, mcp: number): boolean =>
  dist(lm[tip], lm[0]) > dist(lm[pip], lm[0]) * 1.05;

// Thumb extended check
const thumbUp = (lm: Landmark[]): boolean =>
  dist(lm[4], lm[2]) > dist(lm[3], lm[2]) * 1.1;

// Normalised hand scale
const handScale = (lm: Landmark[]): number => dist(lm[0], lm[9]);

// Tips close relative to hand scale
const near = (lm: Landmark[], a: number, b: number, ratio: number): boolean =>
  dist(lm[a], lm[b]) < handScale(lm) * ratio;

export const classifyISLLetter = (lm: Landmark[]): ClassificationResult => {
  if (!lm || lm.length < 21) return { letter: "", confidence: 0 };

  const T = thumbUp(lm);
  const I = up(lm, 8,  6,  5);
  const M = up(lm, 12, 10, 9);
  const R = up(lm, 16, 14, 13);
  const P = up(lm, 20, 18, 17);

  const H  = handScale(lm);
  const tT = lm[4];
  const iT = lm[8];
  const mT = lm[12];
  const rT = lm[16];
  const pT = lm[20];

  // ISL A — both hands fists together (single hand: closed fist, thumb up side)
  if (!I && !M && !R && !P && T && !near(lm, 4, 8, 0.4))
    return { letter: "A", confidence: 0.88 };

  // ISL B — four fingers up, thumb tucked; fingers together
  if (I && M && R && P && !T && dist2D(iT, pT) < H * 1.2)
    return { letter: "B", confidence: 0.90 };

  // ISL C — curved hand, C shape (thumb + index form arc)
  if (!I && !M && !R && !P && !T
    && near(lm, 4, 8, 0.8) && dist(tT, iT) > H * 0.3)
    return { letter: "C", confidence: 0.80 };

  // ISL D — index up, thumb touches middle (single hand)
  if (I && !M && !R && !P && near(lm, 4, 12, 0.5))
    return { letter: "D", confidence: 0.84 };

  // ISL E — all fingers bent/curled, thumb tucked
  if (!I && !M && !R && !P && !T && !near(lm, 4, 8, 0.4))
    return { letter: "E", confidence: 0.76 };

  // ISL F — index + thumb pinch, other 3 up
  if (!I && M && R && P && near(lm, 4, 8, 0.35))
    return { letter: "F", confidence: 0.84 };

  // ISL G — index + thumb horizontal pointing sideways
  if (I && !M && !R && !P && T
    && Math.abs(iT.y - lm[5].y) < H * 0.4
    && dist2D(iT, tT) > H * 0.5)
    return { letter: "G", confidence: 0.80 };

  // ISL H — index + middle horizontal side by side
  if (I && M && !R && !P && !T
    && Math.abs(iT.y - lm[5].y) < H * 0.5
    && dist2D(iT, mT) < H * 0.4)
    return { letter: "H", confidence: 0.81 };

  // ISL I — pinky only up
  if (!I && !M && !R && P && !T)
    return { letter: "I", confidence: 0.90 };

  // ISL J — pinky up + thumb out (same static as Y in many charts, treat separately by J = pinky only + motion, static = I)
  // ISL K — index + middle up, thumb between them touching middle PIP
  if (I && M && !R && !P && T && near(lm, 4, 12, 0.55))
    return { letter: "K", confidence: 0.78 };

  // ISL L — index up + thumb out horizontal (L shape)
  if (I && !M && !R && !P && T
    && iT.y < lm[5].y
    && Math.abs(tT.y - lm[2].y) < H * 0.5)
    return { letter: "L", confidence: 0.87 };

  // ISL M — three fingers (index+middle+ring) over tucked thumb
  if (!I && !M && !R && !P && !T
    && near(lm, 4, 8, 0.55) && near(lm, 4, 12, 0.6))
    return { letter: "M", confidence: 0.74 };

  // ISL N — index + middle folded, thumb between index+middle
  if (!I && !M && !R && !P && !T
    && near(lm, 4, 8, 0.42) && !near(lm, 4, 12, 0.42))
    return { letter: "N", confidence: 0.74 };

  // ISL O — all fingertips meet, forming O
  if (!I && !M && !R && !P
    && near(lm, 4, 8, 0.38) && near(lm, 4, 12, 0.45) && near(lm, 4, 16, 0.50))
    return { letter: "O", confidence: 0.83 };

  // ISL P — index + middle pointing down, thumb out
  if (I && M && !R && !P && T && iT.y > lm[5].y)
    return { letter: "P", confidence: 0.78 };

  // ISL Q — index + thumb pointing down
  if (I && !M && !R && !P && T
    && iT.y > lm[5].y && tT.y > lm[2].y)
    return { letter: "Q", confidence: 0.76 };

  // ISL R — index + middle crossed
  if (I && M && !R && !P && !T
    && Math.abs(iT.x - mT.x) < H * 0.15
    && dist2D(iT, mT) < H * 0.3)
    return { letter: "R", confidence: 0.80 };

  // ISL S — fist with thumb over fingers
  if (!I && !M && !R && !P && !T && near(lm, 4, 8, 0.55))
    return { letter: "S", confidence: 0.77 };

  // ISL T — thumb between index + middle, index curled
  if (!I && !M && !R && !P && T && near(lm, 4, 8, 0.4) && tT.y > lm[5].y)
    return { letter: "T", confidence: 0.79 };

  // ISL U — index + middle up together (close, parallel)
  if (I && M && !R && !P && !T && dist2D(iT, mT) < H * 0.3)
    return { letter: "U", confidence: 0.86 };

  // ISL V — index + middle up spread (peace)
  if (I && M && !R && !P && !T && dist2D(iT, mT) >= H * 0.3)
    return { letter: "V", confidence: 0.87 };

  // ISL W — index + middle + ring up spread
  if (I && M && R && !P && !T)
    return { letter: "W", confidence: 0.86 };

  // ISL X — index + thumb crossed/hooked (both hands)
  if (I && !M && !R && !P && !T && near(lm, 8, 5, 0.6))
    return { letter: "X", confidence: 0.74 };

  // ISL Y — thumb + pinky out (shaka)
  if (!I && !M && !R && P && T)
    return { letter: "Y", confidence: 0.89 };

  // ISL Z — index only, drawing Z (static: same as 1/index up — treat as index pointing with slight curve)
  // Numbers
  if (I && M && R && P && T)
    return { letter: "5", confidence: 0.88 };

  if (I && M && R && P && !T)
    return { letter: "4", confidence: 0.88 };

  if (I && M && R && !P && !T)
    return { letter: "3", confidence: 0.87 };

  if (I && M && !R && !P && !T && dist2D(iT, mT) > H * 0.3)
    return { letter: "2", confidence: 0.87 };

  if (I && !M && !R && !P && !T)
    return { letter: "1", confidence: 0.90 };

  return { letter: "?", confidence: 0.30 };
};

export const classifyTwoHands = (
  hand1: Landmark[],
  hand2: Landmark[],
): ClassificationResult => {
  if (!hand1 || !hand2 || hand1.length < 21 || hand2.length < 21)
    return classifyISLLetter(hand1);

  const d2 = (a: Landmark, b: Landmark) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  // Guard: if wrists far apart, second hand is a false positive
  if (d2(hand1[0], hand2[0]) > 0.55)
    return classifyISLLetter(hand1);

  const h1i = hand1[8], h2i = hand2[8];
  const h1t = hand1[4], h2t = hand2[4];

  // ISL A — both hands closed fists together
  const T1 = thumbUp(hand1), T2 = thumbUp(hand2);
  const I1 = up(hand1, 8, 6, 5), I2 = up(hand2, 8, 6, 5);
  const M1 = up(hand1, 12, 10, 9), M2 = up(hand2, 12, 10, 9);
  const R1 = up(hand1, 16, 14, 13);
  const P1 = up(hand1, 20, 18, 17), P2 = up(hand2, 20, 18, 17);

  if (!I1 && !M1 && !R1 && !P1 && !I2 && !M2 && !P2)
    return { letter: "A", confidence: 0.88 };

  // ISL X — index fingers crossed
  if (I1 && !M1 && I2 && !M2 && d2(h1i, h2i) < 0.08)
    return { letter: "X", confidence: 0.82 };

  // ISL R — hands crossing
  if (d2(h1i, h2t) < 0.07 || d2(h2i, h1t) < 0.07)
    return { letter: "R", confidence: 0.80 };

  return classifyISLLetter(hand1);
};