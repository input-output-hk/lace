import React, { Children, cloneElement, isValidElement, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { v4 as uuidv4 } from 'uuid';
import classNames from 'classnames';
import SwiperCore, { Navigation, Virtual, Lazy, Swiper as SwiperType, Mousewheel } from 'swiper';
import { ExtractObjectFromData, ISlider } from './types';
import { EIconsName } from '../Icon';
import { IogButtonIcon } from '../Button';

// eslint-disable-next-line import/no-unresolved
import 'swiper/css';
// eslint-disable-next-line import/no-unresolved
import 'swiper/css/navigation';
import './styles.scss';

SwiperCore.use([Navigation, Virtual, Lazy, Mousewheel]);

const formatClassName = (className: string) => (className ? className.replace('.', '') : '');

const DEFAULT_PROPS = {
  SPACE_BETWEEN: 8,
  SLIDES_PER_VIEW: 2
};

const BUTTON_CLASS = 'iog-swiper-button-nav';

const IogSlider = ({
  id,
  data,
  children,
  navigation,
  spaceBetween,
  slidesPerView,
  itemProps,
  horizontal,
  narrowArrows,
  buttonSolid = false,
  buttonStandard = false,
  showSliderNavigation = true,
  fallback,
  mousewheel,
  ...props
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
ISlider<any>): React.ReactElement => {
  const swiperRef = useRef<SwiperType | null>(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  const handleSlideChange = () => {
    if (swiperRef.current) {
      setIsBeginning(swiperRef.current.isBeginning);
      setIsEnd(swiperRef.current.isEnd);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const childrenWithProps = (item: ExtractObjectFromData<any>) =>
    Children.map(children, (child) => {
      if (isValidElement(child)) {
        const hasItemProps = itemProps ? itemProps(item) : {};
        return cloneElement(child, { ...item, ...hasItemProps });
      }

      return child;
    });

  const arrowIcon = {
    PREV: narrowArrows ? EIconsName.ARROW_PREV : EIconsName.ARROW_LEFT,
    NEXT: narrowArrows ? EIconsName.ARROW_NEXT : EIconsName.ARROW_RIGHT
  };

  return (
    <div
      className={classNames({
        'iog-swiper-container': true,
        'iog-swiper-container--horizontal': horizontal
      })}
    >
      {horizontal && (
        <div
          className={classNames({
            'iog-swiper-button-container': true,
            'iog-swiper-button-container--horizontal': horizontal,
            'iog-swiper-button-nav--horizontal--left': true
          })}
        >
          {navigation.prevEl && (
            <IogButtonIcon
              className={classNames([
                BUTTON_CLASS,
                formatClassName(navigation.prevEl as string),
                'iog-swiper-button-nav--horizontal'
              ])}
              name={arrowIcon.PREV}
              solid={buttonSolid}
              standard={buttonStandard}
              circle
              iconProps={{
                size: 12
              }}
              data-testid="scroll-prev"
            />
          )}
        </div>
      )}
      <Swiper
        id={id}
        navigation={navigation}
        spaceBetween={spaceBetween || DEFAULT_PROPS.SPACE_BETWEEN}
        slidesPerView={slidesPerView || DEFAULT_PROPS.SLIDES_PER_VIEW}
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        onSlideChange={handleSlideChange}
        mousewheel={mousewheel}
        {...props}
      >
        {data?.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (item: any) => (
            <SwiperSlide key={uuidv4()}>{childrenWithProps(item)}</SwiperSlide>
          )
        )}
      </Swiper>
      {data.length <= 0 && fallback}
      {showSliderNavigation && (
        <div
          className={classNames({
            'iog-swiper-button-container': true,
            'iog-swiper-button-container--horizontal': horizontal
          })}
        >
          {navigation.prevEl && !horizontal && (
            <IogButtonIcon
              className={classNames([BUTTON_CLASS, formatClassName(navigation.prevEl as string)])}
              name={arrowIcon.PREV}
              solid={buttonSolid}
              standard={buttonStandard}
              circle
              iconProps={{
                size: 12
              }}
              onClick={() => swiperRef.current?.slidePrev()}
              data-testid="scroll-prev"
              disabled={isBeginning}
            />
          )}
          <IogButtonIcon
            className={classNames([BUTTON_CLASS, formatClassName(navigation.nextEl as string)])}
            name={arrowIcon.NEXT}
            solid={buttonSolid}
            standard={buttonStandard}
            circle
            iconProps={{
              size: 12
            }}
            onClick={() => swiperRef.current?.slideNext()}
            data-testid="scroll-next"
            disabled={isEnd}
          />
        </div>
      )}
    </div>
  );
};

export default IogSlider;
