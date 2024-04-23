{ inputs, targetSystem }:

assert targetSystem == "x86_64-linux";

let
  pkgs = inputs.nixpkgs.legacyPackages.${targetSystem};
  inherit (pkgs) lib;
in rec {
  common = import ./common.nix { inherit inputs targetSystem; };

  package = lace-blockchain-services;

  installer = selfExtractingArchive;

  inherit (common) ogmios cardano-node;

  cardano-js-sdk = inputs.cardano-js-sdk.packages.${pkgs.system}.default;

  lace-blockchain-services-exe = pkgs.buildGoModule rec {
    name = "lace-blockchain-services";
    src = ./lace-blockchain-services;
    vendorHash = common.lace-blockchain-services-exe-vendorHash;
    nativeBuildInputs = with pkgs; [ pkgconfig imagemagick go-bindata ];
    buildInputs = with pkgs; [
      (libayatana-appindicator-gtk3.override {
        gtk3 = gtk3-x11;
        libayatana-indicator = libayatana-indicator.override { gtk3 = gtk3-x11; };
        libdbusmenu-gtk3 = libdbusmenu-gtk3.override { gtk3 = gtk3-x11; };
      })
      gtk3-x11
    ];
    overrideModAttrs = oldAttrs: {
      buildInputs = (oldAttrs.buildInputs or []) ++ buildInputs;
    };
    preBuild = ''
      convert -background none -size 44x44 cardano.svg cardano.png
      cp cardano.png tray-icon
      cp ${common.openApiJson} openapi.json
      go-bindata -pkg assets -o assets/assets.go tray-icon openapi.json
      mkdir -p constants && cp ${common.constants} constants/constants.go
    '';
  };

  nix-bundle-exe = import inputs.nix-bundle-exe;

  # XXX: this tweaks `nix-bundle-exe` a little by making sure that each package lands in a separate
  # directory, because otherwise we get conflicts in e.g libstdc++ versions:
  mkBundle = exes: (nix-bundle-exe {
    inherit pkgs;
    bin_dir = "bin";
    exe_dir = "exe";
    lib_dir = "lib";
  } (pkgs.linkFarm "exes" (lib.mapAttrsToList (name: path: {
    name = "bin/" + name;
    inherit path;
  }) exes))).overrideAttrs (drv: {
    buildCommand = builtins.replaceStrings ["find '"] ["find -L '"] drv.buildCommand + ''
      for base in ${lib.escapeShellArgs (__attrNames exes)} ; do
        if ${with pkgs; lib.getExe file} "$out/bin/$base" | cut -d: -f2 | grep -i 'shell script' >/dev/null ; then
          # dynamic linking:
          ${with pkgs; lib.getExe patchelf} --set-rpath '$ORIGIN' $out/exe/"$base"
          mv $out/exe/"$base" $out/."$base"-wrapped
          mv $out/bin/"$base" $out/
          sed -r 's,"\$\(dirname (.*?)\)" ,\1 , ; s,lib/,,g ; s,exe/'"$base"',.'"$base"'-wrapped,' -i $out/"$base"
        else
          # static linking:
          mv "$out/bin/$base" $out/
        fi
      done
      rmdir $out/bin
      if [ -e $out/exe ] ; then rmdir $out/exe ; fi
      if [ -e $out/lib ] ; then mv $out/lib/* $out/ && rmdir $out/lib ; fi
    '';
  });

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
    in (nix-bundle-exe {
      inherit pkgs;
      inherit bin_dir exe_dir lib_dir;
    } unbundled).overrideAttrs (drv: {
      inherit bin_dir exe_dir lib_dir;
      buildCommand = ''
        mkdir -p $out/${lib_dir}
        eval "$(sed -r '/^(out|binary)=/d ; /^exe_interpreter=/,$d' \
                  <${inputs.nix-bundle-exe + "/bundle-linux.sh)"}"
        find -L ${unbundled} -type f -name '*.so' | while IFS= read -r elf ; do
          bundleLib "$elf"
        done
      '';
    });
    binBundle = (mkBundle {
      "postgres" = "${postgresPackage}/bin/postgres";
      "initdb"   = "${postgresPackage}/bin/.initdb-wrapped";
      "psql"     = "${postgresPackage}/bin/psql";
      "pg_dump"  = "${postgresPackage}/bin/pg_dump";
    }).overrideAttrs (drv: {
      buildCommand = drv.buildCommand + ''
        find $out -mindepth 1 -maxdepth 1 -type f -executable | xargs file | grep 'shell script' | cut -d: -f1 | while IFS= read -r wrapper ; do
          sed -r '/^exec/i export NIX_PGLIBDIR="$dir/../pkglibdir"' -i "$wrapper"
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

  testPostgres = pkgs.writeShellScriptBin "test-postgres" ''
    set -euo pipefail

    export PGDATA=$HOME/.local/share/lace-blockchain-services/test-postgres
    if [ -e "$PGDATA" ] ; then rm -r "$PGDATA" ; fi
    mkdir -p "$PGDATA"

    ${postgresBundle}/bin/initdb --username postgres --pwfile ${pkgs.writeText "pwfile" "dupa.888"}

    mv "$PGDATA"/postgresql.conf "$PGDATA"/postgresql.conf.original
    cat >"$PGDATA/postgresql.conf" <<EOF
  listen_addresses = 'localhost'
  port = 5432
  unix_socket_directories = '$HOME/.local/share/lace-blockchain-services/test-postgres'
  max_connections = 100
  fsync = on
  logging_collector = off
  log_destination = 'stderr'
  log_statement = 'all'
  datestyle = 'iso'
  timezone = 'utc'
  #autovacuum = on
  EOF

    mv "$PGDATA"/pg_hba.conf "$PGDATA"/pg_hba.conf.original
    cat >"$PGDATA/pg_hba.conf" <<EOF
  # TYPE  DATABASE        USER            ADDRESS                 METHOD
  host    all             all             127.0.0.1/32            scram-sha-256
  host    all             all             ::1/128                 scram-sha-256
  EOF

    exec ${postgresBundle}/bin/postgres
  '';

  lace-blockchain-services = pkgs.runCommand "lace-blockchain-services" {
    meta.mainProgram = lace-blockchain-services-exe.name;
  } ''
    mkdir -p $out/bin $out/libexec/lace-blockchain-services
    cp ${lace-blockchain-services-exe}/bin/* $out/libexec/lace-blockchain-services/
    ln -s $out/libexec/lace-blockchain-services/* $out/bin/

    mkdir -p $out/libexec
    ln -s ${mkBundle { "cardano-node"   = lib.getExe cardano-node;          }} $out/libexec/cardano-node
    ln -s ${mkBundle { "ogmios"         = lib.getExe ogmios;                }} $out/libexec/ogmios
    ln -s ${mkBundle { "mithril-client" = lib.getExe mithril-client;        }} $out/libexec/mithril-client
    ln -s ${mkBundle { "node"           = lib.getExe cardano-js-sdk.nodejs; }} $out/libexec/nodejs
    ln -s ${mkBundle { "clip"           = lib.getExe pkgs.xclip;            }} $out/libexec/xclip
    ln -s ${postgresBundle                                                   } $out/libexec/postgres

    mkdir -p $out/share
    ln -s ${cardano-js-sdk}/libexec/source $out/share/cardano-js-sdk
    ln -s ${pkgs.xkeyboard_config}/share/X11/xkb $out/share/xkb
    ln -s ${common.networkConfigs} $out/share/cardano-node-config
    ln -s ${common.swagger-ui} $out/share/swagger-ui
    ln -s ${common.dashboard} $out/share/dashboard
  '';

  # XXX: this has no dependency on /nix/store on the target machine
  lace-blockchain-services-bundle = let
    unbundled = lace-blockchain-services;
  in pkgs.runCommand "lace-blockchain-services-bundle" {} ''
    mkdir -p $out
    cp -r --dereference ${unbundled}/libexec $out/
    chmod -R +w $out/libexec
    cp -r --dereference ${mkBundle { "lace-blockchain-services" = (lib.getExe unbundled); }} $out/libexec/lace-blockchain-services
    mkdir -p $out/bin
    ln -s ../libexec/lace-blockchain-services/lace-blockchain-services $out/bin/
    cp -r --dereference ${unbundled}/share $out/ || true  # FIXME: unsafe! broken node_modules symlinks
    chmod -R +w $out/share
    cp $(find ${desktopItem} -type f -name '*.desktop') $out/share/lace-blockchain-services.desktop
    ${pkgs.imagemagick}/bin/convert -background none -size 1024x1024 \
      ${./lace-blockchain-services}/cardano.svg $out/share/icon_large.png
  '';

  desktopItem = pkgs.makeDesktopItem {
    name = "lace-blockchain-services";
    exec = "INSERT_PATH_HERE";
    desktopName = common.prettyName;
    genericName = "Cardano Crypto-Currency Backend";
    comment = "Run the backend for the Lace wallet locally";
    categories = [ "Network" ];
    icon = "INSERT_ICON_PATH_HERE";
  };

  # XXX: Be *super careful* changing this!!! You WILL DELETE user data if you make a mistake. Ping @michalrus
  selfExtractingArchive = let
    scriptTemplate = __replaceStrings [
      "@UGLY_NAME@"
      "@PRETTY_NAME@"
    ] [
      (lib.escapeShellArg "lace-blockchain-services")
      (lib.escapeShellArg common.prettyName)
    ] (__readFile ./linux-self-extracting-archive.sh);
    script = __replaceStrings ["1010101010"] [(toString (1000000000 + __stringLength scriptTemplate))] scriptTemplate;
    revShort =
      if inputs.self ? shortRev
      then builtins.substring 0 9 inputs.self.rev
      else "dirty";
  in pkgs.runCommand "lace-blockchain-services-installer" {
    inherit script;
    passAsFile = [ "script" ];
  } ''
    mkdir -p $out
    target=$out/lace-blockchain-services-${common.laceVersion}-${revShort}-${targetSystem}.bin
    cat $scriptPath >$target
    echo 'Compressing (xz)...'
    tar -cJ -C ${lace-blockchain-services-bundle} . >>$target
    chmod +x $target

    # Make it downloadable from Hydra:
    mkdir -p $out/nix-support
    echo "file binary-dist \"$target\"" >$out/nix-support/hydra-build-products
  '';

  swagger-ui-preview = let
    port = 12345;
  in pkgs.writeShellScriptBin "swagger-ui-preview" ''
    set -euo pipefail
    openapi=$(realpath -e nix/lace-blockchain-services/internal/lace-blockchain-services/openapi.json)
    cd $(mktemp -d)
    ln -s ${common.swagger-ui} ./swagger-ui
    ln -s "$openapi" ./openapi.json
    ( sleep 0.5 ; xdg-open http://127.0.0.1:${toString port}/swagger-ui/ ; ) &
    ${lib.getExe pkgs.python3} -m http.server ${toString port}
  '';

  mithril-client = pkgs.runCommand "mithril-client-${common.mithril-bin.version}" {} ''
    cp ${common.mithril-bin}/mithril-client ./

    chmod +wx mithril-client
    patchelf --set-interpreter ${pkgs.stdenv.cc.bintools.dynamicLinker} \
      --set-rpath ${with pkgs; lib.makeLibraryPath [ glibc glibc.libgcc openssl_1_1 ]} \
      mithril-client

    mkdir -p $out/bin
    cp mithril-client $out/bin
    $out/bin/mithril-client --version
  '';

}
