import { build, context } from "esbuild";
import { mkdir, copyFile, readdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const srcDir = path.join(root, "src");
const iconsDir = path.join(root, "icons");

const entryPoints = [
  { in: path.join(srcDir, "background.ts"), out: "background" },
  { in: path.join(srcDir, "content.ts"), out: "content" },
  { in: path.join(srcDir, "popup.ts"), out: "popup" },
];

const isWatch = process.argv.includes("--watch");
const isFirefox = process.argv.includes("--firefox");
const isChrome = process.argv.includes("--chrome") || (!isFirefox && !isWatch);

// Determine output directories based on browser
const browsers = [];
if (isFirefox) browsers.push({ name: "firefox", distDir: path.join(root, "dist-firefox") });
if (isChrome || isWatch) browsers.push({ name: "chrome", distDir: path.join(root, "dist") });

async function buildForBrowser(browser) {
  const { name, distDir } = browser;

  console.log(`\nBuilding for ${name}...`);

  // Clean and recreate dist dir
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  const buildOptions = {
    entryPoints,
    outdir: distDir,
    bundle: true,
    format: "esm",
    target: "es2020",
    sourcemap: true,
    define: {
      'process.env.BROWSER': JSON.stringify(name),
    },
  };

  if (isWatch && name === "chrome") {
    const ctx = await context(buildOptions);
    await ctx.watch();
    console.log("Watching for changes...");
  } else {
    await build(buildOptions);
  }

  // Copy manifest based on browser
  const manifestFile = name === "firefox" ? "manifest.firefox.json" : "manifest.json";
  await copyFile(path.join(root, manifestFile), path.join(distDir, "manifest.json"));

  // Copy static files
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

  console.log(`${name} build complete! Output: ${distDir}`);
}

// Build for each browser
for (const browser of browsers) {
  await buildForBrowser(browser);
}

if (browsers.length > 1) {
  console.log(`\nAll builds complete!`);
}
