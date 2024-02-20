import { style, vars } from '@lace/ui';
import { theme } from 'features/theme';

export const wrapper = style([
  {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    marginTop: '-3px',
    paddingTop: '3px',
    width: '100%',
  },
]);

export const stakepoolTable = style([
  {
    width: '100%',
  },
]);

export const selectedPools = style([
  {
    selectors: {
      [`${stakepoolTable} &`]: {
        borderBottom: `1px solid ${theme.colors.$selectedPoolsSectionBorderColor}`,
        display: 'flex',
        flexDirection: 'column',
        marginBottom: vars.spacing.$24,
        paddingBottom: vars.spacing.$16,
      },
    },
  },
]);
