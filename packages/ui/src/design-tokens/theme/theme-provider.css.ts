import { style } from '@vanilla-extract/css';

import { vars } from './theme-contract.css';

export const root = style({
  color: vars.colors.$lace_typography_main_color,
});
