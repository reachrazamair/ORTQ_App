import { Platform } from 'react-native';

export const Fonts = {
  gothamBold: Platform.select({
    ios: 'Gotham-Bold',
    android: 'gotham_bold',
  }) as string,
  firaSansRegular: Platform.select({
    ios: 'FiraSans-Regular',
    android: 'fira_sans_regular',
  }) as string,
  firaSansBold: Platform.select({
    ios: 'FiraSans-Bold',
    android: 'fira_sans_bold',
  }) as string,
};
