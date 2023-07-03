{ inputs, targetSystem }:

assert targetSystem == "x86_64-windows";

let
  pkgs = inputs.nixpkgs.legacyPackages.x86_64-linux; # cross-building for Windows on Linux
  inherit (pkgs) lib;
in rec {
  common = import ./common.nix { inherit inputs targetSystem; };
  package = pkgs.runCommand "unimplemented" {} "echo unimplemented && exit 1";
  installer = package;
  inherit (common) cardano-node ogmios;

  # XXX: we have to be a bit creative to cross-compile Go code for Windows:
  #   • having a MinGW-w64 stdenv (for the C/C++ parts),
  #   • Linux Go (but instructed to cross-compile),
  #   • and taking go-modules (vendor) from the Linux derivation – these are only sources
  lace-blockchain-services-exe = let
    go = pkgs.go;
    go-modules = inputs.self.internal.lace-blockchain-services.x86_64-linux.lace-blockchain-services-exe.go-modules;
  in pkgs.pkgsCross.mingwW64.stdenv.mkDerivation {
    name = "lace-blockchain-services";
    src = ./lace-blockchain-services;
    GOPROXY = "off";
    GOSUMDB = "off";
    GO111MODULE = "on";
    GOFLAGS = ["-mod=vendor" "-trimpath"];
    GOOS = "windows";
    GOARCH = "amd64";
    inherit (go) CGO_ENABLED;
    nativeBuildInputs = [ go ] ++ (with pkgs; [ go-bindata imagemagick ]);
    configurePhase = ''
      export GOCACHE=$TMPDIR/go-cache
      export GOPATH="$TMPDIR/go"
      rm -rf vendor
      cp -r --reflink=auto ${go-modules} vendor
    '';
    buildPhase = ''
      cp ${icon} tray-icon
      go-bindata -pkg main -o assets.go tray-icon
      go build
    '';
    installPhase = ''
      mkdir -p $out
      mv lace-blockchain-services.exe $out/
    '';
    passthru = { inherit go go-modules; };
  };

  svg2ico = source: let
    sizes = [16 24 32 48 64 128 256 512];
    d2s = d: "${toString d}x${toString d}";
  in pkgs.runCommand "${baseNameOf source}.ico" {
    buildInputs = with pkgs; [ imagemagick ];
  } ''
    ${lib.concatMapStringsSep "\n" (dim: ''
      convert -background none -size ${d2s dim} ${source} ${d2s dim}.png
    '') sizes}
    convert ${lib.concatMapStringsSep " " (dim: "${d2s dim}.png") sizes} $out
  '';

  icon = svg2ico ./lace-blockchain-services/cardano.svg;

  go-rsrc = pkgs.buildGoModule rec {
    pname = "go-rsrc";
    version = "0.10.2";
    src = pkgs.fetchFromGitHub {
      owner = "akavel"; repo = pname;
      rev = "v${version}";
      hash = "sha256-QsPx3RYA2uc+qIN2LKRCvumeMedg0kIEuUOkaRvuLbs=";
    };
    vendorHash = null;
  };

  go-winres = pkgs.buildGoModule rec {
    pname = "go-winres";
    version = "0.3.1";
    src = pkgs.fetchFromGitHub {
      owner = "tc-hib"; repo = pname;
      rev = "v${version}";
      hash = "sha256-D/B5ZJkCutrVeIdgqnalgfNAPiIUDGy+sRi3bYfdBS8=";
    };
    vendorHash = "sha256-ntLgiD4CS1QtWTYbrsEraqndtWYOFqmwgQnSBhF1xuE=";
    doCheck = false;
  };

  lace-blockchain-services = pkgs.runCommand "lace-blockchain-services" {} ''
    mkdir -p $out/libexec
    cp -Lr ${lace-blockchain-services-exe}/* $out/
    cp -L ${ogmios}/bin/*.{exe,dll} $out/libexec/
    cp -Lf ${cardano-node}/bin/*.{exe,dll} $out/libexec/
    cp -Lr ${common.networkConfigs} $out/cardano-node-config
  '';

  # For easier testing, skipping the installer:
  lace-blockchain-services-zip = pkgs.runCommand "lace-blockchain-services.zip" {} ''
    mkdir -p $out
    ln -s ${lace-blockchain-services} lace-blockchain-services
    ${with pkgs; lib.getExe zip} -q -r $out/lace-blockchain-services.zip lace-blockchain-services
  '';

}
