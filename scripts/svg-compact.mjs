// Lossless size reduction for the pre-rendered Bloub cards (used by build-bloub.mjs).
//
// GitHub's image proxy serves the cards uncompressed, so on a slow connection a 240 KB card
// arrives (and starts its colour cycle) well after the 10 KB ones. Most of the bytes are path
// data: one polygon per animation frame, written as absolute "M x yL x yL x y..." pairs.
// This rewrites the same geometry in the shortest exact form:
//   - relative commands (each point as the offset from the previous one: shorter numbers),
//     computed in integer hundredths so no coordinate moves at all;
//   - implicit command repetition ("l1 2l3 4" -> "l1 2 3 4"), no leading zeros (".5");
//   - no whitespace-only text between tags.
// Every frame of an animated path keeps the same command sequence (the rules depend only on
// the sequence, which SMIL already requires to match), so interpolation is unchanged: blending
// relative offsets linearly gives exactly the blended absolute points.
// The cards only use M L C Q Z with at most two decimals; anything else is left untouched.

const PARAMS = { M: 2, L: 2, C: 6, Q: 4, Z: 0 };

function num(h) {
  // h: integer hundredths -> shortest decimal text, no leading zero
  const neg = h < 0;
  const a = Math.abs(h);
  let s = String(Math.floor(a / 100));
  const frac = a % 100;
  if (frac) s += "." + String(frac).padStart(2, "0").replace(/0$/, "");
  if (s.startsWith("0.")) s = s.slice(1);
  return (neg ? "-" : "") + s;
}

export function compactPath(d) {
  const tokens = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)/g);
  if (!tokens) return d;
  // only absolute M L C Q Z with <= 2 decimals; otherwise leave the path alone
  for (const t of tokens) {
    if (/[A-Za-z]/.test(t) ? !(t in PARAMS) : /\.\d{3,}/.test(t)) return d;
  }
  let out = "";
  let prev = ""; // last letter written
  let cx = 0, cy = 0, sx = 0, sy = 0; // current point, subpath start (hundredths)
  const emit = (letter, values) => {
    // A repeated letter is implicit, and so is an "l" right after an "m": a relative moveto's
    // extra pairs are relative linetos. A leading "m" counts as absolute (SVG spec), so even
    // the first point stays exact.
    if (!(letter === prev && letter !== "m") && !(letter === "l" && prev === "m")) out += letter;
    for (const v of values) {
      const t = num(v);
      if (!/[a-z]$/i.test(out) && !t.startsWith("-")) out += " ";
      out += t;
    }
    prev = letter;
  };
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === "Z") {
      out += "z";
      prev = "z";
      cx = sx; cy = sy;
      continue;
    }
    const n = PARAMS[cmd];
    let group = 0;
    do {
      const v = [];
      for (let k = 0; k < n; k++) {
        const t = tokens[i++];
        if (t === undefined || /[A-Za-z]/.test(t)) return d; // malformed: leave untouched
        v.push(Math.round(parseFloat(t) * 100));
      }
      if (cmd === "M" && group === 0) {
        emit("m", [v[0] - cx, v[1] - cy]);
        cx = sx = v[0]; cy = sy = v[1];
      } else if (cmd === "M" || cmd === "L") {
        emit("l", [v[0] - cx, v[1] - cy]);
        cx = v[0]; cy = v[1];
      } else if (cmd === "C") {
        emit("c", [v[0] - cx, v[1] - cy, v[2] - cx, v[3] - cy, v[4] - cx, v[5] - cy]);
        cx = v[4]; cy = v[5];
      } else {
        emit("q", [v[0] - cx, v[1] - cy, v[2] - cx, v[3] - cy]);
        cx = v[2]; cy = v[3];
      }
      group++;
    } while (i < tokens.length && !/[A-Za-z]/.test(tokens[i]));
  }
  return out;
}

const dropLeadingZeros = (list) => list.replace(/(^|[\s;,])(-?)0\.(\d)/g, "$1$2.$3");

export function compactSvg(svg) {
  let s = svg.replace(/>\s+</g, "><");
  // static paths
  s = s.replace(/(<path\b[^>]*?\sd=")([^"]*)(")/g, (_, a, d, b) => a + compactPath(d) + b);
  // animated paths: every frame of the values list
  s = s.replace(/<animate\b[^>]*>/g, (tag) => {
    if (!/attributeName="d"/.test(tag)) return tag;
    return tag.replace(/(\svalues=")([^"]*)(")/, (_, a, v, b) => a + v.split(";").map(compactPath).join(";") + b);
  });
  // numeric lists: timing and transform keyframes
  s = s.replace(/(\s(?:keyTimes|keySplines)=")([^"]*)(")/g, (_, a, v, b) => a + dropLeadingZeros(v) + b);
  s = s.replace(/<animate(?:Transform)?\b[^>]*>/g, (tag) =>
    /attributeName="d"/.test(tag) ? tag : tag.replace(/(\svalues=")([^"]*)(")/, (_, a, v, b) => a + dropLeadingZeros(v) + b)
  );
  return s;
}
