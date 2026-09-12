#version 100
precision highp float;

// ============================================================================
// KWin Glass GLSL Fragment Shader for Niri / Lniri
// Faithful port of kwin-effects-glass (https://github.com/4v3ngR/kwin-effects-glass)
// Author: AbsolOrg / Lniri
//
// Features:
// 1. Physically-based Snell's Law Refraction through curved dielectric boundaries
// 2. Caustic Bevel Normal Estimation via rounded-rectangle SDF gradient
// 3. Corner Optical Displacement & Surface Normal weighting
// 4. Cauchy RGB Chromatic Dispersion (fringing)
// 5. Dual-highlight and shadow rim outline profiles (photorealistic glass bevel)
// 6. Oklab Perceptually-Uniform Color Saturation
// ============================================================================

uniform sampler2D tex;              // Background wallpaper / blurred buffer
varying vec2 v_coords;              // Normalized texture coordinates [0.0, 1.0]

uniform float alpha;                // Window surface alpha
uniform float niri_scale;           // Display scaling factor (e.g. 1.0, 1.5, 2.0)
uniform vec2 geo_size;              // Geometry size in physical pixels
uniform vec4 corner_radius;         // Vec4 corner radii: x=TL, y=TR, z=BR, w=BL
uniform mat3 input_to_geo;          // Coordinate transformation matrix

// Glass parameters (configurable in config.kdl under liquid-glass)
uniform float lg_refraction_strength;    // Optical refraction index (IOR = 1.0 + strength)
uniform float lg_power_factor;           // Normal curvature power (RefractionNormalPow)
uniform float lg_bevel_intensity;        // Caustic bevel depth (RefractionBevelIntensity)
uniform float lg_offset_strength;        // Corner optical distortion (RefractionOffsetStrength)
uniform float lg_edge_thickness;         // Refractive border width relative to minHalfSize
uniform float lg_fringing;               // RGB Chromatic dispersion / Cauchy split
uniform float lg_glow_weight;            // Specular rim highlight & outline intensity
uniform float lg_edge_lighting;          // Edge illumination boost
uniform float lg_oklab_saturation;       // Toggle for Oklab color space saturation
uniform float lg_saturation;             // Saturation multiplier
uniform float lg_brightness;             // Brightness multiplier
uniform float lg_contrast;               // Contrast multiplier

struct GlassFragment {
    vec4 color;
    float dist;
    float edgeFactor;
    float concaveFactor;
    vec3 normal;
    float ior;
};

