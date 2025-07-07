/* eslint-disable unicorn/no-useless-undefined */
import { useWalletStore } from '@src/stores';
import React, { useEffect, useRef, useState } from 'react';
const SPACING = 2;

export const CashbackPortal = () => {
  const { walletInfo } = useWalletStore();
  const [iframeSrc, setIframeSrc] = useState<string | undefined>(undefined);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const getPortalInfo = async () => {
      try {
        // for security, better to proxy to hide the API key
        const response = await window.fetch('https://sandbox-api.bringweb3.io/v1/extension/check/portal', {
          headers: {
            'x-api-key': 'wb9lt1LcEK4ajWMgTrO1HaDUBZ0Pj0dzaLxF8hnu',
            'Content-Type': 'application/json'
          },
          method: 'POST',
          body: JSON.stringify({
            walletAddress: walletInfo.addresses[0].address
          })
        });
        console.log(JSON.stringify(response, undefined, SPACING));

        const data = await response.json();
        const { iframeUrl, token } = data;
        setIframeSrc(`${iframeUrl}?token=${token}`);
      } catch (error) {
        console.log('error fetching', error);
      }
    };
    getPortalInfo();
  }, []);

  return <iframe ref={iframeRef} src={iframeSrc} style={{ width: '100%', height: '600px', border: 'none' }} />;
};
