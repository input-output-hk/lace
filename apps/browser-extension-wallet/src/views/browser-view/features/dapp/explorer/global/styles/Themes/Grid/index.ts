/* eslint-disable no-magic-numbers */
import { IGrid, AlignItems, PaddingLength } from './types';
import { toRem } from '../../Utils/ToRem.styles';
import { GridColumnSizeEnum } from './enum';

/**
 * Default grid size: 4
 */
export const grid: IGrid['grid'] = {
  container: {
    display: 'grid'
  },
  setDisplay: (props) => {
    if (props.flex) return 'flex';
    if (props.grid) return 'grid';
    return 'block';
  },
  columnsSize: {
    1: GridColumnSizeEnum.ONE_WHOLE,
    2: GridColumnSizeEnum.ONE_WHOLE / 2,
    3: GridColumnSizeEnum.ONE_WHOLE / 3,
    4: GridColumnSizeEnum.ONE_WHOLE / 4,
    5: GridColumnSizeEnum.ONE_WHOLE / 5,
    6: GridColumnSizeEnum.ONE_WHOLE / 6
  }
  // getColumnSize(size, gap) {
  //   if (size)
  //     return `
  //       flex: ${this.columnsSize[size]};
  //       flex-basis: calc(${this.columnsSize[size] * 100}% - ${toRem((gap || 0) / size)});
  //     `;
  //   return '';
  // },
  // gridItem: {
  //   aligItems: ({ justify, align }: AlignItems): string => `
  //   ${justify ? `justify-content: ${justify}` : ''};
  //   ${align ? `align-items: ${align}` : ''};
  //   `,
  //   setPadding: (paddings: PaddingLength): string => {
  //     if (paddings.length === 0) return '';
  //     const [...paddingValues] = paddings.map((value) => toRem(value));
  //     const formatedValues = `${paddingValues}`.replace(/,/g, ' ');
  //     return `
  //       padding: ${formatedValues};
  //     `;
  //   }
  // }
};
