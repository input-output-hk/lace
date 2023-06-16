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
        # Uncomment once implemented:
        # x86_64-windows = inputs.self.packages.x86_64-linux.lace-blockchain-services-installer-x86_64-windows;
        # x86_64-darwin  = inputs.self.packages.x86_64-darwin.lace-blockchain-services-installer;
        # aarch64-darwin  = inputs.self.packages.aarch64-darwin.lace-blockchain-services-installer;
      };
    };
  };

}
