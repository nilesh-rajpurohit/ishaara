export interface ClassificationResult {
  letter: string;
  confidence: number;
}

interface Landmark {
  x: number;
  y: number;
  z: number;
}

// ─── Core distance helper ────────────────────────────────────────────────────
const dist = (a: Landmark, b: Landmark): number =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);

const dist2D = (a: Landmark, b: Landmark): number =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

// ─── Finger state helpers ────────────────────────────────────────────────────
// Returns true if a finger is extended (tip is farther from MCP than PIP is)
const up = (lm: Landmark[], tip: number, pip: number, mcp: number): boolean =>
  dist(lm[tip], lm[mcp]) > dist(lm[pip], lm[mcp]) * 1.1;

// Thumb is extended when tip is far from its base (landmark 2)
const thumbUp = (lm: Landmark[]): boolean =>
  dist(lm[4], lm[2]) > dist(lm[3], lm[2]) * 1.1;

// Fingertip-to-fingertip proximity (normalised to hand size)
const close = (lm: Landmark[], a: number, b: number, ratio: number, H: number): boolean =>
  dist(lm[a], lm[b]) < H * ratio;

// ─── Single-hand classifier ──────────────────────────────────────────────────
export const classifyISLLetter = (lm: Landmark[]): ClassificationResult => {
  if (!lm || lm.length < 21) return { letter: "", confidence: 0 };

  // Named booleans for each finger
  const T  = thumbUp(lm);
  const I  = up(lm, 8,  6,  5);   // Index
  const M  = up(lm, 12, 10, 9);   // Middle
  const R  = up(lm, 16, 14, 13);  // Ring
  const P  = up(lm, 20, 18, 17);  // Pinky

  // Hand size reference (wrist → index MCP × 3 for proportional thresholds)
  const H = dist(lm[0], lm[5]) * 3;

  // Tip references
  const tTip = lm[4];   // Thumb
  const iTip = lm[8];   // Index
  const mTip = lm[12];  // Middle
  const rTip = lm[16];  // Ring
  const pTip = lm[20];  // Pinky

  // ── Numbers 0-9 ────────────────────────────────────────────────────────────

  // 0 — all fingers curled into a circle touching thumb
  if (!I && !M && !R && !P && !T
    && close(lm, 4, 8, 0.30, H)
    && dist(tTip, mTip) < H * 0.45
  ) return { letter: "0", confidence: 0.85 };

  // 1 — index only, others folded
  if (I && !M && !R && !P && !T)
    return { letter: "1", confidence: 0.91 };

  // 2 — index + middle up, spread (peace/V)
  if (I && M && !R && !P && !T && dist2D(iTip, mTip) > H * 0.15)
    return { letter: "2", confidence: 0.88 };

  // 3 — index + middle + ring up
  if (I && M && R && !P && !T)
    return { letter: "3", confidence: 0.87 };

  // 4 — all fingers up, thumb folded
  if (I && M && R && P && !T)
    return { letter: "4", confidence: 0.90 };

  // 5 — all five up (open hand) — LAST resort so it doesn't swallow everything
  if (I && M && R && P && T)
    return { letter: "5", confidence: 0.88 };

  // 6 — thumb + pinky touch, others extended
  if (I && M && R && !P && T && close(lm, 4, 20, 0.30, H))
    return { letter: "6", confidence: 0.83 };

  // 7 — thumb + ring touch, others extended
  if (I && M && !R && P && T && close(lm, 4, 16, 0.30, H))
    return { letter: "7", confidence: 0.83 };

  // 8 — thumb + middle touch, index extended
  if (I && !M && !R && P && T && close(lm, 4, 12, 0.30, H))
    return { letter: "8", confidence: 0.83 };

  // 9 — thumb + index form ring, middle/ring/pinky curled
  if (!I && !M && !R && !P && close(lm, 4, 8, 0.28, H) && T)
    return { letter: "9", confidence: 0.82 };

  // ── Letters A-Z ────────────────────────────────────────────────────────────

  // A — fist, thumb to the side (not touching fingers)
  if (!I && !M && !R && !P && T
    && !close(lm, 4, 8, 0.30, H)
  ) return { letter: "A", confidence: 0.90 };

  // B — four fingers up, thumb tucked across palm
  if (I && M && R && P && !T)
    return { letter: "B", confidence: 0.92 };

  // C — curved open hand, thumb and index form C shape
  if (!I && !M && !R && !P && !T
    && close(lm, 4, 8, 0.65, H)
    && dist(tTip, iTip) > H * 0.18
  ) return { letter: "C", confidence: 0.80 };

  // D — index up, thumb touches middle tip, ring+pinky folded
  if (I && !M && !R && !P && close(lm, 4, 12, 0.35, H))
    return { letter: "D", confidence: 0.85 };

  // E — all fingers curled, thumb tucked under fingers
  if (!I && !M && !R && !P && !T
    && !close(lm, 4, 8, 0.30, H)
  ) return { letter: "E", confidence: 0.78 };

  // F — index + thumb pinch, middle/ring/pinky extended
  if (!I && M && R && P && close(lm, 4, 8, 0.28, H))
    return { letter: "F", confidence: 0.85 };

  // G — index points sideways, thumb parallel, others folded
  if (I && !M && !R && !P && T
    && Math.abs(iTip.y - lm[5].y) < H * 0.25
    && iTip.x > lm[5].x   // index pointing sideways
  ) return { letter: "G", confidence: 0.80 };

  // H — index + middle pointing horizontal together
  if (I && M && !R && !P && !T
    && Math.abs(iTip.y - lm[5].y) < H * 0.35
    && dist2D(iTip, mTip) < H * 0.18
  ) return { letter: "H", confidence: 0.82 };

  // I — pinky only up
  if (!I && !M && !R && P && !T)
    return { letter: "I", confidence: 0.90 };

  // J — pinky up + thumb out (same as I but J has motion — static = I, flag as J if thumb out)
  if (!I && !M && !R && P && T)
    return { letter: "Y", confidence: 0.90 };   // Y is same static shape as J in many ISL variants — keep Y

  // K — index + middle up, thumb between them touching middle
  if (I && M && !R && !P && T && close(lm, 4, 12, 0.40, H))
    return { letter: "K", confidence: 0.78 };

  // L — index up, thumb out at right angle (L shape)
  if (I && !M && !R && !P && T
    && iTip.y < lm[5].y    // index pointing up
    && Math.abs(tTip.y - lm[5].y) < H * 0.35  // thumb horizontal
  ) return { letter: "L", confidence: 0.88 };

  // M — three fingers (index+middle+ring) folded over tucked thumb
  if (!I && !M && !R && !P && !T
    && close(lm, 4, 8, 0.50, H)    // thumb near index
    && close(lm, 4, 12, 0.55, H)   // thumb near middle  
  ) return { letter: "M", confidence: 0.75 };

  // N — two fingers (index+middle) folded over tucked thumb
  if (!I && !M && !R && !P && !T
    && close(lm, 4, 8, 0.38, H)
    && !close(lm, 4, 12, 0.38, H)
  ) return { letter: "N", confidence: 0.75 };

  // O — all fingertips meet thumb in O shape
  if (!I && !M && !R && !P
    && close(lm, 4, 8, 0.30, H)
    && close(lm, 4, 12, 0.35, H)
    && close(lm, 4, 16, 0.40, H)
  ) return { letter: "O", confidence: 0.83 };

  // P — index + middle point down, thumb out
  if (I && M && !R && !P && T
    && iTip.y > lm[5].y     // index pointing downward
  ) return { letter: "P", confidence: 0.78 };

  // Q — index + thumb point down, others folded
  if (I && !M && !R && !P && T
    && iTip.y > lm[5].y
    && tTip.y > lm[2].y
  ) return { letter: "Q", confidence: 0.76 };

  // R — index + middle crossed (index over middle)
  if (I && M && !R && !P && !T
    && iTip.x < mTip.x      // index crosses over middle (mirrored camera)
    && close(lm, 8, 12, 0.20, H)
  ) return { letter: "R", confidence: 0.80 };

  // S — fist with thumb over fingers
  if (!I && !M && !R && !P && !T
    && tTip.y > iTip.y     // thumb rests over knuckles
  ) return { letter: "S", confidence: 0.78 };

  // T — thumb between index and middle
  if (!I && !M && !R && !P && T
    && close(lm, 4, 8, 0.35, H)
    && tTip.y > iTip.y
  ) return { letter: "T", confidence: 0.80 };

  // U — index + middle together pointing up
  if (I && M && !R && !P && !T && dist2D(iTip, mTip) < H * 0.15)
    return { letter: "U", confidence: 0.86 };

  // V — index + middle spread (peace sign)
  if (I && M && !R && !P && !T && dist2D(iTip, mTip) >= H * 0.15)
    return { letter: "V", confidence: 0.88 };

  // W — index + middle + ring up, spread
  if (I && M && R && !P && !T)
    return { letter: "W", confidence: 0.87 };

  // X — index hooked / crooked
  if (I && !M && !R && !P && !T
    && dist(iTip, lm[5]) < H * 0.60   // tip pulled back toward palm
  ) return { letter: "X", confidence: 0.75 };

  // Y — thumb + pinky out (shaka)
  if (!I && !M && !R && P && T)
    return { letter: "Y", confidence: 0.90 };

  // Z — index only (same as 1 but Z has motion — static we return 1; 
  //     include here only if 1 didn't fire, shouldn't reach here)

  return { letter: "?", confidence: 0.30 };
};

