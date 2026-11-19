import { VIDEO_FORMAT_META } from '../data/brandPresets';
import { BackdropStyle, VideoConfig } from '../types/brand';
import { drawOkarinaMarkOnCanvas, MarkColors } from './canvasRenderers';

function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
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

function drawAnimatedBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bgColor: string,
  style: BackdropStyle,
  timeSec: number,
  intensity: number,
  bassEnergy: number
) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  if (style === 'solid') return;

  const driftX = Math.sin(timeSec * 0.7) * 0.05 * intensity;
  const driftY = Math.cos(timeSec * 0.55) * 0.04 * intensity;
  const pulse = 1 + bassEnergy * 0.14 * intensity;

  if (style === 'midnight-mesh') {
    const gx1 = w * (0.82 + driftX);
    const gy1 = h * (0.16 + driftY);
    const g1 = ctx.createRadialGradient(gx1, gy1, 30, gx1, gy1, w * 0.85 * pulse);
    g1.addColorStop(0, `rgba(41, 57, 240, ${(0.48 + bassEnergy * 0.14).toFixed(2)})`);
    g1.addColorStop(1, 'rgba(41, 57, 240, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    const gx2 = w * (0.15 - driftX);
    const gy2 = h * (0.84 - driftY);
    const g2 = ctx.createRadialGradient(gx2, gy2, 20, gx2, gy2, w * 0.72 * pulse);
    g2.addColorStop(0, `rgba(24, 213, 168, ${(0.22 + bassEnergy * 0.12).toFixed(2)})`);
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

    const gx = w * (0.78 + driftX);
    const gy = h * (0.78 + driftY);
    const g2 = ctx.createRadialGradient(gx, gy, 20, gx, gy, w * 0.65 * pulse);
    g2.addColorStop(0, `rgba(24, 213, 168, ${(0.24 + bassEnergy * 0.14).toFixed(2)})`);
    g2.addColorStop(1, 'rgba(24, 213, 168, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  } else if (style === 'cool-mist') {
    const g1 = ctx.createRadialGradient(
      w * (0.88 + driftX),
      h * (0.14 + driftY),
      20,
      w * 0.88,
      h * 0.14,
      w * 0.75 * pulse
    );
    g1.addColorStop(0, 'rgba(41, 57, 240, 0.12)');
    g1.addColorStop(1, 'rgba(41, 57, 240, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    const g2 = ctx.createRadialGradient(
      w * (0.12 - driftX),
      h * (0.88 - driftY),
      20,
      w * 0.12,
      h * 0.88,
      w * 0.7 * pulse
    );
    g2.addColorStop(0, 'rgba(24, 213, 168, 0.16)');
    g2.addColorStop(1, 'rgba(24, 213, 168, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  } else if (style === 'mint-horizon') {
    const gy = h * (0.9 + driftY * 0.5);
    const g1 = ctx.createRadialGradient(w * 0.5, gy, 40, w * 0.5, gy, w * 0.95 * pulse);
    g1.addColorStop(0, `rgba(24, 213, 168, ${(0.34 + bassEnergy * 0.16).toFixed(2)})`);
    g1.addColorStop(0.55, 'rgba(41, 57, 240, 0.22)');
    g1.addColorStop(1, 'rgba(11, 17, 32, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);
  } else if (style === 'navy-grid') {
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.09)';
    ctx.lineWidth = 2;
    const step = 90;
    const shift = (timeSec * 14 * intensity) % step;
    for (let x = -step; x <= w + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = -step + shift; y <= h + step; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    const g1 = ctx.createRadialGradient(w * 0.5, h * 0.24, 40, w * 0.5, h * 0.24, w * 0.8 * pulse);
    g1.addColorStop(0, `rgba(92, 124, 250, ${(0.22 + bassEnergy * 0.12).toFixed(2)})`);
    g1.addColorStop(1, 'rgba(11, 17, 32, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawKenBurnsPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  progress: number,
  intensity: number,
  scrimOpacity: number
) {
  const zoom = 1 + 0.14 * intensity * progress;
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

  const dx = (w - drawW) / 2 + Math.sin(progress * Math.PI) * 18 * intensity;
  const dy = (h - drawH) / 2;
  ctx.drawImage(img, dx, dy, drawW, drawH);

  const scrimGrad = ctx.createLinearGradient(0, 0, 0, h);
  scrimGrad.addColorStop(0, `rgba(11, 17, 32, ${(scrimOpacity * 0.7).toFixed(2)})`);
  scrimGrad.addColorStop(0.5, `rgba(11, 17, 32, ${(scrimOpacity * 0.48).toFixed(2)})`);
  scrimGrad.addColorStop(1, `rgba(11, 17, 32, ${Math.min(0.92, scrimOpacity * 1.15).toFixed(2)})`);
  ctx.fillStyle = scrimGrad;
  ctx.fillRect(0, 0, w, h);
}

function drawSpectrumBars(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  maxBarHeight: number,
  barCount: number,
  accentColor: string,
  textColor: string,
  freqData: Uint8Array | null,
  timeSec: number,
  align: 'left' | 'center',
  intensity: number
) {
  const gap = Math.max(6, Math.floor(width / (barCount * 2.3)));
  const barW = Math.max(6, Math.floor((width - gap * (barCount - 1)) / barCount));
  const totalW = barW * barCount + gap * (barCount - 1);
  const startX = align === 'center' ? x - totalW / 2 : x;

  ctx.save();
  for (let i = 0; i < barCount; i++) {
    let val = 0;
    if (freqData && freqData.length > 0) {
      const binIndex = Math.min(
        freqData.length - 1,
        Math.floor((i / barCount) * Math.min(freqData.length * 0.65, 64))
      );
      val = freqData[binIndex] / 255;
    } else {
      // Smooth idle preview wave when paused
      val =
        0.22 +
        0.25 *
          Math.abs(Math.sin(timeSec * 3.2 + i * 0.45)) *
          (0.6 + 0.4 * Math.cos(i * 0.2));
    }

    const barH = Math.max(8, val * maxBarHeight * Math.min(1.3, 0.7 + intensity * 0.4));
    const bx = startX + i * (barW + gap);
    const by = y - barH;

    ctx.fillStyle = i % 3 === 0 ? accentColor : textColor;
    ctx.globalAlpha = i % 3 === 0 ? 0.92 : 0.45;
    drawRoundedRect(ctx, bx, by, barW, barH, barW / 2);
    ctx.fill();
  }
  ctx.restore();
}

export function renderVideoFrameToCanvas(
  canvas: HTMLCanvasElement,
  config: VideoConfig,
  timeSec: number,
  freqData: Uint8Array | null,
  loadedImage: HTMLImageElement | null
) {
  const meta = VIDEO_FORMAT_META[config.format];
  const w = meta.width;
  const h = meta.height;

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const progress = Math.max(0, Math.min(1, timeSec / Math.max(1, config.durationSec)));

  // Extract low-frequency bass energy (0..1) from FFT bins or fallback oscillation
  let bassEnergy = 0.25;
  if (freqData && freqData.length > 4) {
    const sum = freqData[0] + freqData[1] + freqData[2] + freqData[3];
    bassEnergy = sum / (4 * 255);
  } else {
    bassEnergy = 0.2 + 0.16 * Math.sin(timeSec * 3.1);
  }

  // 1. Backdrop
  drawAnimatedBackdrop(
    ctx,
    w,
    h,
    config.bgColor,
    config.backdropStyle,
    timeSec,
    config.motionIntensity,
    bassEnergy
  );

  // 2. Optional Ken Burns Photo
  if (loadedImage) {
    drawKenBurnsPhoto(
      ctx,
      loadedImage,
      w,
      h,
      progress,
      config.motionIntensity,
      config.scrimOpacity
    );
  }

  const isLandscape = config.format === 'landscape';
  const isReel = config.format === 'reel';
  const padX = isLandscape ? 120 : 88;
  const topSafe = isReel ? 180 : isLandscape ? 92 : 88;
  const bottomSafe = isReel ? 170 : isLandscape ? 88 : 88;
  const contentW = w - padX * 2;
  const alignX = config.textAlign === 'center' ? w / 2 : padX;

  const markColors: MarkColors = {
    fill: config.markFill,
    detailColor: config.markDetailColor,
    subtleDetailColor: config.markSubtleDetailColor,
    mouthpieceColor: config.mouthpieceColor,
  };

  // Entrance animations
  const introT = easeOutCubic(timeSec / 0.75);
  const copyT = easeOutCubic((timeSec - 0.15) / 0.85);
  const subT = easeOutCubic((timeSec - 0.3) / 0.85);

  // 3. Top Lockup / Kinetic Emblem
  if (config.templateId === 'okarina-kinetic') {
    const floatY = Math.sin(timeSec * 2.2) * 14 * config.motionIntensity;
    const pulseScale = 1 + bassEnergy * 0.08 * config.motionIntensity;
    const markH = (isReel ? 300 : 220) * pulseScale;
    const markCy = h * (isReel ? 0.31 : 0.29) + floatY;

    ctx.save();
    ctx.globalAlpha = introT;
    drawOkarinaMarkOnCanvas(ctx, w / 2, markCy, markH, markColors);
    ctx.restore();
  } else if (config.logoVariant !== 'none') {
    ctx.save();
    ctx.globalAlpha = introT;
    const lockY = topSafe + (1 - introT) * 18;
    const markH = 66;
    const markW = (markH / 260) * 200;
    const gap = 22;

    if (config.logoVariant === 'mark') {
      const cx = config.textAlign === 'center' ? w / 2 : padX + markW / 2;
      drawOkarinaMarkOnCanvas(ctx, cx, lockY + markH / 2, markH, markColors);
    } else {
      ctx.font = '500 48px "Outfit", sans-serif';
      const wordW = ctx.measureText('okarina').width;
      const totalW = markW + gap + wordW;
      const startX = config.textAlign === 'center' ? w / 2 - totalW / 2 : padX;
      drawOkarinaMarkOnCanvas(
        ctx,
        startX + markW / 2,
        lockY + markH / 2,
        markH,
        markColors
      );
      ctx.fillStyle = config.textColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('okarina', startX + markW + gap, lockY + markH / 2 + 2);
    }

    if (config.dateLabel.trim() && config.textAlign === 'left') {
      ctx.font = '500 24px "JetBrains Mono", monospace';
      ctx.fillStyle = config.mutedTextColor;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(config.dateLabel, w - padX, lockY + markH / 2);
    }
    ctx.restore();
  }

  // 4. Main Typography Block
  const headBase = isReel ? 92 : isLandscape ? 82 : 74;
  const headSize = Math.round(headBase * config.headlineScale);
  const bodySize = isReel ? 36 : isLandscape ? 32 : 30;

  ctx.font = `600 ${headSize}px "Outfit", sans-serif`;
  const maxCopyW = isLandscape ? contentW * 0.72 : contentW;
  const headLines = wrapTextLines(ctx, config.headline, maxCopyW);

  ctx.font = `400 ${bodySize}px "Plus Jakarta Sans", sans-serif`;
  const bodyLines = config.body.trim()
    ? wrapTextLines(ctx, config.body, maxCopyW)
    : [];

  let cursorY =
    config.templateId === 'okarina-kinetic'
      ? h * 0.49
      : isReel
      ? h * 0.42
      : isLandscape
      ? h * 0.3
      : h * 0.34;

  // Eyebrow
  if (config.eyebrow.trim()) {
    ctx.save();
    ctx.globalAlpha = copyT;
    ctx.font = '600 25px "JetBrains Mono", monospace';
    ctx.fillStyle = config.showMintAccent
      ? config.accentColor
      : config.mutedTextColor;
    ctx.textAlign = config.textAlign;
    ctx.textBaseline = 'top';
    ctx.fillText(config.eyebrow, alignX, cursorY + (1 - copyT) * 24);
    ctx.restore();
    cursorY += 50;
  }

  // Headline
  ctx.save();
  ctx.globalAlpha = copyT;
  ctx.font = `600 ${headSize}px "Outfit", sans-serif`;
  ctx.fillStyle = config.textColor;
  ctx.textAlign = config.textAlign;
  ctx.textBaseline = 'top';
  headLines.forEach((line) => {
    ctx.fillText(line, alignX, cursorY + (1 - copyT) * 28);
    cursorY += headSize * 1.12;
  });
  ctx.restore();

  // Signature Mint Rule
  if (config.showMintAccent) {
    cursorY += 22;
    const barW = 120 * copyT;
    const barX = config.textAlign === 'center' ? w / 2 - barW / 2 : padX;
    ctx.fillStyle = config.accentColor;
    drawRoundedRect(ctx, barX, cursorY, Math.max(4, barW), 8, 4);
    ctx.fill();
    cursorY += 32;
  }

  // Body copy
  if (bodyLines.length > 0) {
    cursorY += 12;
    ctx.save();
    ctx.globalAlpha = subT;
    ctx.font = `400 ${bodySize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = config.mutedTextColor;
    ctx.textAlign = config.textAlign;
    ctx.textBaseline = 'top';
    bodyLines.slice(0, 3).forEach((line) => {
      ctx.fillText(line, alignX, cursorY + (1 - subT) * 20);
      cursorY += bodySize * 1.44;
    });
    ctx.restore();
  }

  // 5. Audio-Reactive Waveform Spectrum
  if (config.showWaveform) {
    const waveY = h - bottomSafe - 96;
    const waveW =
      config.templateId === 'waveform-showcase'
        ? contentW
        : Math.min(contentW, isLandscape ? 780 : 620);
    const barCount = isLandscape ? 42 : 28;
    const maxBarH = config.templateId === 'waveform-showcase' ? 170 : 110;
    const waveX = config.textAlign === 'center' ? w / 2 : padX;

    drawSpectrumBars(
      ctx,
      waveX,
      waveY,
      waveW,
      maxBarH,
      barCount,
      config.accentColor,
      config.textColor,
      freqData,
      timeSec,
      config.textAlign,
      config.motionIntensity
    );
  }

  // 6. Footer Progress Track + Handle
  const trackY = h - bottomSafe - 54;
  ctx.fillStyle =
    config.textColor === '#FFFFFF'
      ? 'rgba(255,255,255,0.16)'
      : 'rgba(11,17,32,0.12)';
  drawRoundedRect(ctx, padX, trackY, contentW, 4, 2);
  ctx.fill();

  ctx.fillStyle = config.accentColor;
  drawRoundedRect(ctx, padX, trackY, Math.max(8, contentW * progress), 4, 2);
  ctx.fill();

  ctx.font = '500 26px "Plus Jakarta Sans", sans-serif';
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

export function pickSupportedVideoMimeType(): {
  mimeType: string;
  extension: 'mp4' | 'webm';
} {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: 'video/webm', extension: 'webm' };
  }
  const candidates: { mimeType: string; extension: 'mp4' | 'webm' }[] = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: '', extension: 'webm' };
}
