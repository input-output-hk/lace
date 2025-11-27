/* eslint-disable no-magic-numbers */
import { FixedLengthArray } from '../../../../@types/fixed-length-array.types';

type GridDisplayTypes = 'grid' | 'inline-grid' | 'flex' | 'inline-flex';

export type ColumnsSize = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  6: number;
};

export type AlignTypes = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'normal';

export type DisplayTypes = {
  grid?: boolean;
  flex?: boolean;
};

export type DisplayReturnTypes = keyof DisplayTypes | 'block';

export type JustifyTypes = 'space-around' | 'space-between' | 'space-evenly';

export type PaddingLength =
  | FixedLengthArray<[number]>
  | FixedLengthArray<[number, number]>
  | FixedLengthArray<[number, number, number]>
  | FixedLengthArray<[number, number, number, number]>
  | [];
export interface AlignItems {
  justify?: AlignTypes | JustifyTypes;
  align?: AlignTypes;
}
export interface IGrid {
  grid: {
    setDisplay: (type: DisplayTypes) => DisplayReturnTypes;
    container: {
      display: GridDisplayTypes;
    };
    columnsSize: ColumnsSize;
    // getColumnSize: (columnSize?: keyof ColumnsSize, gap?: number) => string;
    // gridItem: {
    //   aligItems: ({ justify, align }: AlignItems) => string;
    //   setPadding: (props: PaddingLength) => string;
    // };
  };
}
