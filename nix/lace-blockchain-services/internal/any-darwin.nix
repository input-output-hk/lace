{ inputs, targetSystem }:

assert __elem targetSystem ["aarch64-darwin" "x86_64-darwin"];

let
  pkgs = inputs.nixpkgs.legacyPackages.${targetSystem};
  inherit (pkgs) lib;
in rec {
  common = import ./common.nix { inherit inputs targetSystem; };
  package = pkgs.runCommand "unimplemented" {} "echo unimplemented && exit 1";
  installer = package;
  inherit (common) cardano-node ogmios;

  cardano-js-sdk = let
    patchedSrc = pkgs.runCommand "cardano-js-sdk-patched" {} ''
      cp -r ${inputs.cardano-js-sdk} $out
      chmod -R +w $out
      cd $out
      patch -p1 -i ${./cardano-js-sdk--darwin.patch}
    '';

    # For resolving the node_modules:
    theirPackage = (pkgs.callPackage "${patchedSrc}/yarn-project.nix" {} {
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
        <string>${common.prettyName}</string>
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

  lace-blockchain-services = let
    inherit (common) prettyName;
  in pkgs.runCommand "lace-blockchain-services" {
    meta.mainProgram = lace-blockchain-services-exe.name;
  } ''
    app=$out/Applications/${lib.escapeShellArg prettyName}.app/Contents
    mkdir -p "$app"/MacOS
    mkdir -p "$app"/Resources

    cp ${infoPlist} "$app"/Info.plist

    cp ${lace-blockchain-services-exe}/bin/* "$app"/MacOS/${lib.escapeShellArg prettyName}
    mkdir -p $out/bin/
    ln -s "$app"/MacOS/${lib.escapeShellArg prettyName} $out/bin/${lace-blockchain-services-exe.name}

    ln -s ${cardano-node}/bin/* "$app"/MacOS/
    ln -s ${ogmios}/bin/* "$app"/MacOS/
    ln -s ${cardano-js-sdk.nodejs}/bin/node "$app"/MacOS/

    ln -s ${cardano-js-sdk} "$app"/Resources/cardano-js-sdk
    ln -s ${common.networkConfigs} "$app"/Resources/cardano-node-config
  '';

}
