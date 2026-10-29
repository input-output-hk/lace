#!/usr/bin/env node
/* eslint-disable no-console */

// Android WebView's onPageStarted/evaluateJavascript can lose the race against
// a page's first inline script. Fail installation on upstream drift rather than
// silently dropping the Lace-only document-start path.

const fs = require('node:fs');
const path = require('node:path');

const root = process.env.WEBVIEW_PATCH_ROOT ?? path.join(__dirname, '..');
const copies = [
  path.join(root, 'node_modules', 'react-native-webview'),
  ...['apps', 'packages/lib'].flatMap(group => {
    const directory = path.join(root, group);
    return fs.existsSync(directory)
      ? fs
          .readdirSync(directory)
          .map(entry =>
            path.join(directory, entry, 'node_modules', 'react-native-webview'),
          )
      : [];
  }),
].filter(directory => fs.existsSync(directory));

const java = 'android/src/main/java/com/reactnativecommunity/webview';
const changes = [
  {
    file: `${java}/RNCWebView.java`,
    before:
      '    protected static final String JAVASCRIPT_INTERFACE = "ReactNativeWebView";\n',
    markers: ['class LaceBridgeStatusEvent'],
    after: `    private @Nullable String laceBridgeStatusRequestId;
    private @Nullable String laceBridgeStatusDeliveredId;

    public void setLaceBridgeStatusRequestId(@Nullable String requestId) {
        laceBridgeStatusRequestId = requestId;
    }

    public void reportLaceBridgeStatus() {
        // A prop transaction may precede attachment; attachment retries the same request.
        if (!isAttachedToWindow() || !(getParent() instanceof RNCWebViewWrapper)
                || !isLaceDocumentStartScript() || laceBridgeStatusRequestId == null
                || laceBridgeStatusRequestId.isEmpty()
                || laceBridgeStatusRequestId.equals(laceBridgeStatusDeliveredId)) return;
        WritableMap data = Arguments.createMap();
        data.putString("requestId", laceBridgeStatusRequestId);
        data.putBoolean("documentStartScript", WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT));
        data.putBoolean("webMessageListener", WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER));
        dispatchEvent(this, new LaceBridgeStatusEvent(
                UIManagerHelper.getSurfaceId(this), RNCWebViewWrapper.getReactTagFromWebView(this), data));
        laceBridgeStatusDeliveredId = laceBridgeStatusRequestId;
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        reportLaceBridgeStatus();
    }

    private static class LaceBridgeStatusEvent extends Event<LaceBridgeStatusEvent> {
        private final WritableMap data;

        LaceBridgeStatusEvent(int surfaceId, int viewTag, WritableMap data) {
            super(surfaceId, viewTag);
            this.data = data;
        }

        @Override public String getEventName() { return "topLaceBridgeStatus"; }
        @Override public boolean canCoalesce() { return false; }
        @Override protected WritableMap getEventData() { return data; }
    }

    protected static final String JAVASCRIPT_INTERFACE = "ReactNativeWebView";
`,
  },
  {
    file: `${java}/RNCWebViewManagerImpl.kt`,
    before: '        mPendingSource = null\n',
    markers: ['viewWrapper.webView.reportLaceBridgeStatus()'],
    after:
      '        mPendingSource = null\n        viewWrapper.webView.reportLaceBridgeStatus()\n',
  },
  ...['oldarch', 'newarch'].flatMap(architecture => [
    {
      file: `android/src/${architecture}/com/reactnativecommunity/webview/RNCWebViewManager.java`,
      before: '    @ReactProp(name = "allowFileAccess")\n',
      markers: ['public void setLaceBridgeStatusRequestId('],
      after: `    @ReactProp(name = "laceBridgeStatusRequestId")
    public void setLaceBridgeStatusRequestId(RNCWebViewWrapper view, @Nullable String value) {
        view.getWebView().setLaceBridgeStatusRequestId(value);
    }

    ${
      architecture === 'newarch' ? '@Override\n    ' : ''
    }@ReactProp(name = "allowFileAccess")
`,
    },
    {
      file: `android/src/${architecture}/com/reactnativecommunity/webview/RNCWebViewManager.java`,
      before:
        '        export.put(TopLoadingStartEvent.EVENT_NAME, MapBuilder.of("registrationName", "onLoadingStart"));\n',
      markers: ['export.put("topLaceBridgeStatus"'],
      after:
        '        export.put("topLaceBridgeStatus", MapBuilder.of("registrationName", "onLaceBridgeStatus"));\n        export.put(TopLoadingStartEvent.EVENT_NAME, MapBuilder.of("registrationName", "onLoadingStart"));\n',
    },
  ]),
  {
    file: 'src/RNCWebViewNativeComponent.ts',
    before: '  // Android only\n',
    markers: ['onLaceBridgeStatus?:'],
    after: `  // Android only
  laceBridgeStatusRequestId?: string;
  onLaceBridgeStatus?: DirectEventHandler<Readonly<{
    requestId: string;
    documentStartScript: boolean;
    webMessageListener: boolean;
  }>>;
`,
  },
  ...['src/WebViewTypes.ts', 'lib/WebViewTypes.d.ts'].map(file => ({
    file,
    before:
      'export interface AndroidWebViewProps extends WebViewSharedProps {\n',
    markers: ['onLaceBridgeStatus?:'],
    after: `export interface AndroidWebViewProps extends WebViewSharedProps {
  laceBridgeStatusRequestId?: string;
  onLaceBridgeStatus?: (event: NativeSyntheticEvent<{
    requestId: string;
    documentStartScript: boolean;
    webMessageListener: boolean;
  }>) => void;
`,
  })),
  {
    file: `${java}/RNCWebView.java`,
    before: 'import androidx.webkit.JavaScriptReplyProxy;\n',
    after:
      'import androidx.webkit.JavaScriptReplyProxy;\nimport androidx.webkit.ScriptHandler;\n',
  },
  {
    file: `${java}/RNCWebView.java`,
    before: 'import java.util.List;\n',
    after: 'import java.util.Collections;\nimport java.util.List;\n',
  },
  {
    file: `${java}/RNCWebView.java`,
    before:
      '    protected @Nullable\n    String injectedJSBeforeContentLoaded;\n',
    previous: `    protected @Nullable
    String injectedJSBeforeContentLoaded;
    private @Nullable ScriptHandler laceDocumentStartScript;
    private @Nullable String laceDocumentStartOrigin;
`,
    after: `    protected @Nullable
    String injectedJSBeforeContentLoaded;
    private @Nullable ScriptHandler laceDocumentStartScript;
`,
  },
  {
    file: `${java}/RNCWebView.java`,
    before: '    public void callInjectedJavaScriptBeforeContentLoaded() {\n',
    markers: [
      '    public void setLaceDocumentStartScript(',
      '    private boolean isLaceDocumentStartScript()',
    ],
    previous: `    public void setLaceDocumentStartScript(@Nullable String script) {
        injectedJSBeforeContentLoaded = script;
        updateLaceDocumentStartScript();
    }

    public void setLaceDocumentStartOrigin(@Nullable String url) {
        Uri uri = url == null ? null : Uri.parse(url);
        String scheme = uri == null ? null : uri.getScheme();
        String host = uri == null ? null : uri.getHost();
        String origin = null;
        if (host != null && ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme))) {
            String authority = host.contains(":") ? "[" + host + "]" : host;
            origin = scheme.toLowerCase(java.util.Locale.ROOT) + "://" + authority
                    + (uri.getPort() < 0 ? "" : ":" + uri.getPort());
        }
        if (!java.util.Objects.equals(origin, laceDocumentStartOrigin)) {
            laceDocumentStartOrigin = origin;
            updateLaceDocumentStartScript();
        }
    }

    private void updateLaceDocumentStartScript() {
        if (laceDocumentStartScript != null) {
            laceDocumentStartScript.remove();
            laceDocumentStartScript = null;
        }
        if (injectedJSBeforeContentLoaded == null
                || !injectedJSBeforeContentLoaded.contains("/* lace-cip30-document-start */")
                || laceDocumentStartOrigin == null
                || !WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) return;
        // The origin rule excludes cross-origin frames; the top-frame check also
        // excludes same-origin frames before the token-bearing runtime executes.
        String mainFrameScript = "(function(){if(window.top!==window)return;\\n"
                + injectedJSBeforeContentLoaded + "\\n})();";
        laceDocumentStartScript = WebViewCompat.addDocumentStartJavaScript(
                this, mainFrameScript, Collections.singleton(laceDocumentStartOrigin));
    }

    public void callInjectedJavaScriptBeforeContentLoaded() {
`,
    after: `    private boolean isLaceDocumentStartScript() {
        return injectedJSBeforeContentLoaded != null
                && injectedJSBeforeContentLoaded.contains("/* lace-cip30-document-start */");
    }

    public void setLaceDocumentStartScript(@Nullable String script) {
        if (java.util.Objects.equals(script, injectedJSBeforeContentLoaded)) return;
        injectedJSBeforeContentLoaded = script;
        if (laceDocumentStartScript != null) {
            laceDocumentStartScript.remove();
            laceDocumentStartScript = null;
        }
        if (!isLaceDocumentStartScript()
                || !WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)
                || !WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return;
        // Register before loading for every origin, including redirect destinations.
        // Wildcard rules also run in frames: guard before the token-bearing payload.
        String mainFrameScript = "(function(){if(window.top!==window||(window.location.protocol!=='https:'&&window.location.protocol!=='http:'))return;\\n"
                + injectedJSBeforeContentLoaded + "\\n})();";
        laceDocumentStartScript = WebViewCompat.addDocumentStartJavaScript(
                this, mainFrameScript, Collections.singleton("*"));
    }

    public void callInjectedJavaScriptBeforeContentLoaded() {
        // evaluateJavascript has no before-page-script guarantee, even as fallback.
        if (isLaceDocumentStartScript()) return;
`,
  },
  {
    file: `${java}/RNCWebView.java`,
    before:
      '    public void destroy() {\n        if (mWebChromeClient != null) {\n',
    after: `    public void destroy() {
        if (laceDocumentStartScript != null) {
            laceDocumentStartScript.remove();
            laceDocumentStartScript = null;
        }
        if (mWebChromeClient != null) {
`,
  },
  {
    file: `${java}/RNCWebViewClient.java`,
    before: '      reactWebView.callInjectedJavaScriptBeforeContentLoaded();\n',
    previous:
      '      reactWebView.setLaceDocumentStartOrigin(url);\n      reactWebView.callInjectedJavaScriptBeforeContentLoaded();\n',
    after: '      reactWebView.callInjectedJavaScriptBeforeContentLoaded();\n',
  },
  {
    file: `${java}/RNCWebViewManagerImpl.kt`,
    before: '            if (source.hasKey("html")) {\n',
    previous:
      '            if (source.hasKey("html")) {\n                view.setLaceDocumentStartOrigin(null)\n',
    after: '            if (source.hasKey("html")) {\n',
  },
  {
    file: `${java}/RNCWebViewManagerImpl.kt`,
    before: '                if (source.hasKey("method")) {\n',
    previous:
      '                view.setLaceDocumentStartOrigin(url)\n                if (source.hasKey("method")) {\n',
    after: '                if (source.hasKey("method")) {\n',
  },
  {
    file: `${java}/RNCWebViewManagerImpl.kt`,
    before: '        view.loadUrl(BLANK_URL)\n',
    previous:
      '        view.setLaceDocumentStartOrigin(null)\n        view.loadUrl(BLANK_URL)\n',
    after: '        view.loadUrl(BLANK_URL)\n',
  },
  {
    file: `${java}/RNCWebViewManagerImpl.kt`,
    before: '        view.injectedJSBeforeContentLoaded = value\n',
    after: '        view.setLaceDocumentStartScript(value)\n',
  },
  {
    file: `${java}/RNCWebView.java`,
    before:
      '                RNCWebView.this.onMessage(message.getData(), sourceOrigin.toString());\n',
    markers: ['                  if (!isMainFrame || laceDocumentStartScript'],
    after: `                if (isLaceDocumentStartScript()) {
                  if (!isMainFrame || laceDocumentStartScript == null
                          || message.getType() != WebMessageCompat.TYPE_STRING || message.getData() == null) return;
                  String scheme = sourceOrigin.getScheme();
                  if (!("https".equals(scheme) || "http".equals(scheme))) return;
                  try {
                    JSONObject envelope = new JSONObject(message.getData());
                    if (!sourceOrigin.toString().equals(envelope.optString("origin"))) return;
                  } catch (JSONException ignored) {
                    return;
                  }
                }
                RNCWebView.this.onMessage(message.getData(), sourceOrigin.toString());
`,
  },
  {
    file: `${java}/RNCWebView.java`,
    before: '        public void postMessage(String message) {\n',
    markers: ['            if (mWebView.isLaceDocumentStartScript())'],
    after: `        public void postMessage(String message) {
            // This legacy interface cannot attest the sender frame or origin.
            if (mWebView.isLaceDocumentStartScript()) return;
`,
  },
];

