import { fal } from "@fal-ai/client";
import fs from "node:fs/promises";
import path from "node:path";

const key = process.env.FAL_KEY;
if (!key) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}

fal.config({ credentials: key });

const outDir = path.resolve("generated", "scene-01-calm-animation-friendly-v7");
await fs.mkdir(outDir, { recursive: true });

const prompt = `A professional monochrome hand-drawn sketch illustration by a skilled human illustrator. Two real human adult characters in a believable scene for the virtue Calm. One calm grounded adult human and one angry adult human nearby, both complete full-body figures, clearly human, with visible facial features, visible hands, normal clothing, expressive posture, and natural proportions. They should look like sketched humans, not robots, not mannequins, not mascots, not featureless dummies, not toys, not stick figures, not 3D characters. The characters take up a strong portion of the panel. Use simple real scene elements like a bench, doorway, wall, or room edge. Leave only a modest controlled space for text on one side. Clean professional pencil, ink, charcoal, or sharpie-style linework. Emotional feeling visible in face and gesture. Elegant, believable, animation-friendly, no typography, no watermark, no logo, no photorealism, no clutter.`;

const seeds = [8101, 8109, 8117, 8129];
const results = [];

for (const seed of seeds) {
  console.log(`Generating seed ${seed}...`);
  const result = await fal.subscribe("fal-ai/flux/dev", {
    input: {
      prompt,
      image_size: "landscape_4_3",
      num_inference_steps: 36,
      guidance_scale: 6.5,
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
  const filename = `calm-animation-friendly-v7-seed-${seed}.png`;
  await fs.writeFile(path.join(outDir, filename), buffer);

  results.push({ seed, filename, url: image.url, width: image.width, height: image.height, prompt: result.data.prompt });
}

await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log(`Saved ${results.length} images to ${outDir}`);
