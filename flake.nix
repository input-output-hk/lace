{
  description = "Devshell for dapp-store backend microservices";
  inputs.nixpkgs.url = "github:nixos/nixpkgs/cd8d1784506a7c7eb0796772b73437e0b82fad57";
  inputs.flake-parts.url = "github:hercules-ci/flake-parts";
  inputs.dream2nix.url = "github:nix-community/dream2nix";
  inputs.n2c.url = "github:nlewo/nix2container";

  outputs = inputs@{ self, nixpkgs, n2c, flake-parts, dream2nix }:
    flake-parts.lib.mkFlake {inherit inputs;} {
      systems = ["x86_64-linux"];
      imports = [dream2nix.flakeModuleBeta];

      perSystem = {inputs', self', pkgs, config, system, ...}: {

        # define an input for dream2nix to generate outputs for
        dream2nix.inputs."self" = {
          source = inputs.self;
          #projects = ./projects.toml;
          projects = {
            lace = {
              name = "lace";
              relPath = "";
              subsystem = "nodejs";
              translator = "package-lock";
              #translators = [ "package-lock" "package-json"];
              subsystemInfo = {
                workspaces = [ "packages/common" "packages/cardano" "packages/core" "apps/browser-extension-wallet" "packages/e2e-tests" "packages/staking" "packages/ui"];
              };
            };
          };

        };
        packages = config.dream2nix.outputs.self.packages; #
        #devshells = config.dream2nix.outputs.self.devshells;

      };
    };
}
