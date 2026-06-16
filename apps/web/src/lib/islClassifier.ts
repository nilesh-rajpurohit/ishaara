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

// Finger extended: tip further from wrist than PIP
const up = (lm: Landmark[], tip: number, pip: number): boolean =>
  dist(lm[tip], lm[0]) > dist(lm[pip], lm[0]) * 1.08;

const thumbOut = (lm: Landmark[]): boolean =>
  dist(lm[4], lm[2]) > dist(lm[3], lm[2]) * 1.1;

// Hand scale = wrist to middle MCP
const H = (lm: Landmark[]): number => dist(lm[0], lm[9]);

const near = (lm: Landmark[], a: number, b: number, ratio: number): boolean =>
  dist(lm[a], lm[b]) < H(lm) * ratio;

// ── Single-hand ISL classifier ────────────────────────────────────────────────
export const classifyISLLetter = (lm: Landmark[]): ClassificationResult => {
  if (!lm || lm.length < 21) return { letter: "", confidence: 0 };

  const T  = thumbOut(lm);
  const I  = up(lm, 8,  6);
  const M  = up(lm, 12, 10);
  const R  = up(lm, 16, 14);
  const P  = up(lm, 20, 18);
  const Hs = H(lm);

  const tT = lm[4];
  const iT = lm[8];
  const mT = lm[12];
  const rT = lm[16];
  const pT = lm[20];

  // ── NUMBERS (single hand) ────────────────────────────────────────────────
  // 0 — O shape: thumb touches index, all fingers curled
  if (!I && !M && !R && !P && near(lm, 4, 8, 0.40) && dist(tT, iT) > Hs * 0.1)
    return { letter: "0", confidence: 0.85 };

  // 1 — index only up
  if (I && !M && !R && !P && !T)
    return { letter: "1", confidence: 0.91 };

  // 2 — index + middle up, spread
  if (I && M && !R && !P && !T && dist2D(iT, mT) > Hs * 0.25)
    return { letter: "2", confidence: 0.88 };

  // 3 — index + middle + ring up
  if (I && M && R && !P && !T)
    return { letter: "3", confidence: 0.87 };

  // 4 — all four fingers up, thumb tucked
  if (I && M && R && P && !T)
    return { letter: "4", confidence: 0.89 };

  // 5 — all five fingers open
  if (I && M && R && P && T)
    return { letter: "5", confidence: 0.89 };

  // 6 — thumb + pinky touch, rest up
  if (I && M && R && !P && T && near(lm, 4, 20, 0.40))
    return { letter: "6", confidence: 0.83 };

  // 7 — thumb + ring touch, rest up
  if (I && M && !R && P && T && near(lm, 4, 16, 0.40))
    return { letter: "7", confidence: 0.83 };

  // 8 — thumb + middle touch, index + pinky up
  if (I && !M && !R && P && T && near(lm, 4, 12, 0.40))
    return { letter: "8", confidence: 0.83 };

  // 9 — thumb + index circle, others curled
  if (!I && !M && !R && !P && T && near(lm, 4, 8, 0.35))
    return { letter: "9", confidence: 0.82 };

  // ── ISL LETTERS (from official ISLRTC chart) ──────────────────────────────

  // C — single hand curved C shape (thumb + index arc, others curled)
  if (!I && !M && !R && !P && !T
    && near(lm, 4, 8, 0.75) && dist(tT, iT) > Hs * 0.25)
    return { letter: "C", confidence: 0.80 };

  // D — index+thumb pinch pointing up, others curled
  if (I && !M && !R && !P && near(lm, 4, 8, 0.42))
    return { letter: "D", confidence: 0.83 };

  // E — index hooked/bent down, thumb side
  if (I && !M && !R && !P && T && near(lm, 8, 5, 0.65))
    return { letter: "E", confidence: 0.78 };

  // I — index pointing up with thumb, like pointing sign
  if (I && !M && !R && !P && T && iT.y < lm[5].y && dist2D(iT, tT) > Hs * 0.5)
    return { letter: "I", confidence: 0.85 };

  // J — index + middle up, bent at tips (hook shape), thumb out
  // (static approximation: index hooked + thumb out)
  if (I && !M && !R && !P && T && near(lm, 8, 7, 0.30))
    return { letter: "J", confidence: 0.74 };

  // L — index up + thumb out horizontal
  if (I && !M && !R && !P && T
    && iT.y < lm[5].y && Math.abs(tT.y - lm[2].y) < Hs * 0.6)
    return { letter: "L", confidence: 0.87 };

  // O — all fingertips touching thumb (O shape, tighter than C)
  if (!I && !M && !R && !P
    && near(lm, 4, 8, 0.38) && near(lm, 4, 12, 0.45) && near(lm, 4, 16, 0.50))
    return { letter: "O", confidence: 0.83 };

  // P — index only up, pointing down with thumb (gun pointing down)
  if (I && !M && !R && !P && T && iT.y > lm[5].y)
    return { letter: "P", confidence: 0.78 };

  // Q — index curled downward + thumb down
  if (!I && !M && !R && !P && T && tT.y > lm[2].y)
    return { letter: "Q", confidence: 0.76 };

  // T — thumb between index+middle (fist variant)
  if (!I && !M && !R && !P && T
    && near(lm, 4, 8, 0.42) && tT.y > lm[5].y)
    return { letter: "T", confidence: 0.78 };

  // U — index + middle together pointing up (close)
  if (I && M && !R && !P && !T && dist2D(iT, mT) <= Hs * 0.25)
    return { letter: "U", confidence: 0.86 };

  // V — index + middle spread (peace sign)
  if (I && M && !R && !P && !T && dist2D(iT, mT) > Hs * 0.25)
    return { letter: "V", confidence: 0.87 };

  // Y — pinky + thumb out (shaka)
  if (!I && !M && !R && P && T)
    return { letter: "Y", confidence: 0.89 };

  return { letter: "?", confidence: 0.30 };
};

