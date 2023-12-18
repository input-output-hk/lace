import { style, vars } from '@lace/ui';
import { theme } from 'features/theme';

export const wrapper = style([
  {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: '1',
    width: '100%',
  },
]);

export const listItemWrapper = style([
  {
    alignItems: 'center',
    borderBottom: 'none !important',
    height: '68px',
    padding: 0,
    selectors: {
      '&:nth-of-type(even)': {
        backgroundColor: theme.colors.$poolItemEvenBackground,
        borderRadius: vars.spacing.$16,
      },
    },
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
        paddingBottom: vars.spacing.$24,
      },
    },
  },
]);

export const header = style([
  {
    background: theme.colors.$tableHeaderBackground,
    borderRadius: '15px',
    display: 'grid',
    flex: '1',
    gap: vars.spacing.$20,
    gridAutoColumns: 'minmax(0, 1fr)',
    gridAutoFlow: 'column',
    padding: `22px ${vars.spacing.$20}`,
  },
]);

export const headerItem = style([
  {
    ':first-child': {
      justifyContent: 'center',
    },
    alignItems: 'center',
    color: vars.colors.$text_secondary,
    display: 'flex',
    fontSize: vars.fontSizes.$14,
    fontWeight: vars.fontWeights.$semibold,
    justifyContent: 'space-between',
    lineHeight: vars.spacing.$24,
  },
]);

export const active = style([
  {
    selectors: {
      [`&${headerItem}`]: {
        color: vars.colors.$text_primary,
      },
    },
  },
]);

export const withAction = style([
  {
    selectors: {
      [`&${headerItem}`]: {
        cursor: 'pointer',
      },
    },
  },
]);

export const triangle = style({
  borderLeft: `${vars.spacing.$4} solid ${vars.colors.$transparent}`,
  borderRight: `${vars.spacing.$4} solid ${vars.colors.$transparent}`,
});

export const desc = style([
  {
    selectors: {
      [`&${triangle}`]: {
        borderBottom: `7px solid ${vars.colors.$text_secondary}`,
      },
      [`${active} &`]: {
        borderBottomColor: vars.colors.$text_primary,
      },
    },
  },
]);

export const asc = style([
  {
    selectors: {
      [`&${triangle}`]: {
        borderTop: `7px solid ${vars.colors.$text_secondary}`,
      },
      [`${active} &`]: {
        borderTopColor: vars.colors.$text_primary,
      },
    },
  },
]);
