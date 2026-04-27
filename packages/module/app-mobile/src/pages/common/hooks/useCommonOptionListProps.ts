import { useTheme } from '@lace-lib/ui-toolkit';
import { Dimensions } from 'react-native';

export const useCommonOptionListProps = () => {
  const { theme } = useTheme();
  const windowWidth = Dimensions.get('window').width;

  const isTablet = windowWidth > 768 && windowWidth < 1024;

  const isDark = theme.name === 'dark';
  const backgroundColor = theme.background.primary;
  const colors = !isDark
    ? ([
        'rgba(211,211,211,0)',
        'rgba(211,211,211,0.9)',
        'rgba(211,211,211,0.8)',
        'rgba(211,211,211,0.7)',
        'rgba(211,211,211,0.6)',
        'rgba(211,211,211,0.5)',
        backgroundColor,
      ] as const)
    : ([
        'rgba(0,0,0,0.5)',
        'rgba(0,0,0,0.6)',
        'rgba(0,0,0,0.6)',
        'rgba(0,0,0,0.7)',
        backgroundColor,
      ] as const);

  return {
    colors,
    isTablet,
  };
};
