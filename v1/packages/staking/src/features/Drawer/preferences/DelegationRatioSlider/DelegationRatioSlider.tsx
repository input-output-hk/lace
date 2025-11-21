import { IconButton } from '@input-output-hk/lace-ui-toolkit';
import { PostHogAction } from '@lace/common';
import * as Slider from '@radix-ui/react-slider';
import { useOutsideHandles } from 'features/outside-handles-provider';
import React from 'react';
import * as styles from './DelegationRatioSlider.css';
import SliderMinusIcon from './slider-minus.svg';
import SliderPlusIcon from './slider-plus.svg';

const MAX_VALUE = 100;

const inRange = (value: number) => value >= 1 && value <= MAX_VALUE;

export type DelegationRatioSlider = Omit<Slider.SliderProps, 'value' | 'onValueChange' | 'defaultValue'> & {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
};

export const DelegationRatioSlider = React.forwardRef(
  (props: DelegationRatioSlider, forwardedRef: React.ForwardedRef<HTMLInputElement>) => {
    const { analytics } = useOutsideHandles();
    const value = props.value || props.defaultValue || 0;
    const handlePlusClick = () => {
      analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationDelegationRatioSliderPlusClick);
      props.onValueChange && inRange(value + 1) && props.onValueChange(value + 1);
    };
    const handleMinusClick = () => {
      analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationDelegationRatioSliderMinusClick);
      props.onValueChange && inRange(value - 1) && props.onValueChange(value - 1);
    };
    return (
      <div className={styles.SliderContainer}>
        <IconButton.Primary
          icon={<SliderMinusIcon />}
          onClick={handleMinusClick}
          data-testid="pool-details-card-slider-minus"
        />
        <Slider.Root
          className={styles.SliderRoot}
          {...props}
          onValueChange={(newValue) => (props.onValueChange ? props.onValueChange(newValue[0] || 0) : undefined)}
          value={[value]}
          defaultValue={props.defaultValue ? [props.defaultValue] : undefined}
          ref={forwardedRef}
          onValueCommit={() => {
            analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationDelegationRatioSliderVolumePinDrag);
          }}
          data-testid="pool-details-card-slider-item"
        >
          <Slider.Track className={styles.SliderTrack}>
            <Slider.Range className={styles.SliderRange} />
          </Slider.Track>
          <Slider.Thumb className={styles.SliderThumb} aria-label="Volume" />
        </Slider.Root>
        <IconButton.Primary
          icon={<SliderPlusIcon />}
          onClick={handlePlusClick}
          data-testid="pool-details-card-slider-plus"
        />
      </div>
    );
  }
);

DelegationRatioSlider.displayName = 'DelegationRatioSlider';
