import { vars, style } from '../../design-tokens';

export const row = style([
  {
    ':hover': {
      background: vars.colors.$stake_pool_item_bg_hover,
      height: '50px',
      margin: '-3px 0',
      minHeight: '50px',
    },
    alignItems: 'center',
    borderRadius: vars.radius.$medium,
    cursor: 'pointer',
    display: 'grid',
    flex: '1',
    gap: vars.spacing.$10,
    gridTemplateColumns: 'repeat(auto-fit, minmax(0px, 1fr))',
    height: vars.spacing.$44,
    minHeight: vars.spacing.$44,
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
    color: vars.colors.$stake_pool_item_text_color,
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
    fontFamily: vars.fontFamily.$nova,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
  },
]);

export const checkBoxWrapper = style({
  display: 'flex',
});

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
    color: vars.colors.$stake_pool_header_text_color,
    padding: '0',
    fontFamily: vars.fontFamily.$nova,
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

export const body = style([
  {
    height: vars.spacing.$fill,
  },
]);
