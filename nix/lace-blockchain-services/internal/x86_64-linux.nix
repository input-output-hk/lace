{ inputs, targetSystem }:

assert targetSystem == "x86_64-linux";

let
  pkgs = inputs.nixpkgs.legacyPackages.${targetSystem};
  inherit (pkgs) lib;
in rec {
  common = import ./common.nix { inherit inputs targetSystem; };

  package = lace-blockchain-services;

  installer = selfExtractingArchive;

  inherit (common) ogmios cardano-node;

  cardano-js-sdk = inputs.cardano-js-sdk.packages.${pkgs.system}.default;

  lace-blockchain-services-exe = pkgs.buildGoModule rec {
    name = "lace-blockchain-services";
    src = ./lace-blockchain-services;
    vendorHash = common.lace-blockchain-services-exe-vendorHash;
    nativeBuildInputs = with pkgs; [ pkgconfig imagemagick go-bindata ];
    buildInputs = with pkgs; [
      (libayatana-appindicator-gtk3.override {
        gtk3 = gtk3-x11;
        libayatana-indicator = libayatana-indicator.override { gtk3 = gtk3-x11; };
        libdbusmenu-gtk3 = libdbusmenu-gtk3.override { gtk3 = gtk3-x11; };
      })
      gtk3-x11
    ];
    overrideModAttrs = oldAttrs: {
      buildInputs = (oldAttrs.buildInputs or []) ++ buildInputs;
    };
    preBuild = ''
      convert -background none -size 44x44 cardano.svg cardano.png
      cp cardano.png tray-icon
      cp ${common.openApiJson} openapi.json
      go-bindata -pkg assets -o assets/assets.go tray-icon openapi.json
      mkdir -p constants && cp ${common.constants} constants/constants.go
    '';
  };

  lace-blockchain-services = pkgs.runCommand "lace-blockchain-services" {
    meta.mainProgram = lace-blockchain-services-exe.name;
  } ''
    mkdir -p $out/bin $out/libexec $out/share
    cp ${lace-blockchain-services-exe}/bin/* $out/bin/
    ln -s ${cardano-node}/bin/* $out/libexec/
    ln -s ${ogmios}/bin/* $out/libexec/
    ln -s ${mithril-client}/bin/* $out/libexec/
    ln -s ${cardano-js-sdk.nodejs}/bin/node $out/libexec
    ln -s ${pkgs.xclip}/bin/xclip $out/libexec

    mkdir -p $out/share
    ln -s ${cardano-js-sdk}/libexec/source $out/share/cardano-js-sdk
    ln -s ${pkgs.xkeyboard_config}/share/X11/xkb $out/share/xkb
    ln -s ${common.networkConfigs} $out/share/cardano-node-config
    ln -s ${common.swagger-ui} $out/share/swagger-ui
    ln -s ${common.dashboard} $out/share/dashboard
  '';

  # XXX: this has no dependency on /nix/store on the target machine
  lace-blockchain-services-bundle = let
    unbundled = lace-blockchain-services;
    bundled = (import inputs.nix-bundle-exe {
      inherit pkgs;
      bin_dir = "libexec";
      exe_dir = "lib";
      lib_dir = "lib";
    } unbundled).overrideAttrs (drv: {
      meta.mainProgram = lace-blockchain-services-exe.name;
      buildCommand = (
        builtins.replaceStrings
          ["'${unbundled}/bin'"]
          ["'${unbundled}/bin' '${unbundled}/libexec' -follow"]
          drv.buildCommand
      ) + ''
        mkdir -p $out/bin $out/share
        mv $out/libexec/lace-blockchain-services $out/bin/
        cp -r --dereference ${unbundled}/share/. $out/share/ || true  # FIXME: unsafe! broken node_modules symlinks
        cp $(find ${desktopItem} -type f -name '*.desktop') $out/share/lace-blockchain-services.desktop
        ${pkgs.imagemagick}/bin/convert -background none -size 1024x1024 \
          ${./lace-blockchain-services}/cardano.svg $out/share/icon_large.png
      '';
    });
  in bundled;

  desktopItem = pkgs.makeDesktopItem {
    name = "lace-blockchain-services";
    exec = "INSERT_PATH_HERE";
    desktopName = common.prettyName;
    genericName = "Cardano Crypto-Currency Backend";
    comment = "Run the backend for the Lace wallet locally";
    categories = [ "Network" ];
    icon = "INSERT_ICON_PATH_HERE";
  };

  # XXX: Be *super careful* changing this!!! You WILL DELETE user data if you make a mistake. Ping @michalrus
  selfExtractingArchive = let
    scriptTemplate = __replaceStrings [
      "@UGLY_NAME@"
      "@PRETTY_NAME@"
    ] [
      (lib.escapeShellArg "lace-blockchain-services")
      (lib.escapeShellArg common.prettyName)
    ] (__readFile ./linux-self-extracting-archive.sh);
    script = __replaceStrings ["1010101010"] [(toString (1000000000 + __stringLength scriptTemplate))] scriptTemplate;
    revShort =
      if inputs.self ? shortRev
      then builtins.substring 0 9 inputs.self.rev
      else "dirty";
  in pkgs.runCommand "lace-blockchain-services-installer" {
    inherit script;
    passAsFile = [ "script" ];
  } ''
    mkdir -p $out
    target=$out/lace-blockchain-services-${common.laceVersion}-${revShort}-${targetSystem}.bin
    cat $scriptPath >$target
    echo 'Compressing (xz)...'
    tar -cJ -C ${lace-blockchain-services-bundle} . >>$target
    chmod +x $target

    # Make it downloadable from Hydra:
    mkdir -p $out/nix-support
    echo "file binary-dist \"$target\"" >$out/nix-support/hydra-build-products
  '';

  swagger-ui-preview = let
    port = 12345;
  in pkgs.writeShellScriptBin "swagger-ui-preview" ''
    set -euo pipefail
    openapi=$(realpath -e nix/lace-blockchain-services/internal/lace-blockchain-services/openapi.json)
    cd $(mktemp -d)
    ln -s ${common.swagger-ui} ./swagger-ui
    ln -s "$openapi" ./openapi.json
    ( sleep 0.5 ; xdg-open http://127.0.0.1:${toString port}/swagger-ui/ ; ) &
    ${lib.getExe pkgs.python3} -m http.server ${toString port}
  '';

  mithril-client = pkgs.runCommand "mithril-client-${common.mithril-bin.version}" {} ''
    cp ${common.mithril-bin}/mithril-client ./

    chmod +wx mithril-client
    patchelf --set-interpreter ${pkgs.stdenv.cc.bintools.dynamicLinker} \
      --set-rpath ${with pkgs; lib.makeLibraryPath [ /* pkgs.stdenv.cc.cc */ openssl_1_1 ]} \
      mithril-client

    mkdir -p $out/bin
    cp mithril-client $out/bin
    $out/bin/mithril-client --version
  '';

}
