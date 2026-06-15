#!/usr/bin/env node
// ---------------------------------------------------------------------------
// build.js  —  generates assets/profile.svg (dark) + assets/profile-light.svg
// Zero dependencies. Pure Node. Run:  node scripts/build.js
//
// Why a self-contained SVG: GitHub sanitizes inline HTML/CSS in README.md, and
// SVGs embedded via <img> can't run JavaScript. So the whole visual is ONE svg
// using CSS @keyframes + SMIL only, with the avatar inlined as a base64 URI and
// no external font/image/css references (GitHub's camo proxy would block them).
// ---------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");
const data = require("./data.js");

const ROOT = path.resolve(__dirname, "..");
const AVATAR = path.join(ROOT, "assets", "avatar.jpeg");
const OUT_DARK = path.join(ROOT, "assets", "profile.svg");
const OUT_LIGHT = path.join(ROOT, "assets", "profile-light.svg");

// ---- canvas / layout constants --------------------------------------------
const W = 1100;
const PAD = 40;
const GAP = 18;
const CW = W - PAD * 2; // content width = 1020

const SANS =
  "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO =
  "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

// ---- tiny helpers ----------------------------------------------------------
const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// rough text-width estimate (no font metrics available at build time; we pad
// generously so text never overflows its pill/box across systems)
const estW = (text, fs, mono = false) =>
  String(text).length * fs * (mono ? 0.61 : 0.55);

function T(x, y, str, o = {}) {
  const {
    fs = 13,
    ff = SANS,
    fill = "#fff",
    weight = 400,
    anchor = "start",
    ls = 0,
    opacity = 1,
  } = o;
  return (
    `<text x="${x}" y="${y}" font-family="${ff}" font-size="${fs}" ` +
    `font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"` +
    (ls ? ` letter-spacing="${ls}"` : "") +
    (opacity !== 1 ? ` opacity="${opacity}"` : "") +
    `>${esc(str)}</text>`
  );
}

// word-wrap to a max pixel width -> array of lines
function wrap(text, maxW, fs, mono = false) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (estW(t, fs, mono) > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---- palettes --------------------------------------------------------------
const PALETTES = {
  dark: {
    name: "dark",
    bg0: "#0d0a1a",
    bg1: "#0a0a0f",
    vignette: "rgba(0,0,0,0.55)",
    glass0: "rgba(255,255,255,0.055)",
    glass1: "rgba(255,255,255,0.018)",
    cardStroke: "rgba(255,255,255,0.10)",
    topHi: "rgba(255,255,255,0.16)",
    textHi: "#f5f3ff",
    text: "#e7defb",
    textMute: "#a99fc4",
    mono: "#c084fc",
    purple: "#a855f7",
    purpleDeep: "#7c3aed",
    lav: "#e9d5ff",
    teal: "#22d3ee",
    magenta: "#d946ef",
    pillFill: "rgba(168,85,247,0.10)",
    pillStroke: "rgba(192,132,252,0.30)",
    pillText: "#e9d5ff",
    aurora: ["#7c3aed", "#a855f7", "#c026d3", "#22d3ee"],
    auroraOpacity: 0.55,
    shadow: "rgba(0,0,0,0.55)",
    nameGrad: ["#c084fc", "#e9d5ff", "#a855f7"],
  },
  light: {
    name: "light",
    bg0: "#f5f1ff",
    bg1: "#e9e2fb",
    vignette: "rgba(124,58,237,0.06)",
    glass0: "rgba(255,255,255,0.85)",
    glass1: "rgba(255,255,255,0.55)",
    cardStroke: "rgba(76,29,149,0.14)",
    topHi: "rgba(255,255,255,0.9)",
    textHi: "#2e1065",
    text: "#4c1d95",
    textMute: "#6b6385",
    mono: "#7c3aed",
    purple: "#7c3aed",
    purpleDeep: "#6d28d9",
    lav: "#6d28d9",
    teal: "#0891b2",
    magenta: "#a21caf",
    pillFill: "rgba(124,58,237,0.08)",
    pillStroke: "rgba(124,58,237,0.28)",
    pillText: "#4c1d95",
    aurora: ["#c4b5fd", "#a78bfa", "#f0abfc", "#67e8f9"],
    auroraOpacity: 0.5,
    shadow: "rgba(76,29,149,0.18)",
    nameGrad: ["#7c3aed", "#a855f7", "#6d28d9"],
  },
};

const accentColor = (P, a) =>
  a === "teal" ? P.teal : a === "magenta" ? P.magenta : P.purple;

// ---- reusable pieces -------------------------------------------------------
function cardBg(P, x, y, w, h, opts = {}) {
  const { rx = 18, glow = P.purple, delay = 0 } = opts;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#glass)" ` +
    `stroke="${P.cardStroke}" stroke-width="1" filter="url(#shadow)"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="none" ` +
    `stroke="${glow}" stroke-width="1.2" opacity="0" class="pulse" style="animation-delay:${delay}s"/>` +
    `<line x1="${x + rx}" y1="${y + 0.8}" x2="${x + w - rx}" y2="${y + 0.8}" ` +
    `stroke="${P.topHi}" stroke-width="1"/>`
  );
}

