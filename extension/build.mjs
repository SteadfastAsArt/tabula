import { build, context } from "esbuild";
import { mkdir, copyFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const srcDir = path.join(root, "src");
const distDir = path.join(root, "dist");
const iconsDir = path.join(root, "icons");

const entryPoints = [
  { in: path.join(srcDir, "background.ts"), out: "background" },
  { in: path.join(srcDir, "content.ts"), out: "content" },
  { in: path.join(srcDir, "popup.ts"), out: "popup" },
];

const isWatch = process.argv.includes("--watch");

await mkdir(distDir, { recursive: true });

const buildOptions = {
  entryPoints,
  outdir: distDir,
  bundle: true,
  format: "esm",
  target: "es2020",
  sourcemap: true,
};

if (isWatch) {
  const ctx = await context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await build(buildOptions);
}

// Copy static files
await copyFile(path.join(root, "manifest.json"), path.join(distDir, "manifest.json"));
await copyFile(path.join(srcDir, "popup.html"), path.join(distDir, "popup.html"));

// Copy icons
try {
  const iconEntries = await readdir(iconsDir);
  await mkdir(path.join(distDir, "icons"), { recursive: true });
  await Promise.all(
    iconEntries.map((entry) =>
      copyFile(path.join(iconsDir, entry), path.join(distDir, "icons", entry))
    )
  );
} catch {
  console.warn("No icons directory found");
}

console.log("Build complete!");
