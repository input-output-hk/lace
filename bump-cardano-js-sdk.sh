#!/usr/bin/env

# Script to update @cardano-sdk/* dependencies in all package.json files
# within a monorepo, excluding any located within node_modules directories.

# Tested on Mac/Linux, you need jq and curl command installed in your system.

find "." -type d -name 'node_modules' -prune -o -type f -name 'package.json' -print | while IFS= read -r package_file; do
    # Print the current file being processed
    echo "Processing $package_file"

    # Using jq to parse package.json and extract dependency keys starting with @cardano-sdk/
    # - `if .dependencies then ... else empty end` ensures that we only attempt to process existing, non-null dependencies sections.
    jq -r 'if .dependencies then .dependencies | keys[] | select(startswith("@cardano-sdk/")) else empty end' "$package_file" | while IFS= read -r package; do
        echo "Updating $package in $package_file"

        # Fetching the latest version of the package from the npm registry.
        latest_version=$(curl -s "https://registry.npmjs.org/$package" | jq -r '.["dist-tags"].latest')

        # Check if a latest version was fetched successfully.
        if [ -z "$latest_version" ]; then
            echo "Failed to fetch latest version for $package"
            continue
        fi

        # Using jq to update the version of the package in the dependencies object of package.json.
        # - `--arg pkg "$package"` sets the package name as a jq variable.
        # - `--arg ver "$latest_version"` sets the fetched version as a jq variable without the ^ prefix.
        # - `.dependencies[$pkg] = $ver` updates the version of the package in the dependencies object.
        jq --arg pkg "$package" --arg ver "$latest_version" '.dependencies[$pkg] = $ver' "$package_file" > "$package_file.tmp" && mv "$package_file.tmp" "$package_file"

        echo "Updated $package to version $latest_version in $package_file"
    done
done

echo "Dependency updates complete."
