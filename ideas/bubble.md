# Bubble Liquid Glass & KWin Glass Setup Guide for Lniri

A comprehensive guide for configuring the Bubble Qt6/QML file manager with authentic KWin Glass refraction, frosted background blur, and a floating translucent card layout matching Dolphin under the Lniri compositor.

---

## Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Prerequisites & Package Requirements](#2-prerequisites--package-requirements)
3. [Lniri Compositor Configuration](#3-lniri-compositor-configuration)
4. [Bubble Custom Theme Configuration](#4-bubble-custom-theme-configuration)
5. [Bubble Application Configuration](#5-bubble-application-configuration)
6. [Shader Parameters Breakdown](#6-shader-parameters-breakdown)
7. [Step-by-Step Installation & Verification](#7-step-by-step-installation--verification)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Architectural Overview

Achieving physical optical glass refraction on Bubble under Wayland requires coordination between Bubble's QML rendering layer and Lniri's compositor shader engine:

```
+-------------------------------------------------------------------------+
|                  Desktop Wallpaper (Layer::Background)                  |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                    Lniri Liquid Glass Shader Engine                     |
|           (Snell's Law Refraction, Caustic Bevels, Oklab Saturation)    |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                      Bubble File Manager Surface                        |
|   +---------------------------------+-------------------------------+   |
|   | Translucent Sidebar (#222222)   | Frosted File View (Alpha 0.85)|   |
|   +---------------------------------+-------------------------------+   |
+-------------------------------------------------------------------------+
```

### The Translucency Pipeline in Bubble
Bubble is a modern file manager built on Qt6 and QML. Unlike traditional Qt Widgets that require style hooks (`Qt::WA_TranslucentBackground`), Bubble calculates container colors using its internal `Theme.containerColor(Theme.base, factor)` function. 

When `transparency_enabled = true` and `transparency_level = 0.85` are configured:
1. Bubble calculates container alpha dynamically, allowing background pixels to pass through the main viewport card.
2. Lniri samples the desktop wallpaper layer via `xray true`.
3. The compositor's `kwin-glass` shader computes optical refraction, chromatic dispersion (fringing), and edge bevels directly underneath Bubble's translucent viewport.

### Wayland App ID Specifics
Under QtWayland and QML, Bubble presents the runtime Wayland app ID:
```
io.github.soyeb_jim285.Bubble
```
Matching `io.github.soyeb_jim285.Bubble`, `bubble`, and `Bubble` in Lniri ensures that floating geometry and shader effects bind reliably regardless of how the application is launched.

---

## 2. Prerequisites & Package Requirements

Ensure Bubble and the required Qt6 Wayland dependencies are installed on your system:

### Arch Linux / CachyOS
```bash
# Bubble binary or build dependencies
# If using a prebuilt binary in ~/.local/bin/bubble or custom install:
chmod +x ~/.local/bin/bubble

# Ensure Qt6 Wayland and QML modules are available
sudo pacman -S qt6-wayland qt6-declarative qt6-svg
```

---

## 3. Lniri Compositor Configuration

Add the Bubble window rule to `~/.config/niri/config.kdl` (or `~/.config/lniri/config.kdl`). This rule uses identical geometry and shader parameters to Dolphin:

```kdl
// Bubble File Manager (Floating Liquid Glass Window matching Dolphin)
window-rule {
    match app-id="io.github.soyeb_jim285.Bubble"
    match app-id="bubble"
    match app-id="Bubble"

    // Open as floating window centered with identical proportions to Dolphin
    open-floating true
    default-column-width { proportion 0.72; }
    default-window-height { proportion 0.78; }

    // Eliminate artificial window frames so glass rims form the perimeter
    draw-border-with-background false
    geometry-corner-radius 14
    clip-to-geometry true

    background-effect {
        blur true
        xray true

        liquid-glass {
            mode "kwin-glass"
            liquidity 0.6
            refraction-strength 4.5
            power-factor 3.2
            refraction-bevel-intensity 10.0
            refraction-offset-strength 8.0
            edge-thickness 0.18
            fringing 0.45
            glow-weight 0.015
            edge-lighting 0.20
            oklab-saturation 1.0
            saturation 1.20
            vibrancy 0.45
            adaptive-dim 0.0
            adaptive-boost 0.20
            physical-refraction 1.0
            lens-distortion 0.20
        }
    }
}
```

---

## 4. Bubble Custom Theme Configuration

Bubble loads theme definitions from `~/.config/bubble/themes/<theme-name>.toml`. 

Create the Darkly Glass color scheme at `~/.config/bubble/themes/darkly-glass.toml` to match Dolphin's Darkly palette (`#2c2c2c` charcoal base and `#3daee9` KDE blue accent):

```toml
[colors]
base    = "#2c2c2c"
mantle  = "#222222"
crust   = "#1a1a1a"
surface = "#3a3a3a"
overlay = "#4a4a4a"
text    = "#fcfcfc"
subtext = "#d0d0d0"
muted   = "#7f8c8d"
accent  = "#3daee9"
success = "#2ecc71"
warning = "#f39c12"
error   = "#e74c3c"
```

### Color Palette Mapping
- `base = "#2c2c2c"`: Main file grid/card background, matching Dolphin's Darkly file view tint.
- `mantle = "#222222"`: Sidebar and header background, matching Dolphin's dark sidebar tone.
- `crust = "#1a1a1a"`: Deep background accents and borders.
- `accent = "#3daee9"`: KDE Breeze / Darkly cyan-blue highlight for active tabs, selected items, and toggle states.
- `text = "#fcfcfc"`: High-contrast crisp white typography.

---

## 5. Bubble Application Configuration

Edit `~/.config/bubble/config.toml` to apply the `darkly-glass` theme, match the 14px corner radius, enable transparency, and disable duplicate window controls:

```toml
[appearance]
anim_curve_enter = 'OutCubic'
anim_curve_exit = 'InCubic'
anim_curve_transition = 'Bezier'
anim_duration = 200
anim_duration_fast = 100
anim_duration_slow = 350
animations_enabled = true
radius_large = 14
radius_medium = 14
radius_small = 8
transparency_enabled = true
transparency_level = 0.85

[bookmarks]

[context_menu]

[general]
dark_theme = 'darkly-glass'
default_view = 'grid'
dependency_startup_check = true
font_family = ''
icon_theme = 'Adwaita'
light_theme = 'liquid-light'
remember_sort_per_folder = true
right_click_to_edit_path = true
show_hidden = false
sort_ascending = true
sort_by = 'name'
theme = 'darkly-glass'

[layout]
home_starred_partition_enabled = true
home_starred_partition_orientation = 'side_by_side'

[list_view]
column_widths = { modified = 140, size = 110, type = 80 }
columns = [ 'name', 'size', 'modified', 'type' ]

[miller_view]
current_fraction = 0.5
parent_fraction = 0.2

[shortcuts]

[sidebar]
hidden_quick_access = []
position = 'left'
visible = true
width = 200

[starred]
paths = [ '~/github-p', '~/Videos' ]

[window]
button_layout = ':minimize,maximize,close'
show_controls = false
```

### Key Settings in `config.toml`
- `theme = 'darkly-glass'` and `dark_theme = 'darkly-glass'`: Instructs Bubble to load the newly created palette from `~/.config/bubble/themes/darkly-glass.toml`.
- `transparency_enabled = true` and `transparency_level = 0.85`: Grants the central file card a clean 15% transmission factor, harmonizing with Dolphin's 30% opacity setting while maintaining file icon legibility.
- `radius_large = 14` and `radius_medium = 14`: Aligns internal QML element corners with Lniri's `geometry-corner-radius 14`.
- `show_controls = false`: Hides redundant titlebar window buttons for an uncluttered modern header bar.

---

## 6. Shader Parameters Breakdown

The KWin Glass shader parameters used for Bubble match Dolphin:

| Parameter | Value | Description |
| :--- | :--- | :--- |
| `mode` | `"kwin-glass"` | Enables Snell's Law dielectric vector refraction and SDF caustic bevel normals. |
| `liquidity` | `0.6` | Widens the meniscus curve inward towards the window center for an organic fluid feel. |
| `refraction-strength` | `4.5` | Magnitude of optical displacement ($IOR = 1.0 + \text{strength}$). |
| `power-factor` | `3.2` | Bevel falloff curve from the window edges inward. |
| `refraction-bevel-intensity`| `10.0` | Normal steepness and caustic lens distortion depth. |
| `refraction-offset-strength` | `8.0` | Curvature distortion around corners. |
| `edge-thickness` | `0.18` | Relative border width of the refractive meniscus bevel. |
| `fringing` | `0.45` | Cauchy chromatic dispersion (splits RGB wavelengths along curves). |
| `glow-weight` | `0.015` | Very low specular highlight on border rims, keeping the edge white effect minimal and subtle. |
| `edge-lighting` | `0.20` | Subtle background edge illumination without excessive border glare. |
| `oklab-saturation` | `1.0` | Processes color saturation in perceptually uniform Oklab space. |
| `saturation` | `1.20` | Multiplier for refracted wallpaper color saturation. |
| `vibrancy` | `0.45` | Color pop and luminance boost for the refracted substrate. |
| `adaptive-dim` | `0.0` | Neutral baseline dimming. |
| `adaptive-boost` | `0.20` | Automatically lifts luminance over dark wallpapers for a lighter frosted appearance. |
| `physical-refraction` | `1.0` | Enables physically accurate ray-bending physics. |
| `lens-distortion` | `0.20` | Gentle barrel lens bulge across the central viewport. |

---

## 7. Step-by-Step Installation & Verification

### Step 1: Create Theme Directory & File
```bash
mkdir -p ~/.config/bubble/themes
cat << 'EOF' > ~/.config/bubble/themes/darkly-glass.toml
[colors]
base    = "#2c2c2c"
mantle  = "#222222"
crust   = "#1a1a1a"
surface = "#3a3a3a"
overlay = "#4a4a4a"
text    = "#fcfcfc"
subtext = "#d0d0d0"
muted   = "#7f8c8d"
accent  = "#3daee9"
success = "#2ecc71"
warning = "#f39c12"
error   = "#e74c3c"
EOF
```

### Step 2: Apply Bubble Configuration
Update `~/.config/bubble/config.toml` with the settings described in Section 5.

### Step 3: Insert Window Rule into Niri Config
Add the `window-rule` block for `io.github.soyeb_jim285.Bubble` into `~/.config/niri/config.kdl`.

### Step 4: Ensure Wallpaper Daemon is Active
Refraction samples the `Layer::Background` surface:
```bash
pgrep -l "hyprpaper|swaybg|swww"
```

### Step 5: Live Reload Lniri Compositor
Reload the compositor configuration without terminating active windows:
```bash
lniri msg action load-config-file
```

### Step 6: Launch Bubble
```bash
bubble &
```
Bubble will spawn as a centered floating window (72% x 78%), featuring 14px rounded corners, authentic KWin Glass refraction around the edges, and a dark frosted translucent card surface matching Dolphin.

---

## 8. Troubleshooting

### Issue: Bubble Opens Tiled Instead of Floating
- **Cause**: Lniri matched the window before `io.github.soyeb_jim285.Bubble` was added to `config.kdl`, or an older instance was already running.
- **Fix**: Verify all three matches (`io.github.soyeb_jim285.Bubble`, `bubble`, `Bubble`) are present under the window rule. Close existing Bubble instances (`pkill bubble`) and launch a new instance.

### Issue: Bubble Background Appears Solid Opaque
- **Cause**: `transparency_enabled` is set to `false` or `transparency_level` is set to `1.0` in `~/.config/bubble/config.toml`.
- **Fix**: Set `transparency_enabled = true` and `transparency_level = 0.85`.

### Issue: Glass Borders Appear Completely Black
- **Cause**: No wallpaper daemon is active on the Wayland background layer (`Layer::Background`).
- **Fix**: Start `swaybg`, `hyprpaper`, or `swww` with your wallpaper image.

### Issue: Theme Colors Do Not Take Effect
- **Cause**: Theme name in `config.toml` does not match the filename in `~/.config/bubble/themes/`.
- **Fix**: If the file is `~/.config/bubble/themes/darkly-glass.toml`, specify `theme = 'darkly-glass'` (without `.toml`).
