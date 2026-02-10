const fs = require("fs");
const path = require("path");

const TARGET_PATHS = {
  lmp: "v2/apps/midnight-extension",
  v2: "v2/apps/lace-extension",
};

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
    const targetPath = TARGET_PATHS[this.target];
    const targetLabel = this.target === "lmp" ? "LMP" : "v2";

    compiler.hooks.initialize.tap("MergeManifestPlugin", () => {
      console.log(
        `[MergeManifestPlugin] Manifest merge initialized (target: ${targetLabel})\n`
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

          // Read target manifest (LMP or v2) for CSP merging
          const targetManifestPath = path.join(
            __dirname,
            targetPath,
            "dist",
            "manifest.json"
          );
          const targetManifest = JSON.parse(
            fs.readFileSync(targetManifestPath, "utf-8")
          );

          v1Manifest.name = "Lace";
          v1Manifest.bundle_type = this.target;

          // Update service worker to use our sw-bundle.js
          v1Manifest.background.service_worker = "./sw-bundle.js";

          // Update popup to use the bundle entrypoint, which is same as in v1 but doesn't load the script
          v1Manifest.action.default_popup = "./popup.html";

          for (const script of targetManifest.content_scripts) {
            v1Manifest.content_scripts.push(script);
          }

          // Merge CSP connect-src values
          const v1CSP = v1Manifest.content_security_policy.extension_pages;
          const targetCSP = targetManifest.content_security_policy.extension_pages;

          // Extract connect-src from both CSPs
          const v1ConnectMatch = v1CSP.match(/connect-src ([^;]+)/);
          const targetConnectMatch = targetCSP.match(/connect-src ([^;]+)/);

          if (v1ConnectMatch && targetConnectMatch) {
            // Parse connect-src URLs
            const v1ConnectUrls = new Set(
              v1ConnectMatch[1].trim().split(/\s+/)
            );
            const targetConnectUrls = new Set(
              targetConnectMatch[1].trim().split(/\s+/)
            );

            // Merge URLs (union of both sets)
            const mergedConnectUrls = new Set([
              ...v1ConnectUrls,
              ...targetConnectUrls,
            ]);

            // Reconstruct CSP with merged connect-src
            const mergedConnectSrc = Array.from(mergedConnectUrls).join(" ");
            v1Manifest.content_security_policy.extension_pages = v1CSP.replace(
              /connect-src [^;]+/,
              `connect-src ${mergedConnectSrc}`
            );
          }

          // Merge web_accessible_resources
          if (targetManifest.web_accessible_resources) {
            for (const targetResource of targetManifest.web_accessible_resources) {
              v1Manifest.web_accessible_resources.push(targetResource);
            }
          }

          // Write merged manifest
          fs.writeFileSync(
            path.join(distDir, "manifest.json"),
            JSON.stringify(v1Manifest, null, 2),
            "utf-8"
          );

          console.log(
            `[MergeManifestPlugin] Manifest merged successfully (${targetLabel})`
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
