import { StyleSheet, type ViewStyle } from 'react-native';

export const backdropStyle = {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(0,0,0,0.5)',
  backdropFilter: 'blur(1px)',
  WebkitBackdropFilter: 'blur(1px)',
  isolation: 'isolate',
} as unknown as ViewStyle;
