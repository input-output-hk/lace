#!/bin/bash

check_yalc_installed() {
    if ! command -v yalc &> /dev/null; then
        echo "Error: yalc is not installed."
        exit 1
    fi
}

check_path_argument() {
    local default_path="../cardano-js-sdk"
    if [ -z "$1" ]; then
        path="$default_path"
    else
        path="$1"
    fi
}

check_git_repository() {
    local path="$1"
    if [ ! -d "$path/.git" ]; then
        echo "The path $path does not lead to a Git repository or the directory does not exist."
        exit 1
    fi
}

check_git_repository_url() {
    local path="$1"
    local sdk_url="git@github.com:input-output-hk/cardano-js-sdk.git"
    local repository_url=$(git -C "$path" config --get remote.origin.url)
    echo $repository_url
    if [ "$repository_url" != "$sdk_url" ]; then
        echo "The path $path leads to a Git repository, but it's not the desired repository."
        exit 1
    fi
}

publish_packages_with_yalc() {
    local packages_path="$1/packages"
    for dir in "$packages_path"/*/; do
        if [ -d "$dir" ]; then
            echo "Publishing package in $dir"
            (cd "$dir" && yalc publish --push --changed --scripts)
        fi
    done
}

# Main script

check_yalc_installed
check_path_argument "$1"
check_git_repository "$path"
check_git_repository_url "$path"

publish_packages_with_yalc "$path"