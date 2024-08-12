{ inputs, targetSystem }:

let
  buildSystem = if targetSystem == "x86_64-windows" then "x86_64-linux" else targetSystem;
  pkgs = inputs.nixpkgs.legacyPackages.${buildSystem};
  inherit (pkgs) lib;
in rec {

  flake-compat = import inputs.flake-compat;

  prettyName = "Blockchain Services";

  laceVersion = (builtins.fromJSON (builtins.readFile ../../../apps/browser-extension-wallet/package.json)).version;

  # These are configs of ‘cardano-node’ for all networks we make available from the UI.
  # The patching of the official networks needs to happen to:
  #   • turn off ‘EnableP2P’ (and modify topology accordingly), because it doesn’t work on Windows,
  #   • and turn off ‘hadPrometheus’, because it makes cardano-node hang on Windows during graceful exit.
  networkConfigs = let
    selectedNetworks = [ "mainnet" "preprod" "preview" ];
  in pkgs.runCommand "network-configs" {
    nativeBuildInputs = [ pkgs.jq ];
  } (lib.concatMapStringsSep "\n" (network: ''
    mkdir -p $out/${network}
    cp -r ${inputs.cardano-js-sdk}/packages/cardano-services/config/network/${network}/. $out/${network}
  '') selectedNetworks);

  cardanoNodeFlake = (flake-compat { src = inputs.cardano-node; }).defaultNix;

  ogmiosPatched = {
    outPath = toString (pkgs.runCommand "ogmios-patched" {} ''
      cp -r ${inputs.ogmios} $out
      chmod -R +w $out
      find $out -name cabal.project.freeze -delete -o -name package.yaml -delete
      grep -RF -- -external-libsodium-vrf $out | cut -d: -f1 | sort --uniq | xargs -n1 -- sed -r s/-external-libsodium-vrf//g -i
      cd $out
      patch -p1 -i ${./ogmios-6-5-0--missing-srp-hash.patch}
      patch -p1 -i ${./ogmios--on-windows.patch}
    '');
    inherit (inputs.ogmios.sourceInfo) rev shortRev lastModified lastModifiedDate;
  };

  inherit (cardanoNodeFlake.project.${buildSystem}.pkgs) haskell-nix;

  ogmiosProject = haskell-nix.project {
    compiler-nix-name = "ghc96";
    projectFileName = "cabal.project";
    inputMap = { "https://input-output-hk.github.io/cardano-haskell-packages" = cardanoNodeFlake.inputs.CHaP; };
    src = ogmiosPatched + "/server";
    modules = [
      ({ config, lib, pkgs, ... }: {
        packages.cardano-crypto-praos.components.library.pkgconfig = lib.mkForce [ [ pkgs.libsodium-vrf ] ];
        packages.cardano-crypto-class.components.library.pkgconfig = lib.mkForce [ ([ pkgs.libsodium-vrf pkgs.secp256k1 ]
          ++ (if pkgs ? libblst then [pkgs.libblst] else [])) ];
        packages.ogmios.components.library.preConfigure = "export GIT_SHA=${inputs.ogmios.rev}";
      })
      ({ lib, pkgs, ...}: lib.mkIf (targetSystem == "x86_64-windows") {
        packages.entropy.package.buildType = lib.mkForce "Simple";
      })
    ];
  };

  ogmios = {
    x86_64-linux = ogmiosProject.projectCross.musl64.hsPkgs.ogmios.components.exes.ogmios;
    x86_64-windows = ogmiosProject.projectCross.mingwW64.hsPkgs.ogmios.components.exes.ogmios;
    x86_64-darwin = ogmiosProject.hsPkgs.ogmios.components.exes.ogmios;
    aarch64-darwin = ogmiosProject.hsPkgs.ogmios.components.exes.ogmios;
  }.${targetSystem};

  cardano-node = {
    x86_64-linux = cardanoNodeFlake.hydraJobs.x86_64-linux.musl.cardano-node;
    x86_64-windows = cardanoNodeFlake.hydraJobs.x86_64-linux.windows.cardano-node;
    x86_64-darwin = cardanoNodeFlake.packages.x86_64-darwin.cardano-node;
    aarch64-darwin = cardanoNodeFlake.packages.aarch64-darwin.cardano-node;
  }.${targetSystem};

  cardano-submit-api = {
    x86_64-linux = cardanoNodeFlake.hydraJobs.x86_64-linux.musl.cardano-submit-api;
    x86_64-windows = cardanoNodeFlake.hydraJobs.x86_64-linux.windows.cardano-submit-api;
    x86_64-darwin = cardanoNodeFlake.packages.x86_64-darwin.cardano-submit-api;
    aarch64-darwin = cardanoNodeFlake.packages.aarch64-darwin.cardano-submit-api;
  }.${targetSystem};

  postgresPackage = {
    x86_64-linux = pkgs.postgresql_15_jit;
    x86_64-darwin = pkgs.postgresql_15_jit;
    aarch64-darwin = pkgs.postgresql_15_jit;
    x86_64-windows = let
      version = "15.4-1";
    in (pkgs.fetchurl {
      url = "https://get.enterprisedb.com/postgresql/postgresql-${version}-windows-x64.exe";
      hash = "sha256-Su4VKwJkeQ6HqCXTIZIK2c4AJHloqm72BZLs2JCnmN8=";
    }) // { inherit version; };
  }.${targetSystem};

  blockchain-services-exe-vendorHash = "sha256-A1SGcW3+a5jTVMu2H2blEhnvlBD8S+zm61GriF47B0A=";

  constants = pkgs.writeText "constants.go" ''
    package constants

    const (
      BlockchainServicesVersion = ${__toJSON laceVersion}
      BlockchainServicesRevision = ${__toJSON (inputs.self.rev or "dirty")}
      CardanoNodeVersion = ${__toJSON cardanoNodeFlake.project.${buildSystem}.hsPkgs.cardano-node.identifier.version}
      CardanoNodeRevision = ${__toJSON inputs.cardano-node.rev}
      OgmiosVersion = ${__toJSON ogmios.version}
      OgmiosRevision = ${__toJSON inputs.ogmios.rev}
      PostgresVersion = ${__toJSON postgresPackage.version}
      PostgresRevision = ${__toJSON postgresPackage.version}
      CardanoJsSdkVersion = ${__toJSON ((__fromJSON (__readFile (inputs.cardano-js-sdk + "/packages/cardano-services/package.json"))).version)}
      CardanoJsSdkRevision = ${__toJSON inputs.cardano-js-sdk.rev}
      CardanoJsSdkBuildInfo = ${__toJSON (let self = inputs.cardano-js-sdk; in builtins.toJSON {
        inherit (self) lastModified lastModifiedDate rev;
        shortRev = self.shortRev or "no rev";
        extra = {
          inherit (self) narHash;
          sourceInfo = self;
          path = self.outPath;
        };
      })}
      MithrilClientRevision = ${__toJSON inputs.mithril.sourceInfo.rev or "dirty"}
      MithrilClientVersion = ${__toJSON mithril-bin.version}
      MithrilGVKPreview = ${__toJSON mithrilGenesisVerificationKeys.preview}
      MithrilGVKPreprod = ${__toJSON mithrilGenesisVerificationKeys.preprod}
      MithrilGVKMainnet = ${__toJSON mithrilGenesisVerificationKeys.mainnet}
    )
  '';

  swagger-ui = let
    name = "swagger-ui";
    version = "5.2.0";
    src = pkgs.fetchFromGitHub {
      owner = "swagger-api"; repo = name;
      rev = "v${version}";
      hash = "sha256-gF2bUTr181MePC+FJN+BV2KQ7ZEW7sa4Mib7K0sgi4s=";
    };
  in pkgs.runCommand "${name}-${version}" {} ''
    cp -r ${src}/dist $out
    chmod -R +w $out
    sed -r 's|url:.*,|url: window.location.origin + "/openapi.json",|' -i $out/swagger-initializer.js
  '';

  # OpenAPI linter
  vacuum = pkgs.buildGoModule rec {
    pname = "vacuum";
    version = "0.2.6";
    src = pkgs.fetchFromGitHub {
      owner = "daveshanley"; repo = pname;
      rev = "v${version}";
      hash = "sha256-G0NzCqxu1rDrgnOrbDGuOv4Vq9lZJGeNyXzKRBvtf4o=";
    };
    vendorHash = "sha256-5aAnKf/pErRlugyk1/iJMaI4YtY/2Vs8GpB3y8tsjh4=";
    doCheck = false;  # some segfault in OAS 2.0 tests…
  };

  openApiJson = pkgs.runCommand "openapi.json" {
    buildInputs = [ pkgs.jq vacuum ];
  } ''
    vacuum lint --details ${./blockchain-services/openapi.json}

    jq --sort-keys\
      --arg title ${lib.escapeShellArg "${prettyName} API"} \
      '.info.title = $title' \
      ${./blockchain-services/openapi.json} >$out
  '';

  dashboard = pkgs.runCommand "dashboard" {
    buildInputs = with pkgs; [ imagemagick ];
  } ''
    cp -r ${./dashboard} $out
    chmod -R +w $out
    convert -background none -size 32x32 ${./dashboard/favicon.svg} $out/favicon-32x32.png
    convert -background none -size 16x16 ${./dashboard/favicon.svg} $out/favicon-16x16.png
    convert $out/favicon-*.png $out/favicon.ico

    mkdir -p $out/highlight.js
    cp ${pkgs.fetchurl {
      url = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js";
      hash = "sha256-RJn/k21P1WKtylpcvlEtwZ64CULu6GGNr7zrxPeXS9s=";
    }} $out/highlight.js/highlight.min.js
    cp ${pkgs.fetchurl {
      url = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/default.min.css";
      hash = "sha256-+94KwJIdhsNWxBUy5zGciHojvRuP8ABgyrRHJJ8Dx88=";
    }} $out/highlight.js/default.min.css
  '';

  mithrilGenesisVerificationKeys = {
    preview = builtins.readFile (inputs.mithril + "/mithril-infra/configuration/pre-release-preview/genesis.vkey");
    preprod = builtins.readFile (inputs.mithril + "/mithril-infra/configuration/release-preprod/genesis.vkey");
    mainnet = builtins.readFile (inputs.mithril + "/mithril-infra/configuration/release-mainnet/genesis.vkey");
  };

  # FIXME: build from source (Linux, and Darwins are available in their flake.nix, but Windows not)
  mithril-bin = let
    ver = (__fromJSON (__readFile (inputs.self + "/flake.lock"))).nodes.mithril.original.ref or "unknown-ref";
  in {
    x86_64-linux = inputs.mithril.packages.${targetSystem}.mithril-client-cli;
    x86_64-windows = pkgs.fetchurl (
      if ver == "pull/1885/head" then {
        name = "mithril-${ver}-windows-x64.zip";
        url = "https://productionresultssa1.blob.core.windows.net/actions-results/d51b01f8-fa00-4b46-a824-8432f29f3f24/workflow-job-run-2c802917-68c0-5b3f-f64e-4f6eb0b9c055/artifacts/21053eecaedf8df59541c6255e7c6eda59099d752df277452b8703309566104e.zip?rscd=attachment%3B+filename%3D%22mithril-distribution-Windows-X64.zip%22&se=2024-08-12T08%3A57%3A41Z&sig=D45e3rzYnixb%2BKhs3SIAlh%2FP%2FP9uDoW63HU1%2FhH8e0E%3D&ske=2024-08-12T19%3A40%3A06Z&skoid=ca7593d4-ee42-46cd-af88-8b886a2f84eb&sks=b&skt=2024-08-12T07%3A40%3A06Z&sktid=398a6654-997b-47e9-b12b-9515b896b4de&skv=2024-05-04&sp=r&spr=https&sr=b&st=2024-08-12T08%3A47%3A36Z&sv=2024-05-04";
        hash = "sha256-Avz/uuoh7f2K0UuK1fRIrPMCOioH70K7488lisQz63g=";
      } else {
        name = "mithril-${ver}-windows-x64.tar.gz";
        url = "https://github.com/input-output-hk/mithril/releases/download/${ver}/mithril-${ver}-windows-x64.tar.gz";
        hash = "sha256-dnAYZxgl6LfTHPXB8Ss1UR/cLiQwK00iXMd4YihiNSk=";
      }
    );
    x86_64-darwin = inputs.mithril.packages.${targetSystem}.mithril-client-cli;
    aarch64-darwin = inputs.mithril.packages.${targetSystem}.mithril-client-cli;
  }.${targetSystem} // { version = ver; };

}
