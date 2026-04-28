import {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';

export const usePageHeaderCollapseScroll = () => {
  const collapseScrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: event => {
      collapseScrollY.value = event.contentOffset.y;
    },
  });
  return { collapseScrollY, onScroll };
};