// a small pill; returns { w, svg }
function pill(P, x, y, text, o = {}) {
  const {
    fs = 12,
    mono = false,
    h = 26,
    padX = 13,
    fill = P.pillFill,
    stroke = P.pillStroke,
    color = P.pillText,
    weight = 500,
  } = o;
  const w = Math.round(estW(text, fs, mono) + padX * 2);
  const ff = mono ? MONO : SANS;
  const cy = y + h / 2 + fs * 0.35;
  const svg =
    `<g>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>` +
    `<text x="${x + w / 2}" y="${cy}" font-family="${ff}" font-size="${fs}" font-weight="${weight}" ` +
    `fill="${color}" text-anchor="middle"${mono ? ' letter-spacing="0.5"' : ""}>${esc(text)}</text>` +
    `</g>`;
  return { w, svg };
}

function sectionLabel(P, x, y, txt) {
  const tw = estW(txt, 13, true) + 24;
  return (
    `<g>` +
    `<rect x="${x}" y="${y - 9}" width="9" height="9" rx="2" fill="${P.purple}"/>` +
    `<rect x="${x + 4}" y="${y - 13}" width="9" height="9" rx="2" fill="${P.magenta}" opacity="0.7"/>` +
    T(x + 22, y, txt, { fs: 13, ff: MONO, fill: P.textMute, weight: 700, ls: 2.5 }) +
    `<line x1="${x + 22 + tw + 8}" y1="${y - 4}" x2="${PAD + CW}" y2="${y - 4}" stroke="${P.cardStroke}" stroke-width="1"/>` +
    `</g>`
  );
}

// social icons (24x24 coordinate space)
function iconMarkup(name, color) {
  if (name === "github")
    return `<path fill="${color}" d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2 0-.3-.5-1.5.2-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z"/>`;
  if (name === "linkedin")
    return `<path fill="${color}" d="M20.45 20.45h-3.56v-5.57c0-1.33 0-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm1.78 13.02H3.55V9h3.57v11.45zM22.22 0H1.77C.8 0 0 .77 0 1.73v20.54C0 23.23.8 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/>`;
  // mail (stroke style)
  return `<g fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 6 9 6 9-6"/></g>`;
}

