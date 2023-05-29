{
  inputs,
  cell,
}:
if inputs.nixpkgs.system == "x86_64-linux"
then {
  x86_64-linux = import ./internal/x86_64-linux.nix {inherit inputs cell;};
  x86_64-windows = import ./internal/x86_64-windows.nix {inherit inputs cell;};
}
else if inputs.nixpkgs.system == "x86_64-darwin"
then {
  x86_64-darwin = import ./internal/any-darwin.nix {inherit inputs cell;};
}
else if inputs.nixpkgs.system == "aarch64-darwin"
then {
  aarch64-darwin = import ./internal/any-darwin.nix {inherit inputs cell;};
}
else {}
