import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  background: '#FFF9F4',
  surface: '#FFFFFF',
  coral: '#FF654F',
  coralSoft: '#FFE6E0',
  teal: '#17A89A',
  tealDark: '#11877C',
  mint: '#DDF6EF',
  orange: '#F6A84B',
  orangeSoft: '#FDEBD3',
  orangeTint: '#FFF4EA',
  sky: '#2F8FD8',
  skySoft: '#DCEFFB',
  lavender: '#7B61D9',
  lavenderSoft: '#ECE6FB',
  text: '#263238',
  textSecondary: '#6F7A82',
  textInverse: '#FFFFFF',
  border: '#ECE7E2',
  muted: '#F4EFEA',
  online: '#17A89A',
  danger: '#E5484D',
  overlay: 'rgba(38, 50, 56, 0.45)',
  scrimTop: 'rgba(0, 0, 0, 0)',
  scrimBottom: 'rgba(0, 0, 0, 0.72)',
  glass: 'rgba(38, 50, 56, 0.35)',
  frosted: 'rgba(255, 255, 255, 0.85)',
  coralHalo: 'rgba(255, 101, 79, 0.18)',
  skyHalo: 'rgba(47, 143, 216, 0.15)',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorName = keyof typeof colors;

/** Paired tones used by chips, feature icons and tags. */
export const tones = {
  coral: { background: colors.coralSoft, foreground: colors.coral },
  teal: { background: colors.mint, foreground: colors.tealDark },
  orange: { background: colors.orangeSoft, foreground: '#B26A12' },
  sky: { background: colors.skySoft, foreground: colors.sky },
  lavender: { background: colors.lavenderSoft, foreground: colors.lavender },
  neutral: { background: colors.muted, foreground: colors.textSecondary },
} as const;

export type Tone = keyof typeof tones;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  xxl: 28,
  pill: 999,
} as const;

export const fontFamily = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

const text = (fontSize: number, family: string, lineHeight: number): TextStyle => ({
  fontSize,
  fontFamily: family,
  lineHeight,
  color: colors.text,
});

export const typography = {
  display: text(34, fontFamily.black, 40),
  title: text(26, fontFamily.extraBold, 32),
  heading: text(20, fontFamily.extraBold, 26),
  subheading: text(17, fontFamily.bold, 22),
  body: text(15, fontFamily.regular, 21),
  bodyStrong: text(15, fontFamily.bold, 21),
  caption: text(13, fontFamily.medium, 18),
  small: text(11, fontFamily.bold, 14),
  button: text(16, fontFamily.extraBold, 20),
} as const;

export type TypographyVariant = keyof typeof typography;

const shadow = (elevation: number, opacity: number, blur: number, offsetY: number): ViewStyle =>
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#5A3A28',
      shadowOpacity: opacity,
      shadowRadius: blur,
      shadowOffset: { width: 0, height: offsetY },
    },
    default: { elevation, shadowColor: '#5A3A28' },
  });

export const shadows = {
  none: {} as ViewStyle,
  sm: shadow(2, 0.06, 6, 2),
  md: shadow(5, 0.09, 14, 6),
  lg: shadow(10, 0.14, 24, 12),
} as const;

export const layout = {
  screenPadding: spacing.xl,
  /** Floating tab bar height; scrollable tab screens pad their content by this. */
  tabBarHeight: 92,
  buttonHeight: 56,
  inputHeight: 52,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;

export const theme = { colors, tones, spacing, radius, typography, fontFamily, shadows, layout };
export type Theme = typeof theme;
