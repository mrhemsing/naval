import sharp from "sharp";

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

export async function analyzeSketchCoverage(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let nonWhiteCount = 0;
  let darkest = 255;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  const rowInk = new Array(height).fill(0);
  const colInk = new Array(width).fill(0);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      darkest = Math.min(darkest, luminance);

      if (luminance < 245) {
        nonWhiteCount += 1;
        rowInk[y] += 1;
        colInk[x] += 1;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const totalPixels = width * height;
  const coverage = nonWhiteCount / totalPixels;
  const hasInk = maxX >= minX && maxY >= minY;
  const bboxWidth = hasInk ? maxX - minX + 1 : 0;
  const bboxHeight = hasInk ? maxY - minY + 1 : 0;
  const bboxArea = bboxWidth * bboxHeight;
  const bboxCoverage = bboxArea / totalPixels;
  const rowSpread = percentile(rowInk.map((count) => count / width), 0.9);
  const colSpread = percentile(colInk.map((count) => count / height), 0.9);

  return {
    width,
    height,
    coverage: Number(coverage.toFixed(4)),
    bboxCoverage: Number(bboxCoverage.toFixed(4)),
    rowSpread: Number(rowSpread.toFixed(4)),
    colSpread: Number(colSpread.toFixed(4)),
    darkest: Number(darkest.toFixed(1)),
  };
}

export function assessSketch(metrics) {
  const reasons = [];

  if (metrics.coverage < 0.03) reasons.push(`too little drawn content (${metrics.coverage})`);
  if (metrics.bboxCoverage < 0.22) reasons.push(`content occupies too little of frame (${metrics.bboxCoverage})`);
  if (metrics.rowSpread < 0.05) reasons.push(`ink is not distributed across the image height (${metrics.rowSpread})`);
  if (metrics.colSpread < 0.05) reasons.push(`ink is not distributed across the image width (${metrics.colSpread})`);
  if (metrics.darkest > 120) reasons.push(`linework is too faint (${metrics.darkest})`);

  return {
    ok: reasons.length === 0,
    reasons,
  };
}

export async function analyzeAndAssessSketch(filePath) {
  const metrics = await analyzeSketchCoverage(filePath);
  return {
    metrics,
    assessment: assessSketch(metrics),
  };
}
