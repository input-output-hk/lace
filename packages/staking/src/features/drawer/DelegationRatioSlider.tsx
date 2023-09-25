import * as Slider from '@radix-ui/react-slider';
import * as styles from './DelegationRatioSlider.css';

const DEFAULT_VALUE = 50;

export const DelegationRatioSlider = () => (
  <Slider.Root className={styles.SliderRoot} defaultValue={[DEFAULT_VALUE]} max={100} step={1}>
    <Slider.Track className={styles.SliderTrack}>
      <Slider.Range className={styles.SliderRange} />
    </Slider.Track>
    <Slider.Thumb className={styles.SliderThumb} aria-label="Volume" />
  </Slider.Root>
);
