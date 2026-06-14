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
  Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));

const fingerExtended = (lm: Landmark[], tip: number, pip: number, mcp: number): boolean =>
  dist(lm[tip], lm[mcp]) > dist(lm[pip], lm[mcp]) * 1.05;

const thumbExtended = (lm: Landmark[]): boolean =>
  dist(lm[4], lm[2]) > dist(lm[3], lm[2]) * 1.05;

const fingertipsClose = (lm: Landmark[], a: number, b: number, threshold: number): boolean =>
  dist(lm[a], lm[b]) < threshold;

export const classifyISLLetter = (lm: Landmark[]): ClassificationResult => {
  if (!lm || lm.length < 21) return { letter: "", confidence: 0 };

  const T = thumbExtended(lm);
  const I = fingerExtended(lm, 8, 6, 5);
  const M = fingerExtended(lm, 12, 10, 9);
  const R = fingerExtended(lm, 16, 14, 13);
  const P = fingerExtended(lm, 20, 18, 17);

  const wrist = lm[0];
  const imcp  = lm[5];
  const H     = dist(wrist, imcp) * 3;

  const iTip = lm[8];
  const mTip = lm[12];
  const tTip = lm[4];

  // A: fist, thumb up/side
  if (!I && !M && !R && !P && T)
    return { letter: "A", confidence: 0.90 };

  // B: all four fingers up, thumb tucked
  if (I && M && R && P && !T)
    return { letter: "B", confidence: 0.92 };

  // C: curved - thumb and index form C, others slightly curled
  if (!I && !M && !R && !P && !T && dist(tTip, iTip) < H * 0.7 && dist(tTip, iTip) > H * 0.2)
    return { letter: "C", confidence: 0.80 };

  // D: index up, thumb touches middle fingertip
  if (I && !M && !R && !P && fingertipsClose(lm, 4, 12, H * 0.35))
    return { letter: "D", confidence: 0.85 };

  // E: all fingers curled, thumb tucked under
  if (!I && !M && !R && !P && !T)
    return { letter: "E", confidence: 0.78 };

  // F: index+thumb touch, middle+ring+pinky up
  if (!I && M && R && P && fingertipsClose(lm, 4, 8, H * 0.28))
    return { letter: "F", confidence: 0.85 };

  // G: index points sideways + thumb parallel
  if (I && !M && !R && !P && T && Math.abs(iTip.y - lm[5].y) < H * 0.25)
    return { letter: "G", confidence: 0.80 };

  // H: index + middle point horizontal
  if (I && M && !R && !P && !T && Math.abs(iTip.y - lm[5].y) < H * 0.35)
    return { letter: "H", confidence: 0.82 };

  // I: pinky only
  if (!I && !M && !R && P && !T)
    return { letter: "I", confidence: 0.90 };

  // K: index + middle up, thumb between them
  if (I && M && !R && !P && T)
    return { letter: "K", confidence: 0.78 };

  // L: index up + thumb out (L shape)
  if (I && !M && !R && !P && T && iTip.y < lm[5].y)
    return { letter: "L", confidence: 0.88 };

  // O: all tips meet thumb
  if (!I && !M && !R && !P && fingertipsClose(lm, 4, 8, H * 0.28))
    return { letter: "O", confidence: 0.83 };

  // U: index + middle together pointing up
  if (I && M && !R && !P && !T && dist(iTip, mTip) < H * 0.18)
    return { letter: "U", confidence: 0.86 };

  // V: index + middle spread (peace sign)
  if (I && M && !R && !P && !T && dist(iTip, mTip) > H * 0.18)
    return { letter: "V", confidence: 0.88 };

  // W: index + middle + ring up
  if (I && M && R && !P && !T)
    return { letter: "W", confidence: 0.87 };

  // X: index hooked
  if (I && !M && !R && !P && !T && dist(iTip, lm[5]) < H * 0.6)
    return { letter: "X", confidence: 0.75 };

  // Y: thumb + pinky out
  if (!I && !M && !R && P && T)
    return { letter: "Y", confidence: 0.90 };

  // Open hand (5)
  if (I && M && R && P && T)
    return { letter: "5", confidence: 0.82 };

  return { letter: "?", confidence: 0.30 };
};

export const classifyTwoHands = (hand1: any[], hand2: any[]): ClassificationResult => {
  if (!hand1 || !hand2) return { letter: "", confidence: 0 };

  const dist = (a: any, b: any) =>
    Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

  const h1Wrist = hand1[0];
  const h2Wrist = hand2[0];
  const handsClose = dist(h1Wrist, h2Wrist) < 0.4;

  const h1Index = hand1[8];
  const h2Index = hand2[8];
  const h1Thumb = hand1[4];
  const h2Thumb = hand2[4];

  const indexesTouching = dist(h1Index, h2Index) < 0.06;
  const thumbsTouching = dist(h1Thumb, h2Thumb) < 0.06;
  const indexThumbCross = dist(h1Index, h2Thumb) < 0.06 || dist(h2Index, h1Thumb) < 0.06;

  if (indexesTouching && thumbsTouching)
    return { letter: "N", confidence: 0.85 };

  if (indexesTouching && handsClose)
    return { letter: "R", confidence: 0.82 };

  if (thumbsTouching && handsClose)
    return { letter: "T", confidence: 0.80 };

  if (indexThumbCross)
    return { letter: "X", confidence: 0.78 };

  if (handsClose)
    return { letter: "M", confidence: 0.75 };

  return classifyISLLetter(hand1);
};
