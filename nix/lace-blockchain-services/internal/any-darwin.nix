{ inputs, targetSystem }:

assert __elem targetSystem ["aarch64-darwin" "x86_64-darwin"];

let
  pkgs = inputs.nixpkgs.legacyPackages.${targetSystem};
  inherit (pkgs) lib;
in rec {
  common = import ./common.nix { inherit inputs targetSystem; };
  package = lace-blockchain-services;
  installer = pkgs.runCommand "unimplemented" {} "echo unimplemented && exit 1";
  inherit (common) cardano-node ogmios;

  cardano-js-sdk = let
    patchedSrc = pkgs.runCommand "cardano-js-sdk-patched" {} ''
      cp -r ${inputs.cardano-js-sdk} $out
      chmod -R +w $out
      cd $out
      patch -p1 -i ${./cardano-js-sdk--darwin.patch}
    '';

    # # FIXME: investigate more laster, but for now ↓, or else in v18.16, after `install_name_tool`, we’re
    # # getting: `Check failed: VerifyChecksum(blob)` in `v8::internal::Snapshot::VerifyChecksum`
    # nodejs-no-snapshot = cardano-js-sdk.nodejs.overrideAttrs (oldAttrs: {
    #   configureFlags = (oldAttrs.configureFlags or []) ++ ["--without-snapshot"];
    # });

    # For resolving the node_modules:
    theirPackage = (pkgs.callPackage "${patchedSrc}/yarn-project.nix" {
      nodejs = pkgs.nodejs-16_x; # FIXME: temporarily 16.x; as it doesn’t have snapshots which break nix-bundle-exe
    } {
      src = patchedSrc;
    });

    runtime-deps = pkgs.stdenv.mkDerivation {
      name = "cardano-js-sdk-runtime-node_modules";
      inherit (self) src buildInputs npm_config_nodedir;
      configurePhase = __replaceStrings
        ["yarn install --immutable --immutable-cache"]
        ["yarn workspaces focus --all --production"]
        self.configurePhase;
      buildPhase = ":";
      installPhase = "mkdir -p $out && cp -r node_modules $out/";
    };

    self = pkgs.stdenv.mkDerivation {
      name = "cardano-js-sdk";
      src = toString inputs.cardano-js-sdk;
      buildInputs =
        theirPackage.buildInputs # nodejs, and yarn3 wrapper
        ++ (with pkgs; [ python3 pkgconfig xcbuild darwin.cctools rsync ])
        ++ (with pkgs.darwin.apple_sdk.frameworks; [ IOKit AppKit ]);
      inherit (theirPackage) npm_config_nodedir;
      configurePhase = theirPackage.configurePhase;
      buildPhase = "yarn build";
      installPhase = ''
        mkdir $out
        rsync -Rah $(find . '(' '(' -type d -name 'dist' ')' -o -name 'package.json' ')' \
          -not -path '*/node_modules/*') $out/
        cp -r ${runtime-deps}/node_modules $out/
      '';
      passthru.nodejs = theirPackage.nodejs;
    };
  in self;

  lace-blockchain-services-exe = pkgs.buildGoModule rec {
    name = "lace-blockchain-services";
    src = ./lace-blockchain-services;
    vendorHash = "sha256-1iyb+4faqZAo6IZf7PYx3Dg+H2IULzhBW80c5loXBPw=";
    nativeBuildInputs = with pkgs; [ imagemagick go-bindata ];
    buildInputs =
      (with pkgs; [ ])
      ++ (with pkgs.darwin.apple_sdk.frameworks; [ Cocoa WebKit ]);
    overrideModAttrs = oldAttrs: {
      buildInputs = (oldAttrs.buildInputs or []) ++ buildInputs;
    };
    preBuild = ''
      convert -background none -size 66x66 cardano-template.svg cardano.png
      go-bindata -pkg main -o assets.go cardano.png
    '';
  };

  infoPlist = pkgs.writeText "Info.plist" ''
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
        <key>CFBundleDevelopmentRegion</key>
        <string>en</string>
        <key>CFBundleExecutable</key>
        <string>lace-blockchain-services</string>
        <key>CFBundleIdentifier</key>
        <string>io.lace.lace-blockchain-services</string>
        <key>CFBundleName</key>
        <string>${common.prettyName}</string>
        <key>CFBundleDisplayName</key>
        <string>${common.prettyName}</string>
        <key>CFBundleVersion</key>
        <string>1.0</string>
        <key>CFBundleShortVersionString</key>
        <string>1.0.0</string>
        <key>CFBundleIconFile</key>
        <string>iconset</string>
        <key>LSMinimumSystemVersion</key>
        <string>10.14</string>
        <key>NSHighResolutionCapable</key>
        <string>True</string>
        <!-- avoid showing the app on the Dock -->
        <key>LSUIElement</key>
        <string>1</string>
    </dict>
    </plist>
  '';

  icons = let
    sizes = [16 18 19 22 24 32 40 48 64 128 256 512 1024];
    d2s = d: "${toString d}x${toString d}";
    source = ./macos-app-icon.svg;
  in pkgs.runCommand "darwin-icons" {
    buildInputs = with pkgs; [ imagemagick ];
  } ''
    mkdir -p $out/iconset.iconset
    ${lib.concatMapStringsSep "\n" (dim: ''
      convert -background none -size ${d2s dim}       ${source} $out/iconset.iconset/icon_${d2s dim}.png
      convert -background none -size ${d2s (dim * 2)} ${source} $out/iconset.iconset/icon_${d2s dim}@2x.png
    '') sizes}
    /usr/bin/iconutil --convert icns --output $out/iconset.icns $out/iconset.iconset
  '';

  lace-blockchain-services = pkgs.runCommand "lace-blockchain-services" {
    meta.mainProgram = lace-blockchain-services-exe.name;
  } ''
    app=$out/Applications/${lib.escapeShellArg common.prettyName}.app/Contents
    mkdir -p "$app"/MacOS
    mkdir -p "$app"/Resources

    ln -s ${infoPlist} "$app"/Info.plist

    cp ${lace-blockchain-services-exe}/bin/* "$app"/MacOS/
    mkdir -p $out/bin/
    ln -s "$app"/MacOS/lace-blockchain-services $out/bin/

    ln -s ${cardano-node}/bin/cardano-node "$app"/MacOS/
    ln -s ${ogmios}/bin/ogmios "$app"/MacOS/
    ln -s ${cardano-js-sdk.nodejs}/bin/node "$app"/MacOS/

    ln -s ${cardano-js-sdk} "$app"/Resources/cardano-js-sdk
    ln -s ${common.networkConfigs} "$app"/Resources/cardano-node-config

    ln -s ${icons}/iconset.icns "$app"/Resources/iconset.icns
  '';

  nix-bundle-exe-same-dir = pkgs.runCommand "nix-bundle-exe-same-dir" {} ''
    cp -R ${inputs.nix-bundle-exe} $out
    chmod -R +w $out
    sed -r 's+@executable_path/\$relative_bin_to_lib/\$lib_dir+@executable_path+g' -i $out/bundle-macos.sh
  '';

  # XXX: this has no dependency on /nix/store on the target machine
  lace-blockchain-services-bundle = let
    noSpaces = lib.replaceStrings [" "] [""] common.prettyName;
    unbundled = lace-blockchain-services;
    originalApp = lib.escapeShellArg "${unbundled}/Applications/${common.prettyName}.app/Contents";
    bundled = (import nix-bundle-exe-same-dir {
      inherit pkgs;
      bin_dir = "MacOS";
      exe_dir = "_unused_";
      lib_dir = "MacOS";
    } unbundled).overrideAttrs (drv: {
      meta.mainProgram = lace-blockchain-services-exe.name;
      buildCommand = (
        builtins.replaceStrings
          ["'${unbundled}/bin'"]
          ["${originalApp}/MacOS -follow '(' -not -name cardano-node ')'"]
          drv.buildCommand
      ) + ''
        # cardano-node is bundled by Haskell.nix; otherwise we’re getting missing symbols in dyld (TODO: investigate)
        cp -f ${cardano-node}/bin/* $out/MacOS/

        app="$out/Applications/"${lib.escapeShellArg common.prettyName}.app/Contents
        mkdir -p "$app"
        mv $out/MacOS "$app"/
        echo 'Copying Resources…'
        cp -r --dereference ${originalApp}/{Resources,Info.plist} "$app"/
        mkdir -p $out/bin
        ln -s "$app"/MacOS/lace-blockchain-services $out/bin/
      '';
    });
  in bundled;

}
