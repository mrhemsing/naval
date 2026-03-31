import { fal } from "@fal-ai/client";
import fs from "node:fs/promises";
import path from "node:path";

const key = process.env.FAL_KEY;
if (!key) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}

fal.config({ credentials: key });

const outDir = path.resolve("generated", "scene-01-calm-v3");
await fs.mkdir(outDir, { recursive: true });

const prompt = `A refined black ink editorial illustration on a warm ivory paper background, literary and timeless, with clear visual impact and no text. A medium-large calm human figure with a strong readable silhouette sits grounded on a simple bench or low stone seat in the lower-middle of the frame. The figure should feel substantial and emotionally legible, not tiny or distant. A second agitated figure passes through the far side of the composition in blurred restless motion, clearly secondary. The composition should feel elegant but impactful, with controlled negative space, strong subject presence, monochrome ink linework, subtle etched texture, museum-quality restraint, no photorealism, no comic style, no watermark.`;

const seeds = [3101, 3109, 3119, 3121, 3137, 3163];
const results = [];

for (const seed of seeds) {
  console.log(`Generating seed ${seed}...`);
  const result = await fal.subscribe("fal-ai/flux/dev", {
    input: {
      prompt,
      image_size: "portrait_4_3",
      num_inference_steps: 32,
      guidance_scale: 4.5,
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
  const filename = `calm-v3-seed-${seed}.png`;
  await fs.writeFile(path.join(outDir, filename), buffer);

  results.push({ seed, filename, url: image.url, width: image.width, height: image.height, prompt: result.data.prompt });
}

await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log(`Saved ${results.length} images to ${outDir}`);
