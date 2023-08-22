import { sx } from '../../design-tokens';

export const dialogActions = sx({
  display: 'flex',
  justifyContent: 'center',
  gap: '$16',
  // TODO waiting for design team decision
  paddingTop: '$8',
  flexDirection: {
    popupScreen: 'column-reverse',
    smallScreen: 'row',
  },
});
