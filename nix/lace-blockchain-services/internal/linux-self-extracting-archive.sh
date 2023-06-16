#!/bin/sh

# XXX: Be *super careful* changing this!!! You WILL DELETE user data if you make a mistake. Ping @michalrus

# XXX: no -o pipefail in dash (on debians)
set -eu

skip_bytes=$(( 1010101010 - 1000000000 ))

target="$HOME"/.local/opt/@UGLY_NAME@
if [ -e "$target" ] ; then
  echo "Found previous version of "@UGLY_NAME@", removing it..."
  chmod -R +w "$target"
  rm -rf "$target"
fi
mkdir -p "$target"

progress_cmd="cat"
if type pv >/dev/null ; then
  total_size=$(stat -c "%s" "$0")
  progress_cmd="pv -s "$((total_size - skip_bytes))
else
  echo "Note: you don't have \`pv' installed, so we can't show progress"
fi

echo "Unpacking..."
tail -c+$((skip_bytes+1)) "$0" | $progress_cmd | tar -C "$target" -xJ

echo "Setting up a .desktop entry..."
mkdir -p "$HOME"/.local/share/applications
chmod +w "$target"/share "$target"/share/*.desktop
sed -r "s+INSERT_PATH_HERE+$(echo "$target"/bin/*)+g" -i "$target"/share/*.desktop
sed -r "s+INSERT_ICON_PATH_HERE+$target/share/icon_large.png+g" -i "$target"/share/*.desktop
chmod -w "$target"/share "$target"/share/*.desktop
ln -sf "$target"/share/*.desktop "$HOME"/.local/share/applications/@UGLY_NAME@.desktop

echo "Installed successfully!"
echo
echo "Now, either:"
echo "  1. In a terminal, run $(echo "$target"/bin/* | sed -r "s+^$HOME+~+")"
echo "  2. Or select Start -> "@PRETTY_NAME@"."

exit 0
