import type {
  StackCardStyleInterpolator,
  StackNavigationOptions,
} from '@react-navigation/stack';

export const laceStackCardStyleInterpolator: StackCardStyleInterpolator = ({
  current,
  next,
  layouts,
}) => {
  const activeTranslateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [layouts.screen.width, 0],
  });
  const activeOpacity = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const activeScale = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const inactiveTranslateX = next?.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -layouts.screen.width],
  });
  const inactiveOpacity = next?.progress.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [1, 0.3, 0],
  });
  const inactiveScale = next?.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.8],
  });

  const translateX = next ? inactiveTranslateX : activeTranslateX;
  const opacity = next ? inactiveOpacity : activeOpacity;
  const scale = next ? inactiveScale : activeScale;

  return {
    cardStyle: {
      transform: [{ translateX: translateX ?? 0 }, { scale: scale ?? 1 }],
      opacity: opacity ?? 1,
    },
  };
};

export const laceStackSlideFromBottomInterpolator: StackCardStyleInterpolator =
  ({ current, next, layouts }) => {
    const translateY = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.height, 0],
    });
    const opacity = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const inactiveOpacity = next?.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    });

    return {
      cardStyle: {
        transform: [{ translateY }],
        opacity: next ? inactiveOpacity ?? 1 : opacity,
      },
    };
  };

export const laceStackScreenOptions: StackNavigationOptions = {
  headerShown: false,
  detachPreviousScreen: true,
  cardStyle: { backgroundColor: 'transparent' },
  cardStyleInterpolator: laceStackCardStyleInterpolator,
};

export const laceStackNavigatorProps = {
  detachInactiveScreens: true,
  screenOptions: laceStackScreenOptions,
} as const;
