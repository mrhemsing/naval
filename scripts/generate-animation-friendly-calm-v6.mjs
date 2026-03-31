import { fal } from "@fal-ai/client";
import fs from "node:fs/promises";
import path from "node:path";

const key = process.env.FAL_KEY;
if (!key) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}

fal.config({ credentials: key });

const outDir = path.resolve("generated", "scene-01-calm-animation-friendly-v6");
await fs.mkdir(outDir, { recursive: true });

const prompt = `A professional monochrome hand-drawn sketch illustration of a real human scene for the virtue Calm. One large complete full-body calm human and one large complete full-body angry human, both clearly visible and taking up a substantial portion of the frame. The main calm character should occupy roughly 40 to 50 percent of the image height. No tiny figures. No huge empty white poster space. Keep the environment simple but visible: a bench, doorway, wall, or room edge. Leave only a modest controlled area for text on one side, while the rest of the frame is alive with character and scene presence. Emotional feeling must be visible in posture and gesture. Clean professional pencil, ink, charcoal, or sharpie-style linework. Elegant, simple, believable, animation-friendly, room for characters to enter and exit the frame, no typography, no watermark, no logo, no photorealism, no painterly rendering, no clutter, no alien or mannequin people.`;

const seeds = [7101, 7109, 7117, 7129];
const results = [];

for (const seed of seeds) {
  console.log(`Generating seed ${seed}...`);
  const result = await fal.subscribe("fal-ai/flux/dev", {
    input: {
      prompt,
      image_size: "landscape_4_3",
      num_inference_steps: 34,
      guidance_scale: 6,
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
  const filename = `calm-animation-friendly-v6-seed-${seed}.png`;
  await fs.writeFile(path.join(outDir, filename), buffer);

  results.push({ seed, filename, url: image.url, width: image.width, height: image.height, prompt: result.data.prompt });
}

await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log(`Saved ${results.length} images to ${outDir}`);
