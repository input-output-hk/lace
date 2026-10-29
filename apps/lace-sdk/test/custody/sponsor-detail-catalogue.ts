/**
 * The refusal details of Biglup/cardano-account-custody-fee-sponsor at
 * 3cdb3616d, whose rules sponsor main 4de7a38 keeps unchanged: each
 * template copied verbatim from src/policy/rules.ts or
 * src/policy/evaluate.ts, at the line noted. The SDK reads typed errors out
 * of these free-text details, so a sponsor that rewords one must fail the
 * tests that use this catalogue before it reaches an app.
 */
export const SPONSOR_DETAILS = {
  /** rules.ts:376, rule `account_transaction`. */
  unoperatedControl: (ref: string, account: string) =>
    `Reference input ${ref} is the control UTxO of account ${account}, which no input operates`,
  /** rules.ts:385, rule `account_transaction`. */
  orphanGrant: (ref: string, account: string) =>
    `Input ${ref} is a grant UTxO of account ${account}, whose control UTxO is neither spent nor referenced`,
  /** rules.ts:316, rule `account_transaction`. */
  noAccountInput:
    'No input is an account control or grant UTxO and nothing is minted under the account policy',
  /** rules.ts:320, rule `account_transaction`. */
  creationMintCount:
    'An account creation mints exactly one token under the account policy',
  /** rules.ts:323, rule `account_transaction`. */
  creationNftName:
    'An account creation mints a state NFT named with the 28 bytes of its stake script hash',
  /** rules.ts:330, rule `account_transaction`. */
  creationRegistration:
    'An account creation registers exactly one script stake credential with its deposit',
  /** rules.ts:659, rule `no_sponsor_value_elsewhere`. */
  uncoveredOutflow: (demanded: bigint, supplied: bigint) =>
    `Outputs away from the sponsor and the account need ${demanded} lovelace but the non sponsor inputs supply ${supplied}`,
  /** evaluate.ts:60, rule `evaluates`. */
  unknownInput: (ref: string) =>
    `Input ${ref} is not an unspent output the chain knows`,
  /** evaluate.ts:64, rule `evaluates`. */
  unknownReferenceInput: (ref: string) =>
    `Reference input ${ref} is not an unspent output the chain knows`,
  /** rules.ts:565, rule `known_logic`. */
  noLogic: (where: string) =>
    `${where} names no logic script hash in the first field of its datum`,
  /** rules.ts:568, rule `known_logic`. */
  unknownLogic: (where: string, logic: string) =>
    `${where} names logic ${logic}, which is not one of the logic scripts the service knows`,
  /** rules.ts:254, the `where` of a spent or referenced control UTxO. */
  controlUtxo: (ref: string, account: string) =>
    `The control UTxO ${ref} of account ${account}`,
  /** rules.ts:720, rule `no_foreign_scripts`. */
  logicDraw: (hash: string, lovelace: bigint) =>
    `The withdrawal that runs logic ${hash} draws ${lovelace} lovelace, and a logic runs on a withdrawal of zero`,
  /** rules.ts:711, rule `no_foreign_scripts`. */
  duplicateWithdrawal: (rewardAddress: string) =>
    `The transaction withdraws from ${rewardAddress} twice, which the ledger cannot decode`,
  /** rules.ts:798, rule `script_data_hash`. */
  scriptDataUncomputed: (message: string) =>
    `The script data hash cannot be computed: ${message}`,
  /** rules.ts:802, rule `script_data_hash`. */
  scriptDataMismatch: (declared: string, computed: string) =>
    `The body commits to the script data hash ${declared} while the witness set carries script data hashing to ${computed}`,
} as const;
