import { fal } from "@fal-ai/client";
import fs from "node:fs/promises";
import path from "node:path";

const key = process.env.FAL_KEY;
if (!key) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}

fal.config({ credentials: key });

const outDir = path.resolve("generated", "scene-01-calm");
await fs.mkdir(outDir, { recursive: true });

const prompt = `A refined black ink editorial illustration on a warm ivory paper background, philosophical and timeless, elegant negative space, literary and museum-quality restraint, no text. A calm human figure enters and settles onto a simple bench or low stone seat in a sparse open setting, while a second agitated figure passes through the edge of the composition in restless motion. The calm figure feels grounded, centered, and effective; the agitated figure feels transient and noisy. Sophisticated monochrome linework, subtle etched texture, no photorealism, no comic style, no graphic design elements, no watermark.`;

const seeds = [1101, 1107, 1117, 1129];
const results = [];

for (const seed of seeds) {
  console.log(`Generating seed ${seed}...`);
  const result = await fal.subscribe("fal-ai/flux/dev", {
    input: {
      prompt,
      image_size: "portrait_4_3",
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      output_format: "png",
      enable_safety_checker: true,
      acceleration: "none",
      seed,
    },
    logs: true,
    onQueueUpdate(update) {
      if (update.status === "IN_PROGRESS" && update.logs) {
        for (const log of update.logs) {
          if (log.message) console.log(log.message);
        }
      }
    },
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
  const filename = `calm-seed-${seed}.png`;
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
