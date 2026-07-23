#!/usr/bin/env bash
#
# Regenerate ApolloLibrary.podspec pinned to a specific Apollo release, with a
# :sha256 integrity check on the fetched xcframework (NWL Mobile audit M-308).
#
# The upstream podspec pins only the (mutable) GitHub release-asset URL with no
# content verification, and the xcframework performs BIP32-Ed25519 key
# derivation — so we vendor a local copy that adds :sha256. Don't hand-edit the
# digest; run this on every Apollo version bump instead.
#
# Usage: ./update-apollo-podspec.sh <version>     e.g. ./update-apollo-podspec.sh 1.7.2
set -euo pipefail

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "usage: $0 <apollo-version>   (e.g. $0 1.7.2)" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PODSPEC="$SCRIPT_DIR/ApolloLibrary.podspec"
GRADLE_DEPS="$SCRIPT_DIR/../expo-build-plugin/src/gradle-deps.json"
URL="https://github.com/hyperledger-identus/apollo/releases/download/v${VERSION}/ApolloLibrary.xcframework.zip"

echo "Fetching ${URL}"
# mktemp -d is portable across BSD (macOS) and GNU mktemp; a templated file arg
# (…XXXXXX.zip) is not — GNU requires the X's at the end and would abort here.
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
TMP="$TMP_DIR/ApolloLibrary.xcframework.zip"
curl -fsSL "$URL" -o "$TMP"

if command -v shasum >/dev/null 2>&1; then
  SHA="$(shasum -a 256 "$TMP" | awk '{print $1}')"
else
  SHA="$(sha256sum "$TMP" | awk '{print $1}')"
fi
echo "sha256: ${SHA}"

cat > "$PODSPEC" <<PODSPEC
Pod::Spec.new do |spec|
  spec.name         = 'ApolloLibrary'
  spec.version      = '${VERSION}'
  spec.summary      = 'Apollo XCFramework distributed as a CocoaPod.'
  spec.homepage     = 'https://github.com/hyperledger-identus/apollo'
  spec.license      = { :type => 'MIT', :file => 'LICENSE' }
  spec.author       = 'Hyperledger Identus'
  # Vendored copy of the upstream podspec with an added :sha256 so CocoaPods
  # verifies the fetched xcframework before use — the upstream spec pins only
  # the mutable release-asset URL, and this xcframework performs BIP32-Ed25519
  # key derivation (NWL Mobile audit M-308). Do not hand-edit the version / url
  # / digest below; regenerate with:
  #   ./update-apollo-podspec.sh <version>
  # Android resolves the same library via the checksummed Maven coordinate
  # org.hyperledger.identus:apollo-android — keep the two versions aligned.
  spec.source       = {
    :http   => 'https://github.com/hyperledger-identus/apollo/releases/download/v${VERSION}/ApolloLibrary.xcframework.zip',
    :sha256 => '${SHA}'
  }
  spec.vendored_frameworks = 'ApolloLibrary.xcframework'
  spec.platform     = :ios, '13.0'
  spec.ios.deployment_target = '13.0'
  spec.osx.deployment_target = '11.0'
end
PODSPEC

echo "Wrote ${PODSPEC} (v${VERSION})"

# Nudge the two platforms back into alignment if they drift.
if [ -f "$GRADLE_DEPS" ]; then
  ANDROID_VERSION="$(grep -oE 'apollo-android:[0-9]+\.[0-9]+\.[0-9]+' "$GRADLE_DEPS" | head -1 | cut -d: -f2 || true)"
  if [ -n "${ANDROID_VERSION:-}" ] && [ "$ANDROID_VERSION" != "$VERSION" ]; then
    echo "WARNING: Android pins apollo-android ${ANDROID_VERSION} but iOS is now ${VERSION} — align the two (gradle-deps.json)." >&2
  fi
fi
