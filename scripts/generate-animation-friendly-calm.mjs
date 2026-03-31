import { fal } from "@fal-ai/client";
import fs from "node:fs/promises";
import path from "node:path";

const key = process.env.FAL_KEY;
if (!key) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}

fal.config({ credentials: key });

const outDir = path.resolve("generated", "scene-01-calm-animation-friendly-v4");
await fs.mkdir(outDir, { recursive: true });

const prompt = `A professional monochrome hand-drawn sketch illustration. Large full-body sketched characters take up a strong portion of the panel. One calm grounded character and one angry character nearby, both complete bodies with clear readable poses. Minimal simple scene elements only. Clean pencil, ink, charcoal, or sharpie-style linework. Leave intentional negative space on one side for text overlay. The composition must support animating characters into and out of the scene, with room for entrances and exits. Premium, elegant, simple, animation-friendly, no typography, no watermark, no logo, no photorealism, no painterly rendering, no clutter.`;

const seeds = [5101, 5109, 5117, 5129];
const results = [];

for (const seed of seeds) {
  console.log(`Generating seed ${seed}...`);
  const result = await fal.subscribe("fal-ai/flux/dev", {
    input: {
      prompt,
      image_size: "landscape_4_3",
      num_inference_steps: 28,
      guidance_scale: 5,
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
  const filename = `calm-animation-friendly-v4-seed-${seed}.png`;
  await fs.writeFile(path.join(outDir, filename), buffer);

  results.push({ seed, filename, url: image.url, width: image.width, height: image.height, prompt: result.data.prompt });
}

await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log(`Saved ${results.length} images to ${outDir}`);
