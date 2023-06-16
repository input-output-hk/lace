{ inputs, targetSystem }:

assert targetSystem == "x86_64-linux";

let
  pkgs = inputs.nixpkgs.legacyPackages.${targetSystem};
  inherit (pkgs) lib;
in rec {
  common = import ./common.nix { inherit inputs targetSystem; };

  package = lace-blockchain-services;

  installer = selfExtractingArchive;

  # XXX: whenever updating Ogmios, make sure to update `ogmiosInputs` below (based on `${ogmiosSrc}/default.nix`):
  ogmiosSrc = pkgs.fetchFromGitHub {
    owner = "CardanoSolutions";
    repo = "ogmios";
    rev = "v5.6.0";
    hash = "sha256-nCNz/aDDKPVhphM7RnlD81aZC2x7cEzlD+aD4qMA2Sc=";
  };

  ogmiosInputs = {
    haskellNix = let
      self = common.flake-compat {
        src = pkgs.fetchzip {
          url = "https://github.com/input-output-hk/haskell.nix/archive/0.0.117.tar.gz";
          hash = "sha256-oSlxyFCsmG/z1Vks8RT94ZagrzTPT/WMwT7OOiEsyzI=";
        };
      };
    in self.defaultNix // (self.defaultNix.internal.compat { inherit (pkgs) system; });

    iohkNix = import (pkgs.fetchzip {
      url = "https://github.com/input-output-hk/iohk-nix/archive/edb2d2df2ebe42bbdf03a0711115cf6213c9d366.tar.gz";
      hash = "sha256-wveDdPsgB/3nAGAdFaxrcgLEpdi0aJ5kEVNtI+YqVfo=";
    }) {};

    cardanoPkgs = pkgs.fetchzip {
      url = "https://github.com/input-output-hk/cardano-haskell-packages/archive/316e0a626fed1a928e659c7fc2577c7773770f7f.tar.gz";
      hash = "sha256-RCd29xb0ZDZj5u9v9+dykv6nWs6pcEBsAyChm9Ut3To=";
    };
  };

  ogmios = (import ogmiosSrc (ogmiosInputs // {
    inherit (pkgs) system;
    nixpkgsArgs = { inherit (pkgs) system; };
  })).platform.amd64;

  cardano-js-sdk = inputs.cardano-js-sdk.packages.${pkgs.system}.default;

  cardano-node = inputs.cardano-node.packages.${pkgs.system}.cardano-node;

  # ----------------------------------------------------------------------------- #

  lace-blockchain-services-exe = pkgs.buildGoModule rec {
    name = "lace-blockchain-services";
    src = ./lace-blockchain-services;
    vendorHash = "sha256-1iyb+4faqZAo6IZf7PYx3Dg+H2IULzhBW80c5loXBPw=";
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
      go-bindata -pkg main -o assets.go cardano.png
    '';
  };

  lace-blockchain-services = pkgs.runCommand "lace-blockchain-services" {
    meta.mainProgram = lace-blockchain-services-exe.name;
  } ''
    mkdir -p $out/bin $out/libexec $out/share/lace-blockchain-services
    cp ${lace-blockchain-services-exe}/bin/* $out/bin/
    ln -s ${cardano-node}/bin/* $out/libexec/
    ln -s ${ogmios}/bin/* $out/libexec/
    ln -s ${cardano-js-sdk.nodejs}/bin/node $out/libexec
    ln -s ${pkgs.xclip}/bin/xclip $out/libexec

    mkdir -p $out/share
    ln -s ${cardano-js-sdk}/libexec/source $out/share/cardano-js-sdk
    ln -s ${pkgs.xkeyboard_config}/share/X11/xkb $out/share/xkb
    ln -s ${common.networkConfigs} $out/share/cardano-node-config
  '';

  nix-bundle-exe = pkgs.fetchFromGitHub {
    owner = "3noch";
    repo = "nix-bundle-exe";
    rev = "3522ae68aa4188f4366ed96b41a5881d6a88af97"; # 2023-05-01T13:59:27Z
    hash = "sha256-K9PT8LVvTLOm3gX9ZFxag0X85DFgB2vvJB+S12disWw=";
  };

  # XXX: this has no dependency on /nix/store on the target machine
  lace-blockchain-services-bundle = let
    unbundled = lace-blockchain-services;
    bundled = (import nix-bundle-exe {
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
    target=$out/lace-blockchain-services-${revShort}-x86_64-linux.bin
    cat $scriptPath >$target
    echo 'Compressing (xz)...'
    tar -cJ -C ${lace-blockchain-services-bundle} . >>$target
    chmod +x $target

    # Make it downloadable from Hydra:
    mkdir -p $out/nix-support
    echo "file binary-dist \"$(echo $out/*.bin)\"" >$out/nix-support/hydra-build-products
  '';

}
