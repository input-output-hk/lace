import { style, sx } from '../../../design-tokens';

export const border = style([
  sx({
    borderColor: '$variants_table_borderColor',
  }),
  {
    borderCollapse: 'collapse',
    borderStyle: 'solid',
    borderWidth: '1px',
  },
]);

export const table = style([
  border,
  sx({
    background: '$variants_table_bgColor',
    width: '$fill',
  }),
  {
    tableLayout: 'fixed',
  },
]);

export const header = style([
  border,
  sx({ height: '$64', px: '$24' }),
  {
    textAlign: 'left',
  },
]);
