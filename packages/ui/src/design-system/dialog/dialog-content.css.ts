import { style, sx } from '../../design-tokens';

export const dialogContent = style([
  sx({
    padding: '$40',
    borderRadius: '$medium',
    boxShadow: '$dialog',
    backgroundColor: '$dialog_container_bgColor',
    gap: '$24',
    width: {
      popupScreen: '$312',
      smallScreen: '$480',
    },
  }),
  {
    display: 'flex',
    flexDirection: 'column',
  },
]);
