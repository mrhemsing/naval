import fs from "node:fs/promises";
import path from "node:path";

import { analyzeAndAssessSketch } from "./lib/reject-blank-sketch.mjs";

const generatedRoot = path.resolve("generated");
const manualReviewPath = path.join(generatedRoot, "manual-review.json");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMetric(value) {
  return typeof value === "number" ? value.toFixed(4) : "—";
}

function scoreQuality(quality = {}) {
  const metrics = quality.metrics ?? {};
  const assessment = quality.assessment ?? { ok: false, reasons: ["missing quality analysis"] };
  const base = assessment.ok ? 100 : 0;

  return Number((
    base +
    (metrics.coverage ?? 0) * 250 +
    (metrics.bboxCoverage ?? 0) * 220 +
    (metrics.rowSpread ?? 0) * 180 +
    (metrics.colSpread ?? 0) * 180 -
    Math.max(0, ((metrics.darkest ?? 255) - 90) * 0.4) -
    (assessment.reasons?.length ?? 0) * 15
  ).toFixed(2));
}

function assessPromotionReadiness(quality = {}, manualDecision) {
  const metrics = quality.metrics ?? {};
  const reasons = [];

  if ((metrics.coverage ?? 0) < 0.12) reasons.push(`coverage too low for production promotion (${formatMetric(metrics.coverage)})`);
  if ((metrics.bboxCoverage ?? 0) < 0.45) reasons.push(`scene occupancy too low for production promotion (${formatMetric(metrics.bboxCoverage)})`);
  if ((metrics.rowSpread ?? 0) < 0.12) reasons.push(`vertical spread too weak for production promotion (${formatMetric(metrics.rowSpread)})`);
  if ((metrics.colSpread ?? 0) < 0.12) reasons.push(`horizontal spread too weak for production promotion (${formatMetric(metrics.colSpread)})`);
  if ((metrics.darkest ?? 255) > 90) reasons.push(`linework too faint for production promotion (${typeof metrics.darkest === "number" ? metrics.darkest.toFixed(1) : "—"})`);

  if (manualDecision?.status === "reject") {
    reasons.unshift(...(manualDecision.reasons?.length ? manualDecision.reasons : ["manually rejected after visual review"]));
  }

  return {
    ok: reasons.length === 0 && manualDecision?.status !== "hold",
    reasons,
  };
}

async function loadManualReview() {
  try {
    return JSON.parse(await fs.readFile(manualReviewPath, "utf8"));
  } catch {
    return { files: {} };
  }
}

async function loadScene(dirent, manualReview) {
  const sceneDir = path.join(generatedRoot, dirent.name);
  const resultsPath = path.join(sceneDir, "results.json");

  let results = [];
  try {
    results = JSON.parse(await fs.readFile(resultsPath, "utf8"));
  } catch {
    return null;
  }

  let changed = false;
  const enriched = [];

  for (const item of results) {
    const filePath = path.join(sceneDir, item.filename);
    let quality = item.quality;
    const manualDecision = manualReview?.files?.[`${dirent.name}/${item.filename}`] ?? null;

    if (!quality) {
      try {
        quality = await analyzeAndAssessSketch(filePath);
        changed = true;
      } catch {
        quality = {
          metrics: null,
          assessment: { ok: false, reasons: ["could not analyze image"] },
        };
      }
    }

    enriched.push({
      ...item,
      quality,
      manualDecision,
      promotion: assessPromotionReadiness(quality, manualDecision),
      score: scoreQuality(quality),
    });
  }

  enriched.sort((a, b) => b.score - a.score);

  if (changed) {
    await fs.writeFile(resultsPath, `${JSON.stringify(enriched, null, 2)}\n`);
  }

  return {
    slug: dirent.name,
    label: dirent.name.replaceAll("-", " "),
    results: enriched,
    accepted: enriched.filter((item) => item.quality?.assessment?.ok),
    promotionReady: enriched.filter((item) => item.promotion?.ok),
  };
}

