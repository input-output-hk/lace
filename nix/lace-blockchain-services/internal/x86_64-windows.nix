{ inputs, targetSystem }:

assert targetSystem == "x86_64-windows";

let
  pkgs = inputs.nixpkgs.legacyPackages.x86_64-linux; # cross-building for Windows on Linux
  inherit (pkgs) lib;
in rec {
  common = import ./common.nix { inherit inputs targetSystem; };
  package = lace-blockchain-services;
  installer = lace-blockchain-services-zip;
  inherit (common) cardano-node ogmios;

  # XXX: we have to be a bit creative to cross-compile Go code for Windows:
  #   • having a MinGW-w64 stdenv (for the C/C++ parts),
  #   • Linux Go (but instructed to cross-compile),
  #   • and taking go-modules (vendor) from the Linux derivation – these are only sources
  lace-blockchain-services-exe = let
    go = pkgs.go;
    go-modules = inputs.self.internal.lace-blockchain-services.x86_64-linux.lace-blockchain-services-exe.go-modules;
  in pkgs.pkgsCross.mingwW64.stdenv.mkDerivation {
    name = "lace-blockchain-services";
    src = ./lace-blockchain-services;
    GOPROXY = "off";
    GOSUMDB = "off";
    GO111MODULE = "on";
    GOFLAGS = ["-mod=vendor" "-trimpath"];
    GOOS = "windows";
    GOARCH = "amd64";
    inherit (go) CGO_ENABLED;
    nativeBuildInputs = [ go ] ++ (with pkgs; [ go-bindata imagemagick ]);
    configurePhase = ''
      export GOCACHE=$TMPDIR/go-cache
      export GOPATH="$TMPDIR/go"
      rm -rf vendor
      cp -r --reflink=auto ${go-modules} vendor
    '';
    buildPhase = ''
      cp ${icon} tray-icon
      go-bindata -pkg main -o assets.go tray-icon
      go build
    '';
    installPhase = ''
      mkdir -p $out
      mv lace-blockchain-services.exe $out/
    '';
    passthru = { inherit go go-modules; };
  };

  svg2ico = source: let
    sizes = [16 24 32 48 64 128 256 512];
    d2s = d: "${toString d}x${toString d}";
  in pkgs.runCommand "${baseNameOf source}.ico" {
    buildInputs = with pkgs; [ imagemagick ];
  } ''
    ${lib.concatMapStringsSep "\n" (dim: ''
      convert -background none -size ${d2s dim} ${source} ${d2s dim}.png
    '') sizes}
    convert ${lib.concatMapStringsSep " " (dim: "${d2s dim}.png") sizes} $out
  '';

  icon = svg2ico ./lace-blockchain-services/cardano.svg;

  go-rsrc = pkgs.buildGoModule rec {
    pname = "go-rsrc";
    version = "0.10.2";
    src = pkgs.fetchFromGitHub {
      owner = "akavel"; repo = pname;
      rev = "v${version}";
      hash = "sha256-QsPx3RYA2uc+qIN2LKRCvumeMedg0kIEuUOkaRvuLbs=";
    };
    vendorHash = null;
  };

  go-winres = pkgs.buildGoModule rec {
    pname = "go-winres";
    version = "0.3.1";
    src = pkgs.fetchFromGitHub {
      owner = "tc-hib"; repo = pname;
      rev = "v${version}";
      hash = "sha256-D/B5ZJkCutrVeIdgqnalgfNAPiIUDGy+sRi3bYfdBS8=";
    };
    vendorHash = "sha256-ntLgiD4CS1QtWTYbrsEraqndtWYOFqmwgQnSBhF1xuE=";
    doCheck = false;
  };

  lace-blockchain-services = pkgs.runCommand "lace-blockchain-services" {} ''
    mkdir -p $out/libexec
    cp -Lr ${lace-blockchain-services-exe}/* $out/
    cp -L ${ogmios}/bin/*.{exe,dll} $out/libexec/
    cp -Lf ${cardano-node}/bin/*.{exe,dll} $out/libexec/
    cp -Lr ${common.networkConfigs} $out/cardano-node-config
  '';

  # For easier testing, skipping the installer (for now):
  lace-blockchain-services-zip = let
    revShort =
      if inputs.self ? shortRev
      then builtins.substring 0 9 inputs.self.rev
      else "dirty";
  in pkgs.runCommand "lace-blockchain-services.zip" {} ''
    mkdir -p $out
    target=$out/lace-blockchain-services-${revShort}-${targetSystem}.zip

    ln -s ${lace-blockchain-services} lace-blockchain-services
    ${with pkgs; lib.getExe zip} -q -r $target lace-blockchain-services

    # Make it downloadable from Hydra:
    mkdir -p $out/nix-support
    echo "file binary-dist \"$target\"" >$out/nix-support/hydra-build-products
  '';

  # -------------------------------------- cardano-js-sdk ------------------------------------------ #

  # XXX: the main challenge here is that we must cross-build *.node
  # DLLs from Linux to Windows, and it can only be done with Visual
  # Studio running in Wine (Node.js doesn’t support MinGW-w64)
  #
  # See also: similar approach in Daedalus: <https://github.com/input-output-hk/daedalus/blob/94ffe045dea35fd8d638bc466f9eb61e51d4e935/nix/internal/x86_64-windows.nix#L205>
  cardano-js-sdk = rec {
    theirPackage = inputs.cardano-js-sdk.packages.x86_64-linux.default;

    # Let’s grab the build-time `node_modules` of the Linux build, and
    # we’ll call specific "install" scripts manually inside Wine.
    #
    # One improvement would be to skip building the Linux binaries altogether here.
    theirNodeModules = theirPackage.overrideAttrs (drv: {
      name = "cardano-js-sdk-node_modules";
      buildPhase = ":";
      installPhase = ''
        # Clear the Linux binaries:
        find -type f '(' -name '*.node' -o -name '*.o' -o -name '*.o.d' -o -name '*.target.mk' \
          -o -name '*.Makefile' -o -name 'Makefile' -o -name 'config.gypi' ')' -exec rm -vf '{}' ';'

        mkdir $out
        ${with pkgs; lib.getExe rsync} -Rah \
          $(find -type d -name 'node_modules' -prune) \
          $(find -type f '(' -name 'package.json' -o -name 'yarn.lock' ')' -a -not -path '*/node_modules/*') \
          $out/
      '';
      dontFixup = true;
    });

    # XXX: `pkgs.nodejs` lacks `uv/win.h`, `node.lib` etc., so:
    nodejsHeaders = pkgs.runCommand "nodejs-headers-${theirPackage.nodejs.version}" rec {
      version = theirPackage.nodejs.version;
      src = pkgs.fetchurl {
        url = "https://nodejs.org/dist/v${version}/node-v${version}-headers.tar.gz";
        hash = "sha256-4LCiKSF5q4VTV876cE95fXhTtWny1mu3wxPdXLNuBjs=";
      };
      # XXX: normally, node-gyp would download it only for Windows, see `resolveLibUrl()`
      # in `node-gyp/lib/process-release.js`
      node_lib = pkgs.fetchurl {
        url = "https://nodejs.org/dist/v${version}/win-x64/node.lib";
        hash = "sha256-Orh+nCfi1Jhp/RXHhBwWdK9Wyb468WcsFzYhozAPDg0=";
      };
    } ''
      mkdir unpack
      tar -C unpack -xf $src
      mv unpack/* $out
      mkdir -p $out/Release
      ln -s $node_lib $out/Release/node.lib
    '';

    nativeModules = pkgs.stdenv.mkDerivation {
      name = "cardano-js-sdk-nativeModules";
      dontUnpack = true;
      nativeBuildInputs = (with pkgs; [ jq file procps ])
        ++ (with fresherPkgs; [ wineWowPackages.stableFull fontconfig winetricks samba /*samba for bin/ntlm_auth*/ ])
        ;
      configurePhase = ''
        # XXX: `HOME` (for various caches) shouldn’t be under our source root, that confuses some Node.js tools:
        export HOME=$(realpath $NIX_BUILD_TOP/home)
        mkdir -p $HOME

        cp -R ${theirNodeModules}/. ./
        chmod -R +w .
      '';
      FONTCONFIG_FILE = fresherPkgs.makeFontsCache {
        fontDirectories = with fresherPkgs; [
          dejavu_fonts freefont_ttf gyre-fonts liberation_ttf noto-fonts-emoji
          unifont winePackages.fonts xorg.fontcursormisc xorg.fontmiscmisc
        ];
      };
      buildPhase = let
        mkSection = title: ''
          echo ' '
          echo ' '
          echo ' '
          echo ' '
          echo ' '
          echo "===================== ${title} ====================="
        '';
      in ''
        ${pkgs.xvfb-run}/bin/xvfb-run \
          --server-args="-screen 0 1920x1080x24 +extension GLX +extension RENDER -ac -noreset" \
          ${pkgs.writeShellScript "wine-setup-inside-xvfb" ''
            set -euo pipefail

            ${mkSection "Setting Windows system version"}
            winetricks -q win81

            ${mkSection "Setting up env and symlinks in standard locations"}

            # Symlink Windows SDK in a standard location:
            lx_program_files="$HOME/.wine/drive_c/Program Files (x86)"
            mkdir -p "$lx_program_files"
            ln -svf ${msvc-installed}/kits "$lx_program_files/Windows Kits"

            # Symlink VC in a standard location:
            vc_versionYear="$(jq -r .info.productLineVersion <${msvc-cache}/*.manifest)"
            lx_VSINSTALLDIR="$lx_program_files/Microsoft Visual Studio/$vc_versionYear/Community"
            mkdir -p "$lx_VSINSTALLDIR"
            ln -svf ${msvc-installed}/VC "$lx_VSINSTALLDIR"/
            ln -svf ${msvc-installed}/MSBuild "$lx_VSINSTALLDIR"/

            export VCINSTALLDIR="$(winepath -w "$lx_VSINSTALLDIR/VC")\\"
            export VCToolsVersion="$(ls ${msvc-installed}/VC/Tools/MSVC | head -n1)"
            export VCToolsInstallDir="$(winepath -w "$lx_VSINSTALLDIR/VC/Tools/MSVC/$VCToolsVersion")\\"
            export VCToolsRedistDir="$(winepath -w "$lx_VSINSTALLDIR/VC/Redist/MSVC/$VCToolsVersion")\\"

            export ClearDevCommandPromptEnvVars=false

            export VSINSTALLDIR="$(winepath -w "$lx_VSINSTALLDIR")\\"

            lx_WindowsSdkDir=("$lx_program_files/Windows Kits"/*)
            export WindowsSdkDir="$(winepath -w "$lx_WindowsSdkDir")\\"

            set -x

            # XXX: this can break, as `v10.0` is not determined programmatically;
            # XXX: the path is taken from `${msvc-installed}/MSBuild/Microsoft/VC/v160/Microsoft.Cpp.WindowsSDK.props`
            wine reg ADD 'HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Microsoft SDKs\Windows\v10.0' \
              /v 'InstallationFolder' /t 'REG_SZ' /d "$WindowsSdkDir" /f

            # XXX: This path is taken from `${msvc-installed}/unpack/Common7/Tools/vsdevcmd/core/winsdk.bat`
            wine reg ADD 'HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows Kits\Installed Roots' \
              /v 'KitsRoot10' /t 'REG_SZ' /d "$WindowsSdkDir" /f

            set +x

            ${mkSection "Preparing the ‘info’ structure"}
            jq --null-input \
              --arg msBuild      "$(winepath -w "$lx_VSINSTALLDIR/MSBuild/Current/Bin/MSBuild.exe")" \
              --arg path         "$VCINSTALLDIR" \
              --arg sdk          "$(ls ${msvc-installed}/kits/10/Include | head -n1)" \
              --arg toolset      "$(ls "$lx_VSINSTALLDIR/VC/Redist/MSVC" | grep -E '^v[0-9]+$')" \
              --arg version      "$(jq -r .info.productDisplayVersion <${msvc-cache}/*.manifest)" \
              --arg versionMajor "$(jq -r .info.productDisplayVersion <${msvc-cache}/*.manifest | cut -d. -f1)" \
              --arg versionMinor "$(jq -r .info.productDisplayVersion <${msvc-cache}/*.manifest | cut -d. -f2)" \
              --arg versionYear  "$(jq -r .info.productLineVersion    <${msvc-cache}/*.manifest)" \
              '{$msBuild,$path,$sdk,$toolset,$version,$versionMajor,$versionMinor,$versionYear}' \
              > vs-info.json

            ${mkSection "Stubbing all **/node-gyp/lib/find-visualstudio.js"}
            (
              cat <<<${pkgs.lib.escapeShellArg ''
                'use strict'
                function findVisualStudio (nodeSemver, configMsvsVersion, callback) {
                  process.nextTick(() => callback(null,
              ''}
              cat vs-info.json
              cat <<<${pkgs.lib.escapeShellArg ''
                  ));
                }
                module.exports = findVisualStudio
              ''}
            ) >our-find-visualstudio.js
            cat our-find-visualstudio.js
            echo ' '
            find -path '*/node-gyp/lib/find-visualstudio.js' | while IFS= read -r toPatch ; do
              cp -v our-find-visualstudio.js "$toPatch"
            done

            ${mkSection "Setting WINEPATH"}
            export WINEPATH="$(winepath -w ${target.python})"

            ${mkSection "Removing all symlinks to /nix/store (mostly python3)"}
            find node_modules -type l >all-symlinks.lst
            paste all-symlinks.lst <(xargs <all-symlinks.lst readlink) | grep -F /nix/store | cut -f1 | xargs rm -v
            rm all-symlinks.lst

            ${mkSection "Finally, building native modules"}

            # We can’t add the whole ${target.nodejs} to WINEPATH, or it will use their npm.cmd, so:
            ln -s ${target.nodejs}/node.exe node_modules/.bin/

            # Simplify some BAT/.cmd wrappers, the upstream ones assume too much:
            ${let
              batWrappers = {
                "npm"            = "npm/bin/npm-cli.js";
                "node-gyp-build" = "node-gyp-build/bin.js";
                "node-gyp"       = "node-gyp/bin/node-gyp.js";
              };
            in lib.concatStringsSep "\n" (lib.mapAttrsToList (cmd: target: ''
              echo "node.exe \"$(winepath -w node_modules/${target})\" %*" >node_modules/.bin/${cmd}.cmd
            '') batWrappers)}

            # Make it use our node.exe and npm.cmd, etc.:
            export WINEPATH="$(winepath -w node_modules/.bin);$WINEPATH"

            # Tell node-gyp to use the provided Node.js headers for native code builds.
            export npm_config_nodedir="$(winepath -w ${nodejsHeaders})"
            export npm_config_build_from_source=true

            # Make it use our node_modules:
            export NODE_PATH="$(winepath -w ./node_modules)"

            find -type f -name package.json | xargs grep -RF '"install":' | cut -d: -f1 | while IFS= read -r package
            do
              ${mkSection "Running the install script of ‘$package’"}

              # XXX: we have to do that, so that Node.js sets environment properly:
              windowsScriptName="windows-$(sha256sum <<<"$package" | cut -d' ' -f1)"

              jq \
                --arg key "$windowsScriptName" \
                --arg val "cd \"$(winepath -w "$(dirname "$package")")\" && npm run install" \
                '.scripts[$key] = $val' package.json >package.json.new
              mv package.json.new package.json

              wine npm.cmd run "$windowsScriptName"
            done

            # Packages that have a binding.gyp but don’t have an "install" script in their package.json
            # – a weird bunch, but we still have to build them…
            find -name 'binding.gyp' | xargs -n1 dirname | sort | grep -vE --file <(find -type f -name package.json | xargs grep -RF '"install":' | cut -d: -f1 | sort | xargs -n1 dirname | sed -r 's/[]\/$*.^|[]/\\&/g; s/^/^/g') | while IFS= read -r package
            do
              ${mkSection "Running the binding.gyp of ‘$package’"}
              (
                cd "$package"
                wine node-gyp.cmd rebuild
              )
            done
          ''}
      '';
      installPhase = ''
        find -type f -name '*.node' | xargs ${with pkgs; lib.getExe file}

        mkdir $out
        ${with pkgs; lib.getExe rsync} -Rah \
          $(find -type f -name '*.node') \
          $out/
      '';
    };

    target = rec {
      nodejs = pkgs.fetchzip {
        url = "https://nodejs.org/dist/v${theirPackage.nodejs.version}/node-v${theirPackage.nodejs.version}-win-x64.zip";
        hash = "sha256-lLE7yiyN/qOjrA9As3it3HN1VSbQgQlTTYUtMcQ2Xsk=";
      };

      python = pkgs.fetchzip {
        url = "https://www.python.org/ftp/python/3.10.11/python-3.10.11-embed-amd64.zip";
        hash = "sha256-p83yidrRg5Rz1vQpyRuZCb5F+s3ddgHt+JakPjgFgUc=";
        stripRoot = false;
      };
    };

    fresherPkgs = import (pkgs.fetchFromGitHub {
      owner = "NixOS"; repo = "nixpkgs";
      rev = "17a689596b72d1906883484838eb1aaf51ab8001"; # nixos-unstable on 2023-05-15T08:29:41Z
      hash = "sha256-YPLMeYE+UzxxP0qbkBzv3RBDvyGR5I4d7v2n8dI3+fY=";
    }) { inherit (pkgs) system; };

    msvc-wine = pkgs.stdenv.mkDerivation {
      name = "msvc-wine";
      src = pkgs.fetchFromGitHub {
        owner = "mstorsjo";
        repo = "msvc-wine";
        rev = "c4fd83d53689f30ae6cfd8e9ef1ea01712907b59";  # 2023-05-09T21:52:05Z
        hash = "sha256-hA11dIOIL9sta+rwGb2EwWrEkRm6nvczpGmLZtr3nHI=";
      };
      buildInputs = [
        (pkgs.python3.withPackages (ps: with ps; [ six ]))
      ];
      configurePhase = ":";
      buildPhase = ":";
      installPhase = ''
        sed -r 's,msiextract,${pkgs.msitools}/bin/\0,g' -i vsdownload.py
        mkdir -p $out/libexec
        cp -r . $out/libexec/.
      '';
    };

    msvc-cache = let
      version = "16";   # There doesn’t seem to be an easy way to specify a more stable full version, 16.11.26
    in pkgs.stdenv.mkDerivation {
      name = "msvc-cache-${version}";
      inherit version;
      outputHashMode = "recursive";
      outputHashAlgo = "sha256";
      outputHash = "sha256-7+vNhYbrizqhoIDL6vN7vE+Gq2duoYW5adMgOpJgw2w=";
      buildInputs = [];
      dontUnpack = true;
      dontConfigure = true;
      NIX_SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
      buildPhase = ''
        mkdir -p $out
        ${msvc-wine}/libexec/vsdownload.py --accept-license --major ${version} \
          --save-manifest \
          --only-download --cache $out --dest ./
        cp -v *.manifest $out/.
      '';
      dontInstall = true;
    };

    msvc-installed = pkgs.stdenv.mkDerivation {
      name = "msvc-installed-${msvc-cache.version}";
      inherit (msvc-cache) version;
      dontUnpack = true;
      dontConfigure = true;
      buildPhase = ''
        mkdir -p $out
        ${msvc-wine}/libexec/vsdownload.py --accept-license --major ${msvc-cache.version} \
          --manifest ${msvc-cache}/*.manifest \
          --keep-unpack --cache ${msvc-cache} --dest $out/
        mv $out/unpack/MSBuild $out/
      '';
      dontInstall = true;
    };
  };

}
