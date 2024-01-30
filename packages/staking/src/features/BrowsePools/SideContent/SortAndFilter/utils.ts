import { CSSProperties } from 'react';

// can this be done with sprinkles?
export const groupedTextBoxStyle = (length: number, idx: number): CSSProperties => ({
  ...(length > 0 && {
    ...(idx === 0 && {
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 0,
      borderRight: 'red 1px solid',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 0,
    }),
    ...(idx > 0 && {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 16,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 16,
    }),
  }),
});
