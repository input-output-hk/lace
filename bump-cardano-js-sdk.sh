#!/usr/bin/env

# Script to update @cardano-sdk/* dependencies and devDependencies in all package.json files
# within a monorepo, excluding any located within node_modules directories,
# and setting dependencies to exact versions (without the ^ prefix).

# Using find to locate all package.json files in the monorepo.
find "." -type d -name 'node_modules' -prune -o -type f -name 'package.json' -print | while IFS= read -r package_file; do
    echo "Processing $package_file"

    # Function to update a given section (dependencies or devDependencies)
    function update_dependencies {
        dep_type="$1"  # either "dependencies" or "devDependencies"
        jq -r "if .$dep_type then .$dep_type | keys[] | select(startswith(\"@cardano-sdk/\")) else empty end" "$package_file" | while IFS= read -r package; do
            echo "Updating $package in $dep_type of $package_file"
            latest_version=$(curl -s "https://registry.npmjs.org/$package" | jq -r '.["dist-tags"].latest')
            if [ -z "$latest_version" ]; then
                echo "Failed to fetch latest version for $package"
                continue
            fi
            jq --arg pkg "$package" --arg ver "$latest_version" ".$dep_type[\$pkg] = \$ver" "$package_file" > "$package_file.tmp" && mv "$package_file.tmp" "$package_file"
            echo "Updated $package to version $latest_version in $dep_type of $package_file"
        done
    }

    # Update dependencies and devDependencies
    update_dependencies "dependencies"
    update_dependencies "devDependencies"
done

echo "Dependency updates complete."
