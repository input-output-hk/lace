{ inputs, targetSystem }:

let
  buildSystem = if targetSystem == "x86_64-windows" then "x86_64-linux" else targetSystem;
  pkgs = inputs.nixpkgs.legacyPackages.${buildSystem};
  inherit (pkgs) lib;
in rec {

  flake-compat = import inputs.cardano-node.inputs.flake-compat;

  prettyName = "Lace Blockchain Services";

  cardanoWorldFlake = (flake-compat { src = inputs.cardano-world; }).defaultNix;

  networkConfigs = let
    selectedNetworks = [ "mainnet" "preprod" "preview" ];
    website = cardanoWorldFlake.${buildSystem}.cardano.packages.cardano-config-html-internal;
  in pkgs.runCommand "network-configs" {} (lib.concatMapStringsSep "\n" (network: ''
    mkdir -p $out/${network}
    cp -r ${website}/config/${network}/. $out/${network}
  '') selectedNetworks);

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
        src = inputs.ogmios;
        subDir = "server";
        filter = path: type: builtins.all (x: x) [
          (baseNameOf path != "package.yaml")
        ];
      };
    };

  ogmios = {
    x86_64-linux = ogmiosProject.projectCross.musl64.hsPkgs.ogmios.components.exes.ogmios;
    x86_64-windows = throw "unimplemented";
    x86_64-darwin = ogmiosProject.hsPkgs.ogmios.components.exes.ogmios;
    aarch64-darwin = ogmiosProject.hsPkgs.ogmios.components.exes.ogmios;
  }.${targetSystem};

  cardano-node = {
    x86_64-linux = cardanoNodeFlake.hydraJobs.linux.musl.cardano-node;
    x86_64-windows = cardanoNodeFlake.hydraJobs.linux.windows.cardano-node;
    x86_64-darwin = cardanoNodeFlake.packages.x86_64-darwin.cardano-node;
    aarch64-darwin = cardanoNodeFlake.packages.aarch64-darwin.cardano-node;
  }.${targetSystem};

}
