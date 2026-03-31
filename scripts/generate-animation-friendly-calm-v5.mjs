import { fal } from "@fal-ai/client";
import fs from "node:fs/promises";
import path from "node:path";

const key = process.env.FAL_KEY;
if (!key) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}

fal.config({ credentials: key });

const outDir = path.resolve("generated", "scene-01-calm-animation-friendly-v5");
await fs.mkdir(outDir, { recursive: true });

const prompt = `A professional monochrome hand-drawn sketch illustration of a real human scene for the virtue Calm. One large complete full-body calm person and one large complete full-body angry person, both clearly human, expressive, and grounded. The characters take up a good portion of the panel. Leave intentional negative space on one side for text. Use simple real scene elements only, such as a bench, doorway, room edge, or wall. Emotional feeling is visible in posture and gesture. Clean professional pencil, ink, charcoal, or sharpie-style linework. Elegant, simple, believable, animation-friendly, room for characters to enter and exit the frame, no typography, no watermark, no logo, no photorealism, no painterly rendering, no clutter, no alien or mannequin people.`;

const seeds = [6101, 6109, 6117, 6129];
const results = [];

for (const seed of seeds) {
  console.log(`Generating seed ${seed}...`);
  const result = await fal.subscribe("fal-ai/flux/dev", {
    input: {
      prompt,
      image_size: "landscape_4_3",
      num_inference_steps: 32,
      guidance_scale: 5.5,
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
  const filename = `calm-animation-friendly-v5-seed-${seed}.png`;
  await fs.writeFile(path.join(outDir, filename), buffer);

  results.push({ seed, filename, url: image.url, width: image.width, height: image.height, prompt: result.data.prompt });
}

await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log(`Saved ${results.length} images to ${outDir}`);
