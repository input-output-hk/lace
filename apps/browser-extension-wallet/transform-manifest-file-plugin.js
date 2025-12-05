const manifest = require('./manifest.json');
const { transformManifest } = require('./webpack-utils');
const fs = require('fs');
const path = require('path');

class TransformManifestFilePlugin {
  constructor(options = {}) {
    this.options = options;
  }

  apply(compiler) {
    compiler.hooks.initialize.tap('TransformManifestFilePlugin', () => {
      console.log('[TransformManifestFilePlugin] Manifest transformation initialized\n');
    });

    compiler.hooks.thisCompilation.tap('TransformManifestFilePlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'TransformManifestFilePlugin',
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
        },
        (assets) => {
          const jsAssets = Object.keys(assets).filter((asset) => asset.endsWith('.js'));

          const distDir = path.resolve(__dirname, 'dist');
          if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir);
          }

          const transformedManifest = transformManifest(JSON.stringify(manifest), compiler.options.mode, jsAssets);

          fs.writeFileSync(path.join(distDir, 'manifest.json'), transformedManifest, 'utf-8');
        }
      );
    });

    compiler.hooks.done.tap('TransformManifestFilePlugin', (stats) => {
      console.log('\n[TransformManifestFilePlugin] Manifest transformation finalized!\n');
    });
  }
}

module.exports = TransformManifestFilePlugin;
