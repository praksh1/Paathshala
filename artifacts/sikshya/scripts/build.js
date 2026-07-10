const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}

function stripProtocol(domain) {
  let urlString = domain.trim();
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }
  return new URL(urlString).host;
}

function getDeploymentDomain() {
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
    return stripProtocol(process.env.REPLIT_INTERNAL_APP_DOMAIN);
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return stripProtocol(process.env.REPLIT_DEV_DOMAIN);
  }
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return stripProtocol(process.env.EXPO_PUBLIC_DOMAIN);
  }
  exitWithError(
    "ERROR: No deployment domain found. Set REPLIT_INTERNAL_APP_DOMAIN, REPLIT_DEV_DOMAIN, or EXPO_PUBLIC_DOMAIN",
  );
}

function main() {
  console.log("Building static web export (browser-testable, no Expo Go needed)...");

  const domain = getDeploymentDomain();
  console.log(`Setting EXPO_PUBLIC_DOMAIN=${domain}`);

  const outputDir = path.join(projectRoot, "web-build");
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }

  // `expo export -p web` produces a fully static single-page app (index.html + hashed
  // JS/CSS/asset bundles) — no Metro dev server or Expo Go manifest needed at runtime,
  // so it can be served by a plain static file server and works in any browser.
  const result = spawnSync(
    "pnpm",
    ["exec", "expo", "export", "-p", "web", "--output-dir", "web-build"],
    {
      cwd: projectRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        EXPO_PUBLIC_DOMAIN: domain,
        CI: "1",
      },
    },
  );

  if (result.status !== 0) {
    exitWithError("expo export failed");
  }

  if (!fs.existsSync(path.join(outputDir, "index.html"))) {
    exitWithError("Build did not produce web-build/index.html");
  }

  console.log(`Build complete! Static web app ready in web-build/ (base path: ${basePath || "/"})`);
}

main();
