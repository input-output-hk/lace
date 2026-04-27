const {
  withDangerousMod,
  withPodfile,
  withXcodeProject,
} = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

// This plugin orchestrates iOS Continuous Native Generation (CNG) mutations.
// JS drives Expo config plugins and Xcode project edits, while Ruby is used
// only for Podfile post_install logic because CocoaPods evaluates the Podfile.

const POD_DEPS_PATH = path.resolve(__dirname, './pod-deps.json');
const POD_BUILD_SETTINGS_BLOCK_PATH = path.resolve(
  __dirname,
  './ios-pod-post-install.rb',
);
const POD_BUILD_SETTINGS_MARKER =
  'append_build_setting = lambda do |value, flags, fallback = "$(inherited)"|';

const appendBuildFlag = (currentValue, flag, fallbackBase = '$(inherited)') => {
  const normalized = String(currentValue || '').replace(/^"(.*)"$/, '$1');
  const base = normalized || fallbackBase;
  const nextValue = base.includes(flag) ? base : `${base} ${flag}`;
  return `"${nextValue}"`;
};

const readJsonFile = filePath => {
  let fileContents;
  try {
    fileContents = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`❌ Failed to read JSON file at ${filePath}:`, err);
    throw err;
  }

  try {
    return JSON.parse(fileContents);
  } catch (err) {
    console.error(`❌ Failed to parse JSON file at ${filePath}:`, err);
    throw err;
  }
};

const readTextFile = filePath => {
  try {
    return fs.readFileSync(filePath, 'utf-8').trim();
  } catch (err) {
    console.error(`❌ Failed to read text file at ${filePath}:`, err);
    throw err;
  }
};