function renderScene(scene) {
  const acceptedCount = scene.accepted.length;
  const summaryTone = acceptedCount > 0 ? "summary pass" : "summary fail";

  return `
    <section>
      <div class="scene-head">
        <div>
          <h2>${escapeHtml(scene.label)}</h2>
          <p class="${summaryTone}">${acceptedCount}/${scene.results.length} pass automated gate</p>
        </div>
      </div>
      <div class="grid">
        ${scene.results
          .map((item) => {
            const assessment = item.quality?.assessment ?? { ok: false, reasons: ["missing quality analysis"] };
            const promotion = item.promotion ?? { ok: false, reasons: ["missing promotion analysis"] };
            const metrics = item.quality?.metrics ?? {};
            const statusClass = assessment.ok ? "pass" : "fail";
            const promotionClass = promotion.ok ? "pass" : "fail";
            const manualDecision = item.manualDecision;
            const reasons = assessment.reasons?.length
              ? `<ul>${assessment.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>`
              : "<p>No automated gate objections.</p>";
            const promotionReasons = promotion.reasons?.length
              ? `<ul>${promotion.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>`
              : "<p>Meets current promotion-ready thresholds.</p>";
            const manualReviewBlock = manualDecision
              ? `<div class="reasons"><strong>Manual review:</strong><ul><li>${escapeHtml(manualDecision.status)}</li>${(manualDecision.reasons ?? []).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul></div>`
              : "";

            return `
              <figure class="card ${statusClass}">
                <img src="./${encodeURI(scene.slug)}/${encodeURI(item.filename)}" alt="${escapeHtml(item.filename)}">
                <figcaption>
                  <div class="row"><strong>${escapeHtml(item.filename)}</strong><span class="pill ${statusClass}">${assessment.ok ? "pass" : "reject"}</span></div>
                  <div class="row meta"><span>seed ${escapeHtml(item.seed)}</span><span>score ${item.score.toFixed(2)}</span></div>
                  <div class="row meta"><span>promotion</span><span class="pill ${promotionClass}">${promotion.ok ? "ready" : manualDecision?.status === "reject" ? "rejected" : "hold"}</span></div>
                  <dl>
                    <div><dt>coverage</dt><dd>${formatMetric(metrics.coverage)}</dd></div>
                    <div><dt>bbox</dt><dd>${formatMetric(metrics.bboxCoverage)}</dd></div>
                    <div><dt>row</dt><dd>${formatMetric(metrics.rowSpread)}</dd></div>
                    <div><dt>col</dt><dd>${formatMetric(metrics.colSpread)}</dd></div>
                    <div><dt>darkest</dt><dd>${typeof metrics.darkest === "number" ? metrics.darkest.toFixed(1) : "—"}</dd></div>
                  </dl>
                  <div class="reasons"><strong>Gate:</strong>${reasons}</div>
                  <div class="reasons"><strong>Promotion:</strong>${promotionReasons}</div>
                  ${manualReviewBlock}
                </figcaption>
              </figure>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderHtml(scenes) {
  const generatedAt = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Selfish Morality Current Review</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: Arial, sans-serif; background: #f3eadf; color: #2f241c; margin: 0; padding: 24px; }
      h1 { margin: 0 0 8px; }
      p.topnote { margin: 0 0 24px; color: #6b5b4d; }
      section { margin: 0 0 32px; }
      .scene-head { display: flex; justify-content: space-between; align-items: end; gap: 16px; margin-bottom: 12px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
      .card { margin: 0; background: white; padding: 12px; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,.08); border: 2px solid transparent; }
      .card.pass { border-color: #2f855a33; }
      .card.fail { border-color: #c5303033; }
      img { width: 100%; height: auto; display: block; border-radius: 12px; background: #eee; }
      figcaption { padding-top: 10px; font-size: 14px; }
      .row { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
      .meta { color: #6b5b4d; margin-top: 6px; }
      .pill { display: inline-block; border-radius: 999px; padding: 4px 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
      .pill.pass, .summary.pass { background: #c6f6d5; color: #22543d; }
      .pill.fail, .summary.fail { background: #fed7d7; color: #822727; }
      dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px 12px; margin: 12px 0; }
      dl div { background: #f8f4ee; border-radius: 10px; padding: 8px; }
      dt { font-size: 12px; color: #6b5b4d; text-transform: uppercase; margin: 0 0 4px; }
      dd { margin: 0; font-weight: 700; }
      .reasons ul { margin: 8px 0 0 18px; padding: 0; color: #822727; }
      .reasons p { margin: 8px 0 0; color: #22543d; }
      @media (max-width: 900px) {
        .grid { grid-template-columns: 1fr; }
        dl { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
    </style>
  </head>
  <body>
    <h1>Selfish Morality current review</h1>
    <p class="topnote">Regenerated ${escapeHtml(generatedAt)}. Candidates are sorted by automated score inside each scene.</p>
    ${scenes.map(renderScene).join("\n")}
  </body>
</html>
`;
}

function classifyScene(scene) {
  if (scene.accepted.length > 0) return "has-pass";
  return "needs-regeneration";
}

function renderShortlist(scenes) {
  const generatedAt = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
  const lines = [
    "# Selfish Morality generated art shortlist",
    "",
    `Updated: ${generatedAt}`,
    "",
    "## Priority summary",
    "",
  ];

  const withPasses = scenes.filter((scene) => scene.accepted.length > 0);
  const promotionReady = scenes.filter((scene) => scene.promotionReady.length > 0);
  const blocked = scenes.filter((scene) => scene.accepted.length === 0);
  const holdingPattern = scenes.filter((scene) => scene.accepted.length > 0 && scene.promotionReady.length === 0);
  const manuallyRejected = scenes
    .map((scene) => ({
      scene,
      items: scene.results.filter((item) => item.manualDecision?.status === "reject"),
    }))
    .filter((entry) => entry.items.length > 0);

  if (promotionReady.length) {
    lines.push("### Scenes with at least one metrics-strong candidate (still requires visual review before promotion)", "");
    for (const scene of promotionReady) {
      const top = scene.promotionReady[0];
      const metrics = top.quality?.metrics ?? {};
      lines.push(
        `- **${scene.label}** (${scene.promotionReady.length}/${scene.results.length} metrics-strong) → top hold for visual review: \
\`${top.filename}\` (seed ${top.seed}, score ${top.score.toFixed(2)}, coverage ${formatMetric(metrics.coverage)}, bbox ${formatMetric(metrics.bboxCoverage)}, row ${formatMetric(metrics.rowSpread)}, col ${formatMetric(metrics.colSpread)}, darkest ${typeof metrics.darkest === "number" ? metrics.darkest.toFixed(1) : "—"})`
      );
    }
    lines.push("");
  }

  if (holdingPattern.length) {
    lines.push("### Scenes with automated passes but no promotion-ready asset yet", "");
    for (const scene of holdingPattern) {
      const top = scene.accepted[0];
      const metrics = top.quality?.metrics ?? {};
      const reasons = top.promotion?.reasons?.join("; ") || "not promotion-ready yet";
      lines.push(
        `- **${scene.label}** (${scene.accepted.length}/${scene.results.length} gate passes, 0 promotion-ready) → strongest current hold: \
\`${top.filename}\` (seed ${top.seed}, score ${top.score.toFixed(2)}, coverage ${formatMetric(metrics.coverage)}, bbox ${formatMetric(metrics.bboxCoverage)}, row ${formatMetric(metrics.rowSpread)}, col ${formatMetric(metrics.colSpread)}, darkest ${typeof metrics.darkest === "number" ? metrics.darkest.toFixed(1) : "—"}) — hold because: ${reasons}`
      );
    }
    lines.push("");
  }

  if (blocked.length) {
    lines.push("### Scenes currently blocked and needing a new generation pass", "");
    for (const scene of blocked) {
      const top = scene.results[0];
      const reasons = top?.quality?.assessment?.reasons?.length
        ? top.quality.assessment.reasons.join("; ")
        : "no passing candidates";
      lines.push(
        `- **${scene.label}** (${scene.accepted.length}/${scene.results.length} passes) → best current file: \
\`${top?.filename ?? "n/a"}\` (seed ${top?.seed ?? "n/a"}, score ${top?.score?.toFixed?.(2) ?? "n/a"}) — blocker: ${reasons}`
      );
    }
    lines.push("");
  }

  if (manuallyRejected.length) {
    lines.push("### Manually rejected after visual review", "");
    for (const entry of manuallyRejected) {
      for (const item of entry.items) {
        lines.push(
          `- **${entry.scene.label}** → \`${item.filename}\` rejected: ${(item.manualDecision.reasons ?? ["manual visual reject"]).join("; ")}`
        );
      }
    }
    lines.push("");
  }

  lines.push("## Next action", "");

  if (promotionReady.length) {
    const bestScene = [...promotionReady].sort((a, b) => b.promotionReady[0].score - a.promotionReady[0].score)[0];
    lines.push(
      `Do not auto-promote from metrics alone. Visually audit the strongest hold from **${bestScene.label}** against the real brief before wiring it into the app, while queuing fresh generations for scenes with zero passes.`
    );
  } else if (withPasses.length) {
    lines.push("No scene is promotion-ready yet. Keep placeholders/reference art live, use the strongest gate-passing holds only for review, and prioritize fresh generation or stricter visual selection before another app promotion.");
  } else {
    lines.push("No scene currently has a passing candidate, so the immediate next action is a new generation pass with stricter prompts.");
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

const manualReview = await loadManualReview();
const dirents = await fs.readdir(generatedRoot, { withFileTypes: true });
const scenes = [];

for (const dirent of dirents) {
  if (!dirent.isDirectory()) continue;
  const scene = await loadScene(dirent, manualReview);
  if (scene) scenes.push(scene);
}

scenes.sort((a, b) => a.slug.localeCompare(b.slug));

await fs.writeFile(path.join(generatedRoot, "current-review.html"), renderHtml(scenes));
await fs.writeFile(path.join(generatedRoot, "current-shortlist.md"), renderShortlist(scenes));
console.log(`Reviewed ${scenes.length} scene folders and rebuilt generated/current-review.html + generated/current-shortlist.md`);
for (const scene of scenes) {
  console.log(`${scene.slug}: ${scene.accepted.length}/${scene.results.length} passed (${classifyScene(scene)})`);
}
