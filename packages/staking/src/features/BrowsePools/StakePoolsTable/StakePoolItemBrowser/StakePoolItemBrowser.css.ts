import { style, vars } from '@lace/ui';
import { theme } from 'features/theme';

export const row = style([
  {
    borderRadius: '15px',
    cursor: 'pointer',
    display: 'grid',
    flex: '1',
    gap: vars.spacing.$20,
    gridAutoColumns: 'minmax(0, 1fr)',
    gridAutoFlow: 'column',
    height: '68px',
    minHeight: '68px',
    padding: `0 ${vars.spacing.$20}`,
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
      [` &${row}:hover`]: {
        background: vars.colors.$buttons_secondary_container_bgColor_pressed,
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
      [`${withMultiDelegation}:hover &:nth-last-child(2)`]: {
        display: 'none',
      },
    },
  },
]);

export const actions = style([
  {
    alignItems: 'center',
    display: 'none',
    justifyContent: 'flex-end',
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
    selectors: {
      [`${withMultiDelegation}:hover &`]: {
        display: 'none',
      },
      [`${withMultiDelegation}:hover :first-child &`]: {
        display: 'block',
        textAlign: 'center',
      },
    },
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
  },
]);
