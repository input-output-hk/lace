const fs = require('node:fs');
const path = require('node:path');

const patchFile = ({ filePath, from, to }) => {
  if (!fs.existsSync(filePath)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[patch-expo-localization] Skipping; file not found: ${filePath}`,
    );
    return false;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  if (original.includes(to)) return false;
  if (!original.includes(from)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[patch-expo-localization] Skipping; expected content not found in: ${filePath}`,
    );
    return false;
  }

  const patched = original.replace(from, to);
  fs.writeFileSync(filePath, patched, 'utf8');
  return true;
};

const main = () => {
  const repoRoot = path.resolve(__dirname, '..');
  const swiftFile = path.join(
    repoRoot,
    'node_modules',
    'expo-localization',
    'ios',
    'LocalizationModule.swift',
  );

  // Xcode 16 / Swift 6+ requires switches over enums to be exhaustive.
  // Older versions of expo-localization omit an @unknown default case here.
  const from = [
    '    case .iso8601:',
    '      return "iso8601"',
    '    }',
    '  }',
  ].join('\n');

  const to = [
    '    case .iso8601:',
    '      return "iso8601"',
    '    @unknown default:',
    '      return "gregory"',
    '    }',
    '  }',
  ].join('\n');

  const didPatch = patchFile({ filePath: swiftFile, from, to });
  // eslint-disable-next-line no-console
  console.log(
    didPatch
      ? `[patch-expo-localization] Patched: ${path.relative(
          repoRoot,
          swiftFile,
        )}`
      : `[patch-expo-localization] No changes needed: ${path.relative(
          repoRoot,
          swiftFile,
        )}`,
  );
};

main();
