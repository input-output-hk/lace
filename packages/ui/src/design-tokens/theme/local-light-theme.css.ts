import { createTheme } from '@vanilla-extract/css';

import { theme } from './light-theme.css';
import { vars } from './theme-contract.css';

export const lightTheme = createTheme(vars, theme);
