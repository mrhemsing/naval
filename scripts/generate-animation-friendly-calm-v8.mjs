import { fal } from "@fal-ai/client";
import fs from "node:fs/promises";
import path from "node:path";

import { analyzeAndAssessSketch } from "./lib/reject-blank-sketch.mjs";

const key = process.env.FAL_KEY;
if (!key) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}

fal.config({ credentials: key });

const outDir = path.resolve("generated", "scene-01-calm-animation-friendly-v8");
await fs.mkdir(outDir, { recursive: true });

const prompt = `A premium monochrome hand-drawn illustration by a skilled human illustrator for the virtue Calm. Two real adult humans in a believable full-frame scene, not isolated in white emptiness. One calm grounded adult holds composure while another angry adult vents nearby. Both figures must read clearly as adults with mature proportions, visible adult faces, visible hands, normal clothing, expressive posture, and natural anatomy. The scene must contain real illustrated environment across most of the frame: room edges, walls, floor, furniture, doorway, bench, corridor, or street depth. The subjects should occupy a strong portion of the panel and feel large enough for desktop impact. Leave only modest controlled space for text on one side, never a blank white field. Clean professional pencil, ink, charcoal, or sharpie-style linework, emotional feeling visible in face and gesture, elegant believable staging, animation-friendly entrances and exits. No children, no childlike proportions, no robots, no mannequins, no mascots, no featureless dummies, no toys, no stick figures, no typography, no watermark, no logo, no photorealism, no clutter.`;

const seeds = [9101, 9109, 9117, 9129];
const results = [];

for (const seed of seeds) {
  console.log(`Generating seed ${seed}...`);
  const result = await fal.subscribe("fal-ai/flux/dev", {
    input: {
      prompt,
      image_size: "landscape_4_3",
      num_inference_steps: 36,
      guidance_scale: 6.75,
      num_images: 1,
      output_format: "png",
      enable_safety_checker: true,
      acceleration: "none",
      seed,
    },
    logs: true,
  });

  const image = result.data.images?.[0];
  if (!image?.url) throw new Error(`No image URL returned for seed ${seed}`);

  const response = await fetch(image.url);
  if (!response.ok) throw new Error(`Failed to download image for seed ${seed}: ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = `calm-animation-friendly-v8-seed-${seed}.png`;
  const filePath = path.join(outDir, filename);
  await fs.writeFile(filePath, buffer);

  const quality = await analyzeAndAssessSketch(filePath);

  results.push({
    seed,
    filename,
    url: image.url,
    width: image.width,
    height: image.height,
    prompt: result.data.prompt,
    quality,
  });

  if (!quality.assessment.ok) {
    console.warn(`Reject ${filename}: ${quality.assessment.reasons.join("; ")}`);
  } else {
    console.log(`Accept ${filename}: coverage ${quality.metrics.coverage}, bbox ${quality.metrics.bboxCoverage}`);
  }
}

await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log(`Saved ${results.length} images to ${outDir}`);
