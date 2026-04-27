const {
  withAppBuildGradle,
  withDangerousMod,
  withProjectBuildGradle,
  withGradleProperties,
} = require('expo/config-plugins');
const fs = require('node:fs');
const { mkdirSync } = require('node:fs');
const path = require('node:path');

// Load dependencies from JSON file
const loadGradleDependencies = () => {
  const depsPath = path.resolve(__dirname, './gradle-deps.json');
  let depsRaw;
  let deps;
  try {
    depsRaw = fs.readFileSync(depsPath, 'utf-8');
  } catch (err) {
    console.error(`❌ Failed to read gradle-deps.json at ${depsPath}:`, err);
    throw err;
  }
  try {
    deps = JSON.parse(depsRaw);
  } catch (err) {
    console.error('❌ Failed to parse gradle-deps.json:', err);
    throw err;
  }
  return deps;
};

// Copy Kotlin wrapper files and native .so libraries needed at runtime.
// AARs and POMs are resolved from Maven Central — no local vendoring required.
const withApolloKotlinFiles = config => {
  return withDangerousMod(config, [
    'android',
    async config => {
      const projectRoot = config.modRequest.projectRoot;

      // Copy Kotlin wrapper files
      const kotlinSourceDir = path.join(projectRoot, '/apollo-android');
      const kotlinTargetDir = path.join(
        projectRoot,
        '/android/app/src/main/java/io/lace/mobilewallet',
      );

      try {
        mkdirSync(kotlinTargetDir, { recursive: true });
        console.log(
          `✔ Ensured kotlin target directory exists: ${kotlinTargetDir}`,
        );
      } catch (error) {
        console.error(`❌ Failed to create target directory: ${error}`);
        throw error;
      }

      const kotlinFiles = ['ApolloModule.kt', 'ApolloPackage.kt'];
      for (const file of kotlinFiles) {
        const sourcePath = path.join(kotlinSourceDir, file);
        const targetPath = path.join(kotlinTargetDir, file);

        try {
          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`✔ Copied ${file} to ${kotlinTargetDir}`);
          } else {
            console.warn(`⚠️ Source file not found: ${sourcePath}`);
          }
        } catch (error) {
          console.error(`❌ Failed to copy ${file}: ${error}`);
          throw error;
        }
      }

      return config;
    },
  ]);
};

