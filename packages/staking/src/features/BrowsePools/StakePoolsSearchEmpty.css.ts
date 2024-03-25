import { style, sx, vars } from '@lace/ui';

export const icon = style([
  {
    fontSize: vars.spacing.$112,
  },
]);

export const text = style([
  sx({
    color: '$text_secondary',
    lineHeight: '$32',
  }),
  {
    marginTop: `-${vars.spacing.$6}`,
    textAlign: 'center',
  },
]);
