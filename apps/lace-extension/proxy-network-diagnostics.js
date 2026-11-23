const PROXY_BASE_URL = 'https://blockfrost.lw.iog.io/extension/';
const REPORT_INTERVAL_MS = 15 * 60 * 1000;
const NETWORKS = new Set(['mainnet', 'preprod', 'preview', 'testnet', 'none']);
const SERVICES = new Set([
  'blockfrost',
  'maestro',
  'mempool',
  'coinGecko',
  'steelSwap',
  'nftCdn',
  'cardanoCube',
]);
const OPERATIONS = new Set([
  'accounts',
  'addresses',
  'assets',
  'blocks',
  'epochs',
  'genesis',
  'governance',
  'health',
  'metadata',
  'network',
  'pools',
  'rpc',
  'scripts',
  'tx',
  'txs',
]);
const DIAGNOSTIC_COMPONENT = 'ProviderNetwork';
const DIAGNOSTIC_MESSAGE = 'Provider browser request failed';
const BROWSER_ERROR = /^net::ERR_[A-Z0-9_]{1,80}$/;

// Sentry's default Dedupe integration compares the exception before beforeSend
// adds the diagnostic fingerprint. Keep deduplication for all other events.
export const preserveProxyDiagnosticDedupe = defaultIntegrations =>
  defaultIntegrations.map(integration => {
    if (integration.name !== 'Dedupe') return integration;
    return {
      ...integration,
      processEvent: (event, ...args) => {
        if (event.tags?.component === DIAGNOSTIC_COMPONENT) return event;
        return integration.processEvent(event, ...args);
      },
    };
  });

const parseBaseUrl = (baseUrl, service, network) => {
  if (!baseUrl) return null;
  try {
    const parsed = new URL(baseUrl);
    if (
      parsed.protocol !== 'https:' &&
      !(parsed.protocol === 'http:' && parsed.hostname === 'localhost')
    )
      return null;
    return {
      origin: parsed.origin,
      path: `${parsed.pathname.replace(/\/$/, '')}/`,
      matchOrigin: `${parsed.protocol}//${parsed.hostname}`,
      service,
      network,
    };
  } catch {
    return null;
  }
};

export const getDiagnosticRoutes = ({
  maestroMainnetUrl = '',
  maestroTestnetUrl = '',
  mempoolMainnetUrl = '',
  mempoolTestnetUrl = '',
  coinGeckoUrl = '',
  steelSwapUrl = '',
  nftCdnUrl = '',
  cardanoCubeUrl = '',
} = {}) =>
  [
    parseBaseUrl(PROXY_BASE_URL, 'blockfrost', null),
    parseBaseUrl(maestroMainnetUrl, 'maestro', 'mainnet'),
    parseBaseUrl(maestroTestnetUrl, 'maestro', 'testnet'),
    parseBaseUrl(mempoolMainnetUrl, 'mempool', 'mainnet'),
    parseBaseUrl(mempoolTestnetUrl, 'mempool', 'testnet'),
    parseBaseUrl(coinGeckoUrl, 'coinGecko', 'none'),
    parseBaseUrl(steelSwapUrl, 'steelSwap', 'none'),
    parseBaseUrl(nftCdnUrl, 'nftCdn', 'none'),
    parseBaseUrl(cardanoCubeUrl, 'cardanoCube', 'none'),
  ].filter(Boolean);

export const getProxyFailureTags = (
  { url, error },
  routes = getDiagnosticRoutes(),
) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const route = routes.find(
    entry =>
      parsed.origin === entry.origin && parsed.pathname.startsWith(entry.path),
  );
  if (!route) return null;

  let network = route.network;
  let operation;
  if (route.service === 'blockfrost') {
    const [candidateNetwork, api, version, candidateOperation] = parsed.pathname
      .slice(route.path.length)
      .split('/');
    if (
      !['mainnet', 'preprod', 'preview'].includes(candidateNetwork) ||
      api !== 'api' ||
      version !== 'v0'
    )
      return null;
    network = candidateNetwork;
    operation = candidateOperation;
  } else {
    operation = parsed.pathname.slice(route.path.length).split('/')[0];
  }

  // Chrome's error string is useful, but never send an arbitrary browser value.
  const browserError = BROWSER_ERROR.test(error) ? error : 'UNKNOWN';

  return {
    service: route.service,
    network,
    operation: OPERATIONS.has(operation) ? operation : 'other',
    browserError,
  };
};

// Sentry's default integrations may attach fetch URLs, console arguments,
// breadcrumbs, user context, and request details to an otherwise safe event.
// Rebuild only this diagnostic from safe fields immediately before sending.
export const sanitizeProxyNetworkDiagnosticEvent = event => {
  if (event.tags?.component !== DIAGNOSTIC_COMPONENT) return event;

  const { service, network, operation, browserError } = event.tags;
  if (
    !SERVICES.has(service) ||
    !NETWORKS.has(network) ||
    !(OPERATIONS.has(operation) || operation === 'other') ||
    !(BROWSER_ERROR.test(browserError) || browserError === 'UNKNOWN')
  ) {
    return null;
  }

  return {
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: 'javascript',
    level: 'error',
    release: event.release,
    environment: event.environment,
    exception: { values: [{ type: 'Error', value: DIAGNOSTIC_MESSAGE }] },
    tags: {
      component: DIAGNOSTIC_COMPONENT,
      service,
      network,
      operation,
      browserError,
    },
    fingerprint: [
      DIAGNOSTIC_COMPONENT,
      service,
      network,
      operation,
      browserError,
    ],
  };
};

export const registerProxyNetworkDiagnostics = (
  webRequest,
  observability,
  config = {},
) => {
  const lastReport = new Map();
  const routes = getDiagnosticRoutes(config);
  const extensionOrigin = config.extensionOrigin;
  const now = config.now ?? Date.now;

  webRequest.onErrorOccurred.addListener(
    details => {
      if (details.initiator !== extensionOrigin) return;
      const tags = getProxyFailureTags(details, routes);
      if (!tags || tags.browserError === 'net::ERR_ABORTED') return;

      const key = `${tags.service}:${tags.network}:${tags.operation}:${tags.browserError}`;
      const currentTime = now();
      if (currentTime - (lastReport.get(key) ?? -Infinity) < REPORT_INTERVAL_MS)
        return;
      lastReport.set(key, currentTime);

      // Full URLs can contain wallet addresses and query data. Report only the
      // allowlisted fields above; Sentry supplies the event timestamp and release.
      observability.captureException(new Error(DIAGNOSTIC_MESSAGE), {
        tags: { component: DIAGNOSTIC_COMPONENT, ...tags },
      });
    },
    {
      urls: [
        ...new Set(routes.map(route => `${route.matchOrigin}${route.path}*`)),
      ],
    },
  );
};
