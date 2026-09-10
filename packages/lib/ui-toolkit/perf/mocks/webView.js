/**
 * Inert mock of react-native-webview (native module — cannot initialize
 * under Jest). No measured component renders a webview.
 */
const React = require('react');

const WebView = React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({
    goBack: () => {},
    goForward: () => {},
    injectJavaScript: () => {},
    reload: () => {},
    stopLoading: () => {},
  }));
  return null;
});
WebView.displayName = 'WebViewMock';

module.exports = { WebView, default: WebView };
