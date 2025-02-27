/* eslint-disable no-magic-numbers, sonarjs/no-duplicate-string */
import { WebRequest, webRequest, runtime } from 'webextension-polyfill';
import { MessageTypes } from '../types';
import { backendFailures$, requestMessage$ } from './services';
import { logger } from '@lace/common';

const INTERNAL_SERVER_ERROR_STATUS_CODE = 500;
const GATEWAY_TIMEOUT_STATUS_CODE = 503;
const UNAUTHORIZED_STATUS_CODE = 401;
const NOT_FOUND_STATUS_CODE = 404;

// eslint-disable-next-line unicorn/no-null
let sentryUrl: string | null = '';
const sentryUrlExtractionRegex = /https:\/\/[^@]+@([^/]+).*/;
if (sentryUrlExtractionRegex.test(process.env.SENTRY_DSN)) {
  sentryUrl = process.env.SENTRY_DSN.replace(sentryUrlExtractionRegex, 'https://$1');
}

const isSentryRequest = (url: string) => !!sentryUrl && url.startsWith(sentryUrl);

const handleProviderServerErrors = (data: WebRequest.OnCompletedDetailsType) => {
  if (data?.type === 'xmlhttprequest' && runtime.getURL('').startsWith(data.initiator)) {
    const statusCodeQualifiedAsFailure =
      data.statusCode !== NOT_FOUND_STATUS_CODE &&
      data.statusCode > UNAUTHORIZED_STATUS_CODE &&
      data.statusCode < GATEWAY_TIMEOUT_STATUS_CODE;
    if (statusCodeQualifiedAsFailure) {
      // A backend service request has failed, increment the failed requests count
      backendFailures$.next(backendFailures$.value + 1);
    } else {
      // Reset the failed counter
      backendFailures$.next(0);
    }
  }
};

const handleRequests = (data: WebRequest.OnCompletedDetailsType) => {
  // every status code number that is below 500 would be considered as successful
  if (
    data?.type === 'xmlhttprequest' &&
    data.statusCode < INTERNAL_SERVER_ERROR_STATUS_CODE &&
    runtime.getURL('').startsWith(data.initiator)
  ) {
    requestMessage$.next({ type: MessageTypes.HTTP_CONNECTION, data: { connected: true } });
    webRequest.onCompleted.removeListener(handleRequests);
  }
};

const handleConnectionIssues = async (error: WebRequest.OnErrorOccurredDetailsType) => {
  if (
    error?.type !== 'xmlhttprequest' ||
    error?.error !== 'net::ERR_INTERNET_DISCONNECTED' ||
    // checks if URL of the resource that triggered this request is equal to the url of the extension
    !runtime.getURL('').startsWith(error?.initiator)
  )
    return;

  if (!isSentryRequest(error.url)) {
    logger.error('xmlhttprequest:net::ERR_INTERNET_DISCONNECTED', error);
  }

  requestMessage$.next({ type: MessageTypes.HTTP_CONNECTION, data: { connected: false } });
  if (!webRequest.onCompleted.hasListener(handleRequests)) {
    webRequest.onCompleted.addListener(handleRequests, { urls: ['<all_urls>'] });
  }
};

if (!webRequest.onErrorOccurred.hasListener(handleConnectionIssues))
  webRequest.onErrorOccurred.addListener(handleConnectionIssues, { urls: ['<all_urls>'] });

webRequest.onCompleted.addListener(handleProviderServerErrors, { urls: ['<all_urls>'] });
