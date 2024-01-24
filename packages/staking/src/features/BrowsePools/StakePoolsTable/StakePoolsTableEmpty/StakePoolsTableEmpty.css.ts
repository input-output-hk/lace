import { style, vars } from '@lace/ui';

export const container = style([
  {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    justifyContent: 'center',
    marginTop: vars.spacing.$40,
    width: '100%',
  },
]);

export const icon = style([
  {
    fontSize: vars.spacing.$112,
  },
]);

export const text = style([
  {
    color: vars.colors.$text_secondary,
    fontSize: vars.fontSizes.$14,
    fontWeight: vars.fontWeights.$medium,
    lineHeight: vars.spacing.$32,
    marginTop: '-6px',
    textAlign: 'center',
  },
]);
