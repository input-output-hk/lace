import { IconButton } from '@lace/ui';
import * as Slider from '@radix-ui/react-slider';
import React from 'react';
import * as styles from './DelegationRatioSlider.css';
import SliderMinusIcon from './slider-minus.svg';
import SliderPlusIcon from './slider-plus.svg';

export const DelegationRatioSlider = React.forwardRef(
  (props: Slider.SliderProps, forwardedRef: React.ForwardedRef<HTMLInputElement>) => {
    const value = props.value || props.defaultValue || [0];
    const handlePlusClick = () => props.onValueChange && props.onValueChange(value.map((v) => v + 1));
    const handleMinusClick = () => props.onValueChange && props.onValueChange(value.map((v) => v - 1));
    return (
      <div className={styles.SliderContainer}>
        <IconButton.Primary icon={<SliderMinusIcon />} onClick={handleMinusClick} />
        <Slider.Root className={styles.SliderRoot} {...props} ref={forwardedRef}>
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
