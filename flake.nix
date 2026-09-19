{
  description = "Lniri: A scrollable-tiling Wayland compositor with Liquid Glass effects";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    niri = {
      url = "github:niri-wm/niri/v26.04";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      niri,
    }:
    let
      inherit (nixpkgs) lib;

      systems = lib.intersectLists lib.systems.flakeExposed lib.platforms.linux;
      forAllSystems = lib.genAttrs systems;
      pkgsFor = forAllSystems (system: nixpkgs.legacyPackages.${system});

      lniriPackage =
        pkgs:
        let
          system = pkgs.stdenv.hostPlatform.system;
          baseNiri = niri.packages.${system}.niri;
          # Ensure libdisplay-info_0_3 is used to fix the compatibility issue on newer nixpkgs
          upstreamNiri =
            if baseNiri ? override then
              baseNiri.override {
                libdisplay-info = pkgs.libdisplay-info_0_3;
              }
            else
              baseNiri;
        in
        upstreamNiri.overrideAttrs (oldAttrs: {
          pname = "lniri";
          version = "26.4.0";
          __intentionallyOverridingVersion = true;

          postPatch =
            (oldAttrs.postPatch or "")
            + ''
              # Make sure target directories exist and are writable
              chmod -R +w src niri-config 2>/dev/null || true
              mkdir -p src/render_helpers/shaders niri-config/src src/layer

              # Apply Lniri Liquid Glass overlay files onto upstream Niri
              cp -f ${./src/render_helpers/liquid_glass.rs} src/render_helpers/liquid_glass.rs
              cp -f ${./src/render_helpers/background_effect.rs} src/render_helpers/background_effect.rs
              cp -f ${./src/render_helpers/framebuffer_effect.rs} src/render_helpers/framebuffer_effect.rs
              cp -f ${./src/render_helpers/xray.rs} src/render_helpers/xray.rs
              cp -f ${./src/render_helpers/mod.rs} src/render_helpers/mod.rs
              cp -f ${./src/render_helpers/shaders/clipped_surface.frag} src/render_helpers/shaders/clipped_surface.frag
              cp -f ${./src/render_helpers/shaders/mod.rs} src/render_helpers/shaders/mod.rs
              cp -f ${./niri-config/src/appearance.rs} niri-config/src/appearance.rs
              cp -f ${./src/layer/mapped.rs} src/layer/mapped.rs
            '';

          postInstall =
            (oldAttrs.postInstall or "")
            + ''
              # Provide lniri and Lniri binary symlinks alongside niri
              ln -sf $out/bin/niri $out/bin/lniri
              ln -sf $out/bin/niri $out/bin/Lniri

              # Shell completions for lniri
              installShellCompletion --cmd lniri \
                --bash <($out/bin/lniri completions bash) \
                --fish <($out/bin/lniri completions fish) \
                --nushell <($out/bin/lniri completions nushell) \
                --zsh <($out/bin/lniri completions zsh)

              # Prepare and install Lniri desktop entry
              cp ${./resources/lniri.desktop} lniri.desktop
              substituteInPlace lniri.desktop \
                --replace-fail '/usr/local/bin/lniri-session' "$out/bin/lniri-session"
              install -Dm644 lniri.desktop $out/share/wayland-sessions/lniri.desktop

              # Prepare and install Lniri user service
              cp ${./resources/lniri.service} lniri.service
              substituteInPlace lniri.service \
                --replace-fail '/usr/local/bin/lniri' "$out/bin/lniri"
              install -Dm644 lniri.service $out/lib/systemd/user/lniri.service
              mkdir -p $out/share/systemd/user
              ln -sf $out/lib/systemd/user/lniri.service $out/share/systemd/user/lniri.service

              # Prepare and install Lniri session launcher
              cp ${./resources/lniri-session} lniri-session
              patchShebangs lniri-session
              substituteInPlace lniri-session \
                --replace-fail '/usr/local/bin/lniri' "$out/bin/lniri"
              install -Dm755 lniri-session $out/bin/lniri-session

              # Install portals config and shutdown target
              install -Dm644 ${./resources/lniri-portals.conf} $out/share/xdg-desktop-portal/lniri-portals.conf
              install -Dm644 ${./resources/lniri-shutdown.target} $out/lib/systemd/user/lniri-shutdown.target
              ln -sf $out/lib/systemd/user/lniri-shutdown.target $out/share/systemd/user/lniri-shutdown.target

              # Install reference shaders
              install -Dm644 ${./resources/shaders/kwin-glass.frag} $out/share/lniri/shaders/kwin-glass.frag
            '';

          passthru = (oldAttrs.passthru or { }) // {
            providedSessions = [
              "lniri"
              "niri"
            ];
          };

          meta = (oldAttrs.meta or { }) // {
            description = "A scrollable-tiling Wayland compositor with Liquid Glass effects";
            homepage = "https://github.com/TattvaOrg/Lniri";
            mainProgram = "lniri";
          };
        });

      packagesFor = system: rec {
        lniri = lniriPackage pkgsFor.${system};
        niri-glass = lniri;
        default = lniri;
      };
    in
    {
      packages = forAllSystems packagesFor;

      apps = forAllSystems (
        system:
        let
          pkgs = (packagesFor system).lniri;
        in
        {
          default = {
            type = "app";
            program = "${pkgs}/bin/lniri";
            meta.description = "Run the Lniri compositor";
          };
          lniri-session = {
            type = "app";
            program = "${pkgs}/bin/lniri-session";
            meta.description = "Run Lniri as a systemd user session";
          };
        }
      );

      overlays.default = final: _prev: {
        lniri = lniriPackage final;
        niri-glass = lniriPackage final;
      };

      nixosModules.default = import ./nix/nixos-module.nix self;
      homeManagerModules.default = import ./nix/home-manager-module.nix self;
    };
}
