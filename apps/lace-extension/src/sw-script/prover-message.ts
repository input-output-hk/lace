/** Bound requests without interpreting a missing reply as proof-worker death. */
export const sendProofMessage = async <T>(message: {
  target: string;
  operation?: string;
}): Promise<T> =>
  new Promise((resolve, reject) => {
    const operation = message.operation ?? message.target;
    const timeout = setTimeout(() => {
      reject(
        new Error(`Background proof service did not respond (${operation})`),
      );
    }, 10_000);
    const noReply = (state: string) => {
      clearTimeout(timeout);
      reject(
        new Error(
          `Background proof service returned no reply (request: ${operation}; offscreen document: ${state}).`,
        ),
      );
    };
    chrome.runtime.sendMessage(message).then(
      reply => {
        if (reply !== undefined) {
          clearTimeout(timeout);
          resolve(reply as T);
          return;
        }
        // Inspect only metadata; never replay a request whose outcome is unknown.
        void chrome.runtime
          .getContexts({
            contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
          })
          .then(
            contexts => {
              noReply(contexts.length ? 'present' : 'missing');
            },
            () => {
              noReply('unknown');
            },
          );
      },
      error => {
        clearTimeout(timeout);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
