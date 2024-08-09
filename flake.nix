{

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";

    flake-compat.url = "github:input-output-hk/flake-compat";
    flake-compat.flake = false;

    cardano-node.url = "github:IntersectMBO/cardano-node/8.9.2";
    cardano-node.flake = false; # prevent lockfile explosion

    cardano-js-sdk.url = "github:input-output-hk/cardano-js-sdk/@cardano-sdk/cardano-services@0.28.14";
    cardano-js-sdk.flake = false; # we patch it & to prevent lockfile explosion

    ogmios.url = "github:CardanoSolutions/ogmios/v6.3.0";
    ogmios.flake = false;

    cardano-node-for-building-ogmios.url = "github:IntersectMBO/cardano-node/8.10.1-pre";
    cardano-node-for-building-ogmios.flake = false;

    mithril.url = "github:input-output-hk/mithril/2423.0";

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
