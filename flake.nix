{

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";

    cardano-node = {
      url = "github:input-output-hk/cardano-node/1.35.4";
      inputs = {
        cardano-node-workbench.follows = "";
        node-measured.follows = "";
        node-snapshot.follows = "";
        node-process.follows = "";
      };
    };

    cardano-js-sdk.url = "github:input-output-hk/cardano-js-sdk/693689d3f457799c674bed51878a7078b7ddbd0e";

    cardano-world.url = "github:input-output-hk/cardano-world/666ed9a3041768d785bd52487a0ed85b4538c69e";
    cardano-world.flake = false; # otherwise, +19k `divnix/std` dependencies in flake.lock

    # XXX: when updating Ogmios, make sure to update ogmios-CHaP below to the one they use:
    ogmios.url = "github:CardanoSolutions/ogmios/v5.6.0";
    ogmios.flake = false;
    ogmios-CHaP.url = "github:input-output-hk/cardano-haskell-packages/316e0a626fed1a928e659c7fc2577c7773770f7f";
    ogmios-CHaP.flake = false;

    mithril.url = "github:input-output-hk/mithril/2418.1";

    nix-bundle-exe.url = "github:3noch/nix-bundle-exe";
    nix-bundle-exe.flake = false;

    # FIXME: ‘nsis’ can’t cross-compile with the regular Nixpkgs (above)
    nixpkgs-nsis.url = "github:input-output-hk/nixpkgs/be445a9074f139d63e704fa82610d25456562c3d";
    nixpkgs-nsis.flake = false; # too old
  };

  outputs = inputs: let
    supportedSystem = ["x86_64-linux" "x86_64-darwin" "aarch64-darwin"];
    inherit (inputs.nixpkgs) lib;
  in {
    packages = lib.genAttrs supportedSystem (buildSystem:
      import ./nix/lace-blockchain-services/packages.nix { inherit inputs buildSystem; }
    );

    internal = {
      lace-blockchain-services = import ./nix/lace-blockchain-services/internal.nix { inherit inputs; };
    };

    hydraJobs = {
      lace-blockchain-services-installer = {
        x86_64-linux   = inputs.self.packages.x86_64-linux.lace-blockchain-services-installer;
        x86_64-darwin  = inputs.self.packages.x86_64-darwin.lace-blockchain-services-installer;
        aarch64-darwin  = inputs.self.packages.aarch64-darwin.lace-blockchain-services-installer;
        x86_64-windows = inputs.self.packages.x86_64-linux.lace-blockchain-services-installer-x86_64-windows;
      };

      required = inputs.nixpkgs.legacyPackages.x86_64-linux.releaseTools.aggregate {
        name = "github-required";
        meta.description = "All jobs required to pass CI";
        constituents = __attrValues inputs.self.hydraJobs.lace-blockchain-services-installer;
      };
    };
  };

}
