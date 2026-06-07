{
  description = "Spheres Wiki — static reference wiki for the Spheres TTRPG system";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        inherit (pkgs) lib stdenv;
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22          # ≥ 22.12.0 (package.json engines → 22.22.3)
            just               # task runner (just test, just build, etc.)
            git-lfs            # manage large assets (book covers)
          ] ++ lib.optionals stdenv.isLinux [
            vips               # sharp (optional Astro dep) builds against this
            pkg-config
          ];

          shellHook = ''
            echo "🪐 Spheres Wiki dev shell  •  Node $(node --version)"

            if [ ! -d node_modules ]; then
              echo "📦 Installing npm dependencies (one-time)…"
              npm install
            fi

            export PATH="$PWD/node_modules/.bin:$PATH"
          '';
        };

        # Extended shell with Playwright system deps for e2e tests.
        # On NixOS, ensure programs.nix-ld.enable = true so prebuilt
        # Chromium can find its dynamic linker.  Without nix-ld, use:
        #   steam-run npx playwright test
        devShells.e2e = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22
            just
            git-lfs
          ] ++ lib.optionals stdenv.isLinux ([
            vips
            pkg-config
          ] ++ (with pkgs; [
            # Libraries the Playwright Chromium binary needs at runtime
            atk
            cairo
            cups
            dbus
            expat
            ffmpeg
            gdk-pixbuf
            glib
            gtk3
            libdrm
            libxkbcommon
            mesa
            nspr
            nss
            pango
            udev
            libx11
            libxcomposite
            libxdamage
            libxext
            libxfixes
            libxrandr
            libxcb
          ]));

          shellHook = ''
            echo "🪐 Spheres Wiki dev shell (e2e)  •  Node $(node --version)"

            if [ ! -d node_modules ]; then
              echo "📦 Installing npm dependencies (one-time)…"
              npm install
            fi

            export PATH="$PWD/node_modules/.bin:$PATH"

            export PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers"
            if [ ! -d "$PLAYWRIGHT_BROWSERS_PATH" ]; then
              echo "🎭 Installing Playwright browsers (one-time, ~500 MB)…"
              npx playwright install chromium
            fi
          '';
        };
      }
    );
}