const buildPodLinesFromDeps = deps =>
  deps.pods
    .map(pod => {
      if (pod.podspec) {
        return `  pod '${pod.name}', :podspec => '${pod.podspec}'`;
      }
      if (pod.version) {
        return `  pod '${pod.name}', '${pod.version}'`;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');

const insertAfterReactNativePostInstall = (contents, block) => {
  const lines = contents.split('\n');
  const startLine = lines.findIndex(line =>
    line.includes('react_native_post_install('),
  );
  if (startLine === -1) {
    return null;
  }

  let depth = 0;
  let foundOpeningParen = false;
  let endLine = -1;
  for (let i = startLine; i < lines.length; i++) {
    for (const char of lines[i]) {
      if (char === '(') {
        depth++;
        foundOpeningParen = true;
      } else if (char === ')') {
        depth--;
      }
    }
    if (foundOpeningParen && depth <= 0) {
      endLine = i;
      break;
    }
  }
  if (endLine === -1) {
    return null;
  }

  const indentation = lines[startLine].match(/^(\s*)/)?.[1] ?? '';
  const indentedBlock = block
    .split('\n')
    .map(line => `${indentation}${line}`)
    .join('\n');
  lines.splice(endLine + 1, 0, indentedBlock);
  return lines.join('\n');
};

const forEachAppTargetBuildConfig = (xcodeProject, callback) => {
  const appTargetInfo = xcodeProject.getTarget(
    'com.apple.product-type.application',
  );
  const appTarget = appTargetInfo?.target;
  if (!appTarget) {
    return false;
  }

  const buildConfigListId =
    typeof appTarget.buildConfigurationList === 'string'
      ? appTarget.buildConfigurationList
      : appTarget.buildConfigurationList?.value;
  const configLists = xcodeProject.pbxXCConfigurationList();
  const targetConfigList = buildConfigListId
    ? configLists[buildConfigListId]
    : undefined;
  const configurationIds = (targetConfigList?.buildConfigurations || [])
    .map(configRef =>
      typeof configRef === 'string' ? configRef : configRef.value,
    )
    .filter(Boolean);
  const configurations = xcodeProject.pbxXCBuildConfigurationSection();

  configurationIds.forEach(configId => {
    const buildConfig = configurations[configId];
    if (!buildConfig?.buildSettings) return;
    callback(buildConfig);
  });

  return true;
};

const withApolloSetup = config => {
  config = withDangerousMod(config, [
    'ios',
    async config => {
      const projectRoot = config.modRequest.projectRoot;
      const src = path.join(projectRoot, 'apollo-ios');
      const dest = path.join(projectRoot, 'ios');
      fs.cpSync(src, dest, { recursive: true });
      console.log(`✔ Copied Apollo from ${src} to ${dest}`);
      return config;
    },
  ]);

  config = withXcodeProject(config, config => {
    const xcodeProject = config.modResults;
    const apolloFiles = ['ApolloModule.swift', 'ApolloModuleBridge.m'];
    const mainGroupKey = xcodeProject.getFirstProject().firstProject.mainGroup;
    const apolloGroupKey = xcodeProject.pbxCreateGroup(
      'Apollo',
      'Apollo',
      '"<group>"',
    );
    xcodeProject.addToPbxGroup(apolloGroupKey, mainGroupKey);
    apolloFiles.forEach(filePath => {
      try {
        xcodeProject.addSourceFile(filePath, {}, apolloGroupKey);
      } catch (error) {
        console.error(
          `❌    - Failed to add ${filePath} to Apollo group:`,
          error,
        );
        throw error;
      }
    });

    // Configure build settings for main app target to handle non-modular headers
    if (
      forEachAppTargetBuildConfig(xcodeProject, buildConfig => {
        // Allow non-modular includes for React Native 0.81
        buildConfig.buildSettings.CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES =
          'YES';
        buildConfig.buildSettings.OTHER_CFLAGS = appendBuildFlag(
          buildConfig.buildSettings.OTHER_CFLAGS,
          '-Wno-error=non-modular-include-in-framework-module',
        );
        buildConfig.buildSettings.OTHER_SWIFT_FLAGS = appendBuildFlag(
          buildConfig.buildSettings.OTHER_SWIFT_FLAGS,
          '-Xcc -Wno-error=non-modular-include-in-framework-module',
        );
        buildConfig.buildSettings.GCC_TREAT_WARNINGS_AS_ERRORS = 'NO';
      })
    ) {
      console.log('✔ Configured build settings for main app target');
    } else {
      console.warn('⚠️ Could not find iOS application target in Xcode project');
    }

    return config;
  });
  return config;
};

/**
 * Fix AppDelegate to use correct bundle root for non-Expo Router projects.
 * Expo auto-detects src/app as Expo Router, but this project uses standard index.js.
 */
const withAppDelegateFix = config => {
  config = withDangerousMod(config, [
    'ios',
    async config => {
      const appDelegateBasePath = path.join(
        config.modRequest.platformProjectRoot,
        config.modRequest.projectName || 'Lace',
      );
      const appDelegateCandidates = [
        path.join(appDelegateBasePath, 'AppDelegate.swift'),
        path.join(appDelegateBasePath, 'AppDelegate.mm'),
        path.join(appDelegateBasePath, 'AppDelegate.m'),
      ];

      const appDelegatePath = appDelegateCandidates.find(filePath =>
        fs.existsSync(filePath),
      );
      if (!appDelegatePath) {
        console.warn(
          `⚠️  AppDelegate implementation file not found. Checked: ${appDelegateCandidates.join(
            ', ',
          )}`,
        );
        return config;
      }

      let content = fs.readFileSync(appDelegatePath, 'utf-8');
      const before = content;

      // Swift AppDelegate pattern
      content = content.replace(
        /jsBundleURL\(forBundleRoot:\s*"\.expo\/\.virtual-metro-entry"\)/g,
        'jsBundleURL(forBundleRoot: "index")',
      );
      // Objective-C / Objective-C++ AppDelegate pattern
      content = content.replace(
        /jsBundleURLForBundleRoot:@\"\.expo\/\.virtual-metro-entry\"/g,
        'jsBundleURLForBundleRoot:@"index"',
      );

      if (content !== before) {
        fs.writeFileSync(appDelegatePath, content, 'utf-8');
        console.log(
          `✔ Fixed ${path.basename(
            appDelegatePath,
          )} bundle root to use "index"`,
        );
      } else {
        console.warn(
          `⚠️  AppDelegate bundle root did not require changes in ${appDelegatePath}`,
        );
      }

      return config;
    },
  ]);
  return config;
};

const withPodDependencies = config => {
  return withPodfile(config, config => {
    const deps = readJsonFile(POD_DEPS_PATH);
    const podLines = buildPodLinesFromDeps(deps);
    config.modResults.contents = config.modResults.contents.replace(
      /use_expo_modules!\n/,
      `use_expo_modules!\n${podLines}\n`,
    );

    console.log(`✔ Added pod dependencies from pod-deps.json`);
    const podBuildSettingsBlock = readTextFile(POD_BUILD_SETTINGS_BLOCK_PATH);

    // Find the existing post_install block and inject the shared Ruby fragment.
    if (config.modResults.contents.includes('post_install do |installer|')) {
      if (config.modResults.contents.includes(POD_BUILD_SETTINGS_MARKER)) {
        console.log(
          '✔ Apollo module fixes already present in post_install block',
        );
      } else {
        const updatedContents = insertAfterReactNativePostInstall(
          config.modResults.contents,
          podBuildSettingsBlock,
        );
        if (updatedContents) {
          config.modResults.contents = updatedContents;
          console.log(
            '✔ Added Apollo module fixes to existing post_install block',
          );
        } else {
          // Fallback when react_native_post_install call is not found/formatted differently.
          config.modResults.contents = config.modResults.contents.replace(
            /post_install do \|installer\|\n/,
            `post_install do |installer|\n  ${podBuildSettingsBlock.replace(
              /\n/g,
              '\n  ',
            )}\n`,
          );
          console.log(
            '✔ Added Apollo module fixes to post_install block using fallback insertion',
          );
        }
      }
    } else {
      // Add a new post_install block if none exists
      const postInstallBlock = `\npost_install do |installer|\n${podBuildSettingsBlock}\nend\n`;
      config.modResults.contents += postInstallBlock;
      console.log('✔ Added post_install block for C++ standard');
    }
    return config;
  });
};

module.exports = {
  withApolloSetup,
  withAppDelegateFix,
  withPodDependencies,
};