const pending = new Map();
const failures = [];
for (const directory of copies) {
  const version = JSON.parse(
    fs.readFileSync(path.join(directory, 'package.json'), 'utf8'),
  ).version;
  if (version !== '13.16.1') {
    failures.push(`${directory}: unverified react-native-webview ${version}`);
    continue;
  }
  for (const { file, before, after, previous, markers = [] } of changes) {
    const target = path.join(directory, file);
    if (!fs.existsSync(target)) {
      failures.push(`${target}: missing`);
      continue;
    }
    const content = pending.get(target) ?? fs.readFileSync(target, 'utf8');
    if (previous && content.includes(previous)) {
      if (content.split(previous).length !== 2) {
        failures.push(`${target}: previous patch anchor ambiguous`);
        continue;
      }
      pending.set(target, content.replace(previous, after));
      continue;
    }
    if (content.includes(after)) {
      if (content.split(after).length !== 2) {
        failures.push(`${target}: patched anchor ambiguous`);
      }
      continue;
    }
    if (markers.some(marker => content.includes(marker))) {
      failures.push(`${target}: existing patch has drifted`);
      continue;
    }
    if (content.split(before).length !== 2) {
      failures.push(`${target}: patch anchor missing or ambiguous`);
      continue;
    }
    pending.set(target, content.replace(before, after));
  }
}

if (copies.length === 0) failures.push('react-native-webview is not installed');
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
if (process.argv.includes('--check') && pending.size > 0) {
  console.error('react-native-webview Android patch not fully applied');
  process.exit(1);
}
for (const [target, content] of pending) fs.writeFileSync(target, content);
console.log(
  `[postinstall] Patched ${pending.size} react-native-webview Android files`,
);
