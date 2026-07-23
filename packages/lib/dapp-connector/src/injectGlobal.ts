import type { Logger } from 'ts-log';

export type WindowWithCustomGlobal<T> = Window & {
  [key: string]: { [k: string]: T } | undefined;
};

type InjectGlobalProps<T> = {
  namespace: string;
  wallet: T;
  walletName: string;
  rdns?: string;
};

type InjectGlobalDependencies<T> = {
  logger: Logger;
  window: WindowWithCustomGlobal<T>;
};

export const injectGlobal = <T>(
  { wallet, namespace, walletName, rdns }: InjectGlobalProps<T>,
  { logger, window }: InjectGlobalDependencies<T>,
): void => {
  if (!window[namespace]) {
    logger.debug(
      {
        module: 'injectWindow',
        wallet,
      },
      `Creating ${namespace} global scope`,
    );
    window[namespace] = {};
  } else {
    logger.debug(
      {
        module: 'injectWindow',
        wallet,
      },
      `${namespace} global scope exists`,
    );
  }

  if (rdns) {
    Object.assign(wallet as object, { rdns });
  }

  window[namespace][walletName] = window[namespace][walletName] || wallet;
  logger.debug(
    {
      module: 'injectWindow',
      wallet,
      windowGlobal: window[namespace],
    },
    'Injected',
  );
};
