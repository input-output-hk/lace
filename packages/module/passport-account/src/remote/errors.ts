/**
 * A request that needs the device key reached the signer outside a held
 * key session. Raised on the signer; it reaches the dApp as its code.
 */
export class KeySessionRequiredError extends Error {
  public readonly code = 'key-session-required' as const;
  public constructor(kind: string) {
    super(`The signer request "${kind}" needs an open key session.`);
    this.name = 'KeySessionRequiredError';
  }
}

/** What a request fell outside of: the flow's kinds, circuits or arguments. */
type FlowScopeSubject =
  | { argument: string }
  | { circuit: string }
  | { kind: string };

const describeFlowScope = (
  flowKind: string,
  subject: FlowScopeSubject,
): string => {
  if ('kind' in subject) {
    return `The signer request "${subject.kind}" is not part of the "${flowKind}" flow.`;
  }
  if ('circuit' in subject) {
    return `The circuit "${subject.circuit}" is not part of the "${flowKind}" flow.`;
  }
  return `The authorisation argument "${subject.argument}" is not what the "${flowKind}" flow was approved for.`;
};

/**
 * A request reached the signer inside a key session whose approved flow
 * never makes it: a kind the flow does not send, an authorisation for a
 * circuit the flow does not call, or an authorisation whose argument is
 * not the commitment, grant id, scope or account the user approved.
 * Raised on the signer before the key source is touched; it reaches the
 * dApp as its code.
 */
export class FlowScopeError extends Error {
  public readonly code = 'flow-scope' as const;
  public constructor(flowKind: string, subject: FlowScopeSubject) {
    super(describeFlowScope(flowKind, subject));
    this.name = 'FlowScopeError';
  }
}

/**
 * An open-inbox, reencrypt-inbox or create-keys request carried more
 * entries than one request may, so the signer refused it before touching
 * the key source.
 * The bound travels in `details`; a client splits a larger inbox into
 * requests of at most that many entries. Raised on the signer; it
 * reaches the dApp as its code.
 */
export class InboxRequestTooLargeError extends Error {
  public readonly code = 'inbox-request-too-large' as const;
  public readonly details: { maxEntries: number };
  public constructor(maxEntries: number) {
    super(
      `An inbox request carries at most ${maxEntries} entries; split the inbox over several requests.`,
    );
    this.name = 'InboxRequestTooLargeError';
    this.details = { maxEntries };
  }
}

/** What an issue-grant descriptor failed to re-derive to. */
type GrantBindingSubject = 'grantId' | 'scopeDigest';

const describeGrantBinding = (subject: GrantBindingSubject): string =>
  subject === 'grantId'
    ? 'The grant id is not the one derived for the dApp origin, the account, the grantee key and the slot.'
    : 'The scope digest is not the one derived from the scope and the scope salt.';

/**
 * An issue-grant flow reached the signer carrying a grant id or a scope
 * digest other than the one the signer derives itself from the
 * descriptor's scope, slot and salt and from the dApp origin it observes
 * on the channel. Raised on the signer before any ceremony; it reaches
 * the dApp as its code.
 */
export class GrantBindingMismatchError extends Error {
  public readonly code = 'grant-binding-mismatch' as const;
  public constructor(subject: GrantBindingSubject) {
    super(describeGrantBinding(subject));
    this.name = 'GrantBindingMismatchError';
  }
}

/**
 * A request reached the signer after its key session's time ran out. The
 * session was released when it expired, so the flow it served can only
 * fail; a fresh flow-open starts over. Raised on the signer; it reaches
 * the dApp as its code.
 */
export class SessionExpiredError extends Error {
  public readonly code = 'session-expired' as const;
  public constructor(kind: string) {
    super(
      `The signer request "${kind}" arrived after the key session expired.`,
    );
    this.name = 'SessionExpiredError';
  }
}
