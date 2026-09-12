# Lniri Shader Guide: KWin Glass & Liquid Glass

This guide covers everything you need to configure, customize, and master the optical shader engines in **Lniri**: the **KWin Glass Engine** (`mode "kwin-glass"`) and the **Liquid Glass Engine** (`mode "liquid"`).

---

## Table of Contents

1. [Overview & Optical Engines](#overview--optical-engines)
2. [Quick Setup Guide](#quick-setup-guide)
3. [Window Rules (Applications & Terminals)](#window-rules-applications--terminals)
4. [Layer Surface Rules (Bars, Docks, Launchers)](#layer-surface-rules-bars-docks-launchers)
5. [Curated Presets](#curated-presets)
6. [Complete Parameter Reference](#complete-parameter-reference)
7. [Standalone GLSL Shader Usage](#standalone-glsl-shader-usage)
8. [Tips & Troubleshooting](#tips--troubleshooting)

---

## Overview & Optical Engines

Lniri provides two distinct real-time physical optical engines:

```
                      ┌─────────────────────────────────────────┐
                      │             Lniri Compositor            │
                      └────────────────────┬────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
       ┌─────────────────────────┐                   ┌─────────────────────────┐
       │   Mode: "kwin-glass"    │                   │      Mode: "liquid"     │
       ├─────────────────────────┤                   ├─────────────────────────┤
       │ • Snell's Law Vector    │                   │ • Water-drop Curvature  │
       │ • Finite-Diff Normals   │                   │ • Surface Tension Drop  │
       │ • Corner Displacement   │                   │ • Lens Barrel Distort   │
       │ • Dual Rim Highlights   │                   │ • SDF Normal Falloff    │
       │ • Oklab Saturation      │                   │ • Fluid Liquidity       │
       └─────────────────────────┘                   └─────────────────────────┘
```

- **`mode "kwin-glass"`** (Authentic KWin Glass): A faithful port of [kwin-effects-glass](https://github.com/4v3ngR/kwin-effects-glass). Simulates exact dielectric refraction using Snell's Law (`refract()`), computes caustic bevel surface normals using rounded-rectangle Signed Distance Function (SDF) gradients, applies corner optical displacement, replaces artificial borders with natural dual-highlight/shadow rim profiles, and preserves color vibrancy in perceptually uniform Oklab color space.
- **`mode "liquid"`** (Fluid Liquid Glass): A fluid water-drop optical engine with organic surface-tension curvature, central magnification, and barrel lens distortion.

---

## Quick Setup Guide

### 1. Enable Rounded Corners (Required)
The physical glass bevels calculate their curvature normals from the window geometry. Rounded corners are essential for authentic edge refraction:

```kdl
window-rule {
    geometry-corner-radius 12
    clip-to-geometry true
}
```

### 2. Add the Glass Effect Rule
Lniri loads its configuration from:
- `~/.config/lniri/config.kdl`
- `~/.config/niri/config.kdl` (automatic fallback)

Simply insert the `liquid-glass` block inside `background-effect`:

```kdl
window-rule {
    match app-id=".*"

    background-effect {
        blur true
        xray true

        liquid-glass {
            mode "kwin-glass"
            refraction-strength 4.0
            power-factor 3.0
            refraction-bevel-intensity 10.0
            refraction-offset-strength 8.0
            edge-thickness 0.18
            fringing 0.45
            glow-weight 0.20
            edge-lighting 0.60
            oklab-saturation 1.0
            saturation 1.15
        }
    }
}
```

> [!NOTE]
> Changes to `config.kdl` are **hot-reloaded instantly**. You will see the shader changes in real-time as soon as the file is saved.

---

## Window Rules (Applications & Terminals)

For semi-transparent terminal emulators (Ghostty, Alacritty, Kitty, Foot) or code editors, configure the window rule to eliminate window borders and let the glass rim serve as the natural boundary:

```kdl
window-rule {
    match app-id="^(Alacritty|kitty|com.mitchellh.ghostty|foot)$"
    draw-border-with-background false

    background-effect {
        blur true
        xray true // See through to wallpaper across the entire workspace

        liquid-glass {
            mode "kwin-glass"
            refraction-strength 4.2
            power-factor 3.2
            refraction-bevel-intensity 11.0
            refraction-offset-strength 8.5
            edge-thickness 0.19
            fringing 0.50
            glow-weight 0.22
            edge-lighting 0.70
            oklab-saturation 1.0
            saturation 1.18
        }
    }
}
```

---

## Layer Surface Rules (Bars, Docks, Launchers)

Lniri applies optical glass shaders to Wayland layer surfaces such as **Waybar**, **Mistbar**, **Fuzzel**, **Rofi-Wayland**, or **DMS**:

```kdl
layer-rule {
    match namespace="^waybar.*"
    match namespace="^mistbar.*"
    match namespace="^bar.*"
    match namespace="^launcher.*"
    geometry-corner-radius 14

    background-effect {
        blur true
        // Set xray false if you want your bar to refract windows sitting behind it!
        xray false

        liquid-glass {
            mode "kwin-glass"
            refraction-strength 4.5
            power-factor 3.5
            refraction-bevel-intensity 12.0
            refraction-offset-strength 9.0
            edge-thickness 0.20
            fringing 0.45
            glow-weight 0.25
            edge-lighting 0.80
            oklab-saturation 1.0
            saturation 1.20
        }
    }
}
```

---

## Curated Presets

Copy and paste any of the following presets directly into your `liquid-glass { ... }` block:

### Preset 1: Authentic KWin Glass (Balanced & Realistic)
Faithful reproduction of standard `kwin-effects-glass` optics with natural caustic bevels and subtle rainbow fringing:

```kdl
liquid-glass {
    mode "kwin-glass"
    refraction-strength 4.0
    power-factor 3.0
    refraction-bevel-intensity 10.0
    refraction-offset-strength 8.0
    edge-thickness 0.18
    fringing 0.45
    glow-weight 0.20
    edge-lighting 0.60
    oklab-saturation 1.0
    saturation 1.15
    brightness 1.0
    contrast 1.0
}
```

### Preset 2: Frosted KWin Glass (Minimal Reflection & Crystal Clarity)
Soft, low-reflection crystal appearance ideal for dense code and reading:

```kdl
liquid-glass {
    mode "kwin-glass"
    refraction-strength 2.5
    power-factor 2.5
    refraction-bevel-intensity 8.0
    refraction-offset-strength 6.0
    edge-thickness 0.15
    fringing 0.25
    glow-weight 0.05
    edge-lighting 0.20
    oklab-saturation 1.0
    saturation 1.05
    brightness 1.02
    contrast 1.0
}
```

### Preset 3: Cyberpunk Neon Rim (Intense Glow & Chromatic Dispersion)
Pronounced refractive borders with vibrant RGB prism fringing and specular rims:

```kdl
liquid-glass {
    mode "kwin-glass"
    refraction-strength 5.5
    power-factor 3.8
    refraction-bevel-intensity 15.0
    refraction-offset-strength 12.0
    edge-thickness 0.22
    fringing 0.75
    glow-weight 0.55
    edge-lighting 1.20
    oklab-saturation 1.0
    saturation 1.30
    brightness 1.05
    contrast 1.05
}
```

### Preset 4: Deep Fluid Water-Drop (Original Liquid Engine)
Fluid droplet meniscus with surface tension magnification:

```kdl
liquid-glass {
    mode "liquid"
    liquidity 0.85
    refraction-strength 4.0
    power-factor 3.5
    refraction-power 1.5
    fringing 0.45
    saturation 1.15
    vibrancy 0.35
    lens-distortion 0.15
    physical-refraction 1.0
}
```

---

## Complete Parameter Reference

| Parameter | Engine | Default | Typical Range | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`mode`** | Both | `"liquid"` | `"kwin-glass"` / `"liquid"` | Switches between the authentic KWin Glass engine and the fluid water-drop engine. |
| **`refraction-strength`** | Both | `4.0` | `1.0` – `6.0` | Index of refraction magnitude ($IOR = 1.0 + \text{strength} \times 0.02$). |
| **`power-factor`** | Both | `3.0` | `2.0` – `15.0` | Curvature steepness of the glass edge (equivalent to `RefractionNormalPow`). |
| **`refraction-bevel-intensity`** | KWin | `10.0` | `1.0` – `25.0` | Finite-difference normal scaling. Higher values produce steeper 3D caustic bevels. |
| **`refraction-offset-strength`** | KWin | `8.0` | `1.0` – `20.0` | Corner optical displacement magnitude. |
| **`edge-thickness`** | KWin | `0.18` | `0.05` – `0.35` | Width of the refractive meniscus bevel relative to the window half-size. |
| **`fringing`** | Both | `0.45` | `0.0` – `1.0` | Cauchy chromatic dispersion split between Red, Green, and Blue light rays. |
| **`glow-weight`** | Both | `0.20` | `0.0` – `0.8` | Intensity of dual specular rim highlights along the outer boundary. |
| **`edge-lighting`** | Both | `0.60` | `0.0` – `1.5` | Dynamic wallpaper light transmission through the meniscus boundary. |
| **`oklab-saturation`** | KWin | `1.0` | `0.0` or `1.0` | `1.0` enables perceptually uniform Oklab color saturation; `0.0` disables it. |
| **`saturation`** | Both | `1.15` | `0.5` – `1.5` | Color saturation multiplier. |
| **`brightness`** | Both | `1.0` | `0.8` – `1.3` | Post-refraction brightness multiplier. |
| **`contrast`** | Both | `1.0` | `0.8` – `1.3` | Post-refraction contrast multiplier. |
| **`liquidity`** | Liquid | `0.8` | `0.0` – `2.0` | Controls fluid droplet surface-tension curvature. |
| **`refraction-power`** | Liquid | `1.5` | `0.5` – `2.5` | Falloff exponent on displacement vectors. |
| **`lens-distortion`** | Liquid | `0.15` | `0.0` – `0.5` | Subtle center-outward barrel lens distortion. |

---

## Standalone GLSL Shader Usage

A self-contained, documented GLSL fragment shader is available in the repository at:
[`resources/shaders/kwin-glass.frag`](resources/shaders/kwin-glass.frag)

### Uniform Inputs Reference
If you are inspecting or reusing the GLSL shader in custom rendering pipelines, it expects the following standard uniforms:

```glsl
uniform sampler2D tex;                  // Background wallpaper / blurred framebuffer
uniform float     alpha;                // Window surface opacity [0.0 - 1.0]
uniform float     niri_scale;           // Display scaling factor (1.0, 1.5, 2.0)
uniform vec2      geo_size;             // Window dimensions in physical pixels
uniform vec4      corner_radius;        // Corner radii: vec4(TopLeft, TopRight, BottomRight, BottomLeft)
uniform mat3      input_to_geo;         // Transformation matrix from texture to window geometry

// KWin Glass Uniforms
uniform float     lg_refraction_strength;
uniform float     lg_power_factor;
uniform float     lg_bevel_intensity;
uniform float     lg_offset_strength;
uniform float     lg_edge_thickness;
uniform float     lg_fringing;
uniform float     lg_glow_weight;
uniform float     lg_edge_lighting;
uniform float     lg_oklab_saturation;
uniform float     lg_saturation;
uniform float     lg_brightness;
uniform float     lg_contrast;
```

---

## Tips & Troubleshooting

1. **Why don't I see any curved refraction on the edges?**  
   Ensure your window rule has `geometry-corner-radius` set (e.g. `12` or `16`). The caustic normal generator relies on the rounded rectangle SDF distance field to compute surface angles.

2. **How do I get clear crystal glass without frosted blur?**  
   Set `blur false` inside `background-effect`:
   ```kdl
   background-effect {
       blur false
       xray true
       liquid-glass {
           mode "kwin-glass"
           ...
       }
   }
   ```

3. **What is `xray true` vs `xray false`?**  
   - `xray true`: The glass effect looks straight through all open windows directly to the root desktop wallpaper.
   - `xray false`: The glass refracts whatever is immediately underneath that specific window (including other open windows, desktop icons, etc.).

4. **Hot Reloading:**  
   You do not need to restart Lniri or log out. Modifying any value in `~/.config/niri/config.kdl` or `~/.config/lniri/config.kdl` immediately updates the live desktop.