// Rounded-rectangle Signed Distance Function (SDF)
// p: coordinates relative to window center
// b: half-dimensions of the window
// r: corner radius vec4(TL, TR, BR, BL)
float roundedRectangleDist(vec2 p, vec2 b, vec4 r)
{
    float radius = p.x > 0.0
        ? (p.y > 0.0 ? r.y : r.z)   // Right: Top-Right (r.y), Bottom-Right (r.z)
        : (p.y > 0.0 ? r.x : r.w);  // Left: Top-Left (r.x), Bottom-Left (r.w)
    vec2 q = abs(p) - b + radius;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

// ----------------------------------------------------------------------------
// Oklab Perceptual Color Space Functions
// ----------------------------------------------------------------------------
vec3 srgbToLinear(vec3 c)
{
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

vec3 linearToSrgb(vec3 c)
{
    return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

vec3 linearToOklab(vec3 c)
{
    float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
    float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
    float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;

    float l_ = pow(max(l, 0.0), 1.0 / 3.0);
    float m_ = pow(max(m, 0.0), 1.0 / 3.0);
    float s_ = pow(max(s, 0.0), 1.0 / 3.0);

    return vec3(
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    );
}

vec3 oklabToLinear(vec3 c)
{
    float l_ = c.r + 0.3963377774 * c.g + 0.2158037573 * c.b;
    float m_ = c.r - 0.1055613458 * c.g - 0.0638541728 * c.b;
    float s_ = c.r - 0.0894841775 * c.g - 1.2914855480 * c.b;

    float l = l_ * l_ * l_;
    float m = m_ * m_ * m_;
    float s = s_ * s_ * s_;

    return vec3(
         4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
}

vec3 oklabSaturate(vec3 srgb, float sat)
{
    if (abs(sat - 1.0) < 0.001) {
        return srgb;
    }
    vec3 lab = linearToOklab(srgbToLinear(clamp(srgb, 0.0, 1.0)));
    lab.gb *= sat;
    return linearToSrgb(clamp(oklabToLinear(lab), 0.0, 1.0));
}

// ----------------------------------------------------------------------------
// Snell's Law Sample Processor with Cauchy RGB Dispersion
// ----------------------------------------------------------------------------
vec4 processSample(
    vec2 baseUv,
    vec3 glassNormal,
    float ior,
    float dispersion,
    float magnitude,
    vec2 uvScale,
    vec2 lensShift
) {
    vec3 viewRay = vec3(0.0, 0.0, -1.0);

    vec3 refractG = refract(viewRay, glassNormal, 1.0 / ior);
    vec2 dir = length(refractG.xy) > 0.001 ? normalize(refractG.xy) : vec2(0.0);
    vec2 shiftG = vec2(dir.x, -dir.y) * magnitude * uvScale + vec2(lensShift.x, -lensShift.y);
    vec4 sampleG = texture2D(tex, clamp(baseUv + shiftG, 0.0, 1.0));

    if (dispersion > 0.001) {
        float fringe = clamp(dispersion, 0.0, 1.0) * 0.3;
        vec2 shiftR = vec2(dir.x, -dir.y) * (magnitude * (1.0 + fringe)) * uvScale + vec2(lensShift.x, -lensShift.y);
        vec2 shiftB = vec2(dir.x, -dir.y) * (magnitude * (1.0 - fringe)) * uvScale + vec2(lensShift.x, -lensShift.y);

        float r = texture2D(tex, clamp(baseUv + shiftR, 0.0, 1.0)).r;
        float b = texture2D(tex, clamp(baseUv + shiftB, 0.0, 1.0)).b;
        return vec4(r, sampleG.g, b, sampleG.a);
    }
    return sampleG;
}

// ----------------------------------------------------------------------------
// Snell's Law Refraction Engine
// ----------------------------------------------------------------------------
GlassFragment kwinSnellsRefraction(
    vec2 uv_tex,
    vec2 position,
    vec2 halfBlurSize,
    vec4 cornerRadius,
    vec2 uvScale,
    float minHalfSize,
    float dist,
    float edgeFactor,
    float concaveFactor,
    float refractionStrength,
    float refractionBevelIntensity,
    float refractionOffsetStrength,
    float refractionRGBFringing
) {
    float bandWidth = clamp(minHalfSize * lg_edge_thickness, 0.1, minHalfSize * 0.9);
    float ior = 1.0 + refractionStrength;

    float minR = min(min(cornerRadius.x, cornerRadius.y), min(cornerRadius.z, cornerRadius.w));
    float eps = min(bandWidth * 0.75, max(minR * 0.6, 1.0));
    float dxp = roundedRectangleDist(position + vec2(eps, 0.0), halfBlurSize, cornerRadius);
    float dxn = roundedRectangleDist(position - vec2(eps, 0.0), halfBlurSize, cornerRadius);
    float dyp = roundedRectangleDist(position + vec2(0.0, eps), halfBlurSize, cornerRadius);
    float dyn = roundedRectangleDist(position - vec2(0.0, eps), halfBlurSize, cornerRadius);
    vec2 smoothGrad = vec2(dxp - dxn, dyp - dyn);
    float gradLen = length(smoothGrad);

    float normalHeight = concaveFactor * refractionBevelIntensity;
    vec2 normalXY = gradLen > 0.001 ? (smoothGrad / gradLen) * normalHeight : vec2(0.0);
    vec3 glassNormal = normalize(vec3(normalXY, 1.0));

    float lensMagnitude = concaveFactor * bandWidth * refractionBevelIntensity;
    vec2 surfaceNormal = gradLen > 0.001 ? (smoothGrad / gradLen) : vec2(1.0, 0.0);

    vec2 normalizedPos = position / (halfBlurSize * 2.0);
    float cornerWeight = dot(normalizedPos, normalizedPos) * refractionOffsetStrength;
    surfaceNormal += normalizedPos * concaveFactor * cornerWeight;

    vec2 lensShift = -surfaceNormal * lensMagnitude * uvScale;
    float refractionMagnitude = lensMagnitude * refractionStrength;
    vec4 color = processSample(uv_tex, glassNormal, ior, refractionRGBFringing, refractionMagnitude, uvScale, lensShift);

    return GlassFragment(color, dist, edgeFactor, concaveFactor, glassNormal, ior);
}

// ----------------------------------------------------------------------------
// Glass Glow & Rim Caustic Illumination
// ----------------------------------------------------------------------------
vec3 kwinGlassGlow(vec2 position, GlassFragment s, float glowStrength, float edgeLighting)
{
    float rimMask = clamp(0.25 * s.concaveFactor, 0.0, glowStrength);
    vec3 glowColor = vec3(1.0);
    vec3 glow = mix(s.color.rgb, glowColor, rimMask);
    if (edgeLighting > 0.0) {
        glow += (s.color.rgb * s.concaveFactor * edgeLighting);
    }
    return glow;
}

// ----------------------------------------------------------------------------
// Photorealistic Dual-Highlight / Shadow Rim Outline
// ----------------------------------------------------------------------------
vec3 kwinGlassOutline(vec2 position, vec2 blurSize, GlassFragment s, float glowStrength)
{
    vec3 glow = s.color.rgb;

    if (glowStrength > 0.0) {
        float edgeMask = smoothstep(0.0, -2.0 * niri_scale, s.dist);
        float borderInner = smoothstep(-1.0 * niri_scale, -3.0 * niri_scale, s.dist);
        float edgeProfile = edgeMask - borderInner;
        float thicknessShadow = pow(max(edgeProfile, 0.0), 0.9);
        float shadowMask = smoothstep(blurSize.y * 0.7, -blurSize.y * 0.7, position.y) *
                           smoothstep(blurSize.x * 0.7, -blurSize.x * 0.7, position.x);
        float highlightMask = smoothstep(-blurSize.y * 0.7, blurSize.y * 0.7, position.y) *
                              smoothstep(-blurSize.x * 0.7, blurSize.x * 0.7, position.x);

        glow = mix(glow, vec3(1.0), thicknessShadow * shadowMask * glowStrength);
        glow = mix(glow, vec3(1.0), thicknessShadow * highlightMask * glowStrength);
    }

    return glow;
}

void main()
{
    vec3 coords_geo = input_to_geo * vec3(v_coords, 1.0);

    if (coords_geo.x < 0.0 || coords_geo.x > 1.0 || coords_geo.y < 0.0 || coords_geo.y > 1.0) {
        gl_FragColor = vec4(0.0);
        return;
    }

    vec2 winSize = geo_size;
    vec2 halfWinSize = winSize * 0.5;
    vec2 winPixel = coords_geo.xy * geo_size;

    vec2 position = winPixel - halfWinSize;
    position.y = -position.y;

    float dist = roundedRectangleDist(position, halfWinSize, corner_radius);

    float aaWidth = 1.5 * niri_scale;
    float edgeAlpha = clamp(0.5 - dist / aaWidth, 0.0, 1.0);
    edgeAlpha = edgeAlpha * edgeAlpha * (3.0 - 2.0 * edgeAlpha);

    if (edgeAlpha <= 0.0) {
        gl_FragColor = vec4(0.0);
        return;
    }

    // Physical pixel scale
    vec2 dU = vec2(input_to_geo[0][0], input_to_geo[0][1]);
    vec2 dV = vec2(input_to_geo[1][0], input_to_geo[1][1]);
    vec2 texPixels = max(vec2(length(dU) * winSize.x, length(dV) * winSize.y), vec2(1.0));
    vec2 uvScale = 1.0 / texPixels;

    float minHalfSize = min(halfWinSize.x, halfWinSize.y);
    float minEsp = clamp(minHalfSize * lg_edge_thickness, 0.1, minHalfSize * 0.9);
    float edgeFactor = 1.0 - clamp(abs(dist) / minEsp, 0.0, 1.0);
    float concaveFactor = 1.0 - sqrt(max(0.0, 1.0 - pow(smoothstep(0.0, 1.0, edgeFactor), lg_power_factor)));

    vec4 color = texture2D(tex, v_coords);
    GlassFragment s;

    if (lg_refraction_strength > 0.0) {
        vec4 r = clamp(corner_radius * 2.0, min(64.0 * niri_scale, minHalfSize), min(128.0 * niri_scale, minHalfSize));
        s = kwinSnellsRefraction(
            v_coords, position, halfWinSize, r, uvScale,
            minHalfSize, dist, edgeFactor, concaveFactor,
            lg_refraction_strength, lg_bevel_intensity, lg_offset_strength, lg_fringing
        );
    } else {
        s = GlassFragment(color, dist, edgeFactor, concaveFactor, vec3(0.0, 0.0, 1.0), 1.0);
    }

    vec3 rgb = s.concaveFactor < 1.0 ? kwinGlassGlow(position, s, lg_glow_weight, lg_edge_lighting) : s.color.rgb;
    s.color.rgb = rgb;
    rgb = kwinGlassOutline(position, winSize, s, lg_glow_weight);

    // Color adjustments
    if (lg_oklab_saturation > 0.5) {
        rgb = oklabSaturate(rgb, lg_saturation);
    } else if (abs(lg_saturation - 1.0) > 0.01) {
        float lum = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
        rgb = clamp(mix(vec3(lum), rgb, lg_saturation), 0.0, 1.0);
    }

    if (abs(lg_brightness - 1.0) > 0.01) {
        rgb *= lg_brightness;
    }
    if (abs(lg_contrast - 1.0) > 0.01) {
        rgb = clamp(mix(vec3(0.5), rgb, lg_contrast), 0.0, 1.0);
    }

    gl_FragColor = vec4(rgb, s.color.a) * edgeAlpha * alpha;
}
