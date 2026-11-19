import {
  BRAND_FORMAT_META,
  INSTAGRAM_FORMAT_META,
} from '../data/brandPresets';
import {
  BackdropStyle,
  BrandConfig,
  InstagramConfig,
} from '../types/brand';
import { saveBlobFile, saveUrlAsFile } from './downloadHelper';

export interface MarkColors {
  fill: string;
  detailColor: string;
  subtleDetailColor: string;
  mouthpieceColor: string;
}

/**
 * Draws the exact okarina mark centered horizontally at (cx, cy) with given total height.
 * Coordinate system matches the 200x260 SVG viewBox.
 */
export function drawOkarinaMarkOnCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  height: number,
  colors: MarkColors
) {
  const scale = height / 260;
  ctx.save();
  ctx.translate(cx - 100 * scale, cy - 130 * scale);
  ctx.scale(scale, scale);

  const traceSilhouette = () => {
    ctx.beginPath();
    ctx.moveTo(100, 12);
    ctx.bezierCurveTo(147, 12, 182, 68, 182, 124);
    ctx.bezierCurveTo(182, 174, 146, 218, 100, 248);
    ctx.bezierCurveTo(54, 218, 18, 174, 18, 124);
    ctx.bezierCurveTo(18, 68, 53, 12, 100, 12);
    ctx.closePath();
  };

  // Fill silhouette
  traceSilhouette();
  ctx.fillStyle = colors.fill;
  ctx.fill();

  // Clip interior details
  ctx.save();
  traceSilhouette();
  ctx.clip();

  // Mouthpiece hole
  ctx.beginPath();
  ctx.ellipse(100, 23.5, 12.5, 5.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = colors.mouthpieceColor;
  ctx.fill();

  // Subtle lashes
  ctx.strokeStyle = colors.subtleDetailColor;
  ctx.lineWidth = 3.8;
  ctx.lineCap = 'round';
  const lashes: [number, number, number, number][] = [
    [43, 101, 48, 117.5],
    [58, 105.5, 61.5, 122.5],
    [73, 109.5, 75, 126.5],
    [127, 109.5, 125, 126.5],
    [142, 105.5, 138.5, 122.5],
    [157, 101, 152, 117.5],
  ];
  for (const [x1, y1, x2, y2] of lashes) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Curved horizontal band
  ctx.beginPath();
  ctx.moveTo(14, 121);
  ctx.quadraticCurveTo(100, 148, 186, 121);
  ctx.strokeStyle = colors.detailColor;
  ctx.lineWidth = 4.6;
  ctx.lineCap = 'butt';
  ctx.stroke();

  // Eyes
  ctx.fillStyle = colors.detailColor;
  ctx.beginPath();
  ctx.arc(59, 156, 11.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(141, 156, 11.5, 0, Math.PI * 2);
  ctx.fill();

  // Chin slashes
  ctx.strokeStyle = colors.subtleDetailColor;
  ctx.lineWidth = 3.8;
  ctx.lineCap = 'round';
  const slashes: [number, number, number, number][] = [
    [71, 186, 90, 193],
    [78, 200, 94, 206],
    [85, 213, 97, 217.5],
  ];
  for (const [x1, y1, x2, y2] of slashes) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacingPx: number,
  align: 'left' | 'center' | 'right' = 'center'
) {
  if (!text) return;
  if (Math.abs(letterSpacingPx) < 0.2) {
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    return;
  }

  const chars = Array.from(text);
  const widths = chars.map((c) => ctx.measureText(c).width);
  const totalWidth =
    widths.reduce((acc, w) => acc + w, 0) + letterSpacingPx * (chars.length - 1);

  let cursorX = x;
  if (align === 'center') cursorX = x - totalWidth / 2;
  if (align === 'right') cursorX = x - totalWidth;

  ctx.textAlign = 'left';
  chars.forEach((char, idx) => {
    ctx.fillText(char, cursorX, y);
    cursorX += widths[idx] + letterSpacingPx;
  });
}

function measureSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  letterSpacingPx: number
): number {
  if (!text) return 0;
  const chars = Array.from(text);
  const sum = chars.reduce((acc, c) => acc + ctx.measureText(c).width, 0);
  return sum + letterSpacingPx * Math.max(0, chars.length - 1);
}

/**
 * Renders any of the 7 Brand Editor formats to a full-resolution HTML5 Canvas.
 */
export function renderBrandAssetToCanvas(
  canvas: HTMLCanvasElement,
  config: BrandConfig
) {
  const meta = BRAND_FORMAT_META[config.format];
  canvas.width = meta.width;
  canvas.height = meta.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, meta.width, meta.height);

  // Background fill unless transparent
  if (!config.transparentBg) {
    ctx.fillStyle = config.bgColor;
    ctx.fillRect(0, 0, meta.width, meta.height);
  }

  const markColors: MarkColors = {
    fill: config.markFill,
    detailColor: config.markDetailColor,
    subtleDetailColor: config.markSubtleDetailColor,
    mouthpieceColor: config.mouthpieceColor,
  };

  const cx = meta.width / 2;
  const cy = meta.height / 2;

  if (config.format === 'primary') {
    const markH = 440 * config.markScale;
    const fontSize = 188 * config.markScale;
    const spacingPx = fontSize * config.letterSpacing;
    const markCy = cy - 150 * config.padding;
    drawOkarinaMarkOnCanvas(ctx, cx, markCy, markH, markColors);

    ctx.font = `500 ${fontSize}px "Outfit", sans-serif`;
    ctx.fillStyle = config.wordmarkColor;
    ctx.textBaseline = 'middle';
    const textY = cy + 205 * config.padding;
    drawSpacedText(ctx, config.brandText, cx, textY, spacingPx, 'center');

    if (config.showAccentBar) {
      const barW = 156 * config.markScale;
      const barH = 10;
      ctx.fillStyle = config.accentColor;
      drawRoundedRect(ctx, cx - barW / 2, textY + 125, barW, barH, 5);
      ctx.fill();
    }

    if (config.showTagline && config.tagline.trim()) {
      ctx.font = `500 34px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = config.wordmarkColor;
      ctx.globalAlpha = 0.65;
      drawSpacedText(
        ctx,
        config.tagline,
        cx,
        textY + (config.showAccentBar ? 185 : 135),
        2,
        'center'
      );
      ctx.globalAlpha = 1;
    }
  } else if (config.format === 'horizontal' || config.format === 'banner') {
    const isBanner = config.format === 'banner';
    const baseScale = isBanner ? 0.72 : 1;
    const markH = 310 * config.markScale * baseScale;
    const markW = (markH / 260) * 200;
    const fontSize = 210 * config.markScale * baseScale;
    const spacingPx = fontSize * config.letterSpacing;
    const gap = 92 * config.padding * baseScale;

    ctx.font = `500 ${fontSize}px "Outfit", sans-serif`;
    const textW = measureSpacedText(ctx, config.brandText, spacingPx);
    const totalW = markW + gap + textW;
    const startX = cx - totalW / 2;

    const verticalOffset = config.showTagline && config.tagline.trim() ? -28 : 0;

    drawOkarinaMarkOnCanvas(
      ctx,
      startX + markW / 2,
      cy + verticalOffset,
      markH,
      markColors
    );

    ctx.fillStyle = config.wordmarkColor;
    ctx.textBaseline = 'middle';
    drawSpacedText(
      ctx,
      config.brandText,
      startX + markW + gap,
      cy + verticalOffset + 8 * baseScale,
      spacingPx,
      'left'
    );

    if (config.showAccentBar) {
      const barW = Math.min(140 * baseScale, textW * 0.35);
      ctx.fillStyle = config.accentColor;
      drawRoundedRect(
        ctx,
        startX + markW + gap,
        cy + verticalOffset + fontSize * 0.56,
        barW,
        8 * baseScale,
        4
      );
      ctx.fill();
    }

    if (config.showTagline && config.tagline.trim()) {
      ctx.font = `500 ${Math.round(36 * baseScale)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = config.wordmarkColor;
      ctx.globalAlpha = 0.65;
      drawSpacedText(
        ctx,
        config.tagline,
        cx,
        cy + markH * 0.56 + 34,
        1.5,
        'center'
      );
      ctx.globalAlpha = 1;
    }
  } else if (config.format === 'mark') {
    const markH = 620 * config.markScale;
    drawOkarinaMarkOnCanvas(ctx, cx, cy, markH, markColors);
  } else if (config.format === 'app-icon') {
    const pad = 104 * config.padding;
    const boxSize = Math.max(400, meta.width - pad * 2);
    const x = (meta.width - boxSize) / 2;
    const y = (meta.height - boxSize) / 2;
    const radius = (config.cornerRadius / 100) * boxSize;

    ctx.fillStyle = config.containerColor;
    drawRoundedRect(ctx, x, y, boxSize, boxSize, radius);
    ctx.fill();

    const markH = boxSize * 0.54 * config.markScale;
    drawOkarinaMarkOnCanvas(ctx, cx, cy, markH, markColors);
  } else if (config.format === 'profile') {
    const pad = 104 * config.padding;
    const diameter = Math.max(400, meta.width - pad * 2);
    ctx.fillStyle = config.containerColor;
    ctx.beginPath();
    ctx.arc(cx, cy, diameter / 2, 0, Math.PI * 2);
    ctx.fill();

    const markH = diameter * 0.53 * config.markScale;
    drawOkarinaMarkOnCanvas(ctx, cx, cy, markH, markColors);
  } else if (config.format === 'favicon') {
    const sizes = [360, 180, 96, 62, 34];
    const gap = 64;
    const totalW = sizes.reduce((a, b) => a + b, 0) + gap * (sizes.length - 1);
    let cursorX = cx - totalW / 2;
    const bottomY = cy + 170;

    sizes.forEach((size) => {
      const y = bottomY - size;
      const radius = (config.cornerRadius / 100) * size;
      ctx.fillStyle = config.containerColor;
      drawRoundedRect(ctx, cursorX, y, size, size, radius);
      ctx.fill();

      drawOkarinaMarkOnCanvas(
        ctx,
        cursorX + size / 2,
        y + size / 2,
        size * 0.55 * config.markScale,
        markColors
      );
      cursorX += size + gap;
    });
  }
}

/**
 * Generates a clean standalone SVG string for vector download.
 */
export function generateBrandAssetSVG(config: BrandConfig): string {
  const meta = BRAND_FORMAT_META[config.format];
  const { width, height } = meta;
  const cx = width / 2;
  const cy = height / 2;

  const markGroup = (centerX: number, centerY: number, markH: number, clipId: string) => {
    const scale = markH / 260;
    const tx = centerX - 100 * scale;
    const ty = centerY - 130 * scale;
    return `
    <g transform="translate(${tx.toFixed(2)}, ${ty.toFixed(2)}) scale(${scale.toFixed(4)})">
      <defs>
        <clipPath id="${clipId}">
          <path d="M 100 12 C 147 12, 182 68, 182 124 C 182 174, 146 218, 100 248 C 54 218, 18 174, 18 124 C 18 68, 53 12, 100 12 Z" />
        </clipPath>
      </defs>
      <path d="M 100 12 C 147 12, 182 68, 182 124 C 182 174, 146 218, 100 248 C 54 218, 18 174, 18 124 C 18 68, 53 12, 100 12 Z" fill="${config.markFill}" />
      <g clip-path="url(#${clipId})">
        <ellipse cx="100" cy="23.5" rx="12.5" ry="5.2" fill="${config.mouthpieceColor}" />
        <g stroke="${config.markSubtleDetailColor}" stroke-width="3.8" stroke-linecap="round">
          <line x1="43" y1="101" x2="48" y2="117.5" />
          <line x1="58" y1="105.5" x2="61.5" y2="122.5" />
          <line x1="73" y1="109.5" x2="75" y2="126.5" />
          <line x1="127" y1="109.5" x2="125" y2="126.5" />
          <line x1="142" y1="105.5" x2="138.5" y2="122.5" />
          <line x1="157" y1="101" x2="152" y2="117.5" />
        </g>
        <path d="M 14 121 Q 100 148 186 121" stroke="${config.markDetailColor}" stroke-width="4.6" fill="none" />
        <circle cx="59" cy="156" r="11.5" fill="${config.markDetailColor}" />
        <circle cx="141" cy="156" r="11.5" fill="${config.markDetailColor}" />
        <g stroke="${config.markSubtleDetailColor}" stroke-width="3.8" stroke-linecap="round">
          <line x1="71" y1="186" x2="90" y2="193" />
          <line x1="78" y1="200" x2="94" y2="206" />
          <line x1="85" y1="213" x2="97" y2="217.5" />
        </g>
      </g>
    </g>`;
  };

  const escapeXml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const bgRect = config.transparentBg
    ? ''
    : `<rect width="${width}" height="${height}" fill="${config.bgColor}" />`;

  let body = '';

  if (config.format === 'primary') {
    const markH = 440 * config.markScale;
    const fontSize = 188 * config.markScale;
    const textY = cy + 205 * config.padding;
    body = `
      ${markGroup(cx, cy - 150 * config.padding, markH, 'clip-primary')}
      <text x="${cx}" y="${textY}" text-anchor="middle" dominant-baseline="central" font-family="Outfit, sans-serif" font-weight="500" font-size="${fontSize}" letter-spacing="${config.letterSpacing}em" fill="${config.wordmarkColor}">${escapeXml(config.brandText)}</text>
      ${
        config.showAccentBar
          ? `<rect x="${cx - (156 * config.markScale) / 2}" y="${textY + 125}" width="${156 * config.markScale}" height="10" rx="5" fill="${config.accentColor}" />`
          : ''
      }
      ${
        config.showTagline && config.tagline.trim()
          ? `<text x="${cx}" y="${textY + (config.showAccentBar ? 185 : 135)}" text-anchor="middle" dominant-baseline="central" font-family="Plus Jakarta Sans, sans-serif" font-weight="500" font-size="34" fill="${config.wordmarkColor}" fill-opacity="0.65">${escapeXml(config.tagline)}</text>`
          : ''
      }
    `;
  } else if (config.format === 'horizontal' || config.format === 'banner') {
    const isBanner = config.format === 'banner';
    const baseScale = isBanner ? 0.72 : 1;
    const markH = 310 * config.markScale * baseScale;
    const fontSize = 210 * config.markScale * baseScale;
    const offset = isBanner ? 260 : 340;
    body = `
      ${markGroup(cx - offset, cy, markH, 'clip-horiz')}
      <text x="${cx - offset + markH * 0.56}" y="${cy + 6}" text-anchor="start" dominant-baseline="central" font-family="Outfit, sans-serif" font-weight="500" font-size="${fontSize}" letter-spacing="${config.letterSpacing}em" fill="${config.wordmarkColor}">${escapeXml(config.brandText)}</text>
    `;
  } else if (config.format === 'mark') {
    body = markGroup(cx, cy, 620 * config.markScale, 'clip-mark');
  } else if (config.format === 'app-icon') {
    const pad = 104 * config.padding;
    const boxSize = Math.max(400, width - pad * 2);
    const x = (width - boxSize) / 2;
    const y = (height - boxSize) / 2;
    const radius = (config.cornerRadius / 100) * boxSize;
    body = `
      <rect x="${x}" y="${y}" width="${boxSize}" height="${boxSize}" rx="${radius}" fill="${config.containerColor}" />
      ${markGroup(cx, cy, boxSize * 0.54 * config.markScale, 'clip-app')}
    `;
  } else if (config.format === 'profile') {
    const pad = 104 * config.padding;
    const diameter = Math.max(400, width - pad * 2);
    body = `
      <circle cx="${cx}" cy="${cy}" r="${diameter / 2}" fill="${config.containerColor}" />
      ${markGroup(cx, cy, diameter * 0.53 * config.markScale, 'clip-profile')}
    `;
  } else if (config.format === 'favicon') {
    const sizes = [360, 180, 96, 62, 34];
    const gap = 64;
    const totalW = sizes.reduce((a, b) => a + b, 0) + gap * (sizes.length - 1);
    let cursorX = cx - totalW / 2;
    const bottomY = cy + 170;
    body = sizes
      .map((size, idx) => {
        const y = bottomY - size;
        const r = (config.cornerRadius / 100) * size;
        const part = `
          <rect x="${cursorX}" y="${y}" width="${size}" height="${size}" rx="${r}" fill="${config.containerColor}" />
          ${markGroup(cursorX + size / 2, y + size / 2, size * 0.55 * config.markScale, `clip-fav-${idx}`)}
        `;
        cursorX += size + gap;
        return part;
      })
      .join('');
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  ${bgRect}
  ${body}
</svg>`;
}

/**
 * Draws procedural studio backdrops for Instagram templates.
 */
function drawStudioBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bgColor: string,
  style: BackdropStyle
) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  if (style === 'solid') return;

  if (style === 'midnight-mesh') {
    const g1 = ctx.createRadialGradient(w * 0.82, h * 0.16, 40, w * 0.82, h * 0.16, w * 0.85);
    g1.addColorStop(0, 'rgba(41, 57, 240, 0.48)');
    g1.addColorStop(1, 'rgba(41, 57, 240, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    const g2 = ctx.createRadialGradient(w * 0.15, h * 0.84, 30, w * 0.15, h * 0.84, w * 0.72);
    g2.addColorStop(0, 'rgba(24, 213, 168, 0.22)');
    g2.addColorStop(1, 'rgba(24, 213, 168, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  } else if (style === 'indigo-aura') {
    const g1 = ctx.createLinearGradient(0, 0, w, h);
    g1.addColorStop(0, 'rgba(92, 124, 250, 0.45)');
    g1.addColorStop(0.55, 'rgba(41, 57, 240, 0.1)');
    g1.addColorStop(1, 'rgba(11, 17, 32, 0.55)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    const g2 = ctx.createRadialGradient(w * 0.78, h * 0.78, 20, w * 0.78, h * 0.78, w * 0.65);
    g2.addColorStop(0, 'rgba(24, 213, 168, 0.25)');
    g2.addColorStop(1, 'rgba(24, 213, 168, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  } else if (style === 'cool-mist') {
    const g1 = ctx.createRadialGradient(w * 0.88, h * 0.14, 20, w * 0.88, h * 0.14, w * 0.75);
    g1.addColorStop(0, 'rgba(41, 57, 240, 0.10)');
    g1.addColorStop(1, 'rgba(41, 57, 240, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    const g2 = ctx.createRadialGradient(w * 0.12, h * 0.88, 20, w * 0.12, h * 0.88, w * 0.7);
    g2.addColorStop(0, 'rgba(24, 213, 168, 0.14)');
    g2.addColorStop(1, 'rgba(24, 213, 168, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  } else if (style === 'mint-horizon') {
    const g1 = ctx.createRadialGradient(w * 0.5, h * 0.92, 40, w * 0.5, h * 0.92, w * 0.95);
    g1.addColorStop(0, 'rgba(24, 213, 168, 0.34)');
    g1.addColorStop(0.55, 'rgba(41, 57, 240, 0.22)');
    g1.addColorStop(1, 'rgba(11, 17, 32, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);
  } else if (style === 'navy-grid') {
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.09)';
    ctx.lineWidth = 2;
    const step = 90;
    for (let x = 0; x <= w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
    const g1 = ctx.createRadialGradient(w * 0.5, h * 0.22, 40, w * 0.5, h * 0.22, w * 0.8);
    g1.addColorStop(0, 'rgba(92, 124, 250, 0.22)');
    g1.addColorStop(1, 'rgba(11, 17, 32, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  zoom: number,
  offsetX: number,
  offsetY: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = w / h;
  let drawW = w;
  let drawH = h;
  if (imgRatio > boxRatio) {
    drawH = h * zoom;
    drawW = drawH * imgRatio;
  } else {
    drawW = w * zoom;
    drawH = drawW / imgRatio;
  }

  const dx = x + (w - drawW) / 2 + (offsetX / 100) * w * 0.6;
  const dy = y + (h - drawH) / 2 + (offsetY / 100) * h * 0.6;
  ctx.drawImage(img, dx, dy, drawW, drawH);
  ctx.restore();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
  }
  return lines;
}

function drawBrandLockupInline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  align: 'left' | 'center',
  variant: InstagramConfig['logoVariant'],
  textColor: string,
  markColors: MarkColors,
  scale = 1
) {
  if (variant === 'none') return;

  if (variant === 'mark') {
    const markH = 74 * scale;
    const markW = (markH / 260) * 200;
    const cx = align === 'center' ? x : x + markW / 2;
    drawOkarinaMarkOnCanvas(ctx, cx, y + markH / 2, markH, markColors);
    return;
  }

  if (variant === 'horizontal') {
    const markH = 68 * scale;
    const markW = (markH / 260) * 200;
    const fontSize = 48 * scale;
    const gap = 22 * scale;
    ctx.font = `500 ${fontSize}px "Outfit", sans-serif`;
    const wordW = ctx.measureText('okarina').width;
    const totalW = markW + gap + wordW;
    const startX = align === 'center' ? x - totalW / 2 : x;

    drawOkarinaMarkOnCanvas(
      ctx,
      startX + markW / 2,
      y + markH / 2,
      markH,
      markColors
    );
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('okarina', startX + markW + gap, y + markH / 2 + 2);
    return;
  }

  if (variant === 'stacked') {
    const markH = 112 * scale;
    const cx = align === 'center' ? x : x + 64 * scale;
    drawOkarinaMarkOnCanvas(ctx, cx, y + markH / 2, markH, markColors);
    ctx.font = `500 ${52 * scale}px "Outfit", sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('okarina', cx, y + markH + 18 * scale);
  }
}

/**
 * Renders any of the 8 Instagram Story / Post templates at native resolution (1080px wide).
 */
export function renderInstagramToCanvas(
  canvas: HTMLCanvasElement,
  config: InstagramConfig,
  loadedImage: HTMLImageElement | null
) {
  const meta = INSTAGRAM_FORMAT_META[config.format];
  const w = meta.width;
  const h = meta.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const isStory = config.format === 'story';
  const padX = 88;
  const topSafe = isStory ? 180 : 88;
  const bottomSafe = isStory ? 170 : 88;
  const contentW = w - padX * 2;
  const alignX = config.textAlign === 'center' ? w / 2 : padX;

  const markColors: MarkColors = {
    fill: config.markFill,
    detailColor: config.markDetailColor,
    subtleDetailColor: config.markSubtleDetailColor,
    mouthpieceColor: config.mouthpieceColor,
  };

  // Base backdrop
  drawStudioBackdrop(ctx, w, h, config.bgColor, config.backdropStyle);

  const isFramedPhotoTemplate =
    config.templateId === 'product-spotlight' ||
    config.templateId === 'polaroid-frame';

  // Full-bleed photo if uploaded and not a framed-photo template
  if (loadedImage && !isFramedPhotoTemplate) {
    drawCoverImage(
      ctx,
      loadedImage,
      0,
      0,
      w,
      h,
      config.photoZoom,
      config.photoOffsetX,
      config.photoOffsetY
    );
    // Measured scrim for guaranteed legibility
    const scrimGrad = ctx.createLinearGradient(0, 0, 0, h);
    scrimGrad.addColorStop(0, `rgba(11, 17, 32, ${(config.scrimOpacity * 0.65).toFixed(2)})`);
    scrimGrad.addColorStop(0.45, `rgba(11, 17, 32, ${(config.scrimOpacity * 0.45).toFixed(2)})`);
    scrimGrad.addColorStop(1, `rgba(11, 17, 32, ${Math.min(0.92, config.scrimOpacity * 1.15).toFixed(2)})`);
    ctx.fillStyle = scrimGrad;
    ctx.fillRect(0, 0, w, h);
  }

  // Template-specific layouts
  if (config.templateId === 'minimal-mark') {
    const centerMarkH = isStory ? 340 : 270;
    const markCy = h * 0.42;
    drawOkarinaMarkOnCanvas(ctx, w / 2, markCy, centerMarkH, markColors);

    const headSize = Math.round(92 * config.headlineScale);
    ctx.font = `500 ${headSize}px "Outfit", sans-serif`;
    ctx.fillStyle = config.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const headY = markCy + centerMarkH / 2 + 54;
    ctx.fillText(config.headline, w / 2, headY);

    if (config.showMintAccent) {
      ctx.fillStyle = config.accentColor;
      drawRoundedRect(ctx, w / 2 - 58, headY + headSize + 32, 116, 8, 4);
      ctx.fill();
    }

    if (config.body.trim()) {
      ctx.font = `400 36px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = config.mutedTextColor;
      ctx.fillText(config.body, w / 2, headY + headSize + 72);
    }

    // Quiet footer
    ctx.font = `500 26px "JetBrains Mono", monospace`;
    ctx.fillStyle = config.mutedTextColor;
    ctx.textAlign = 'center';
    ctx.fillText(
      [config.dateLabel, config.footerHandle].filter(Boolean).join('  ·  '),
      w / 2,
      h - bottomSafe
    );
    return;
  }

  if (config.templateId === 'product-spotlight' || config.templateId === 'polaroid-frame') {
    const isPolaroid = config.templateId === 'polaroid-frame';
    // Top bar: lockup + date
    drawBrandLockupInline(
      ctx,
      padX,
      topSafe,
      'left',
      config.logoVariant === 'none' ? 'none' : 'horizontal',
      config.textColor,
      markColors,
      0.92
    );

    if (config.dateLabel.trim()) {
      ctx.font = `500 24px "JetBrains Mono", monospace`;
      ctx.fillStyle = config.mutedTextColor;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(config.dateLabel, w - padX, topSafe + 34);
    }

    // Inset photo frame
    const frameTop = topSafe + 120;
    const frameH = isStory ? 960 : config.format === 'post-portrait' ? 660 : 490;
    const framePad = isPolaroid ? 28 : 0;

    if (isPolaroid) {
      ctx.save();
      ctx.shadowColor = 'rgba(11, 17, 32, 0.14)';
      ctx.shadowBlur = 44;
      ctx.shadowOffsetY = 20;
      ctx.fillStyle = '#FFFFFF';
      drawRoundedRect(ctx, padX, frameTop, contentW, frameH + 40, 28);
      ctx.fill();
      ctx.restore();
    }

    const imgX = padX + framePad;
    const imgY = frameTop + framePad;
    const imgW = contentW - framePad * 2;
    const imgH = frameH - framePad;

    ctx.save();
    drawRoundedRect(ctx, imgX, imgY, imgW, imgH, isPolaroid ? 16 : 28);
    ctx.clip();

    if (loadedImage) {
      drawCoverImage(
        ctx,
        loadedImage,
        imgX,
        imgY,
        imgW,
        imgH,
        config.photoZoom,
        config.photoOffsetX,
        config.photoOffsetY
      );
    } else {
      // Elegant placeholder studio frame with okarina mark
      const fg = ctx.createLinearGradient(imgX, imgY, imgX + imgW, imgY + imgH);
      fg.addColorStop(0, '#162244');
      fg.addColorStop(1, '#2939F0');
      ctx.fillStyle = fg;
      ctx.fillRect(imgX, imgY, imgW, imgH);

      drawOkarinaMarkOnCanvas(ctx, imgX + imgW / 2, imgY + imgH / 2 - 18, 170, {
        fill: '#FFFFFF',
        detailColor: '#2939F0',
        subtleDetailColor: '#8B97FA',
        mouthpieceColor: '#2939F0',
      });
      ctx.font = `500 26px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Drop your photo in the left panel', imgX + imgW / 2, imgY + imgH / 2 + 88);
    }
    ctx.restore();

    // Subtle border on spotlight frame
    if (!isPolaroid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, imgX, imgY, imgW, imgH, 28);
      ctx.stroke();
    }

    // Text deck below photo
    let cursorY = frameTop + frameH + (isPolaroid ? 86 : 62);
    if (config.eyebrow.trim()) {
      ctx.font = `600 24px "JetBrains Mono", monospace`;
      ctx.fillStyle = config.accentColor;
      ctx.textAlign = config.textAlign;
      ctx.textBaseline = 'top';
      ctx.fillText(config.eyebrow, alignX, cursorY);
      cursorY += 42;
    }

    const headSize = Math.round((isStory ? 74 : 58) * config.headlineScale);
    ctx.font = `600 ${headSize}px "Outfit", sans-serif`;
    ctx.fillStyle = config.textColor;
    ctx.textAlign = config.textAlign;
    ctx.textBaseline = 'top';
    const headLines = wrapTextLines(ctx, config.headline, contentW);
    headLines.forEach((line) => {
      ctx.fillText(line, alignX, cursorY);
      cursorY += headSize * 1.12;
    });

    if (config.body.trim()) {
      cursorY += 16;
      const bodySize = isStory ? 34 : 28;
      ctx.font = `400 ${bodySize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = config.mutedTextColor;
      const bodyLines = wrapTextLines(ctx, config.body, contentW);
      bodyLines.slice(0, 3).forEach((line) => {
        ctx.fillText(line, alignX, cursorY);
        cursorY += bodySize * 1.42;
      });
    }

    // Bottom footer line
    ctx.font = `500 26px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = config.mutedTextColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(config.footerHandle, padX, h - bottomSafe);
    if (config.ctaText.trim()) {
      ctx.textAlign = 'right';
      ctx.fillStyle = config.accentColor;
      ctx.fillText(config.ctaText, w - padX, h - bottomSafe);
    }
    return;
  }

  if (config.templateId === 'studio-note') {
    // Top bar on backdrop/photo
    drawBrandLockupInline(
      ctx,
      padX,
      topSafe,
      'left',
      'horizontal',
      '#FFFFFF',
      {
        fill: '#5C7CFA',
        detailColor: '#0B1120',
        subtleDetailColor: '#1E294B',
        mouthpieceColor: '#0B1120',
      },
      0.92
    );

    // Docked crisp white editorial card in lower half
    const cardH = isStory ? 780 : 540;
    const cardY = h - bottomSafe - cardH;
    ctx.save();
    ctx.shadowColor = 'rgba(11, 17, 32, 0.25)';
    ctx.shadowBlur = 48;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, padX - 16, cardY, contentW + 32, cardH, 36);
    ctx.fill();
    ctx.restore();

    const innerPad = 64;
    let cy = cardY + innerPad;
    const cardInnerX = padX - 16 + innerPad;
    const cardInnerW = contentW + 32 - innerPad * 2;

    if (config.showMintAccent) {
      ctx.fillStyle = config.accentColor;
      drawRoundedRect(ctx, cardInnerX, cy, 88, 8, 4);
      ctx.fill();
      cy += 36;
    }

    if (config.eyebrow.trim()) {
      ctx.font = `600 24px "JetBrains Mono", monospace`;
      ctx.fillStyle = '#2939F0';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(
        [config.eyebrow, config.dateLabel].filter(Boolean).join('  ·  '),
        cardInnerX,
        cy
      );
      cy += 46;
    }

    const headSize = Math.round((isStory ? 74 : 58) * config.headlineScale);
    ctx.font = `600 ${headSize}px "Outfit", sans-serif`;
    ctx.fillStyle = '#0B1120';
    const hLines = wrapTextLines(ctx, config.headline, cardInnerW);
    hLines.forEach((line) => {
      ctx.fillText(line, cardInnerX, cy);
      cy += headSize * 1.12;
    });

    if (config.body.trim()) {
      cy += 22;
      const bodySize = isStory ? 34 : 28;
      ctx.font = `400 ${bodySize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#475569';
      const bLines = wrapTextLines(ctx, config.body, cardInnerW);
      bLines.forEach((line) => {
        ctx.fillText(line, cardInnerX, cy);
        cy += bodySize * 1.48;
      });
    }

    // Card footer
    ctx.font = `600 26px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#0B1120';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(config.footerHandle, cardInnerX, cardY + cardH - innerPad + 8);
    if (config.ctaText.trim()) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#2939F0';
      ctx.fillText(config.ctaText, cardInnerX + cardInnerW, cardY + cardH - innerPad + 8);
    }
    return;
  }

  // Standard Editorial / Launch / Quote / Event layouts
  const topLogo = config.logoPosition === 'top';

  if (topLogo) {
    drawBrandLockupInline(
      ctx,
      alignX,
      topSafe,
      config.textAlign,
      config.logoVariant,
      config.textColor,
      markColors,
      1
    );
  }

  if (config.dateLabel.trim() && config.textAlign === 'left' && topLogo) {
    ctx.font = `500 24px "JetBrains Mono", monospace`;
    ctx.fillStyle = config.mutedTextColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.dateLabel, w - padX, topSafe + 34);
  }

  // Main copy block placement
  const isQuote = config.templateId === 'quote-card';
  const isEvent = config.templateId === 'event-drop';
  const headBase = isStory ? 96 : config.format === 'post-portrait' ? 84 : 76;
  const headSize = Math.round(headBase * (isQuote ? 0.84 : 1) * config.headlineScale);
  ctx.font = `${isQuote ? '500' : '600'} ${headSize}px "Outfit", sans-serif`;
  const headLines = wrapTextLines(ctx, config.headline, contentW);

  const bodySize = isStory ? 38 : 32;
  ctx.font = `400 ${bodySize}px "Plus Jakarta Sans", sans-serif`;
  const bodyLines = config.body.trim() ? wrapTextLines(ctx, config.body, contentW) : [];

  const totalBlockH =
    (config.eyebrow ? 52 : 0) +
    headLines.length * (headSize * 1.12) +
    (config.showMintAccent ? 46 : 0) +
    (bodyLines.length > 0 ? 24 + bodyLines.length * (bodySize * 1.45) : 0) +
    (isEvent ? 96 : 0);

  let cursorY =
    config.templateId === 'editorial-photo'
      ? h - bottomSafe - totalBlockH - 96
      : (h - totalBlockH) / 2 + (topLogo ? 24 : -24);

  // Event date strip
  if (isEvent && config.dateLabel.trim()) {
    ctx.font = `600 28px "JetBrains Mono", monospace`;
    ctx.fillStyle = config.accentColor;
    ctx.textAlign = config.textAlign;
    ctx.textBaseline = 'top';
    ctx.fillText(config.dateLabel, alignX, cursorY);
    cursorY += 56;
  }

  // Eyebrow
  if (config.eyebrow.trim()) {
    ctx.font = `600 26px "JetBrains Mono", monospace`;
    ctx.fillStyle = config.showMintAccent ? config.accentColor : config.mutedTextColor;
    ctx.textAlign = config.textAlign;
    ctx.textBaseline = 'top';
    ctx.fillText(config.eyebrow, alignX, cursorY);
    cursorY += 52;
  }

  // Headline
  ctx.font = `${isQuote ? '500' : '600'} ${headSize}px "Outfit", sans-serif`;
  ctx.fillStyle = config.textColor;
  ctx.textAlign = config.textAlign;
  ctx.textBaseline = 'top';
  headLines.forEach((line) => {
    ctx.fillText(line, alignX, cursorY);
    cursorY += headSize * 1.12;
  });

  // Mint signature rule
  if (config.showMintAccent) {
    cursorY += 24;
    const barW = 112;
    const barX = config.textAlign === 'center' ? w / 2 - barW / 2 : padX;
    ctx.fillStyle = config.accentColor;
    drawRoundedRect(ctx, barX, cursorY, barW, 8, 4);
    ctx.fill();
    cursorY += 32;
  }

  // Body
  if (bodyLines.length > 0) {
    cursorY += 16;
    ctx.font = `400 ${bodySize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = config.mutedTextColor;
    ctx.textAlign = config.textAlign;
    ctx.textBaseline = 'top';
    bodyLines.forEach((line) => {
      ctx.fillText(line, alignX, cursorY);
      cursorY += bodySize * 1.45;
    });
  }

  // Bottom bar
  if (!topLogo) {
    drawBrandLockupInline(
      ctx,
      alignX,
      h - bottomSafe - 74,
      config.textAlign,
      config.logoVariant,
      config.textColor,
      markColors,
      0.95
    );
  } else {
    // Divider hairline
    ctx.strokeStyle =
      config.textColor === '#FFFFFF'
        ? 'rgba(255,255,255,0.16)'
        : 'rgba(11,17,32,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padX, h - bottomSafe - 54);
    ctx.lineTo(w - padX, h - bottomSafe - 54);
    ctx.stroke();

    ctx.font = `500 28px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = config.mutedTextColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(config.footerHandle, padX, h - bottomSafe);

    if (config.ctaText.trim()) {
      ctx.textAlign = 'right';
      ctx.fillStyle = config.textColor;
      ctx.fillText(config.ctaText, w - padX, h - bottomSafe);
    }
  }
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  if (dataUrl.startsWith('data:') || dataUrl.startsWith('blob:') || dataUrl.startsWith('/')) {
    saveUrlAsFile(dataUrl, filename);
    return;
  }
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadSvgString(svg: string, filename: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  saveBlobFile(blob, filename);
}
