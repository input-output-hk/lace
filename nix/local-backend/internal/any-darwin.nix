{
  inputs,
  cell,
}:
assert __elem inputs.nixpkgs.system ["aarch64-darwin" "x86_64-darwin"]; let
  pkgs = inputs.nixpkgs;
in {
  package = throw "unimplemented";

  installer = throw "unimplemented";
}
