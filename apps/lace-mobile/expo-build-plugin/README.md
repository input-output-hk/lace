# expo-build-plugin

This plugin automates Apollo integration for the Lace Mobile app (iOS and Android) during the code generation stage.

## Implementation

This plugin is implemented in JavaScript (CommonJS) and runs directly without a build step, making it compatible with EAS Build and local development environments.

## Actions performed

### iOS

- **Apollo wrapper**: Integrates the Apollo wrapper into the Xcode project.
- **Podfile modifications**: Adds `Blake2` and `ApolloLibrary` pods to the Podfile.

### Android

- **Maven repository**: Adds `mavenLocal()` repository to the project's build.gradle.
- **Dependencies**:
  - Adds `apollo-android` (version 1.6.0) with exclusions to app build.gradle.
  - Adds `bcprov-jdk18on` (version 1.80) to app build.gradle.
- **Dependency resolution**: Injects a subprojects block in project build.gradle that:
  - Forces `bcprov-jdk18on` version 1.80
  - Excludes conflicting dependencies:
    - From apollo-android: `org.bouncycastle:bcprov-jdk15on`, `com.squareup.okio:okio`
    - From all configurations: `org.bouncycastle:bcprov-jdk15to18`, `com.squareup.okio:okio-jvm`
- **Apollo Kotlin integration**:
  - Copies Apollo Kotlin files (`ApolloModule.kt` and `ApolloPackage.kt`) to the app's main directory.
  - Registers the Apollo package in `MainApplication.kt` for native module integration.
- **Release signing configuration**:
  - Adds release signing config block to app build.gradle.
  - Configures signing parameters to use environment variables or gradle properties.
  - Sets release build variant to use the release signing config.
- **Dynamic version code**:
  - Configures app to read the version code from a `build-number` file.
  - Works with CI/CD pipeline to automatically increment version code for each release.
