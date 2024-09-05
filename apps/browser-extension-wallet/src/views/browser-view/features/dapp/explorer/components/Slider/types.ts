// eslint-disable-next-line import/no-unresolved
import { SwiperProps } from 'swiper/react';
import { NavigationOptions } from 'swiper/types';
import { IReturnItemFromArray } from '../../@types/index';

export type ExtractObjectFromData<Data> = Data extends unknown[]
  ? IReturnItemFromArray<Data> extends Record<string, unknown>
    ? IReturnItemFromArray<Data>
    : any
  : any;

export interface ISlider<Data> extends Omit<SwiperProps, 'navigation'> {
  data: Data extends any[] ? Data : never;
  navigation: NavigationOptions;
  id?: string;
  narrowArrows?: boolean;
  horizontal?: boolean;
  itemProps?: (item: ExtractObjectFromData<Data>) => any;
  buttonSolid?: boolean;
  buttonStandard?: boolean;
  fallback?: React.ReactElement;
}
