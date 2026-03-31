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

const scenes = [
  {
    slug: "scene-01-calm-animation-friendly-v3",
    prompt: `A premium monochrome hand-drawn illustration for the virtue Calm. Two unmistakably adult humans in a believable interior or street-edge scene, not isolated in white emptiness. One calm grounded adult visibly holds composure while another adult shows anger nearby. The adults must feel mature and human, with normal adult anatomy, visible adult faces and hands, normal clothing, and no childlike proportions, oversized heads, cute styling, mannequin stiffness, or mascot simplification. Compose the image as a real full-frame scene: drawn floor across the lower frame, architecture or environment reaching the left and right frame edges, and believable walls, doorway, furniture, bench, corridor, or street depth so the illustration reads as an inhabited place rather than a poster on white paper. The subjects should be large enough to matter on desktop and mobile, with strong silhouettes and emotional clarity, leaving only controlled negative space. Professional pencil, ink, charcoal, or sharpie-style linework, animation-friendly staging with room for entrance and exit, but never tiny distant figures. No children, no mannequins, no featureless dummies, no typography, no watermark, no logo, no photorealism, no painterly wash, no comic-book style.`, 
    seeds: [4101, 4109, 4117, 4129],
  },
  {
    slug: "scene-02-forgive-animation-friendly-v3",
    prompt: `A premium monochrome hand-drawn illustration for the virtue Forgive. One unmistakably adult human character in a believable full-frame environment, not isolated in white emptiness, walking away from a broken threshold, damaged room, corridor, rain-washed street, or emotional aftermath into release. The adult must feel mature and human, with normal adult anatomy, visible adult posture, normal clothing, and no childlike proportions, oversized head, cute styling, mannequin stiffness, or toy-like simplification. The scene must read as a complete illustration with real drawn architecture across the frame: floor extending through the lower frame, walls or structural edges reaching the sides, doorway or corridor depth, debris or aftermath, and enough environmental drawing that the figure is embedded in a place rather than floating on white paper. The character must be large enough to matter on desktop and mobile, with emotional gravity and an animation-friendly path of travel, but never as a tiny distant figure. Professional pencil, ink, charcoal, or sharpie-style linework. No children, no typography, no watermark, no logo, no photorealism, no painterly wash, no comic-book style.`, 
    seeds: [4201, 4207, 4217, 4229],
  },
  {
    slug: "scene-04-honest-animation-friendly-v3",
    prompt: `A premium monochrome hand-drawn illustration for the virtue Honest. One unmistakably adult human character in a believable full-frame scene, not isolated in white emptiness, standing in a resolved truthful moment while false masks, broken fragments, reflections, or visual noise separate around them. The adult must look mature and human, with normal adult anatomy, visible adult face and hands, grounded proportions, normal clothing, and no childlike proportions, oversized head, cute styling, mannequin stiffness, or mascot simplification. The subject must command the frame inside a real drawn environment: floor through the lower frame, structural edges or objects reaching the sides, and enough room architecture, mirror fragments, threshold elements, or spatial depth that the image feels like a finished inhabited scene rather than a tiny centered figure on blank white. Professional pencil, ink, charcoal, or sharpie-style linework, elegant symbolism, animation-friendly staging, and a composition that works on desktop and mobile. No tiny distant figures, no children, no typography, no watermark, no logo, no photorealism, no painterly wash, no comic-book style.`, 
    seeds: [4401, 4409, 4417, 4429],
  },
];

async function generateScene(scene) {
  const outDir = path.resolve("generated", scene.slug);
  await fs.mkdir(outDir, { recursive: true });

  const results = [];

  for (const seed of scene.seeds) {
    console.log(`Generating ${scene.slug} seed ${seed}...`);

    const result = await fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: scene.prompt,
        image_size: "landscape_4_3",
        num_inference_steps: 30,
        guidance_scale: 4.5,
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
      throw new Error(`No image URL returned for ${scene.slug} seed ${seed}`);
    }

    const response = await fetch(image.url);
    if (!response.ok) {
      throw new Error(`Failed to download image for ${scene.slug} seed ${seed}: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = `${scene.slug}-seed-${seed}.png`;
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
}

for (const scene of scenes) {
  await generateScene(scene);
}

console.log("Animation-friendly fal batch complete.");
