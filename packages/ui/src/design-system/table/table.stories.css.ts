import { globalStyle } from '@vanilla-extract/css';

import { vars } from '../../design-tokens';

globalStyle('*', {
  fontFamily: vars.fontFamily.$nova,
});