// Function to register ApolloPackage in MainApplication.kt
const withApolloPackageRegistration = config => {
  return withDangerousMod(config, [
    'android',
    async config => {
      const projectRoot = config.modRequest.projectRoot;

      // Path to generated MainApplication.kt
      const mainApplicationPath = path.join(
        projectRoot,
        '/android/app/src/main/java/io/lace/mobilewallet/MainApplication.kt',
      );

      // Check if file exists
      if (!fs.existsSync(mainApplicationPath)) {
        console.warn(
          `⚠️ MainApplication.kt not found at ${mainApplicationPath}`,
        );
        throw new Error(
          `MainApplication.kt not found at ${mainApplicationPath}`,
        );
      }

      let mainApplicationContent = fs.readFileSync(
        mainApplicationPath,
        'utf-8',
      );

      // Add the import for ApolloPackage if not already present
      if (
        !mainApplicationContent.includes(
          'import io.lace.mobilewallet.ApolloPackage',
        )
      ) {
        // Try the Expo 54 / RN 0.81+ pattern first (no SoLoader import)
        if (
          mainApplicationContent.includes(
            'import expo.modules.ApplicationLifecycleDispatcher',
          )
        ) {
          mainApplicationContent = mainApplicationContent.replace(
            /import expo\.modules\.ApplicationLifecycleDispatcher/,
            'import io.lace.mobilewallet.ApolloPackage\nimport expo.modules.ApplicationLifecycleDispatcher',
          );
        } else if (
          mainApplicationContent.includes(
            'import com.facebook.soloader.SoLoader',
          )
        ) {
          // Legacy pattern (pre-Expo 54)
          mainApplicationContent = mainApplicationContent.replace(
            /import com\.facebook\.soloader\.SoLoader/,
            'import com.facebook.soloader.SoLoader\nimport io.lace.mobilewallet.ApolloPackage',
          );
        } else {
          // Fallback: add import after the package declaration
          mainApplicationContent = mainApplicationContent.replace(
            /(package io\.lace\.mobilewallet\s*\n)/,
            '$1\nimport io.lace.mobilewallet.ApolloPackage\n',
          );
        }
      }

      // Add the package registration if not already present
      if (!mainApplicationContent.includes('ApolloPackage()')) {
        // Try Expo 54 / RN 0.81+ pattern: PackageList(this).packages.apply { ... }
        if (
          mainApplicationContent.includes('PackageList(this).packages.apply')
        ) {
          mainApplicationContent = mainApplicationContent.replace(
            /(PackageList\(this\)\.packages\.apply\s*\{)/,
            '$1\n              add(ApolloPackage())',
          );
        } else {
          // Legacy pattern: val packages = PackageList(this).packages
          mainApplicationContent = mainApplicationContent.replace(
            /val packages = PackageList\(this\)\.packages[\s\S]*?\/\/ Packages that cannot be autolinked yet can be added manually here, for example:[\s\S]*?\/\/ packages\.add\(new MyReactNativePackage\(\)\);/,
            'val packages = PackageList(this).packages\n            // Packages that cannot be autolinked yet can be added manually here, for example:\n            // packages.add(new MyReactNativePackage());\n            packages.add(ApolloPackage())',
          );
        }
      }

      // Write the modified content back to the file
      fs.writeFileSync(mainApplicationPath, mainApplicationContent);
      console.log('✔ Added ApolloPackage registration to MainApplication.kt');

      return config;
    },
  ]);
};

const withReleaseSigningConfig = config => {
  return withAppBuildGradle(config, config => {
    // Add release signing config
    config.modResults.contents = config.modResults.contents.replace(
      /signingConfigs\s*{[\s\S]*?debug\s*{[\s\S]*?}[\s\S]*?}/,
      match => {
        return `${match.slice(0, -1)}
        release {
            // Use environment variables or gradle.properties for keystore details
            storeFile file(System.getenv('KEYSTORE_FILE') ?: project.findProperty('KEYSTORE_FILE') ?: './release.keystore')
            storePassword System.getenv('KEYSTORE_PASSWORD') ?: project.findProperty('KEYSTORE_PASSWORD') ?: ''
            keyAlias System.getenv('KEY_ALIAS') ?: project.findProperty('KEY_ALIAS') ?: 'upload'
            keyPassword System.getenv('KEY_PASSWORD') ?: project.findProperty('KEY_PASSWORD') ?: ''
        }
    }`;
      },
    );

    config.modResults.contents = config.modResults.contents.replace(
      /debug\s*\{\s*signingConfig\s*signingConfigs\.release/,
      'debug {\n            signingConfig signingConfigs.debug',
    );

    config.modResults.contents = config.modResults.contents.replace(
      /release\s*\{\s*\/\/\s*Caution.*\s*\/\/\s*see.*\s*signingConfig\s*signingConfigs\.debug/, // NOSONAR - build-time regex; bounded input;
      'release {\n            signingConfig signingConfigs.release',
    );

    console.log('✔ Added release signing configuration to app build.gradle');
    return config;
  });
};

// Function to set versionCode from the 'build-number' file
const withVersionCodeFromFile = config => {
  return withAppBuildGradle(config, config => {
    // Find the defaultConfig block and replace the versionCode line
    const defaultConfigPattern = /defaultConfig\s*{[\s\S]*?}/;
    const defaultConfigMatch =
      config.modResults.contents.match(defaultConfigPattern);

    if (defaultConfigMatch) {
      const originalBlock = defaultConfigMatch[0];
      const updatedBlock = originalBlock.replace(
        /versionCode\s+\d+/,
        'versionCode (file("${rootProject.projectDir}/build-number").exists() ? file("${rootProject.projectDir}/build-number").text.trim().toInteger() : 1)\n        println "Current versionCode: ${versionCode}"\n',
      );

      config.modResults.contents = config.modResults.contents.replace(
        originalBlock,
        updatedBlock,
      );

      console.log('✔ Set versionCode to read from build-number file');
    } else {
      throw new Error(`❌ Could not find defaultConfig block`);
    }

    return config;
  });
};

// Function to configure Gradle optimization properties
const withGradleOptimizations = config => {
  return withGradleProperties(config, config => {
    // Remove existing optimization properties to avoid duplicates
    const keysToUpdate = [
      'org.gradle.jvmargs',
      'org.gradle.parallel',
      'org.gradle.daemon',
      'org.gradle.caching',
      'org.gradle.configureondemand',
      'org.gradle.workers.max',
      'android.aapt2DaemonPoolSize',
      'android.enablePngCrunchInReleaseBuilds',
    ];

    config.modResults = config.modResults.filter(
      item => !keysToUpdate.includes(item.key),
    );

    // Add updated properties
    config.modResults.push(
      {
        type: 'property',
        key: 'org.gradle.jvmargs',
        value:
          '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError',
      },
      {
        type: 'property',
        key: 'org.gradle.parallel',
        value: 'true',
      },
      {
        type: 'property',
        key: 'org.gradle.daemon',
        value: 'true',
      },
      {
        type: 'property',
        key: 'org.gradle.caching',
        value: 'true',
      },
      {
        type: 'property',
        key: 'org.gradle.configureondemand',
        value: 'true',
      },
      // Limit workers to prevent resource exhaustion
      {
        type: 'property',
        key: 'org.gradle.workers.max',
        value: '2',
      },
      // Limit AAPT2 daemon pool to prevent timeout under resource pressure
      {
        type: 'property',
        key: 'android.aapt2DaemonPoolSize',
        value: '1',
      },
      // PNG crunching enabled - assets should be pre-optimized in CI
      {
        type: 'property',
        key: 'android.enablePngCrunchInReleaseBuilds',
        value: 'true',
      },
    );
    console.log('✔ Added Gradle optimization properties');
    return config;
  });
};

// Fix duplicate Java resources during packaging (e.g. bcprov vs jspecify)
const withAndroidPackagingFixes = config => {
  return withGradleProperties(config, config => {
    const key = 'android.packagingOptions.pickFirsts';
    const required = 'META-INF/versions/9/OSGI-INF/MANIFEST.MF';

    const idx = config.modResults.findIndex(
      item => item.type === 'property' && item.key === key,
    );

    if (idx >= 0) {
      const existing = config.modResults[idx].value || '';
      const parts = existing
        .split(',')
        .map(p => p.trim())
        .filter(Boolean);
      if (!parts.includes(required)) parts.push(required);
      config.modResults[idx].value = parts.join(',');
    } else {
      config.modResults.push({ type: 'property', key, value: required });
    }

    console.log(`✔ Added packagingOptions pickFirsts: ${required}`);
    return config;
  });
};

const withAndroidApolloDependencies = config => {
  const deps = loadGradleDependencies();
  const apolloDep =
    deps.dependencies.find(dep => dep.name === 'apollo-android')
      ?.implementation || '';
  const bcprovDep =
    deps.dependencies.find(dep => dep.name === 'bcprov-jdk18on')
      ?.implementation || '';
  const subprojectsBlock = deps.subprojectsBlock || '';

  config = withProjectBuildGradle(config, config => {
    config.modResults.contents += `\n${subprojectsBlock}`;
    console.log(
      '✔ Injected subprojects block for dependency resolution in project build.gradle',
    );
    return config;
  });

  config = withAppBuildGradle(config, config => {
    if (bcprovDep) {
      config.modResults.contents = config.modResults.contents.replace(
        /(dependencies\s*{\n)/,
        `$1    ${bcprovDep}\n`,
      );
      console.log('✔ Added bcprov-jdk18on dependency to app build.gradle');
    }
    config.modResults.contents = config.modResults.contents.replace(
      /(dependencies\s*{\n)/,
      `$1    ${apolloDep}\n`,
    );
    console.log('✔ Added apollo-android dependency to app build.gradle');
    return config;
  });

  // Copy Apollo Kotlin files to the target directory
  config = withApolloKotlinFiles(config);
  config = withApolloPackageRegistration(config);

  // Add release signing configuration
  config = withReleaseSigningConfig(config);

  // Set versionCode from build-number file
  config = withVersionCodeFromFile(config);

  // Add Gradle optimizations
  config = withGradleOptimizations(config);

  // Fix duplicate Java resources during packaging
  config = withAndroidPackagingFixes(config);

  return config;
};

module.exports = {
  withAndroidApolloDependencies,
};
