// Embedded-only gate: the deployed guest is a FRAME the Lace extension mounts
// (the host panel/tab and the offscreen pre-warm both embed it), so a direct
// top-level visit is a confused visitor, not a wallet session — it gets a
// static holding page and no boot at all.
//
// NOT a security boundary: a hostile embedder is also embedded and passes this
// check. The privilege boundary is ADR 41's window.lace injection, withheld
// outside the host's own embedding; this gate only redirects direct visitors.

const INSTALL_URL = 'https://www.lace.io';

/** Render the holding page instead of booting the app? */
export const shouldRenderEmbeddedGate = ({
  allowStandalone,
  isEmbedded,
}: {
  allowStandalone: boolean;
  isEmbedded: boolean;
}): boolean => !isEmbedded && !allowStandalone;

/** Replace the document with the static notice — plain DOM, no bundle work:
 * this runs in place of the app, so it must not pull the React graph in. */
const renderInstallNotice = (): void => {
  const panel = document.createElement('div');
  panel.style.fontFamily = 'system-ui, sans-serif';
  panel.style.margin = '0 auto';
  panel.style.maxWidth = '32rem';
  panel.style.padding = '4rem 1.5rem';
  panel.style.textAlign = 'center';

  const heading = document.createElement('h1');
  heading.style.fontSize = '1.5rem';
  heading.textContent = 'Lace runs inside the Lace extension';

  const install = document.createElement('a');
  install.href = INSTALL_URL;
  install.textContent = 'Install Lace';

  panel.append(heading, install);
  document.body.replaceChildren(panel);
};

/**
 * Decide the gate for THIS document and, when it fires, replace the body with
 * the install notice. Returns whether it fired, so the entry point can skip
 * boot entirely. `allowStandalone` is the app's build-time escape hatch for
 * unembedded runs (dev server, e2e); a deployed build passes false.
 */
export const applyEmbeddedGate = ({
  allowStandalone,
}: {
  allowStandalone: boolean;
}): boolean => {
  if (
    !shouldRenderEmbeddedGate({
      allowStandalone,
      isEmbedded: window.parent !== window,
    })
  ) {
    return false;
  }
  renderInstallNotice();
  return true;
};
