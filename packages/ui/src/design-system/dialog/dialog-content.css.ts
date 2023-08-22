import { style, sx } from '../../design-tokens';

export const dialogContent = style([
  sx({
    padding: '$40',
    borderRadius: '$medium',
    boxShadow: '$dialog',
    backgroundColor: '$dialog_container_bgColor',
    gap: '$24',
    width: {
      popupScreen: '$dialog_width_popup',
      smallScreen: '$dialog_width_browser',
    },
  }),
  {
    display: 'flex',
    flexDirection: 'column',
  },
]);
