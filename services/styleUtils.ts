// --- Helper functions for dynamic theme generation ---
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
};
const rgbToHex = (r: number, g: number, b: number): string => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
const lighten = (hex: string, percent: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const amount = Math.round(2.55 * percent);
    return rgbToHex(
        Math.min(255, rgb.r + amount),
        Math.min(255, rgb.g + amount),
        Math.min(255, rgb.b + amount)
    );
};
export const generatePalette = (baseColor: string) => {
    const rgb = hexToRgb(baseColor);
    if (!rgb) return {};
    return {
        '--dynamic-accent-start': baseColor,
        '--dynamic-accent-end': lighten(baseColor, 15),
        '--dynamic-accent-highlight': lighten(baseColor, 30),
        '--dynamic-accent-glow': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
        '--dynamic-accent-color': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`,
    };
};
