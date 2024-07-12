import { toast } from '@lace/common';
import React from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';

const TOAST_DEFAULT_DURATION = 3;

export const CopiableHash = ({ hash, copiedText }: { hash: string; copiedText: string }): React.ReactElement => (
  <CopyToClipboard text={hash}>
    <div
      onClick={() =>
        toast.notify({
          duration: TOAST_DEFAULT_DURATION,
          text: copiedText
        })
      }
    >
      {hash}
    </div>
  </CopyToClipboard>
);