// ─── Two-hand classifier ─────────────────────────────────────────────────────
// Only invoked when MediaPipe confidently detects EXACTLY 2 hands
export const classifyTwoHands = (
  hand1: Landmark[],
  hand2: Landmark[],
  handedness?: string[]  // "Left" | "Right" from MediaPipe
): ClassificationResult => {
  if (!hand1 || !hand2 || hand1.length < 21 || hand2.length < 21)
    return classifyISLLetter(hand1);

  // Use 2D for cross-hand distances (they're in the same camera plane)
  const d = (a: Landmark, b: Landmark) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const wristDist = d(hand1[0], hand2[0]);

  // Only attempt two-hand signs if hands are close enough to actually interact
  // (if they're far apart, the second "hand" is likely a false positive)
  if (wristDist > 0.55) {
    return classifyISLLetter(hand1);
  }

  const h1i = hand1[8],  h2i = hand2[8];   // Index tips
  const h1t = hand1[4],  h2t = hand2[4];   // Thumb tips
  const h1m = hand1[12], h2m = hand2[12];  // Middle tips

  const indexTouching  = d(h1i, h2i) < 0.06;
  const thumbTouching  = d(h1t, h2t) < 0.06;
  const indexThumbCross = d(h1i, h2t) < 0.06 || d(h2i, h1t) < 0.06;
  const middleTouching = d(h1m, h2m) < 0.06;

  if (indexTouching && thumbTouching)  return { letter: "N", confidence: 0.85 };
  if (indexTouching && middleTouching) return { letter: "R", confidence: 0.82 };
  if (thumbTouching)                   return { letter: "T", confidence: 0.80 };
  if (indexThumbCross)                 return { letter: "X", confidence: 0.78 };

  // Fall back to single-hand classification on dominant hand
  return classifyISLLetter(hand1);
};