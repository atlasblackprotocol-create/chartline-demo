import { Platform } from 'react-native';

// Palette sampled from the ChartLine logo, matching the SwiftUI app.
export const colors = {
  brand: 'rgb(66, 145, 245)',
  brandCyan: 'rgb(92, 191, 232)',
  brandMint: 'rgb(133, 250, 173)',
  brandDeep: 'rgb(31, 28, 41)',
  /** Navy from the logo background, used behind every screen. */
  appBackground: 'rgb(26, 26, 38)',
  /** Slightly lifted navy for cards and list rows. */
  cardBackground: 'rgb(41, 41, 59)',
  cardBorder: 'rgba(66, 69, 97, 0.6)',
  text: '#FFFFFF',
  secondary: 'rgba(235, 235, 245, 0.6)',
  tertiary: 'rgba(235, 235, 245, 0.3)',
  separator: 'rgba(84, 84, 88, 0.6)',
  green: '#30D158',
  orange: '#FF9F0A',
  red: '#FF453A',
  yellow: '#FFD60A',
  purple: '#BF5AF2',
};

export const brandGradient = [colors.brand, colors.brandCyan, colors.brandMint] as const;

/** react-native-svg text falls back to a serif face on web without an explicit family. */
export const svgFontFamily = Platform.OS === 'web' ? '-apple-system, "Helvetica Neue", Roboto, Arial, sans-serif' : undefined;

export const font = {
  caption2: 11,
  caption: 12,
  footnote: 13,
  subheadline: 15,
  body: 17,
  headline: 17,
  title3: 20,
  title2: 22,
  title: 28,
};
