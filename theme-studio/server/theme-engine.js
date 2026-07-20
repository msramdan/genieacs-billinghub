/**
 * Apply BillingHub accent colors into GenieACS app.css content.
 * Preserves structure; rewrites known CSS custom properties + common hex accents.
 */
function applyThemeToCss(css, theme) {
  const accent = theme.accent;
  const accentHover = theme.accentHover || shade(accent, -18);
  const loginGlow = theme.loginGlow || hexToRgba(accent, 0.07);

  let out = css;

  // CSS variables (BillingHub block)
  out = out.replace(/--bh-accent:\s*#[0-9a-fA-F]{3,8}/g, `--bh-accent: ${accent}`);
  out = out.replace(/--bh-accent-hover:\s*#[0-9a-fA-F]{3,8}/g, `--bh-accent-hover: ${accentHover}`);
  out = out.replace(/--color7:\s*#[0-9a-fA-F]{3,8}/g, `--color7: ${accent}`);
  out = out.replace(/outline-color:\s*#1f6467/g, `outline-color: ${accent}`);

  // Login page teal glow (default BillingHub)
  out = out.replace(
    /rgba\(15,\s*118,\s*110,\s*\.07\)/g,
    loginGlow
  );
  out = out.replace(
    /rgba\(15,\s*118,\s*110,\s*0\.07\)/g,
    loginGlow
  );

  // Common hardcoded BillingHub teal in buttons / links if present
  out = out.replace(/#1f6467/gi, accent);
  out = out.replace(/#184f52/gi, accentHover);

  return out;
}

function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function hexToRgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function shade(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  const nr = Math.round((t - r) * p + r);
  const ng = Math.round((t - g) * p + g);
  const nb = Math.round((t - b) * p + b);
  return (
    "#" +
    [nr, ng, nb]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  );
}

const PRESETS = {
  teal: {
    id: "teal",
    name: "BillingHub Teal",
    accent: "#1f6467",
    accentHover: "#184f52",
    preview: "linear-gradient(135deg, #0f1419, #1f6467)",
  },
  ocean: {
    id: "ocean",
    name: "Ocean Blue",
    accent: "#1d6fa5",
    accentHover: "#155a86",
    preview: "linear-gradient(135deg, #0b1c2c, #1d6fa5)",
  },
  ember: {
    id: "ember",
    name: "Ember Copper",
    accent: "#c45c26",
    accentHover: "#9a451c",
    preview: "linear-gradient(135deg, #1a100c, #c45c26)",
  },
  forest: {
    id: "forest",
    name: "Forest Moss",
    accent: "#3d6b4f",
    accentHover: "#2f5340",
    preview: "linear-gradient(135deg, #0e1611, #3d6b4f)",
  },
  slate: {
    id: "slate",
    name: "Slate Steel",
    accent: "#4a6fa5",
    accentHover: "#3a5884",
    preview: "linear-gradient(135deg, #12151c, #4a6fa5)",
  },
  rose: {
    id: "rose",
    name: "Rosewood",
    accent: "#a63d57",
    accentHover: "#842f44",
    preview: "linear-gradient(135deg, #1a0f12, #a63d57)",
  },
};

module.exports = { applyThemeToCss, PRESETS, shade };
