type TimeToFullDisplayProps = {
  record: boolean;
};

// TTFD depends on the SDK's native onDraw reporter, so web has nothing to
// record. This variant keeps @sentry/react-native — a second Sentry core next
// to the tab's @sentry/react — out of the extension tab bundle.
export const TimeToFullDisplay = (_props: TimeToFullDisplayProps) => null;
