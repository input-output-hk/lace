{ inputs, targetSystem }:

assert __elem targetSystem ["aarch64-darwin" "x86_64-darwin"];

let
  pkgs = inputs.nixpkgs.legacyPackages.${targetSystem};
in rec {
  package = pkgs.runCommand "unimplemented" {} "echo unimplemented && exit 1";
  installer = package;
}
