# Dolphin Liquid Glass & KWin Glass Setup Guide for Lniri

A comprehensive guide for configuring the KDE Dolphin file manager with authentic KWin Glass refraction, frosted background blur, and a floating translucent card layout under the Lniri compositor.

---

## Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Prerequisites & Package Requirements](#2-prerequisites--package-requirements)
3. [Environment Configuration](#3-environment-configuration)
4. [Lniri Compositor Configuration](#4-lniri-compositor-configuration)
5. [Darkly Application Style Configuration](#5-darkly-application-style-configuration)
6. [KDE Globals Configuration](#6-kde-globals-configuration)
7. [Dolphin UI Configuration](#7-dolphin-ui-configuration)
8. [Shader Parameters Breakdown](#8-shader-parameters-breakdown)
9. [Step-by-Step Installation & Verification](#9-step-by-step-installation--verification)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Architectural Overview

Achieving physical optical glass refraction on KDE applications under Wayland requires coordination across three distinct subsystems:

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
|                      Dolphin File Manager Surface                       |
|   +---------------------------------+-------------------------------+   |
|   | Transparent Sidebar (Opacity 0) | Frosted File View (Opacity 30)|   |
|   +---------------------------------+-------------------------------+   |
+-------------------------------------------------------------------------+
```

### Why Default Dolphin Appears Opaque
Standard Qt and KDE widgets render an opaque `#222222` or `#ffffff` window buffer by default. When a window buffer is completely opaque, compositor-level shaders running behind the window cannot show through.

### The Solution
1. **Darkly Style Plugin**: A modern fork of Lightly for Qt6/KDE that sets `Qt::WA_TranslucentBackground` on Dolphin's main window, punches alpha-transparent holes for the sidebar (`DolphinSidebarOpacity=0`), and renders the file item container at configurable translucency (`DolphinViewOpacity=30`).
2. **Lniri Compositor Shader**: Samples the desktop layer through `xray true`, evaluates Snell's law dielectric refraction and curvature normals across the window perimeter, and displays real-time glass optics through all translucent regions.

---

## 2. Prerequisites & Package Requirements

Ensure the following packages are installed on your system:

### Arch Linux / CachyOS
```bash
# Core KDE Dolphin file manager and Wayland platform integration
sudo pacman -S dolphin qt6-wayland kdeglobals

# Darkly Qt style plugin (AUR)
paru -S darkly-bin
# or
yay -S darkly-bin
```

---

## 3. Environment Configuration

For Qt applications to load the Darkly style and KDE integration under Wayland, set the following environment variables.

In `~/.config/niri/config.kdl` (or `~/.config/lniri/config.kdl`):

```kdl
environment {
    QT_QPA_PLATFORM "wayland"
    QT_STYLE_OVERRIDE "Darkly"
    QT_QPA_PLATFORMTHEME "kde"
}
```

Alternatively, export these in your session environment (`~/.profile`, `~/.bashprofile`, or `/etc/environment`):

```bash
export QT_QPA_PLATFORM=wayland
export QT_STYLE_OVERRIDE=Darkly
export QT_QPA_PLATFORMTHEME=kde
```

---

## 4. Lniri Compositor Configuration

Add the Dolphin window rule to `~/.config/niri/config.kdl` (or `~/.config/lniri/config.kdl`):

```kdl
// Dolphin File Manager (Floating Liquid Glass Window)
window-rule {
    match app-id="org.kde.dolphin"
    match app-id="dolphin"

    // Open as floating window centered with comfortable proportions
    open-floating true
    default-column-width { proportion 0.72; }
    default-window-height { proportion 0.78; }

    // Eliminate artificial window frames to let glass rims form the perimeter
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

## 5. Darkly Application Style Configuration

Create or modify `~/.config/darklyrc`:

```ini
[Common]
CornerRadius=14
ShadowStrength=0

[Style]
AnimationsEnabled=true
AnimationsDuration=200

# File view transparency: 30 = 30% background tint (70% translucent glass)
TransparentDolphinView=false
DolphinViewOpacity=30

# Complete sidebar transparency
DolphinSidebarOpacity=0

# Translucent navigation & header bars
MenuBarOpacity=0
ToolBarOpacity=0
TabBarOpacity=0
MenuOpacity=100

# Seamless frameless integration
TitleWidgetDrawFrame=false
DockWidgetDrawFrame=false
SidePanelDrawFrame=false
DisableDolphinUrlNavigatorBackground=true
RoundedRubberBandFrame=true
SplitterProxyEnabled=true
SplitterProxyWidth=12
TabUseHighlightColor=true
ToolBarDrawItemSeparator=false
ToolBarDrawSeparator=false
ViewDrawFocusIndicator=false
```

### Key Parameters in `darklyrc`
- `CornerRadius=14`: Matches Niri's `geometry-corner-radius 14`, aligning Qt widget internal rounding with the compositor glass clipping curve.
- `DolphinSidebarOpacity=0`: Makes the Places/Bookmarks sidebar fully translucent so wallpaper refraction and blur show through cleanly.
- `DolphinViewOpacity=30`: Makes the main file list area 70% transparent while retaining a 30% dark tint for readability.
- `DisableDolphinUrlNavigatorBackground=true`: Eliminates the grey path bar box, blending the breadcrumb path seamlessly into the glass title area.

---

## 6. KDE Globals Configuration

Ensure `~/.config/kdeglobals` instructs Qt applications to use Darkly:

```ini
[KDE]
widgetStyle=Darkly

[General]
ColorScheme=Darkly
```

---

## 7. Dolphin UI Configuration

To achieve a clean, frameless look without redundant toolbar elements, update `~/.config/dolphinrc`:

```ini
MenuBar=Disabled

[General]
ShowFullPath=false
ShowSelectionToggle=false
ShowSpaceInfo=false
ShowStatusBar=Disabled
ShowZoomSlider=false
Version=202

[MainWindow]
MenuBar=Disabled

[PlacesPanel]
IconSize=16

[StatusBar]
Visible=false
```

---

## 8. Shader Parameters Breakdown

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
| `adaptive-boost` | `0.20` | Automatically lifts luminance over dark wallpapers for a lighter frosted appearance. |
| `lens-distortion` | `0.20` | Gentle barrel lens bulge across the central file area. |

---

## 9. Step-by-Step Installation & Verification

### Step 1: Write Configuration Files
1. Place the window rule in `~/.config/niri/config.kdl`.
2. Place the Darkly configuration in `~/.config/darklyrc`.
3. Verify `~/.config/kdeglobals` and `~/.config/dolphinrc`.

### Step 2: Ensure a Wallpaper Daemon is Running
Compositor refraction requires an active surface in `Layer::Background`.
```bash
# Verify wallpaper daemon is active
pgrep -l "hyprpaper|swaybg|swww"

# If not running, start one:
hyprpaper &
# or
swaybg -i /path/to/wallpaper.png -m fill &
```

### Step 3: Hot-Reload Lniri
Reload your compositor config live without restarting your session:
```bash
lniri msg action load-config-file
```

### Step 4: Launch Dolphin
```bash
dolphin &
```
Dolphin will open as a floating, centered window featuring rounded refractive glass borders, translucent sidebar, and a frosted, liquid-refracted file view.

---

## 10. Troubleshooting

### Issue: Dolphin File View is Pure Opaque Grey
- Verify that `DolphinViewOpacity` is set to `30` (or below `100`) in `~/.config/darklyrc`.
- Confirm that `QT_STYLE_OVERRIDE="Darkly"` is present in your environment.
- Close all running Dolphin background daemons with `killall dolphin` and launch again.

### Issue: Glass Borders Appear Completely Black
- A wallpaper daemon is not running on the Wayland background layer. Run `swaybg` or `hyprpaper`.

### Issue: Dolphin Opens Tiled Instead of Floating
- Check that `open-floating true` is inside the `match app-id="org.kde.dolphin"` window-rule block in `config.kdl`.
- If an existing Dolphin window was open, close it so Niri evaluates the open-floating rule on creation.

### Issue: Window Corners Appear Square
- Ensure `geometry-corner-radius 14` and `clip-to-geometry true` are set in the window rule.
