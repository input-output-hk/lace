import { sx } from '../../design-tokens';

export const dialogActions = sx({
  display: 'flex',
  justifyContent: 'center',
  gap: '$16',
  flexDirection: {
    popupScreen: 'column-reverse',
    smallScreen: 'row',
  },
});
