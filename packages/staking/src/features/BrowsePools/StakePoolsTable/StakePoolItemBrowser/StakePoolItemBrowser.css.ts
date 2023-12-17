import { style, vars } from '@lace/ui';
import { theme } from 'features/theme';

export const row = style([
  {
    borderRadius: '15px',
    cursor: 'pointer',
    display: 'grid',
    flex: '1',
    gap: vars.spacing.$20,
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    height: '68px',
    minHeight: '68px',
    padding: `22px ${vars.spacing.$10}`,
    selectors: {
      '&:hover': {
        background: vars.colors.$buttons_secondary_container_bgColor_pressed,
      },
      '&:nth-of-type(even)': {
        backgroundColor: theme.colors.$poolItemEvenBackground,
        borderRadius: vars.spacing.$16,
      },
    },
  },
]);

export const withMultiDelegation = style([
  {
    selectors: {
      [`&${row}`]: {
        cursor: 'default',
      },
      [` &${row}:hover`]: {
        background: vars.colors.$buttons_secondary_container_bgColor_pressed,
        gap: '0',
        gridTemplateColumns: 'calc(100% / 7) calc(100% / 7 * 6)',
        padding: '0',
      },
    },
  },
]);

export const cell = style([
  {
    ':first-child': {
      textAlign: 'center',
    },
    alignItems: 'center',
    color: vars.colors.$text_secondary,
    display: 'flex',
    fontSize: vars.fontSizes.$16,
    fontWeight: vars.fontWeights.$bold,
    lineHeight: vars.spacing.$24,
    selectors: {
      [`${withMultiDelegation}:hover &`]: {
        display: 'none',
      },
      [`${withMultiDelegation}:hover &:first-child`]: {
        display: 'flex',
      },
    },
  },
]);

export const actions = style([
  {
    alignItems: 'center',
    display: 'none',
    justifyContent: 'flex-end',
    paddingRight: vars.spacing.$10,
    selectors: {
      [`${withMultiDelegation}:hover &`]: {
        display: 'flex',
      },
    },
  },
]);
export const cellInner = style([
  {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
  },
]);
