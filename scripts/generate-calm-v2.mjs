import { fal } from "@fal-ai/client";
import fs from "node:fs/promises";
import path from "node:path";

const key = process.env.FAL_KEY;
if (!key) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}

fal.config({ credentials: key });

const outDir = path.resolve("generated", "scene-01-calm-v2");
await fs.mkdir(outDir, { recursive: true });

const prompt = `A refined black ink editorial illustration on a warm ivory paper background, philosophical and timeless, elegant negative space, literary and museum-quality restraint, no text. A calm seated human figure is the clear center of gravity, grounded and still on a simple bench or low stone seat in a sparse open setting. A second agitated figure passes quickly through the far edge of the composition as a transient blur of restless motion, clearly secondary. Preserve generous empty paper space for text. Sophisticated monochrome linework, subtle etched texture, restrained printmaking sensibility, no photorealism, no comic style, no graphic design elements, no watermark.`;

const seeds = [2101, 2107, 2117, 2129, 2137, 2141];
const results = [];

for (const seed of seeds) {
  console.log(`Generating seed ${seed}...`);
  const result = await fal.subscribe("fal-ai/flux/dev", {
    input: {
      prompt,
      image_size: "portrait_4_3",
      num_inference_steps: 32,
      guidance_scale: 4,
      num_images: 1,
      output_format: "png",
      enable_safety_checker: true,
      acceleration: "none",
      seed,
    },
    logs: true,
  });

  const image = result.data.images?.[0];
  if (!image?.url) {
    throw new Error(`No image URL returned for seed ${seed}`);
  }

  const response = await fetch(image.url);
  if (!response.ok) {
    throw new Error(`Failed to download image for seed ${seed}: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const filename = `calm-v2-seed-${seed}.png`;
  await fs.writeFile(path.join(outDir, filename), buffer);

  results.push({
    seed,
    filename,
    url: image.url,
    width: image.width,
    height: image.height,
    prompt: result.data.prompt,
  });
}

await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log(`Saved ${results.length} images to ${outDir}`);
