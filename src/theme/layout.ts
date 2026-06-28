export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 28,
} as const;

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  overline: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  display: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 26,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  metric: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 22,
  },
};
