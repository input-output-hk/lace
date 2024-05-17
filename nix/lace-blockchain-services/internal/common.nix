{ inputs, targetSystem }:

let
  buildSystem = if targetSystem == "x86_64-windows" then "x86_64-linux" else targetSystem;
  pkgs = inputs.nixpkgs.legacyPackages.${buildSystem};
  inherit (pkgs) lib;
in rec {

  flake-compat = import inputs.cardano-node.inputs.flake-compat;

  prettyName = "Lace Blockchain Services";

  laceVersion = (builtins.fromJSON (builtins.readFile ../../../apps/browser-extension-wallet/package.json)).version;

  # These are configs of ‘cardano-node’ for all networks we make available from the UI.
  # The patching of the official networks needs to happen to:
  #   • turn off ‘EnableP2P’ (and modify topology accordingly), because it doesn’t work on Windows,
  #   • and turn off ‘hadPrometheus’, because it makes cardano-node hang on Windows during graceful exit.
  networkConfigs = let
    selectedNetworks = [ "mainnet" "preprod" "preview" ];
  in pkgs.runCommand "network-configs" {
    nativeBuildInputs = [ pkgs.jq ];
  } ((lib.concatMapStringsSep "\n" (network: ''
    mkdir -p $out/${network}
    cp -r ${inputs.cardano-js-sdk}/packages/cardano-services/config/network/${network}/. $out/${network}
  '') selectedNetworks) + (lib.optionalString (targetSystem == "x86_64-windows") ''
    # Transform P2P topologies to non-P2P (or else, on Windows, we’d require C:\etc\resolv.conf)
    chmod -R +w $out
    find $out -type f -name 'topology.*' | while IFS= read -r file ; do
      addr=$(jq -er '.PublicRoots[0].publicRoots.accessPoints[0].address' "$file") || continue
      port=$(jq -er '.PublicRoots[0].publicRoots.accessPoints[0].port'    "$file") || continue
      jq --arg addr "$addr" --argjson port "$port" --null-input \
        '.Producers = [.addr = $addr | .port = $port | .valency = 1]' > tmp.json
      mv tmp.json "$file"
    done
    find $out -type f -name 'config.*' | while IFS= read -r file ; do
      if [ "$(jq .EnableP2P "$file")" == "true" ] ; then
        jq '.EnableP2P = false' "$file" >tmp.json
        mv tmp.json "$file"
      fi

      # With '.hasPrometheus', cardano-node hangs during graceful exit on Windows:
      jq 'del(.hasPrometheus)' "$file" >tmp.json
      mv tmp.json "$file"
    done
  ''));

  # XXX: they don’t enable aarch64-darwin builds yet:
  cardanoNodeFlake = if targetSystem != "aarch64-darwin" then inputs.cardano-node else let
    self = flake-compat {
      src = {
        outPath = toString (pkgs.runCommand "cardano-node-patched" {} ''
          cp -r ${inputs.cardano-node} $out
          chmod -R +w $out
          echo '[ "x86_64-linux" "x86_64-darwin" "aarch64-darwin" ]' >$out/nix/supported-systems.nix
        '');
        inherit (inputs.cardano-node.sourceInfo) rev shortRev lastModified lastModifiedDate;
      };
    };
  in self.defaultNix;

  inherit (cardanoNodeFlake.legacyPackages.${buildSystem}) haskell-nix;

  ogmiosCompiler = "ghc8107";

  ogmiosPatched = {
    outPath = toString (pkgs.runCommand "ogmios-patched" {} ''
      cp -r ${inputs.ogmios} $out
      chmod -R +w $out
      cd $out
      patch -p1 -i ${./ogmios--on-windows.patch}
    '');
    inherit (inputs.ogmios.sourceInfo) rev shortRev lastModified lastModifiedDate;
  };

  ogmiosProject = let
    theirDefaultNix = __readFile "${inputs.ogmios}/default.nix";
  in
    # XXX: make sure we're taking the correct CHaP revision & GHC that Ogmios builds against:
    assert lib.hasInfix inputs.ogmios-CHaP.rev theirDefaultNix;
    assert lib.hasInfix ogmiosCompiler theirDefaultNix;
    haskell-nix.project {
      compiler-nix-name = ogmiosCompiler;
      projectFileName = "cabal.project";
      inputMap = { "https://input-output-hk.github.io/cardano-haskell-packages" = inputs.ogmios-CHaP; };
      src = haskell-nix.haskellLib.cleanSourceWith {
        name = "ogmios-src";
        src = ogmiosPatched;
        subDir = "server";
        filter = path: type: builtins.all (x: x) [
          (baseNameOf path != "package.yaml")
        ];
      };
    };

  ogmios = {
    x86_64-linux = ogmiosProject.projectCross.musl64.hsPkgs.ogmios.components.exes.ogmios;
    x86_64-windows = ogmiosProject.projectCross.mingwW64.hsPkgs.ogmios.components.exes.ogmios;
    x86_64-darwin = ogmiosProject.hsPkgs.ogmios.components.exes.ogmios;
    aarch64-darwin = ogmiosProject.hsPkgs.ogmios.components.exes.ogmios;
  }.${targetSystem};

  cardano-node = {
    x86_64-linux = cardanoNodeFlake.hydraJobs.linux.musl.cardano-node;
    x86_64-windows = cardanoNodeFlake.hydraJobs.linux.windows.cardano-node;
    x86_64-darwin = cardanoNodeFlake.packages.x86_64-darwin.cardano-node;
    aarch64-darwin = cardanoNodeFlake.packages.aarch64-darwin.cardano-node;
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

  lace-blockchain-services-exe-vendorHash = "sha256-A1SGcW3+a5jTVMu2H2blEhnvlBD8S+zm61GriF47B0A=";

  constants = pkgs.writeText "constants.go" ''
    package constants

    const (
      LaceBlockchainServicesVersion = ${__toJSON laceVersion}
      LaceBlockchainServicesRevision = ${__toJSON (inputs.self.rev or "dirty")}
      CardanoNodeVersion = ${__toJSON cardano-node.version}
      CardanoNodeRevision = ${__toJSON inputs.cardano-node.sourceInfo.rev}
      OgmiosVersion = ${__toJSON ogmios.version}
      OgmiosRevision = ${__toJSON inputs.ogmios.rev}
      PostgresVersion = ${__toJSON postgresPackage.version}
      PostgresRevision = ${__toJSON postgresPackage.version}
      ProviderServerVersion = ${__toJSON ((__fromJSON (__readFile (inputs.cardano-js-sdk + "/packages/cardano-services/package.json"))).version)}
      ProviderServerRevision = ${__toJSON inputs.cardano-js-sdk.rev}
      CardanoJsSdkBuildInfo = ${__toJSON (let self = inputs.cardano-js-sdk; in builtins.toJSON {
        inherit (self) lastModified lastModifiedDate rev;
        shortRev = self.shortRev or "no rev";
        extra = {
          inherit (self) narHash;
          sourceInfo = self;
          path = self.outPath;
        };
      })}
      MithrilClientRevision = ${__toJSON inputs.mithril.sourceInfo.rev}
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
    vacuum lint --details ${./lace-blockchain-services/openapi.json}

    jq --sort-keys\
      --arg title ${lib.escapeShellArg "${prettyName} API"} \
      '.info.title = $title' \
      ${./lace-blockchain-services/openapi.json} >$out
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
    ver = (__fromJSON (__readFile (inputs.self + "/flake.lock"))).nodes.mithril.original.ref;
  in {
    x86_64-linux = pkgs.fetchzip {
      name = "mithril-${ver}-linux-x64.tar.gz";
      url = "https://github.com/input-output-hk/mithril/releases/download/${ver}/mithril-${ver}-linux-x64.tar.gz";
      hash = "sha256-BvKBZWEd9b+hCfNyEKr0SVivUDK5lGxZhwLJuSlHCpY=";
      stripRoot = false;
    };
    x86_64-windows = pkgs.fetchzip {
      name = "mithril-${ver}-windows-x64.tar.gz";
      url = "https://github.com/input-output-hk/mithril/releases/download/${ver}/mithril-${ver}-windows-x64.tar.gz";
      hash = "sha256-3/KZSxK46Akeno5VUHC0ZX9EZa5vLuMbAdCq7gy1oRw=";
      stripRoot = false;
    };
    x86_64-darwin = pkgs.fetchzip {
      name = "mithril-${ver}-macos-x64.tar.gz";
      url = "https://github.com/input-output-hk/mithril/releases/download/${ver}/mithril-${ver}-macos-x64.tar.gz";
      hash = "sha256-5rQEhBjAQHKS86N7uLzjAp9L/w0c0pGwEA2vbN4n8NI=";
      stripRoot = false;
    };
    aarch64-darwin = inputs.mithril.packages.aarch64-darwin.mithril-client-cli;
  }.${targetSystem} // { version = ver; };

}
