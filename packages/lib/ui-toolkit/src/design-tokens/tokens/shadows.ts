import { Platform } from 'react-native';

import type { Theme } from '../theme';

export interface ShadowToken {
  innerShadowBlur: number;
  dropShadowBlur: number;
}

export type ShadowVariants = 'elevated' | 'inset';

const shadow: ShadowToken = {
  innerShadowBlur: 16,
  dropShadowBlur: 40,
};

const getBoxShadow = ({ theme }: { theme: Theme }) => {
  return {
    elevated: `0px 0px ${shadow.innerShadowBlur}px 0px ${theme.extra.shadowInner}, 0px 0px ${shadow.dropShadowBlur}px 0px ${theme.extra.shadowDrop}`,
    inset: `inset 0px 0px ${shadow.innerShadowBlur}px 0px ${theme.extra.shadowInnerStrong}, 0px 0px ${shadow.dropShadowBlur}px 0px ${theme.extra.shadowDrop}`,
  };
};

export const getShadowStyle = ({
  theme,
  variant,
}: {
  theme: Theme;
  variant: ShadowVariants;
}) => {
  if (Platform.OS === 'web') {
    const boxShadow = getBoxShadow({ theme })[variant];
    return {
      boxShadow,
      backdropFilter: 'blur(20px)',
    };
  }

  return {
    shadowColor: theme.extra.shadowInnerStrong,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  };
};
