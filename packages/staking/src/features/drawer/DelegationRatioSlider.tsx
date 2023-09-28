import { IconButton } from '@lace/ui';
import * as Slider from '@radix-ui/react-slider';
import React from 'react';
import * as styles from './DelegationRatioSlider.css';
import SliderMinusIcon from './slider-minus.svg';
import SliderPlusIcon from './slider-plus.svg';

export type DelegationRatioSlider = Omit<Slider.SliderProps, 'value' | 'onValueChange' | 'defaultValue'> & {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
};

const CONSTRAINTS = {
  MAX: 100,
  MIN: 1,
};

export const DelegationRatioSlider = React.forwardRef(
  (props: DelegationRatioSlider, forwardedRef: React.ForwardedRef<HTMLInputElement>) => {
    const fallbackValue = CONSTRAINTS.MIN;
    const value = props.value || props.defaultValue || fallbackValue;
    const handlePlusClick = () => props.onValueChange && value < CONSTRAINTS.MAX && props.onValueChange(value + 1);
    const handleMinusClick = () => props.onValueChange && value > CONSTRAINTS.MIN && props.onValueChange(value - 1);
    return (
      <div className={styles.SliderContainer}>
        <IconButton.Primary icon={<SliderMinusIcon />} onClick={handleMinusClick} />
        <Slider.Root
          min={CONSTRAINTS.MIN}
          max={CONSTRAINTS.MAX}
          className={styles.SliderRoot}
          {...props}
          onValueChange={(newValue) =>
            props.onValueChange ? props.onValueChange(newValue[0] || fallbackValue) : undefined
          }
          value={[value]}
          defaultValue={props.defaultValue ? [props.defaultValue] : undefined}
          ref={forwardedRef}
        >
          <Slider.Track className={styles.SliderTrack}>
            <Slider.Range className={styles.SliderRange} />
          </Slider.Track>
          <Slider.Thumb className={styles.SliderThumb} aria-label="Volume" />
        </Slider.Root>
        <IconButton.Primary icon={<SliderPlusIcon />} onClick={handlePlusClick} />
      </div>
    );
  }
);
