{ inputs, targetSystem }:

assert targetSystem == "x86_64-windows";

let
  pkgs = inputs.nixpkgs.legacyPackages.x86_64-linux; # cross-building for Windows on Linux
in rec {
  package = pkgs.runCommand "unimplemented" {} "echo unimplemented && exit 1";
  installer = package;
}
