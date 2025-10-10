import React from 'react';

const pattern = /(^|\s|<[a-z]*\/?>)(https?:\/\/[\w!#%&()+,./:=?@|~\u2019\-]*[\w#%&()+/=@|~\-])/gi;

export const textToLink = (content: string, openExternalLink: (url: string) => void): React.ReactNode => (
  <>
    {content.split(pattern).map((s) => {
      if (pattern.test(s)) {
        return (
          <a key={s} onClick={() => openExternalLink(s)}>
            {s}
          </a>
        );
      }
      return s;
    })}
  </>
);