// social pill with icon + label; returns { w, svg }
function socialPill(P, x, y, s) {
  const h = 44;
  const fs = 14;
  const iconBox = 20;
  const padX = 18;
  const gapIcon = 12;
  const labelW = estW(s.label, fs, false);
  const w = Math.round(padX + iconBox + gapIcon + labelW + padX);
  const iconScale = iconBox / 24;
  const ix = x + padX;
  const iy = y + (h - iconBox) / 2;
  const ty = y + h / 2 + fs * 0.35;
  const svg =
    `<g>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${P.pillFill}" stroke="${P.pillStroke}" stroke-width="1.2"/>` +
    `<g transform="translate(${ix} ${iy}) scale(${iconScale.toFixed(4)})">${iconMarkup(s.icon, P.purple)}</g>` +
    `<text x="${ix + iconBox + gapIcon}" y="${ty}" font-family="${SANS}" font-size="${fs}" font-weight="600" fill="${P.text}">${esc(s.label)}</text>` +
    `</g>`;
  return { w, svg };
}

// ---- main builder ----------------------------------------------------------
function build(P, avatarURI) {
  const parts = [];
  let y = PAD;
  let fadeIdx = 0;
  const fade = (inner) => {
    const d = (0.06 * fadeIdx++).toFixed(2);
    return `<g class="fade" style="animation-delay:${d}s">${inner}</g>`;
  };

  // ===================== HERO =====================
  const heroH = 200;
  {
    const hx = PAD + 8;
    let s = "";
    // eyebrow
    s += T(hx, y + 30, data.eyebrow, {
      fs: 13,
      ff: MONO,
      fill: P.mono,
      weight: 600,
      ls: 3,
    });
    // name (gradient fill + subtle SMIL shimmer)
    s += `<text x="${hx}" y="${y + 86}" font-family="${SANS}" font-size="52" font-weight="800" fill="url(#nameGrad)" letter-spacing="-0.5">${esc(
      data.name
    )}</text>`;
    // tagline
    s += T(hx, y + 124, data.tagline, {
      fs: 22,
      fill: P.text,
      weight: 600,
    });
    // monoline + blinking cursor
    s += T(hx, y + 156, data.monoline, {
      fs: 13.5,
      ff: MONO,
      fill: P.teal,
      weight: 600,
      ls: 4,
    });
    // include letter-spacing (4px per gap) so the cursor sits after the text
    const mlW = estW(data.monoline, 13.5, true) + (data.monoline.length - 1) * 4;
    s += `<rect x="${hx + mlW + 10}" y="${y + 144}" width="9" height="16" rx="1.5" fill="${P.teal}" class="blink"/>`;

    // hero pills, stacked on the right, vertically centered
    const ph = 30;
    const pgap = 12;
    let py = y + (heroH - (data.heroPills.length * ph + (data.heroPills.length - 1) * pgap)) / 2;
    for (const label of data.heroPills) {
      const pl = pill(P, 0, py, label, { fs: 12, mono: true, h: ph, padX: 15 });
      const px = PAD + CW - pl.w;
      s += `<g transform="translate(${px} 0)">${pl.svg}</g>`;
      py += ph + pgap;
    }
    parts.push(fade(s));
  }
  y += heroH + GAP;

  // ===================== ABOUT + VALUE CARDS =====================
  const aboutH = 252;
  {
    const aboutW = 612;
    // --- about card ---
    let s = cardBg(P, PAD, y, aboutW, aboutH, { delay: 0.6 });
    // avatar
    const avD = 134;
    const avCx = PAD + 36 + avD / 2;
    const avCy = y + aboutH / 2 - 6;
    s +=
      // rotating gradient ring
      `<circle cx="${avCx}" cy="${avCy}" r="${avD / 2 + 9}" fill="none" stroke="url(#ringGrad)" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(
        Math.PI *
        (avD + 18) *
        0.7
      ).toFixed(1)} ${(Math.PI * (avD + 18) * 0.3).toFixed(1)}" class="spin" style="transform-origin:${avCx}px ${avCy}px" opacity="0.95"/>` +
      // soft glow halo
      `<circle cx="${avCx}" cy="${avCy}" r="${avD / 2 + 4}" fill="none" stroke="${P.purple}" stroke-width="2" filter="url(#avatarGlow)" opacity="0.8" class="halo"/>` +
      // photo
      `<image xlink:href="${avatarURI}" x="${avCx - avD / 2}" y="${avCy - avD / 2}" width="${avD}" height="${avD}" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>` +
      // inner rim
      `<circle cx="${avCx}" cy="${avCy}" r="${avD / 2}" fill="none" stroke="${P.lav}" stroke-width="1.5" opacity="0.5"/>`;

    // text block
    const tx = PAD + 36 + avD + 34;
    s += T(tx, y + 40, "ABOUT", { fs: 12, ff: MONO, fill: P.textMute, weight: 700, ls: 3 });
    s += T(tx, y + 72, data.role, { fs: 21, fill: P.textHi, weight: 700 });
    s += T(tx, y + 95, data.roleSub, { fs: 13.5, fill: P.purple, weight: 600 });
    // location with pin
    s +=
      `<g transform="translate(${tx} ${y + 116})">` +
      `<path d="M7 0a5 5 0 0 0-5 5c0 3.5 5 9 5 9s5-5.5 5-9a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" fill="${P.magenta}" transform="translate(0 -1) scale(0.85)"/>` +
      `</g>` +
      T(tx + 16, y + 124, data.location, { fs: 13, fill: P.textMute });
    // blurb
    const blurbW = aboutW - (tx - PAD) - 30;
    wrap(data.blurb, blurbW, 13).forEach((ln, i) => {
      s += T(tx, y + 152 + i * 19, ln, { fs: 13, fill: P.text });
    });
    // education (mono, wrapped defensively so it can never overflow the card,
    // pinned to the bottom of the card)
    const eduFs = 11.5;
    const eduLH = 16;
    const eduW = aboutW - (tx - PAD) - 22;
    const eduLines = [];
    data.education.forEach((ln) => {
      wrap(ln, eduW, eduFs, true).forEach((w) => eduLines.push(w));
    });
    const eduStartY = y + aboutH - 16 - (eduLines.length - 1) * eduLH;
    eduLines.forEach((ln, i) => {
      s += T(tx, eduStartY + i * eduLH, ln, { fs: eduFs, ff: MONO, fill: P.textMute });
    });
    parts.push(fade(s));

    // --- value cards 2x2 ---
    const rx0 = PAD + aboutW + GAP;
    const rW = CW - aboutW - GAP; // 390
    const vw = (rW - GAP) / 2; // 186
    const vh = (aboutH - GAP) / 2; // 117
    data.values.forEach((v, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const vx = rx0 + col * (vw + GAP);
      const vy = y + row * (vh + GAP);
      const ac = accentColor(P, v.accent);
      let c = cardBg(P, vx, vy, vw, vh, { rx: 16, glow: ac, delay: 0.7 + i * 0.12 });
      // index
      c += T(vx + vw - 16, vy + 28, String(i + 1).padStart(2, "0"), {
        fs: 12,
        ff: MONO,
        fill: P.textMute,
        anchor: "end",
        weight: 600,
      });
      // accent tick
      c += `<rect x="${vx + 18}" y="${vy + 20}" width="22" height="3" rx="1.5" fill="${ac}"/>`;
      // label (may be 2 lines)
      const lblLines = wrap(v.label, vw - 36, 14, false);
      lblLines.forEach((ln, li) => {
        c += T(vx + 18, vy + 48 + li * 18, ln, {
          fs: 14,
          fill: P.textHi,
          weight: 700,
          ls: 0.3,
        });
      });
      // sub
      const subY = vy + 48 + lblLines.length * 18 + 14;
      wrap(v.sub, vw - 34, 11).forEach((ln, si) => {
        c += T(vx + 18, subY + si * 14, ln, { fs: 11, fill: P.textMute });
      });
      parts.push(fade(c));
    });
  }
  y += aboutH + 30;

  // ===================== FEATURED PROJECTS =====================
  parts.push(fade(sectionLabel(P, PAD, y, "FEATURED PROJECTS")));
  y += 30;
  {
    const cols = 3;
    const pw = (CW - GAP * 2) / cols; // 328
    const innerW = pw - 36;
    // pre-compute uniform card height
    let maxH = 0;
    const layouts = data.projects.map((proj) => {
      const descLines = wrap(proj.desc, innerW, 12.5);
      // tag rows
      const tagPills = proj.tags.map((t) => pill(P, 0, 0, t, { fs: 10.5, h: 21, padX: 9 }));
      const tagRows = [];
      let rowW = 0;
      let row = [];
      for (const tp of tagPills) {
        if (rowW + tp.w > innerW && row.length) {
          tagRows.push(row);
          row = [];
          rowW = 0;
        }
        row.push(tp);
        rowW += tp.w + 8;
      }
      if (row.length) tagRows.push(row);
      const descBottom = 56 + descLines.length * 18;
      const tagsTop = descBottom + 14;
      const h = tagsTop + tagRows.length * 28 + 8;
      maxH = Math.max(maxH, h);
      return { descLines, tagRows };
    });

    data.projects.forEach((proj, i) => {
      const px = PAD + i * (pw + GAP);
      const ac = i === 1 ? P.teal : P.purple;
      let c = cardBg(P, px, y, pw, maxH, { glow: ac, delay: 1.0 + i * 0.12 });
      const ix = px + 22;
      // top dot + index
      c += `<circle cx="${ix + 4}" cy="${y + 28}" r="4.5" fill="${ac}"/>`;
      c += T(px + pw - 20, y + 32, "PROJECT " + String(i + 1).padStart(2, "0"), {
        fs: 10,
        ff: MONO,
        fill: P.textMute,
        anchor: "end",
        ls: 1,
      });
      // name
      c += T(ix + 18, y + 33, proj.name, { fs: 18, fill: P.textHi, weight: 700 });
      // desc
      const { descLines, tagRows } = layouts[i];
      descLines.forEach((ln, li) => {
        c += T(ix, y + 60 + li * 18, ln, { fs: 12.5, fill: P.textMute });
      });
      // tags
      const tagsTop = y + 56 + descLines.length * 18 + 14;
      tagRows.forEach((row, ri) => {
        let tx = ix;
        const ty = tagsTop + ri * 28;
        row.forEach((tp) => {
          c += `<g transform="translate(${tx} ${ty})">${tp.svg}</g>`;
          tx += tp.w + 8;
        });
      });
      parts.push(fade(c));
    });
    y += maxH + 30;
  }

  // ===================== TECH STACK =====================
  parts.push(fade(sectionLabel(P, PAD, y, "TECH STACK")));
  y += 30;
  {
    const innerPad = 26;
    const labelColW = 138;
    const pillsX = PAD + innerPad + labelColW;
    const pillsW = CW - innerPad * 2 - labelColW;
    const rowH = 34;
    const groupGap = 12;

    // layout pills per group, compute total height
    let cursor = innerPad + 8;
    const groupRender = [];
    data.stack.forEach((grp) => {
      const startY = cursor;
      const tagPills = grp.items.map((it) =>
        pill(P, 0, 0, it, { fs: 12, h: 26, padX: 12 })
      );
      const rows = [];
      let row = [];
      let rowW = 0;
      for (const tp of tagPills) {
        if (rowW + tp.w > pillsW && row.length) {
          rows.push(row);
          row = [];
          rowW = 0;
        }
        row.push(tp);
        rowW += tp.w + 9;
      }
      if (row.length) rows.push(row);
      groupRender.push({ grp, rows, startY });
      cursor += rows.length * rowH + groupGap;
    });
    const stackH = cursor - groupGap + innerPad + 6;

    let c = cardBg(P, PAD, y, CW, stackH, { delay: 1.4 });
    groupRender.forEach(({ grp, rows, startY }) => {
      const gy = y + startY;
      const firstRowCenter = gy + rowH / 2;
      // group label
      c += T(PAD + innerPad, firstRowCenter + 4.5, grp.group, {
        fs: 12,
        ff: MONO,
        fill: P.mono,
        weight: 700,
        ls: 1,
      });
      rows.forEach((row, ri) => {
        let px = pillsX;
        const py = gy + ri * rowH + (rowH - 26) / 2;
        row.forEach((tp) => {
          c += `<g transform="translate(${px} ${py})">${tp.svg}</g>`;
          px += tp.w + 9;
        });
      });
    });
    parts.push(fade(c));
    y += stackH + 30;
  }

  // ===================== SOCIALS =====================
  parts.push(fade(sectionLabel(P, PAD, y, "CONNECT")));
  y += 26;
  {
    const sgap = 16;
    const pills = data.socials.map((s) => socialPill(P, 0, 0, s));
    const total = pills.reduce((a, p) => a + p.w, 0) + sgap * (pills.length - 1);
    let sx = PAD + (CW - total) / 2;
    const sy = y;
    let s = "";
    pills.forEach((p) => {
      s += `<g transform="translate(${sx} ${sy})">${p.svg}</g>`;
      sx += p.w + sgap;
    });
    parts.push(fade(s));
    y += 44 + 20;
  }

  // ===================== FOOTER =====================
  parts.push(
    fade(
      T(W / 2, y + 6, data.footer, {
        fs: 11,
        ff: MONO,
        fill: P.textMute,
        anchor: "middle",
        ls: 0.5,
      })
    )
  );
  y += 20;

  const H = Math.round(y + PAD - 10);

  // ===================== DEFS =====================
  const a = P.aurora;
  const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${P.bg0}"/>
      <stop offset="1" stop-color="${P.bg1}"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${P.glass0}"/>
      <stop offset="1" stop-color="${P.glass1}"/>
    </linearGradient>
    <linearGradient id="nameGrad" gradientUnits="userSpaceOnUse" x1="${PAD}" y1="0" x2="${PAD + 620}" y2="0">
      <stop offset="0" stop-color="${P.nameGrad[0]}"/>
      <stop offset="0.5" stop-color="${P.nameGrad[1]}"/>
      <stop offset="1" stop-color="${P.nameGrad[2]}"/>
      <animateTransform attributeName="gradientTransform" type="translate" values="-180 0; 180 0; -180 0" dur="9s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" keyTimes="0;0.5;1"/>
    </linearGradient>
    <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${P.purple}"/>
      <stop offset="0.5" stop-color="${P.magenta}"/>
      <stop offset="1" stop-color="${P.teal}"/>
    </linearGradient>
    <radialGradient id="auA" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${a[0]}" stop-opacity="0.9"/>
      <stop offset="1" stop-color="${a[0]}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="auB" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${a[1]}" stop-opacity="0.9"/>
      <stop offset="1" stop-color="${a[1]}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="auC" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${a[2]}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${a[2]}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="auD" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${a[3]}" stop-opacity="0.8"/>
      <stop offset="1" stop-color="${a[3]}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.35" r="0.85">
      <stop offset="0.55" stop-color="${P.bg1}" stop-opacity="0"/>
      <stop offset="1" stop-color="${P.vignette}"/>
    </radialGradient>
    <clipPath id="avatarClip"><circle cx="${PAD + 36 + 134 / 2}" cy="${PAD + 200 + GAP + 252 / 2 - 6}" r="67"/></clipPath>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="${P.shadow}" flood-opacity="0.9"/>
    </filter>
    <filter id="avatarGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
    <filter id="auroraBlur" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="55"/>
    </filter>
    <style>
      /* Content is always visible at rest (no opacity-hiding entrance) so a
         cached/static frame looks complete; motion comes from ambient loops. */
      .fade { opacity: 1; }
      .pulse { animation: pulse 7s ease-in-out infinite; }
      @keyframes pulse { 0%,100% { opacity: 0.12; } 50% { opacity: 0.5; } }
      .blink { animation: blink 1.1s steps(1) infinite; }
      @keyframes blink { 0%,50% { opacity: 1; } 50.01%,100% { opacity: 0; } }
      .spin { animation: spin 16s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .halo { animation: halo 5s ease-in-out infinite; }
      @keyframes halo { 0%,100% { opacity: 0.45; } 50% { opacity: 0.95; } }
      .au { filter: url(#auroraBlur); transform-box: fill-box; transform-origin: center; }
      .au1 { animation: au1 19s ease-in-out infinite; }
      .au2 { animation: au2 23s ease-in-out infinite; }
      .au3 { animation: au3 27s ease-in-out infinite; }
      .au4 { animation: au4 21s ease-in-out infinite; }
      @keyframes au1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,40px) scale(1.18); } }
      @keyframes au2 { 0%,100% { transform: translate(0,0) scale(1.1); } 50% { transform: translate(-70px,30px) scale(0.9); } }
      @keyframes au3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(50px,-30px) scale(1.2); } }
      @keyframes au4 { 0%,100% { transform: translate(0,0) scale(0.95); } 50% { transform: translate(-40px,-25px) scale(1.15); } }
      @media (prefers-reduced-motion: reduce) {
        .pulse,.blink,.spin,.halo,.au1,.au2,.au3,.au4 { animation: none !important; }
        .pulse { opacity: 0.2; }
      }
    </style>
  </defs>`;

  // ===================== AURORA LAYER =====================
  const aurora = `
  <g opacity="${P.auroraOpacity}">
    <g class="au au1"><circle cx="230" cy="170" r="240" fill="url(#auA)"/></g>
    <g class="au au2"><circle cx="880" cy="120" r="220" fill="url(#auB)"/></g>
    <g class="au au3"><circle cx="560" cy="60" r="200" fill="url(#auC)"/></g>
    <g class="au au4"><circle cx="980" cy="${Math.round(H * 0.55)}" r="220" fill="url(#auD)"/></g>
    <g class="au au2"><circle cx="120" cy="${Math.round(H * 0.7)}" r="200" fill="url(#auA)"/></g>
  </g>`;

  const title = `${data.name} — ${data.role}`;
  const desc = `${data.tagline} ${data.role} based in ${data.location}. Stack: ${data.stack
    .map((g) => g.items.join(", "))
    .join("; ")}.`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="${esc(
    title
  )}">
  <title>${esc(title)}</title>
  <desc>${esc(desc)}</desc>
  ${defs}
  <rect width="${W}" height="${H}" rx="0" fill="url(#bg)"/>
  ${aurora}
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
  ${parts.join("\n  ")}
</svg>
`;
}

// ---- run -------------------------------------------------------------------
function main() {
  if (!fs.existsSync(AVATAR)) {
    console.error("ERROR: missing avatar at " + AVATAR);
    process.exit(1);
  }
  const b64 = fs.readFileSync(AVATAR).toString("base64");
  const avatarURI = `data:image/jpeg;base64,${b64}`;

  const dark = build(PALETTES.dark, avatarURI);
  const light = build(PALETTES.light, avatarURI);
  fs.writeFileSync(OUT_DARK, dark, "utf8");
  fs.writeFileSync(OUT_LIGHT, light, "utf8");

  const kb = (s) => (Buffer.byteLength(s, "utf8") / 1024).toFixed(1) + " KB";
  console.log("✓ wrote assets/profile.svg        " + kb(dark));
  console.log("✓ wrote assets/profile-light.svg  " + kb(light));
  console.log("  avatar embedded: " + (b64.length / 1024).toFixed(1) + " KB base64");
}

main();
