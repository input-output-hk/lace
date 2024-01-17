import { style, vars } from '@lace/ui';
import { theme } from 'features/theme';

export const row = style([
  {
    alignItems: 'center',
    borderRadius: vars.radius.$medium,
    cursor: 'pointer',
    display: 'grid',
    flex: '1',
    gap: vars.spacing.$10,
    gridTemplateColumns: 'repeat(auto-fit, minmax(0px, 1fr))',
    height: vars.spacing.$44,
    minHeight: vars.spacing.$44,
    selectors: {
      '&:hover': {
        background: theme.colors.$stakePoolItemBgHover,
        height: '50px',
        margin: '-3px 0',
        minHeight: '50px',
      },
    },
  },
]);

export const selectable = style([
  {
    selectors: {
      [`&${row}`]: {
        gridTemplateColumns: '28px repeat(auto-fit, minmax(0px, 1fr))',
      },
    },
  },
]);

export const cell = style([
  {
    color: theme.colors.$stakePoolItemTextColor,
    display: 'flex',
    fontSize: vars.fontSizes.$16,
    fontWeight: vars.fontWeights.$medium,
    lineHeight: vars.spacing.$24,
    padding: `0 ${vars.spacing.$8}`,
    selectors: {
      [`${selectable} &:first-child`]: {
        justifyContent: 'flex-end',
        padding: 0,
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

// header styles
export const header = style([
  {
    cursor: 'default',
    selectors: {
      [`&${row}:hover`]: {
        background: 'initial',
        height: vars.spacing.$44,
        margin: '0',
        minHeight: vars.spacing.$44,
      },
    },
  },
]);

export const headerItem = style([
  {
    color: theme.colors.$stakePoolHeaderTextColor,
    padding: '0',
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
        alignItems: 'center',
        cursor: 'pointer',
      },
    },
  },
]);
