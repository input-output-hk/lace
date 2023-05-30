import { walletRoutePaths } from '@routes/wallet-paths';

interface R<T> {
  [keys: string]: T;
}

type WalletRouteRecord = R<WalletRoute>;
type WalletRoute = string | WalletRouteRecord;

export const isInternalLink = (link: string, walletPaths: WalletRoute = walletRoutePaths): boolean => {
  if (link === '/') return true;
  if (typeof walletPaths === 'string') return link === walletPaths;
  for (const key in walletPaths) {
    const isValid = isInternalLink(link, (walletPaths as WalletRouteRecord)[key]);
    if (isValid) return true;
  }
  return false;
};
