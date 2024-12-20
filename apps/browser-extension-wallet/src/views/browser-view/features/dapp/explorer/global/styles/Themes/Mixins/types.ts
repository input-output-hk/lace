import { FixedLengthArray } from '../../../../@types/fixed-length-array.types';
import { IColors } from '../Colors/types';

export type MarginType = 'auto' | '0 auto' | 'auto 0';

export type RuleLengthArray =
  | FixedLengthArray<[number]>
  | FixedLengthArray<[number, number]>
  | FixedLengthArray<[number, number, number]>
  | FixedLengthArray<[number, number, number, number]>
  | [];

export interface IElementSizes {
  size?: number;
  width?: number;
  height?: number;
}
export interface IMixins {
  mixins: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setPadding: (props?: RuleLengthArray, isStyleObject?: boolean) => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSpacer: (space?: number, isStyleObject?: boolean) => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setMargin: (props?: RuleLengthArray, isStyleObject?: boolean) => any;
    setSize: (sizes: IElementSizes) => Record<string, number>;
    setColor: (color?: keyof IColors['colors']) => Partial<Record<string, string>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setBackground: (color?: any) => Partial<Record<string, string>>;
    setObjectFit: (
      value?: React.CSSProperties['objectFit']
    ) => Partial<Record<'objectFit', React.CSSProperties['objectFit']>>;
    toRem: (value: number) => string;
  };
}
