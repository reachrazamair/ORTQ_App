import { Platform } from 'react-native';

export const Typography = {
  families: {
    primary: Platform.select({
      ios: 'gotham_regular',
      android: 'gotham_regular',
    }),
    secondary: Platform.select({
      ios: 'fira_sans_regular',
      android: 'fira_sans_regular',
    }),
    bold: 'gotham_bold',
    medium: 'gotham_medium',
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    huge: 32,
  },
  weights: {
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
  },
};
