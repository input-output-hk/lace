import { createTheme } from '@vanilla-extract/css';

import { theme } from './dark-theme.css';
import { vars } from './theme-contract.css';

export const darkTheme = createTheme(vars, theme);
