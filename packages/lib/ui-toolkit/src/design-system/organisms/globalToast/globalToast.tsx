import type { ImageSourcePropType } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo, useEffect, useRef } from 'react';
import Animated from 'react-native-reanimated';

import { Icon, Toast, useTriggerToast } from '../..';

import type { IconName } from '../..';

type ColorType =
  | 'black'
  | 'negative'
  | 'neutral'
  | 'positive'
  | 'primary'
  | 'secondary'
  | 'white';

type BackgroundType = 'colored' | 'semiTransparent' | 'transparent';

export type IconConfig = {
  name: string;
  size?: number;
  variant?: 'solid' | 'stroke';
  color?: string;
};

export type GlobalToastConfig = {
  text: string;
  subtitle?: string;
  color?: ColorType;
  backgroundType?: BackgroundType;
  duration?: number;
  position?: 'bottom' | 'top';
  leftIcon?: IconConfig;
  leftImage?: ImageSourcePropType;
  rightIcon?: IconConfig;
};

export interface GlobalToastProps {
  toast: GlobalToastConfig | null;
  onHide: () => void;
}

const HIDE_DELAY_MS = 600;

export const GlobalToast = ({ toast, onHide }: GlobalToastProps) => {
  const { t } = useTranslation();
  // Translate text/subtitle so side effects can dispatch translation keys.
  // Uses defaultValue fallback so pre-translated strings and raw provider
  // error messages pass through unchanged.
  const translatedText = toast?.text
    ? t(toast.text, { defaultValue: toast.text })
    : toast?.text;
  const translatedSubtitle = toast?.subtitle
    ? t(toast.subtitle, { defaultValue: toast.subtitle })
    : toast?.subtitle;
  const duration = useMemo(() => toast?.duration || 3, [toast?.duration]);
  const position = useMemo(() => toast?.position || 'top', [toast?.position]);
  const triggerToast = useTriggerToast({ duration, position });

  const previousToastTextRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onHideRef = useRef(onHide);

  useEffect(() => {
    onHideRef.current = onHide;
  }, [onHide]);

  const renderIcon = (config?: IconConfig, defaultSize = 20) =>
    config ? (
      <Icon
        name={config.name as IconName}
        size={config.size || defaultSize}
        variant={config.variant || 'stroke'}
        color={config.color}
      />
    ) : undefined;

  const leftIcon = useMemo(
    () => renderIcon(toast?.leftIcon, 40),
    [toast?.leftIcon],
  );
  const rightIcon = useMemo(
    () => renderIcon(toast?.rightIcon, 20),
    [toast?.rightIcon],
  );

  useEffect(() => {
    if (!toast) {
      previousToastTextRef.current = null;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    if (previousToastTextRef.current === toast.text) return;
    previousToastTextRef.current = toast.text;

    triggerToast.showToast();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(
      onHideRef.current,
      (toast.duration || 3) * 1000 + HIDE_DELAY_MS,
    );

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [toast, triggerToast]);

  if (!toast) {
    return null;
  }

  return (
    <Animated.View style={triggerToast.animatedStyle}>
      <Toast
        text={translatedText ?? toast.text}
        subtitle={translatedSubtitle}
        color={toast.color}
        backgroundType={toast.backgroundType}
        leftIcon={leftIcon}
        leftImage={toast.leftImage}
        rightIcon={rightIcon}
      />
    </Animated.View>
  );
};
