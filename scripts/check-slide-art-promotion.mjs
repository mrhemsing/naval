import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const projectRoot = path.resolve(".");
const slidesPath = path.join(projectRoot, "lib", "slides.ts");
const approvalsPath = path.join(projectRoot, "generated", "promotion-approvals.json");

function extractSlidesSource(fileText) {
  const match = fileText.match(/export const slides: Slide\[] = (\[[\s\S]*\]);\s*$/);
  if (!match) {
    throw new Error("Could not locate slides array in lib/slides.ts");
  }

  return match[1];
}

function parseSlides(fileText) {
  const slidesLiteral = extractSlidesSource(fileText);
  return vm.runInNewContext(`(${slidesLiteral})`, {}, { timeout: 1000 });
}

function isReferenceImage(imagePath) {
  return /^\/slides\/slide-\d{2}-[a-z0-9-]+\.(png|jpe?g|webp)$/i.test(imagePath);
}

const slidesFile = await fs.readFile(slidesPath, "utf8");
const approvals = JSON.parse(await fs.readFile(approvalsPath, "utf8"));
const slides = parseSlides(slidesFile);
const approvedSlides = approvals.slides ?? {};
const errors = [];

for (const slide of slides) {
  if (!slide?.slug) {
    errors.push("Found slide without slug.");
    continue;
  }

  if (slide.artStatus !== "reference" && slide.artStatus !== "approved-generated") {
    errors.push(`${slide.slug}: invalid artStatus \"${slide.artStatus}\".`);
    continue;
  }

  if (slide.artStatus === "reference") {
    if (!isReferenceImage(slide.image)) {
      errors.push(`${slide.slug}: reference slide must use the canonical /slides/slide-XX-*.jpg/png/webp asset path, got ${slide.image}.`);
    }
    continue;
  }

  const approval = approvedSlides[slide.slug];
  if (!approval) {
    errors.push(`${slide.slug}: marked approved-generated but has no entry in generated/promotion-approvals.json.`);
    continue;
  }

  if (approval.image !== slide.image) {
    errors.push(`${slide.slug}: approved image mismatch. slides.ts uses ${slide.image} but approval manifest lists ${approval.image}.`);
  }

  if (!approval.approvedAt || !approval.approvedBy || !approval.notes) {
    errors.push(`${slide.slug}: approval manifest entry must include image, approvedAt, approvedBy, and notes.`);
  }
}

if (errors.length) {
  console.error("Slide art promotion check failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Slide art promotion check passed for ${slides.length} slides.`);
