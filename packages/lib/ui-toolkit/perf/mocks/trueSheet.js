/**
 * Minimal mock of @lodev09/react-native-true-sheet (native module — cannot
 * initialize under Jest). Sheets in the measured components stay CLOSED, so
 * the mock renders nothing and exposes inert imperative handles; the sheet's
 * own open-state render cost is out of scope for the pilot.
 */
const React = require('react');

const TrueSheet = React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({
    dismiss: async () => {},
    present: async () => {},
    resize: async () => {},
  }));
  return null;
});
TrueSheet.displayName = 'TrueSheetMock';
TrueSheet.dismiss = async () => {};
TrueSheet.present = async () => {};

module.exports = {
  TrueSheet,
  useTrueSheet: () => ({ dismiss: async () => {}, present: async () => {} }),
};
