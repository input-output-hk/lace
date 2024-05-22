import React from 'react';
import { Trans } from 'react-i18next';

export const LegalTranslations = (): React.ReactElement => (
  <Trans
    i18nKey="legal"
    // transSupportBasicHtmlNodes won't preserv tags attributes, so using the "components" prop instead
    components={{
      br: <br />,
      strong: <strong />,
      i: <i />,
      b: <b style={{ fontWeight: 600 }} />,
      div: <div />,
      u: <u />,
      uunderline: <u style={{ textDecoration: 'underline' }} />,
      a: <a />,
      privacyPolicy: (
        <a
          href="https://static.iohk.io/terms/iog-privacy-policy.pdf"
          style={{ textDecoration: 'underline' }}
          target="_blank"
        />
      ),
      iogdmcapolicy: (
        <a
          href="https://static.iohk.io/terms/iog-dmca-policy.pdf"
          style={{ textDecoration: 'underline' }}
          target="_blank"
        />
      ),
      rulesstreamlinedarbitration: <a href="http://www.jamsadr.com/rules-streamlined-arbitration" target="_blank" />,
      rulescomprehensivearbitration: (
        <a href="http://www.jamsadr.com/rules-comprehensive-arbitration/" target="_blank" />
      ),
      jamsadr: <a href="http://www.jamsadr.com" target="_blank" />,
      contactform: <a href="https://iohk.io/en/contact/" target="_blank" />
    }}
  />
);
