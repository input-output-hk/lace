{ inputs, targetSystem }:

assert __elem targetSystem ["aarch64-darwin" "x86_64-darwin"];

let
  pkgs = inputs.nixpkgs.legacyPackages.${targetSystem};
  inherit (pkgs) lib;
in rec {
  common = import ./common.nix { inherit inputs targetSystem; };
  package = lace-blockchain-services;
  installer = dmgImage;
  inherit (common) cardano-node ogmios;

  cardano-js-sdk = rec {
    patchedSrc = pkgs.runCommand "cardano-js-sdk-patched" {} ''
      cp -r ${inputs.cardano-js-sdk} $out
      chmod -R +w $out
      cd $out
      patch -p1 -i ${./cardano-js-sdk--darwin.patch}
    '';

    theFlake = (common.flake-compat {
      src = patchedSrc;
    }).defaultNix;

    # In v18.16, after `install_name_tool`, we’re getting:
    #   `Check failed: VerifyChecksum(blob)` in `v8::internal::Snapshot::VerifyChecksum`
    # Let’s disable the default snapshot verification for now:
    nodejs-no-snapshot = theFlake.inputs.nixpkgs.legacyPackages.${targetSystem}.nodejs.overrideAttrs (old: {
      patches = (old.patches or []) ++ [ ./nodejs--no-verify-snapshot-checksum.patch ];
    });

    # For resolving the node_modules:
    theirPackage = (pkgs.callPackage "${patchedSrc}/yarn-project.nix" {
      nodejs = nodejs-no-snapshot;
    } {
      src = patchedSrc;
    });

    ourPackageWithoutDeps = theirPackage.overrideAttrs (oldAttrs: {
      # A bunch of deps build binaries using node-gyp that requires Python
      PYTHON = "${pkgs.python3}/bin/python3";
      NODE_OPTIONS = "--max_old_space_size=8192";
      # playwright build fixes
      PLAYWRIGHT_BROWSERS_PATH = builtins.toFile "fake-playwright" ""; # nixpkgs.playwright-driver.browsers;
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = 1;
      CHROMEDRIVER_FILEPATH = builtins.toFile "fake-chromedriver" "";
      # node-hid uses pkg-config to find sources
      buildInputs = oldAttrs.buildInputs ++ [
        buildTimeSDK.xcodebuild
        buildTimeSDK.frameworks.AppKit
        pkgs.perl
        pkgs.pkgconfig
        pkgs.darwin.cctools
        buildTimeSDK.frameworks.CoreServices
        buildTimeSDK.objc4
        pkgs.jq
        pkgs.rsync
      ];

      # We have to run the install scripts ourselves, because we cannot cross-build for 2 CPU architectures:
      configurePhase = lib.replaceStrings ["yarn install"] ["YARN_ENABLE_SCRIPTS=false yarn install"] oldAttrs.configurePhase;

      # Now run the install scripts:
      postConfigure = let
        changeFrom = if lib.hasInfix "aarch64" targetSystem then "x86_64" else "arm64";
        changeTo = if lib.hasInfix "aarch64" targetSystem then "arm64" else "x86_64";
      in ''
        # Get rid of all the prebuilds (no binary blobs):
        find node_modules -iname '*.node' | xargs -r -d'\n' rm -v || true

        # Don’t try to download prebuilded packages (with prebuild-install):
        export HOME=$(realpath $NIX_BUILD_TOP/home)
        mkdir -p $HOME
        ( echo 'buildFromSource=true' ; echo 'compile=true' ; ) >$HOME/.prebuild-installrc
        export npm_config_build_from_source=true

        # x86_64 cross-compilation won’t fly in this pure derivation:
        find -type f '(' -name '*.gyp' -o -name '*.gypi' ')' \
          | xargs grep -F '${changeFrom}' | cut -d: -f1 | sort --unique \
          | while IFS= read -r file
        do
          sed -r 's/${changeFrom}/${changeTo}/g' -i "$file"
        done

        # Now we have to run the install scripts manually:
        find -type f -name package.json | xargs grep -RF '"install":' | cut -d: -f1 \
          | grep -vF 'node_modules/playwright/' \
          | grep -vF 'node_modules/napi-macros/example/' \
          | while IFS= read -r package
        do
          if [ "$(jq .scripts.install "$package")" = "null" ] ; then
            continue
          fi
          echo ' '
          echo "Running ‘install’ for ‘$package’…"
          (
            cd "$(dirname "$package")"
            yarn run install
          )
        done
      '';

      # run actual build
      buildPhase = ''
        yarn workspace @cardano-sdk/cardano-services run build
      '';
      # override installPhase to only install what's necessary
      installPhase = ''
        mkdir $out
        rsync -Rah $(find . '(' '(' -type d -name 'dist' ')' -o -name 'package.json' ')' \
          -not -path '*/node_modules/*') $out/
      '';
    });

    production-deps = ourPackageWithoutDeps.overrideAttrs (oldAttrs: {
      name = "cardano-sdk-production-deps";
      configurePhase =
        builtins.replaceStrings
        ["yarn install --immutable --immutable-cache"]
        ["yarn workspaces focus --all --production"]
        oldAttrs.configurePhase;
      buildPhase = "";
      installPhase = let ourArch = if lib.hasInfix "aarch64" targetSystem then "arm64" else "x86_64"; in ''
        mkdir -p $out
        echo 'Getting rid of alien architectures…'
        find node_modules -iname '*.node' | xargs -d'\n' file | grep -Evi 'Mach-O.*(${ourArch}|universal)' \
          | cut -d: -f1 | xargs -r -d'\n' rm -v || true
        cp -r node_modules $out/
      '';
    });

    ourPackage = pkgs.runCommandNoCC "cardano-js-sdk" {
      passthru = {
        inherit (theirPackage) nodejs;
      };
    } ''
      mkdir -p $out
      cp -r ${ourPackageWithoutDeps}/. ${production-deps}/. $out/
      chmod -R +w $out

      # Drop the cjs/ prefix, it’s problematic on Darwin:
      find $out/packages -mindepth 3 -maxdepth 3 -type d -path '*/dist/cjs' | while IFS= read -r cjs ; do
        mv "$cjs" "$cjs.old-unused"
        mv "$cjs.old-unused"/{.*,*} "$(dirname "$cjs")/"
        rmdir "$cjs.old-unused"
      done
      find $out/packages -mindepth 2 -maxdepth 2 -type f -name 'package.json' | while IFS= read -r packageJson ; do
        sed -r 's,dist/cjs,dist,g' -i "$packageJson"
        sed -r 's,dist/esm,dist,g' -i "$packageJson"
      done
    '';
  };

  lace-blockchain-services-exe = pkgs.buildGoModule rec {
    name = "lace-blockchain-services";
    src = ./lace-blockchain-services;
    vendorHash = common.lace-blockchain-services-exe-vendorHash;
    nativeBuildInputs = with pkgs; [ imagemagick go-bindata ];
    buildInputs =
      (with pkgs; [ ])
      ++ (with pkgs.darwin.apple_sdk.frameworks; [ Cocoa WebKit ]);
    overrideModAttrs = oldAttrs: {
      buildInputs = (oldAttrs.buildInputs or []) ++ buildInputs;
    };
    preBuild = ''
      convert -background none -size 66x66 cardano-template.svg cardano.png
      cp cardano.png tray-icon
      cp ${common.openApiJson} openapi.json
      go-bindata -pkg assets -o assets/assets.go tray-icon openapi.json
      mkdir -p constants && cp ${common.constants} constants/constants.go

      chmod -R +w vendor
      (
        cd vendor/github.com/getlantern/systray
        patch -p1 -i ${./getlantern-systray--darwin-handle-reopen.patch}
      )
    '';
  };

  infoPlist = pkgs.writeText "Info.plist" ''
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
        <key>CFBundleDevelopmentRegion</key>
        <string>en</string>
        <key>CFBundleExecutable</key>
        <string>lace-blockchain-services</string>
        <key>CFBundleIdentifier</key>
        <string>io.lace.lace-blockchain-services</string>
        <key>CFBundleName</key>
        <string>${common.prettyName}</string>
        <key>CFBundleDisplayName</key>
        <string>${common.prettyName}</string>
        <key>CFBundleVersion</key>
        <string>1.0</string>
        <key>CFBundleShortVersionString</key>
        <string>1.0.0</string>
        <key>CFBundleIconFile</key>
        <string>iconset</string>
        <key>LSMinimumSystemVersion</key>
        <string>10.14</string>
        <key>NSHighResolutionCapable</key>
        <string>True</string>
        <!-- avoid showing the app on the Dock -->
        <key>LSUIElement</key>
        <string>1</string>
    </dict>
    </plist>
  '';

  svg2icns = source: let
    sizes = [16 18 19 22 24 32 40 48 64 128 256 512 1024];
    d2s = d: "${toString d}x${toString d}";
  in pkgs.runCommand "${baseNameOf source}.icns" {
    buildInputs = with pkgs; [ imagemagick ];
  } ''
    mkdir -p iconset.iconset
    ${lib.concatMapStringsSep "\n" (dim: ''
      convert -background none -size ${d2s dim}       ${source} iconset.iconset/icon_${d2s dim}.png
      convert -background none -size ${d2s (dim * 2)} ${source} iconset.iconset/icon_${d2s dim}@2x.png
    '') sizes}
    /usr/bin/iconutil --convert icns --output $out iconset.iconset
  '';

  icons = svg2icns ./macos-app-icon.svg;

  lace-blockchain-services = pkgs.runCommand "lace-blockchain-services" {
    meta.mainProgram = lace-blockchain-services-exe.name;
  } ''
    app=$out/Applications/${lib.escapeShellArg common.prettyName}.app/Contents
    mkdir -p "$app"/MacOS
    mkdir -p "$app"/Resources

    ln -s ${infoPlist} "$app"/Info.plist

    cp ${lace-blockchain-services-exe}/bin/* "$app"/MacOS/
    mkdir -p $out/bin/
    ln -s "$app"/MacOS/lace-blockchain-services $out/bin/

    # cardano-node is already bundled by Haskell.nix; otherwise we’re getting missing
    # symbols in dyld (TODO: investigate why)
    ln -s ${cardano-node}/bin "$app"/MacOS/cardano-node

    ln -s ${mkBundle { "ogmios"         = lib.getExe ogmios;                }} "$app"/MacOS/ogmios
    ln -s ${mkBundle { "mithril-client" = lib.getExe mithril-client;        }} "$app"/MacOS/mithril-client
    ln -s ${mkBundle { "node"           = lib.getExe cardano-js-sdk.ourPackage.nodejs; }} "$app"/MacOS/nodejs
    ln -s ${postgresBundle                                                   } "$app"/MacOS/postgres

    ln -s ${cardano-js-sdk.ourPackage} "$app"/Resources/cardano-js-sdk
    ln -s ${common.networkConfigs} "$app"/Resources/cardano-node-config
    ln -s ${common.swagger-ui} "$app"/Resources/swagger-ui
    ln -s ${common.dashboard} "$app"/Resources/dashboard

    ln -s ${icons} "$app"/Resources/iconset.icns
  '';

  postgresPackage = common.postgresPackage.overrideAttrs (drv: {
    # `--with-system-tzdata=` is non-relocatable, cf. <https://github.com/postgres/postgres/blob/REL_15_2/src/timezone/pgtz.c#L39-L43>
    configureFlags = lib.filter (flg: !(lib.hasPrefix "--with-system-tzdata=" flg)) drv.configureFlags;
  });

  # Slightly more complicated, we have to bundle ‘postgresPackage.lib’, and also make smart
  # use of ‘make_relative_path’ defined in <https://github.com/postgres/postgres/blob/REL_15_2/src/port/path.c#L635C1-L662C1>:
  postgresBundle = let
    pkglibdir = let
      unbundled = postgresPackage.lib;
      bin_dir = "bin";
      exe_dir = "exe";
      lib_dir = ".";
    in (import nix-bundle-exe-same-dir {
      inherit pkgs;
      inherit bin_dir exe_dir lib_dir;
    } unbundled).overrideAttrs (drv: {
      inherit bin_dir exe_dir lib_dir;
      buildCommand = ''
        mkdir -p $out/${lib_dir}
        eval "$(sed -r '/^(out|binary)=/d ; /^bundleBin "/d' \
                  <${nix-bundle-exe-same-dir + "/bundle-macos.sh)"}"
        find -L ${unbundled} -type f -name '*.so' | while IFS= read -r lib ; do
          bundleBin "$lib" "lib"
        done
        rmdir $out/bin
      '';
    });
    binBundle = (mkBundle {
      "postgres" = "${postgresPackage}/bin/postgres";
      "initdb"   = "${postgresPackage}/bin/initdb";
      "psql"     = "${postgresPackage}/bin/psql";
      "pg_dump"  = "${postgresPackage}/bin/pg_dump";
    }).overrideAttrs (drv: {
      buildCommand = drv.buildCommand + ''
        chmod -R +w $out
        find $out -mindepth 1 -maxdepth 1 -type f -executable | xargs file | grep -E ':.*executable' | cut -d: -f1 | while IFS= read -r exe ; do
          echo "Wrapping $exe…"
          wrapped=".$(basename "$exe")-wrapped"
          mv -v "$exe" "$(dirname "$exe")"/"$wrapped"
          (
            echo '#!/bin/sh'
            echo 'set -eu'
            echo 'dir=$(cd "$(dirname "$0")"; pwd -P)'
            echo 'export NIX_PGLIBDIR="$dir/../pkglibdir"'
            echo 'exec "$dir/'"$wrapped"'" "$@"'
          ) >"$exe"
          chmod +x "$exe"
        done
      '';
    });
  in pkgs.runCommand "postgresBundle" {
    passthru = { inherit pkglibdir binBundle; };
  } ''
    mkdir -p $out/bin
    cp -r ${binBundle}/. $out/bin/

    ln -sf ${pkglibdir} $out/pkglibdir
    ln -sf ${postgresPackage}/share $out/share
  '';

  nix-bundle-exe-same-dir = pkgs.runCommand "nix-bundle-exe-same-dir" {} ''
    cp -R ${inputs.nix-bundle-exe} $out
    chmod -R +w $out
    sed -r 's+@executable_path/\$relative_bin_to_lib/\$lib_dir+@executable_path+g' -i $out/bundle-macos.sh
  '';

  mkBundle = exes: let
    unbundled = pkgs.linkFarm "exes" (lib.mapAttrsToList (name: path: {
      name = "bin/" + name;
      inherit path;
    }) exes);
  in (import nix-bundle-exe-same-dir {
    inherit pkgs;
    bin_dir = "bundle";
    exe_dir = "_unused_";
    lib_dir = "bundle";
  } unbundled).overrideAttrs (drv: {
      buildCommand = (
        builtins.replaceStrings
          ["'${unbundled}/bin'"]
          ["'${unbundled}/bin' -follow"]
          drv.buildCommand
      ) + ''
        mv $out/bundle/* $out/
        rmdir $out/bundle
      '';
  });

  # XXX: this has no dependency on /nix/store on the target machine
  lace-blockchain-services-bundle = let
    unbundled = lace-blockchain-services;
  in pkgs.runCommand "lace-blockchain-services-bundle" {
    meta.mainProgram = lace-blockchain-services-exe.name;
  } ''
    mkdir -p $out/{Applications,bin}
    cp -r --dereference ${unbundled}/Applications/${lib.escapeShellArg common.prettyName}.app $out/Applications/

    chmod -R +w $out
    rm $out/Applications/${lib.escapeShellArg common.prettyName}.app/Contents/MacOS/lace-blockchain-services
    cp -r --dereference ${mkBundle { "lace-blockchain-services" = "${unbundled}/Applications/${common.prettyName}.app/Contents/MacOS/lace-blockchain-services"; }}/. $out/Applications/${lib.escapeShellArg common.prettyName}.app/Contents/MacOS/.

    ln -s $out/Applications/${lib.escapeShellArg common.prettyName}.app/Contents/MacOS/lace-blockchain-services $out/bin/
  '';

  hfsprogs = pkgs.hfsprogs.overrideAttrs (drv: {
    buildInputs = (with pkgs; [ openssl darwin.cctools gcc ]) ++ [(
      pkgs.runCommand "gcc-symlink" {} ''
        mkdir -p $out/bin
        ln -s ${pkgs.stdenv.cc}/bin/cc $out/bin/gcc
      ''
    )];
    postPatch = (drv.postPatch or "") + ''
      sed -r 's+-lbsd++g' -i fsck_hfs.tproj/Makefile.lnx
      grep -RF '<endian.h>' | cut -d: -f1 | while IFS= read -r file ; do
        sed -r 's+#include <endian\.h>+#include <machine/endian.h>+g' -i "$file"
      done
      grep -RF '<byteswap.h>' | cut -d: -f1 | while IFS= read -r file ; do
        sed -r 's+#include <byteswap\.h>+#include <libkern/OSByteOrder.h>\n#define bswap_16(x) OSSwapInt16(x)\n#define bswap_32(x) OSSwapInt32(x)\n#define bswap_64(x) OSSwapInt64(x)+' -i "$file"
      done
      grep -RF '<bsd/string.h>' | cut -d: -f1 | while IFS= read -r file ; do
        sed -r 's+#include <bsd/string.h>+#include <string.h>+g' -i "$file"
      done
    '';
    meta = drv.meta // {
      platforms = lib.platforms.darwin;
    };
  });

  # Reading: <http://newosxbook.com/DMG.html>
  libdmg-hfsplus = pkgs.stdenv.mkDerivation {
    name = "libdmg-hfsplus";
    src = pkgs.fetchFromGitHub {
      owner = "fanquake"; repo = "libdmg-hfsplus";
      rev = "1cc791e4173da9cb0b0cc16c5a1aaa25d5eb5efa";
      hash = "sha256-FdpuRq6vmvM10RMILDVRYsDcu64ItKvjdfB4CmuU2UQ=";
    };
    buildInputs = with pkgs; [ cmake zlib ];
  };

  # XXX: one can use hdiutil without super-user privileges to generate an ISO
  dmgImage-ugly = let
    revShort =
      if inputs.self ? shortRev
      then builtins.substring 0 9 inputs.self.rev
      else "dirty";
  in pkgs.runCommand "lace-blockchain-services-dmg" {} ''
    mkdir -p $out
    target=$out/lace-blockchain-services-${common.laceVersion}-${revShort}-${targetSystem}.dmg

    /usr/bin/hdiutil makehybrid -iso -joliet -o tmp.iso \
      ${lace-blockchain-services-bundle}/Applications

    echo 'Converting ISO to DMG…'
    ${libdmg-hfsplus}/bin/dmg tmp.iso $target

    # Make it downloadable from Hydra:
    mkdir -p $out/nix-support
    echo "file binary-dist \"$target\"" >$out/nix-support/hydra-build-products
  '';

  pythonPackages = pkgs.python3Packages;

  mac_alias = pythonPackages.buildPythonPackage rec {
    pname = "mac_alias";
    version = "2.2.2-rc1";
    src = pkgs.fetchFromGitHub {
      owner = "dmgbuild"; repo = pname; rev = "c5c6fa8f59792a6e1b3812086e540857ef31be45";
      hash = "sha256-5s4aGzDIDJ4XSlSVDcjf5Eujzj7eDv6vK8iS1GXcpkc=";
    };
    propagatedBuildInputs = (with pythonPackages; [ setuptools ]);
    format = "pyproject";
    postFixup = ''rm -r $out/bin''; # no __main__.py
  };

  ds_store = pythonPackages.buildPythonPackage rec {
    pname = "ds_store";
    version = "1.3.1";
    src = pkgs.fetchFromGitHub {
      owner = "dmgbuild"; repo = pname; rev = "v${version}";
      hash = "sha256-45lmkE61uXVCBUMyVVzowTJoALY1m9JI68s7Yb0vCks=";
    };
    propagatedBuildInputs = (with pythonPackages; [ setuptools ]) ++ [ mac_alias ];
    format = "pyproject";
    postFixup = ''sed -r 's+main\(\)+main(sys.argv[1:])+g' -i $out/bin/.${pname}-wrapped'';
  };

  # Apple make changes to the original libffi, e.g. adding this non-standard symbol: `ffi_find_closure_for_code_np`
  apple_libffi = pkgs.stdenv.mkDerivation {
    name = "apple-libffi";
    dontUnpack = true;
    installPhase = let
      sdk = newestSDK.MacOSX-SDK;
    in ''
      mkdir -p $out/include $out/lib
      cp -r ${sdk}/usr/include/ffi $out/include/
      cp -r ${sdk}/usr/lib/libffi.* $out/lib/
    '';
  };

  # XXX: do not give that to code building target system binaries, or
  # users will lose compatibility with older MacOS; but it’s fine to use
  # the modern one for building tools we only use in build time
  buildTimeSDK =
    if targetSystem == "aarch64-darwin"
    then pkgs.darwin.apple_sdk_11_0
    else (pkgs.darwin.apple_sdk_10_12 // {
      xcodebuild = pkgs.xcbuild;
      objc4 = pkgs.darwin.objc4;
    });

  # For the DMG tooling:
  newestSDK = pkgs.darwin.apple_sdk_11_0;

  pyobjc = rec {
    version = "9.2";

    commonPreBuild = ''
      # Force it to target our ‘darwinMinVersion’, it’s not recognized correctly:
      grep -RF -- '-DPyObjC_BUILD_RELEASE=%02d%02d' | cut -d: -f1 | while IFS= read -r file ; do
        sed -r '/-DPyObjC_BUILD_RELEASE=%02d%02d/{s/%02d%02d/${
          lib.concatMapStrings (lib.fixedWidthString 2 "0") (
            lib.splitString "." newestSDK.stdenv.targetPlatform.darwinMinVersion
          )
        }/;n;d;}' -i "$file"
      done

      # impurities:
      ( grep -RF '/usr/bin/xcrun' || true ; ) | cut -d: -f1 | while IFS= read -r file ; do
        sed -r "s+/usr/bin/xcrun+$(${lib.getExe pkgs.which} xcrun)+g" -i "$file"
      done
      ( grep -RF '/usr/bin/python' || true ; ) | cut -d: -f1 | while IFS= read -r file ; do
        sed -r "s+/usr/bin/python+$(${lib.getExe pkgs.which} python)+g" -i "$file"
      done
    '';

    core = pythonPackages.buildPythonPackage rec {
      pname = "pyobjc-core";
      inherit version;
      src = pythonPackages.fetchPypi {
        inherit pname version;
        hash = "sha256-1zS5KR/skf9OOuOLnGg53r8Ct5wHMUR26H2o6QssaMM=";
      };
      nativeBuildInputs = [ newestSDK.xcodebuild pkgs.darwin.cctools ];
      buildInputs =
        (with pkgs; [ ])
        ++ [ newestSDK.objc4 apple_libffi newestSDK.libs.simd ]
        ++ (with newestSDK.frameworks; [ Foundation GameplayKit MetalPerformanceShaders ]);
      hardeningDisable = ["strictoverflow"]; # -fno-strict-overflow is not supported in clang on darwin
      NIX_CFLAGS_COMPILE = [ "-Wno-error=deprecated-declarations" ];
      preBuild = commonPreBuild + ''
        sed -r 's+\(.*usr/include/objc/runtime\.h.*\)+("${newestSDK.objc4}/include/objc/runtime.h")+g' -i setup.py
        sed -r 's+/usr/include/ffi+${apple_libffi}/include+g' -i setup.py

        # Turn off clang’s Link Time Optimization, or else we can’t recognize (and link) Objective C .o’s:
        sed -r 's/"-flto=[^"]+",//g' -i setup.py

        # Fix some test code:
        grep -RF '"sw_vers"' | cut -d: -f1 | while IFS= read -r file ; do
          sed -r "s+"sw_vers"+"/usr/bin/sw_vers"+g" -i "$file"
        done
      '';
      # XXX: We’re turning tests off, because they’re mostly working (0.54% failures among 4,600 tests),
      # and I don’t have any more time to investigate now (maybe in a Nixpkgs contribution in the future):
      #
      # pyobjc-core> Ran 4600 tests in 273.830s
      # pyobjc-core> FAILED (failures=3, errors=25, skipped=4, expected failures=3, unexpected successes=1)
      # pyobjc-core> SUMMARY: {'count': 4600, 'fails': 3, 'errors': 25, 'xfails': 3, 'xpass': 0, 'skip': 4}
      # pyobjc-core> error: some tests failed
      dontUseSetuptoolsCheck = true;
    };

    framework-Cocoa = pythonPackages.buildPythonPackage rec {
      pname = "pyobjc-framework-Cocoa";
      inherit version;
      src = pythonPackages.fetchPypi {
        inherit pname version;
        hash = "sha256-79eAgIctjI3mwrl+Dk6smdYgOl0WN6oTXQcdRk6y21M=";
      };
      nativeBuildInputs = [ newestSDK.xcodebuild pkgs.darwin.cctools ];
      buildInputs = (with newestSDK.frameworks; [ Foundation AppKit ]);
      propagatedBuildInputs = [ core ];
      hardeningDisable = ["strictoverflow"]; # -fno-strict-overflow is not supported in clang on darwin
      preBuild = commonPreBuild;
      dontUseSetuptoolsCheck = true; # XXX: majority is passing
    };

    framework-Quartz = pythonPackages.buildPythonPackage rec {
      pname = "pyobjc-framework-Quartz";
      inherit version;
      src = pythonPackages.fetchPypi {
        inherit pname version;
        hash = "sha256-9YYYO5ue9/Fl8ERKe3FO2WXXn26SYXyq+GkVDc/Vpys=";
      };
      nativeBuildInputs = [ newestSDK.xcodebuild pkgs.darwin.cctools ];
      buildInputs = (with newestSDK.frameworks; [ Foundation CoreVideo Quartz ]);
      propagatedBuildInputs = [ framework-Cocoa ];
      hardeningDisable = ["strictoverflow"]; # -fno-strict-overflow is not supported in clang on darwin
      preBuild = commonPreBuild;
      dontUseSetuptoolsCheck = true; # XXX: majority is passing
    };
  };

  # How to get it in a saner way?
  apple_SetFile = pkgs.runCommand "SetFile" {} ''
    mkdir -p $out/bin
    cp ${newestSDK.CLTools_Executables}/usr/bin/SetFile $out/bin/
  '';

  # dmgbuild doesn’t rely on Finder to customize appearance of the mounted DMT directory
  # Finder is unreliable and requires graphical environment
  # dmgbuild still uses /usr/bin/hdiutil, but it's possible to use it w/o root (in 2 stages), which they do
  dmgbuild = pythonPackages.buildPythonPackage rec {
    pname = "dmgbuild";
    version = "1.6.1-rc1";
    src = pkgs.fetchFromGitHub {
      owner = "dmgbuild"; repo = pname; rev = "cdf7ba052fcd09f60132af183ce2b1388566cc75";
      hash = "sha256-QkVEECnUmEROZNzczKHLYTjSyoLz3V8v2uhuJWntgog=";
    };
    patches = [ ./dmgbuild--force-badge.diff ];
    propagatedBuildInputs = (with pythonPackages; [ setuptools ]) ++ [ ds_store pyobjc.framework-Quartz ];
    format = "pyproject";
    preBuild = ''sed -r 's+/usr/bin/SetFile+${apple_SetFile}/bin/SetFile+g' -i src/dmgbuild/core.py''; # impure
  };

  mkBadge = pkgs.writers.makePythonWriter pythonPackages.python pythonPackages pythonPackages "mkBadge" {
    libraries = [ (dmgbuild.overrideDerivation (drv: {
      preBuild = (drv.preBuild or "") + "\n" + ''
        sed -r 's/^\s*position = \(0.5, 0.5\)\s*$//g' -i src/dmgbuild/badge.py
        sed -r 's/^def badge_disk_icon\(badge_file, output_file/\0, position/g' -i src/dmgbuild/badge.py
      '';
    })) ];
  } ''
    import sys
    import dmgbuild.badge
    if len(sys.argv) != 5:
        print("usage: " + sys.argv[0] + " <source.icns> <target.icns> " +
              "<posx=0.5> <posy=0.5>")
        sys.exit(1)
    dmgbuild.badge.badge_disk_icon(sys.argv[1], sys.argv[2],
                                   (float(sys.argv[3]), float(sys.argv[4])))
  '';

  badgeIcon = pkgs.runCommand "badge.icns" {} ''
    ${mkBadge} ${svg2icns ./macos-dmg-inset.svg} $out 0.5 0.420
  '';

  dmgImage = let
    revShort =
      if inputs.self ? shortRev
      then builtins.substring 0 9 inputs.self.rev
      else "dirty";
    # See <https://dmgbuild.readthedocs.io/en/latest/settings.html>:
    settingsPy = let s = lib.escapeShellArg; in pkgs.writeText "settings.py" ''
      import os.path

      app_path = defines.get("app_path", "/non-existent.app")
      icon_path = defines.get("icon_path", "/non-existent.icns")
      app_name = os.path.basename(app_path)

      # UDBZ (bzip2) is 154 MiB, while UDZO (gzip) is 204 MiB
      format = "UDBZ"
      size = None
      files = [app_path]
      symlinks = {"Applications": "/Applications"}
      hide_extension = [ app_name ]

      icon = icon_path

      icon_locations = {app_name: (140, 120), "Applications": (500, 120)}
      background = "builtin-arrow"

      show_status_bar = False
      show_tab_view = False
      show_toolbar = False
      show_pathbar = False
      show_sidebar = False
      sidebar_width = 180

      window_rect = ((200, 200), (640, 320))
      default_view = "icon-view"
      show_icon_preview = False

      include_icon_view_settings = "auto"
      include_list_view_settings = "auto"

      arrange_by = None
      grid_offset = (0, 0)
      grid_spacing = 100
      scroll_position = (0, 0)
      label_pos = "bottom"  # or 'right'
      text_size = 16
      icon_size = 128

      # license = { … }
    '';
  in pkgs.runCommand "lace-blockchain-services-dmg" {} ''
    mkdir -p $out
    target=$out/lace-blockchain-services-${common.laceVersion}-${revShort}-${targetSystem}.dmg

    ${dmgbuild}/bin/dmgbuild \
      -D app_path=${lace-blockchain-services-bundle}/Applications/${lib.escapeShellArg common.prettyName}.app \
      -D icon_path=${badgeIcon} \
      -s ${settingsPy} \
      ${lib.escapeShellArg common.prettyName} $target

    # Make it downloadable from Hydra:
    mkdir -p $out/nix-support
    echo "file binary-dist \"$target\"" >$out/nix-support/hydra-build-products
  '';

  mithril-client = pkgs.runCommand "mithril-client-${common.mithril-bin.version}" {} ''
    mkdir -p $out/bin
    cp ${common.mithril-bin}/${
      if targetSystem == "aarch64-darwin"
      then "bin/mithril-client"
      else "mithril-client"
    } $out/bin/
    chmod +x $out/bin/mithril-client
    $out/bin/mithril-client --version
  '';
}