// ── Two-hand ISL classifier ───────────────────────────────────────────────────
// Used for: A, B, F, G, H, K, M, N, R, S, W, X, Z
export const classifyTwoHands = (
  h1: Landmark[],
  h2: Landmark[],
): ClassificationResult => {
  if (!h1 || !h2 || h1.length < 21 || h2.length < 21)
    return classifyISLLetter(h1);

  const d = dist2D;
  const wristDist = d(h1[0], h2[0]);

  // If wrists too far apart = false positive second hand
  if (wristDist > 0.60) return classifyISLLetter(h1);

  const T1 = thumbOut(h1), T2 = thumbOut(h2);
  const I1 = up(h1, 8, 6),  I2 = up(h2, 8, 6);
  const M1 = up(h1, 12,10), M2 = up(h2, 12,10);
  const R1 = up(h1, 16,14), R2 = up(h2, 16,14);
  const P1 = up(h1, 20,18), P2 = up(h2, 20,18);

  // Tips
  const h1iT = h1[8], h2iT = h2[8];
  const h1tT = h1[4], h2tT = h2[4];
  const h1mT = h1[12],h2mT = h2[12];
  const h1pT = h1[20],h2pT = h2[20];

  // A — both hands fists touching/close, thumbs up side
  if (!I1 && !M1 && !R1 && !P1 && !I2 && !M2 && !R2 && !P2 && wristDist < 0.30)
    return { letter: "A", confidence: 0.87 };

  // B — both hands together, all fingers up flat (like open book)
  if (I1 && M1 && R1 && P1 && I2 && M2 && R2 && P2 && !T1 && !T2 && wristDist < 0.35)
    return { letter: "B", confidence: 0.86 };

  // F — one hand index+thumb pinch, other hand fingers spread (from chart)
  if ((!I1 && !M1 && near(h1, 4, 8, 0.38) && I2 && M2 && R2 && P2)
   || (!I2 && !M2 && near(h2, 4, 8, 0.38) && I1 && M1 && R1 && P1))
    return { letter: "F", confidence: 0.82 };

  // G — both hands: index+thumb pointing, mirrored (two-hand G in ISL)
  if (I1 && !M1 && !R1 && !P1 && T1 && I2 && !M2 && !R2 && !P2 && T2 && wristDist < 0.40)
    return { letter: "G", confidence: 0.80 };

  // H — both hands, fingers horizontal together
  if (I1 && M1 && !R1 && !P1 && !T1 && I2 && M2 && !R2 && !P2 && !T2 && wristDist < 0.35)
    return { letter: "H", confidence: 0.81 };

  // K — one hand open, other hand index pointing up (from chart: hand + index)
  if (I1 && !M1 && !R1 && !P1 && I2 && M2 && R2 && P2 && wristDist < 0.35)
    return { letter: "K", confidence: 0.79 };

  // M — both hands open/spread (from chart: palms facing)
  if (I1 && M1 && R1 && P1 && T1 && I2 && M2 && R2 && P2 && T2 && wristDist < 0.40)
    return { letter: "M", confidence: 0.80 };

  // N — both hands open (like M but slightly different — N in ISL chart shows two open palms)
  if (I1 && M1 && R1 && P1 && I2 && M2 && R2 && P2 && !T1 && !T2 && wristDist < 0.45)
    return { letter: "N", confidence: 0.80 };

  // R — both hands clasp/interlock
  if (!I1 && !M1 && !R1 && !I2 && !M2 && !R2 && wristDist < 0.30)
    return { letter: "R", confidence: 0.80 };

  // S — both hands fists, one over the other (S in ISL = stacked fists)
  if (!I1 && !M1 && !R1 && !P1 && !I2 && !M2 && !R2 && !P2
    && Math.abs(h1[0].y - h2[0].y) > 0.08 && wristDist < 0.35)
    return { letter: "S", confidence: 0.79 };

  // W — three fingers up on both hands (W = two V shapes together)
  if (I1 && M1 && R1 && !P1 && !T1 && I2 && M2 && R2 && !P2 && !T2 && wristDist < 0.45)
    return { letter: "W", confidence: 0.82 };

  // X — both index fingers crossed
  if (I1 && !M1 && !R1 && !P1 && I2 && !M2 && !R2 && !P2
    && d(h1iT, h2iT) < 0.10)
    return { letter: "X", confidence: 0.83 };

  // Z — one hand index up, other hand holding (static Z approximation)
  if (I1 && !M1 && !R1 && !P1 && !I2 && !M2 && !R2 && !P2 && wristDist < 0.40)
    return { letter: "Z", confidence: 0.74 };

  // fallback to single hand
  return classifyISLLetter(h1);
};