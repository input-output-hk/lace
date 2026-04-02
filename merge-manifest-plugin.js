const fs = require("fs");
const path = require("path");

const TARGET_PATHS = {
  lmp: ["v2/apps/midnight-extension"],
  v2: ["v2/apps/lace-extension"],
  "v2-lmp": ["v2/apps/lace-extension", "v2/apps/midnight-extension"],
};

function mergeTargetManifestIntoBase(baseManifest, targetManifest) {
  for (const script of targetManifest.content_scripts) {
    baseManifest.content_scripts.push(script);
  }

  const baseCSP = baseManifest.content_security_policy.extension_pages;
  const targetCSP = targetManifest.content_security_policy.extension_pages;

  const baseConnectMatch = baseCSP.match(/connect-src ([^;]+)/);
  const targetConnectMatch = targetCSP.match(/connect-src ([^;]+)/);

  if (baseConnectMatch && targetConnectMatch) {
    const mergedConnectUrls = new Set([
      ...baseConnectMatch[1].trim().split(/\s+/),
      ...targetConnectMatch[1].trim().split(/\s+/),
    ]);
    const mergedConnectSrc = Array.from(mergedConnectUrls).join(" ");
    baseManifest.content_security_policy.extension_pages = baseCSP.replace(
      /connect-src [^;]+/,
      `connect-src ${mergedConnectSrc}`
    );
  }

  if (targetManifest.web_accessible_resources) {
    for (const targetResource of targetManifest.web_accessible_resources) {
      baseManifest.web_accessible_resources.push(targetResource);
    }
  }
}

class MergeManifestPlugin {
  constructor(options = {}) {
    this.target = options.target || "lmp";
    if (!TARGET_PATHS[this.target]) {
      throw new Error(
        `Invalid target "${this.target}". Must be one of: ${Object.keys(TARGET_PATHS).join(", ")}`
      );
    }
  }

  apply(compiler) {
    compiler.hooks.initialize.tap("MergeManifestPlugin", () => {
      console.log(
        `[MergeManifestPlugin] Manifest merge initialized (target: ${this.target})\n`
      );
    });

    compiler.hooks.thisCompilation.tap("MergeManifestPlugin", (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: "MergeManifestPlugin",
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
        },
        () => {
          const distDir = path.resolve(__dirname, "dist");
          if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir);
          }

          // Read v1 manifest as base
          const v1ManifestPath = path.join(
            __dirname,
            "v1",
            "apps",
            "browser-extension-wallet",
            "dist",
            "manifest.json"
          );
          const v1Manifest = JSON.parse(
            fs.readFileSync(v1ManifestPath, "utf-8")
          );

          v1Manifest.name = "Lace";
          v1Manifest.background.service_worker = "./sw-bundle.js";
          v1Manifest.action.default_popup = "./popup.html";

          for (const targetPath of TARGET_PATHS[this.target]) {
            const targetManifestPath = path.join(
              __dirname,
              targetPath,
              "dist",
              "manifest.json"
            );
            const targetManifest = JSON.parse(
              fs.readFileSync(targetManifestPath, "utf-8")
            );
            mergeTargetManifestIntoBase(v1Manifest, targetManifest);
          }

          fs.writeFileSync(
            path.join(distDir, "manifest.json"),
            JSON.stringify(v1Manifest, null, 2),
            "utf-8"
          );

          console.log(
            `[MergeManifestPlugin] Manifest merged successfully (${this.target})`
          );
        }
      );
    });

    compiler.hooks.done.tap("MergeManifestPlugin", () => {
      console.log("\n[MergeManifestPlugin] Manifest merge finalized!\n");
    });
  }
}

module.exports = MergeManifestPlugin;
