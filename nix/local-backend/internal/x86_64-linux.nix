{
  inputs,
  cell,
}:
assert inputs.nixpkgs.system == "x86_64-linux"; let
  pkgs = inputs.nixpkgs;
in {
  package = throw "unimplemented";

  installer = throw "unimplemented";
}
