# @lace-lib/cardano-custody

## Purpose

Pure, IO-free primitives for the **Cardano custody account**: an account at a
permanent script address of the
[Cardano account custody contract](https://github.com/Biglup/cardano-account-custody-contract/tree/b48545f4be850c1044de2dbeb51751718b4b8e70).
The address's payment credential is a permanent account proxy. The account's
rules live in a logic script that the control datum names and a device may
replace; the proxy runs that logic through a withdrawal from the logic's
script stake credential, which every transaction that operates the account
carries. Device keys listed in the control datum own the account. Agents
spend from it under on-chain grants. Each grant sits in its own grant UTxO at
the account address, caps outflow of one asset and restricts expiry and
recipients.

The SDK and the hosted passkey signer both use this library, so they derive
identities, decode datums and apply authoring rules with one implementation.
It depends only on `@cardano-sdk/*`. It never imports `@lace-contract/*`,
because `@lace-contract/cardano-context` imports it.

The contract is unaudited, and upstream describes it as testnet-only.

## API overview

All names are exported from `src/index.ts`. Functions that can fail return a
`CustodyResult` (`{ ok: true, value }` or `{ ok: false, error }`) with a typed
error instead of throwing for invalid input. A result is plain data, but its
payload may hold `bigint`, so convert it before putting it in a Redux action
or JSON. The encoders return Plutus data rather than a result: they throw for
a hex field that is not hex of whole bytes, which the types already exclude.

### Blueprint and contract versions

- `ACCOUNT_VALIDATOR_COMPILED_CODE`, `ACCOUNT_VALIDATOR_HASH`: the account
  proxy (`account.account`), which takes no parameter and is the same on
  every network. Lace calls it the account validator.
- `UNAPPLIED_STAKE_VALIDATOR_COMPILED_CODE`, `UNAPPLIED_STAKE_VALIDATOR_HASH`:
  the stake validator as the blueprint carries it, before application.
- `LOGIC_V1_COMPILED_CODE`, `LOGIC_V1_HASH`: logic version 1 applied to the
  proxy hash, its only parameter, so it is the same on every network.
- `CUSTODY_BLUEPRINT_SHA256`, `CUSTODY_CONTRACT_COMPILER`,
  `CUSTODY_CONTRACT_REVISION`: provenance of the pinned build.
- `findCustodyContractVersion(accountValidatorHash)`: the supported version a
  record or persisted account names, or `unsupported-contract-version`.
  `SUPPORTED_CUSTODY_CONTRACT_VERSIONS` lists every supported version, oldest
  first; creator recovery scans each of them.
  `CURRENT_CUSTODY_CONTRACT_VERSION` is the version new accounts use. Every
  account is bound for life to the account proxy its stake script was
  applied to.
- A version's `logics` are the logic scripts Lace accepts for its accounts:
  logic version 1 only. `currentLogicHash` names the logic new accounts run.
  `findCustodyLogic(version, logicHash)` gives the logic a control datum
  names, or `unknown-logic`: Lace neither operates nor signs for an account
  under rules it has not reviewed.
- A version's `referenceScripts` are the UTxOs that park its proxy and logic
  scripts on a network, by network magic: Preprod only. Each pins the output
  reference, the address and the lovelace (`CustodyReferenceScript`).
  `custodyReferenceScriptUtxos(version, networkMagic)` rebuilds them as the
  chain holds them, with the vendored script as reference script, so a
  builder references a script without a chain lookup. On a network without
  an entry, transactions attach the proxy and the logic.
- `custodyDeviceAccountIndex(version, networkMagic)`: the CIP-1854 account
  index of the version's creator and device keys on a network. The pinned
  version uses account 0 on Mainnet and account 1 on every testnet, so a
  testnet creation never reveals a Mainnet creator key hash. Callers always
  take the index from here.

Runtime code never imports `src/blueprint/plutus.json` or
`src/blueprint/preprod.json`. Tests tie the TypeScript constants to them, and
the redeemer codecs to the blueprint's constructor indices.

### Identity

`deriveCustodyAccountIdentity({ contractVersion, creatorKeyHash, chainId })`
returns the stake script (a `Cardano.PlutusScript` ready for
`TransactionBuilder.attachScript`), the stake script hash, the base address,
the reward account and the state NFT asset id. It refuses a chain id whose
network id is not the one its network magic implies, because the account
record keeps only the magic.

- The stake validator takes the creator key hash (`owner`), then the proxy
  hash. Lace applies them without a UPLC library: the applied script for an
  all-zero owner is built once from the unapplied script, and each owner is
  written at bytes 1219-1246 of the 1283-byte result. Tests pin
  the upstream vectors that `aiken blueprint apply` produces, a vector derived
  for the upstream Preprod creator key, and compare 200 owners against
  `@blaze-cardano/uplc` `applyParams`, a test-only dependency.
- The stake script hash and the NFT id are the same on every network. Preprod
  and Preview share network id 0 and therefore addresses, so the identity
  carries the network magic.

### Account tokens

Every token under the account policy is an account token, and the contract
keeps each one, in quantity 1, at the address of the account whose stake
script hash starts its name. The state NFT is named by the 28-byte stake
script hash. A grant token is named by the stake script hash followed by the
grant's slot as 4 big-endian bytes.

- `custodyGrantTokenName(stakeScriptHash, slot)` and
  `custodyGrantAssetId(account, slot)` give a grant's token. Both throw a
  `RangeError` for a slot outside 0 to 2^32 − 1.
- `parseCustodyAccountTokenName(name)` reads a lower-case hex name of 28 or
  32 bytes as the state NFT or a grant token, with its stake script hash and
  slot. The caller checks the policy id and compares the hash with its own
  account's.

### Codecs

`encodeCustodyAccountState` and `decodeCustodyAccountState` convert the
control datum,
`{ logic, devices, grantGeneration, nextSlot, revoked, outstanding }`: the
hash of the logic the account runs, the device key hashes, the generation
every current grant carries, the slot the next grant takes, the revoked slots
and the number of grant tokens minted and not yet burned.
`encodeCustodyGrant` and `decodeCustodyGrant` convert the inline datum of a
grant UTxO, `{ slot, grantee, generation, scope }`; a scope is
`{ asset, perCallCap, cap, lovelacePerCallCap, lovelaceCap, expiresAt, recipients }`.
`decodeCustodyStateLogic` reads only the first field of a control datum and
`decodeCustodyStateDevices` only the second, whatever the field count. The
proxy reads the logic and the stake script reads the devices by position, so
every logic keeps both there, and a verifier that needs only these keeps
working when later fields change.

Recipients are Plutus address data, which carries no network id;
`custodyRecipientFromAddress` and `custodyRecipientToAddress` convert them from
and to a `Cardano.Address` on a given network. The redeemer encoders
(`encodeCustody*Redeemer`) cover the spend redeemer (`Device`, `SpendWithGrant`,
`SweepGrant`, `Fund`), the mint redeemer (`CreateAccount`, `IssueGrants`,
`BurnGrants`), the stake redeemer (`Operate`) and the logic redeemer (`Run`,
which a logic run carries); none carries a field. Inspection decodes the
spend and mint redeemers only.
`CUSTODY_LOVELACE_ASSET` (empty policy id and asset name) and
`isCustodyLovelaceAsset` name the asset of a lovelace grant.

- Decoding accepts exactly the shapes the contract's soft cast accepts:
  canonical constructor indices and exact field counts. Unlike upstream, a
  credential constructor other than 0 or 1 is refused.
- Decoding applies no authoring rule, so an on-chain entry with, for example,
  a 27-byte device hash still decodes. A device can then remove it.
- Encoders always build fresh Plutus data. Decoded `@cardano-sdk/core` data
  keeps a `cbor` cache that wins over any edit, so encoders never reuse it.

### UTxO classification

- `classifyCustodyAccountUtxos(account, utxos)` sorts the UTxOs at the
  account's exact address by who may spend them, and ignores every other
  address. It never throws.
  - `controls`: every UTxO holding the state NFT. More than one makes the
    account invalid; the caller decides.
  - `grants`: UTxOs holding exactly one grant token of the account beside
    lovelace, with an inline grant whose slot is the token's, in slot order.
  - `reserves`: no account token and an inline datum, which only a device
    spends. `own` carry exactly the datum `d87980` and no reference script;
    `foreign` carry any other datum or a reference script, which raises the
    fee and minimum lovelace of spending them.
  - `funds`: no account token and no datum. Agents spend them within their
    grants, and devices spend them.
  - `stranded`: no account token and a datum hash, whose datum the chain does
    not reveal.
  - `anomalies`: account tokens in a shape the contract rules out, listed
    and never spent.
- `custodyGrantLiveness(grant, state, now)` judges a grant against a control
  state: `superseded` (an older generation), `future-generation` (a newer
  generation, so the state is older than the grant), `revoked`, `expired`
  (its expiry is at or before `now`) or `current`, in that order of
  precedence. Only a current grant can be spent; a superseded, revoked or
  expired grant can be swept.

### State rules and transitions

- The state rules list every rule a control state or a grant breaks, with
  its position. They combine the contract's bounds with authoring rules the
  contract does not check.

  - Bounds: 1 to 8 distinct devices, at most 16 outstanding grants, at most
    32 revoked slots, non-negative counters, at most 8 recipients,
    non-negative caps, a positive expiry and zero lovelace caps on a lovelace
    grant.
  - Authoring rules: a 28-byte logic hash, 28-byte key and credential
    hashes, policy ids of 0 or 28 bytes, asset names of at most 32 bytes,
    distinct recipients, a non-negative generation and a slot from 0 to
    2^32 − 1.

  The transitions, the agent policy parser and inspection apply them to every
  state and grant Lace builds or approves. On chain data they mark the
  entries that are unusable. `CUSTODY_MAX_GRANTS` (16), `CUSTODY_MAX_REVOKED`
  (32) and `CUSTODY_MAX_GRANT_BATCH` (8, the most grants one transaction
  issues or sweeps) are the exported bounds.

- `isCustodyGrantExpired(grant, now)` and
  `findCustodyGrantsHeldByDevices(state, grants)` support consent. A
  non-finite `now` counts as expired, and the grant transitions refuse it as
  `invalid-now`.
- The transitions check what they introduce and fail with a
  `CustodyStateTransitionError`. The ones that touch grants take `grants`,
  every grant of the account: its grant UTxOs and the issues still in flight.
  - `createInitialCustodyAccountState`: the creator as the only device under
    the given logic, generation 0 and zero counters, the only state Lace
    creates.
  - `issueCustodyGrant`: a grant in the next slot under the current
    generation, with the next slot and the outstanding count one higher. It
    refuses a full account (`grant-limit`) and the end of the slot space.
  - `revokeCustodyGrant`: appends the slot of a current grant to the revoked
    list. It refuses a grant that is not current (`grant-not-current`) and a
    full list (`revoked-list-full`).
  - `replaceCustodyGrant`: a revoke and an issue in one state.
  - `revokeAllCustodyGrants`: raises the generation, which kills every grant,
    and empties the revoked list.
  - `sweepCustodyGrants`: lowers the outstanding count by the grants swept
    and removes exactly their slots from the revoked list. Slots are never
    reused, so a removed slot cannot revive a grant. Each grant must be dead
    against the state before the sweep (`grant-not-dead`), at most 8 go in
    one sweep, and `startsAfter` names the latest expiry a grant dead by
    expiry alone needs the transaction's validity to start after.
  - `addCustodyDevice` and `removeCustodyDevice`: refuse a full device list
    and the removal of the last usable device (`last-device`). Removing a
    device leaves the grants its key holds in force.
- An agent key holds one current grant. Issuing to a grantee that holds a
  current grant fails with `grantee-has-grant` and names its slot; replace
  that grant to change its scope or move it to another key. A grant to a
  listed device fails with `grantee-is-device`, and a device that is the
  grantee of a current grant fails with `device-is-grantee`.

### Public account record and agent policy

- `createCustodyAccountRecord(identity)` produces the transferable record v1,
  which callers can serialize with `JSON.stringify`:
  `{ type, version, networkMagic, accountValidatorHash, creatorKeyHash, stakeScriptHash, address }`.
- `parseCustodyAccountRecord(input, selectedNetworkMagic)` validates a record
  offline, in order: (1) type, version and field shapes; (2) a supported
  contract version; (3) the stake script hash re-derived from the creator key
  hash; (4) the address re-derived for the record's network, byte for byte;
  (5) the selected network. Each step fails with its own error code. Step 3
  is what proves the record names a genuine custody account, because the mint
  accepts any stake script. The upstream `{ owner, stakeScriptHash, address }`
  shape is accepted too, with the network taken from the selected one.
- `exportCustodyAgentPolicy(record, grant)` renders the agent policy version 2
  for a grant read from its grant UTxO: the record, the grantee and the grant
  as `{ slot, generation, token, asset, perCallCap, cap, lovelacePerCallCap, lovelaceCap, expiresAt, recipients }`,
  with integers as decimal strings and recipients as bech32 on the record's
  network. The slot, token and caps are a snapshot: the agent finds its
  grant by its key, and the grant UTxO holds the current caps.
- `parseCustodyAgentPolicy(input, selectedNetworkMagic)` accepts only that
  shape, validates the record as `parseCustodyAccountRecord` does, and checks
  that the token is the grant token of the account and slot. It refuses any
  other version. It does not prove that the grant exists or is current.

### Device keys

Custody device and creator keys follow
[CIP-1854](https://cips.cardano.org/cip/CIP-1854): `m/1854'/1815'/a'/0/i`
(`CUSTODY_DEVICE_KEY_PATH`), where `a` is `custodyDeviceAccountIndex` for the
contract version and network. `deriveCustodyDeviceKey(accountPublicKey, index)`
derives the key and its hash from the account extended public key, without a
secret. `custodyDeviceFingerprint(keyHash)` gives the first and last 8 hex
characters for people to compare across devices.

`CUSTODY_CREATOR_INDEX_GAP` (20) is the CIP-1854 address gap of creator
recovery: a scan stops once that many unregistered creator indices follow the
last account found. An index someone else registered first neither counts
toward the gap nor resets it. Recovery (`recoverCardanoCustodyAccounts` in
the SDK README) and creation (the Cardano module's creation builder)
document their own scan bounds; creation does not use the gap.

### Data signatures (proof of control)

A listed device proves that it controls an account by signing a site's
challenge as CIP-8 data. The signature binds the account address, the
origin of the site it is for and the purpose, so it never verifies for
another account, another site or another purpose. A site that relays
another site's challenge to the user gets a signature the issuing site
refuses.

- `custodyDataSigStructure({ address, origin, purpose, payload })` gives the
  bytes the device key signs: the COSE `Sig_structure`
  `["Signature1", protected, h'', payload]`.
- `encodeCustodyDataSignature({ address, origin, purpose, payload, publicKey, signature })`
  gives the CIP-30 `DataSignature` in CBOR hex:
  - the COSE_Sign1 is an untagged
    `[protected, { "hashed": false }, payload, signature]`, with the payload
    attached and never hashed;
  - the protected header is
    `{ 1: -8, "origin": text, "address": bytes, "purpose": text }` in
    deterministic CBOR order: EdDSA, the origin as `scheme://host[:port]`,
    the raw address bytes, and `sign-in` or `link-account`;
  - the COSE_Key is `{ 1: 1, 3: -8, -1: 6, -2: publicKey }`, an Ed25519 OKP
    key without a key id.
- `isCustodyDataOrigin(value)` accepts only an origin exactly as a browser
  serializes it: lower-case host, no default port, no path, no trailing
  slash, and not the opaque `null`. `isCustodyDataPurpose(value)` accepts
  `sign-in` and `link-account`. Both encoders throw for anything else.
- `verifyCustodyDataSignature({ signature, key, payload, address, origin, purpose, devices })`
  never throws. It returns the signer's key hash, or the first failure as
  `CustodyDataSignatureError`, in this order:
  `invalid-address`, `invalid-payload`, `invalid-origin`, `invalid-purpose`
  (the verifier's own input), `malformed-signature`, `malformed-key`,
  `address-mismatch`, `origin-mismatch`, `purpose-mismatch`,
  `payload-mismatch`, `invalid-signature` and `device-not-listed` (with the
  key hash). It accepts protected header labels and COSE_Key labels it does
  not read, including a key id, and refuses a label that repeats.

The challenge, the origin, the purpose and the devices are the verifier's
own. `devices` comes from the account's current control datum as the
verifier reads it from the chain, never from the client. The verifier issues
a fresh challenge for each proof, so a signature cannot be replayed.

### Transaction analysis

The SDK builders and the hosted signer read custody transactions with the
same functions, so the rules exist in one implementation. None of them reads
the chain: resolved inputs come from the caller.

- `inspectCustodyTransaction(transaction, resolvedInputs, options)` reads a
  `Serialization.Transaction`, the object whose body hash is signed, with the
  caller's resolutions of every input, reference input and collateral input.
  `options` names the chain, the current time, a slot to POSIX millisecond
  converter for the network, and optionally the account record, the signing
  device key hash and `allowGrantSpend`. A custody account is any address
  whose payment credential is a supported account proxy and whose stake
  credential is an inline script. `classifyCustodyAddress(address)` gives
  that reading for one address: `account`, `unspendable` (the account
  proxy with no, a key or a pointer stake part) or `other`.
  - On success it reports each account the transaction operates: the spent
    control input and its state, the referenced control UTxO of a grant
    spend, the control output with its state and lovelace, fund and reserve
    inputs, account outputs by kind, the grants it
    issues (each with its output, token, grant and lovelace), the grants it
    sweeps (each with why it was dead), a grant spend with the grant before
    and after, the net outflow per asset, the certificates and the reward
    withdrawal of its stake credential, the lovelace its logic run draws
    (`logicDraw`, present when not zero), the state change (devices added and
    removed, slots revoked and removed from the revoked list, the generation,
    next slot and outstanding count before and after, and the logic when it
    changes) and the list of operations. It also reports deposits
    to other custody accounts, external inputs and outputs, collateral,
    required signers, the validity bounds, the fee and the fee shares.
  - The fee shares (`feeShares`) attribute the fee: the external payers'
    addresses in ledger input order, the part of the fee they pay (what they
    put in beyond their own change, capped at the fee) and the rest, which
    the operated accounts pay. An external output to an external input's
    address is that payer's change.
  - An `owner-spend` is named when an asset other than an account token
    leaves the account, or when the lovelace leaving its address, its reward
    account and its logic run's draw exceeds its part of the accounts' fee
    share. An account that pays
    only its own fee spends nothing. With several operated accounts, an
    account's part is what the other accounts' outflows cannot cover.
  - Otherwise it returns every refusal in check order, so the first one is
    the one to report. `code` is what the hosted signer answers, and `reason`
    names the rule:
    - `custody-unsupported-version`: the record's contract version, or a
      control state spent, written or referenced that names a logic outside
      the version's catalogue (`unknown-logic`);
    - `custody-context-mismatch`: a record or resolution that does not match
      the body, another network, another account, a spend redeemer that does
      not fit the UTxO, a creation state other than the creator alone at
      generation 0 with zero counters, a known logic attached without a run
      or run with no control UTxO naming it (`unused-logic`), or a reference
      input at a parked script's output reference resolved without exactly
      that script (`reference-script-mismatch`);
    - `custody-malformed-datum`: an undecodable or impure control or grant
      UTxO; a new state that breaks a rule, lowers the generation or moves a
      counter otherwise than the grant tokens minted and burned do; or an
      issued grant that breaks the logic's issuance rule or an authoring
      rule, or is already expired;
    - `custody-unsupported-operation`: a grant spend unless allowed, an allowed
      grant spend that breaks the logic's grant spend rule or spends an input
      outside the account address (`grant-spend-foreign-input`); an operation
      without a withdrawal from the logic its control state names
      (`logic-withdrawal-missing`); a logic run whose draw the account gives up
      (`logic-draw-leaves-account`, below); a rewrite that changes the logic
      (`logic-changed`), since Lace does not upgrade accounts; a control UTxO
      referenced outside a grant spend; a reference input carrying a script
      other than a parked contract script at its pinned output reference on the
      network (`foreign-reference-script`); a reward account the withdrawal map
      names twice, read from the body bytes (`duplicate-withdrawal`); issue and
      sweep in one transaction; more than 8 grants issued or swept; a swept
      grant that is not dead, or burns that do not match the swept grants; a
      slot taken off the revoked list without its token burned or a generation
      step, or a slot revoked that was never issued or is already listed; a
      reserve spent without the control UTxO; a control output carrying a
      reference script at creation or in a device rewrite; an output at the
      account that is neither a plain deposit nor a reserve with the datum
      `d87980` and no reference script; vote or combined delegation, any other
      certificate, a withdrawal from a credential that is neither the account's
      stake script nor a known logic, a mint Lace does not build; a stake
      operation without the control UTxO spent; or a body field such as votes or
      sub-transactions;
    - `custody-device-not-listed`: the device is not listed, not the creator
      at creation, or not a required signer;
    - `custody-locked-output`: an output no account builder can spend.
  - A device key hash that is not 28 bytes, which the contract does not
    check, is accepted in a new state only when the previous state already
    lists it, so a device can remove it. Every other authoring rule applies
    to every new state.
  - A logic run draws the whole reward balance of the logic's credential,
    which anyone can pay into and is normally zero. Lovelace is fungible, so
    inspection credits the draw to the account: it is accepted only when the
    account then gives up no more lovelace than its part of the fee, and
    never in a grant spend. When an external payer takes change back, that
    part is nothing, so the payer's change cannot hold the draw. A creation
    therefore keeps the draw when its control output holds at least that
    much. The report shows it as `logicDraw`, never as a reward withdrawal
    of the account.
- `detectCustodyEffects(transaction)` reads the body alone, for a signing
  kind that has no resolutions. It reports an output or the collateral
  return carrying a datum at an account proxy payment credential (a reserve
  deposit among them), an output holding an account token, a mint or burn
  under the account policy, an account proxy witness script, a withdrawal
  from a known logic's credential (`logic-withdrawal`), a known logic
  witness script (`logic-witness`), and payments that no redeemer can ever
  spend. A transaction whose only custody
  elements are datum-free payments to custody account addresses is
  deposit-only.
- Grant spends follow `grant.ak` and the logic's `grant_spend_rule`
  exactly. Inspection computes the value
  spent from the exact account address minus the value paid back to it, per
  asset class, with addresses compared as Plutus data.
  `findCustodyScopeViolations` checks a net outflow against a scope. Given
  the fee the account pays, or an estimate no lower than it, it reports that
  fee on each violation whose outflow is lovelace, so the outflow reads as
  the payment plus the fee. `custodyGrantAfterSpend` lowers a grant's `cap`,
  and for a token grant its `lovelaceCap`, by the net outflow of its asset:
  the most the recreated grant may keep, since the logic accepts any cap
  from zero to that value. With `allowGrantSpend`, inspection checks
  the whole grant spend: the grant UTxO as the only account-token input, the
  control UTxO referenced exactly once, a current grant, the grantee's
  signature, a finite upper bound no later than the expiry, scope,
  recipients, plain deposits back, token placement, the recreated grant UTxO
  with its exact value, every field kept and caps within range, and no mint
  under the account policy. The inspector refuses
  each of them as `grant-spend-violation`, so a grant spend it accepts is one
  the logic accepts.
- `compareRequestedGrantScope(requested, actual, chainId)` lists the fields
  where the scope an app declares differs from a grant the transaction
  issues. Recipients must be equal as an ordered list, on the account network
  and in canonical bech32: lower case, with the prefix of the network the
  address header names. `serializeCustodyRequestedGrantScope` and
  `parseCustodyRequestedGrantScope` carry a requested scope through the
  signer protocol; the parser accepts only canonical decimal strings,
  lower-case hex and canonical bech32 payment addresses.

### Fee sponsor policy

`findCustodySponsorRuleViolations(transaction, resolvedInputs, context)`
mirrors the policy of the
[fee sponsor service](https://github.com/Biglup/cardano-account-custody-fee-sponsor/tree/4de7a3812af99c631870724a0633f6250ed4f23a).
`context` names the mode (`fee`, with the leased fee UTxO and the most it may
be drawn down by, or `collateral`), the sponsor address, the shared
collateral UTxO, the contract version, the network magic, the latest upper
validity slot the mode accepts, the current slot, the protocol's collateral
percentage and its cost models. The contract version stands for the
service's configuration: its proxy is the account script, its logics are the
logics the service knows, and a creation's stake credential must be its stake
validator applied to a listed device. It returns at most one violation per
rule, in the service's check order, each with the service's `rule` name
(`well_formed`, `uses_leased_fee_input`, `no_sponsor_inputs`,
`uses_shared_collateral`, `bounded_validity`, `account_transaction`,
`known_logic`, `sponsor_outflow_bounded`, `sponsor_outflow_zero`,
`no_sponsor_value_elsewhere`, `no_foreign_scripts`, `script_data_hash`,
`signers`) and a `reason`.

- Fee mode serves a creation only. The leased fee UTxO may pay only its fee,
  stake deposit and control output, and the fee may not exceed the service's
  default limit of 2 ADA.
- An account input counts when it holds the account's state NFT or one of its
  grant tokens. A referenced control UTxO of an account no input operates is
  refused, and so is a grant UTxO whose control UTxO is neither spent nor
  referenced.
- Every control UTxO the transaction spends or references, and every control
  output it writes, must name a known logic (`known_logic`).
- Scripts: inputs and mints may run the proxy only; certificates and votes
  may name the proxy or an account's stake script; withdrawals and attached
  scripts may also name a logic a control datum names. A withdrawal map
  that names a reward account twice is refused, and so is a logic run that
  draws lovelace (`logic-draw`): the service runs a logic on a withdrawal of
  zero only.
- The script data hash is recomputed from the witness set's redeemers and
  datums and the language views of every attached script and every
  reference script on an input or reference input, a superset of what the
  ledger counts. Lace attaches and references PlutusV3 scripts only, so both
  agree.
- Lace's own checks sit beside the service's: the shared collateral rule
  also refuses a fee the collateral cannot cover at the collateral
  percentage (`fee-exceeds-collateral`), and the script rule also refuses a
  reference input that carries a script, unless it is a parked script's UTxO
  on the network carrying exactly that script (`foreign-reference-script`).

Builders run it before they ask the sponsor for a witness to catch defects
early. It is not a second policy engine: it does not evaluate scripts, it
knows only the sponsor UTxOs the client sees, where the service knows its
whole pool, and it assumes the service's default fee limit and the version's
logics, where the service reads its configuration. A passing mirror check
does not guarantee that the service will sign.

## Limits

- No IO. Reading the chain, including the final record check (one control UTxO
  at the address with a decodable inline datum), belongs to the caller.
- One creator key creates at most one account per network: the stake
  credential can never be deregistered. Anyone who learns the stake credential
  before creation can register it first and block creation at that address.
- The scripts do not check hash lengths, most authoring rules or which
  slots the revoked list holds. A state that breaks them can exist on chain;
  the violation functions report it. The control datum stays within 449
  bytes only for values Lace writes, since the logic bounds counts, not
  integer sizes.
- Recipients carry no network. A recipient renders on whichever network the
  caller names.
- Inspection checks resolutions against the transaction, not against the
  chain. It refuses a spend redeemer on an input that no script locks, an
  account proxy witness that nothing needs, a known logic attached without
  a run, a parked script's output reference resolved to another script,
  and any other reference input that carries a script. A resolution that
  places a fund input at another script address can still hide it, since
  inspection does not check which script an input outside the account
  needs.
- Witness-set redeemers are bound to a signature only through the script
  data hash, which inspection does not recompute. The report reads each
  account input's spend redeemer from them. Another redeemer set under the
  same body cannot change what the body does: it can only run a script
  branch that the device's signature does not authorise. A redeemer list
  that names one pointer twice is refused.
- Body-only detection sees every custody spend the contract accepts,
  because each one pays an account token back to the account: an owner
  operation recreates the control UTxO, a grant spend its grant UTxO, and a
  sweep spends the control UTxO beside the grants it burns. It also sees
  every logic run. It cannot see a withdrawal or a delegation of an
  account's stake credential that only references the control UTxO, since
  that runs no logic. That needs the signature of a listed device, a
  CIP-1854 key that the ordinary signing kinds never derive.
- Lace accepts logic version 1 only, and refuses a change of logic: a device
  may install any registered logic on chain, so an account that names
  another logic is reported `unknown-logic` and never operated.

## Re-pinning the blueprint

1. Replace `src/blueprint/plutus.json` byte for byte with the upstream file and
   update `CUSTODY_BLUEPRINT_SHA256` and the provenance constants.
2. Copy the proxy's and the stake validator's compiled codes and hashes into
   `src/blueprint/*-validator.ts`.
3. Apply each logic validator to the proxy hash with the Aiken CLI, and
   vendor the applied code and hash beside `src/blueprint/logic-v1.ts`. The
   tests re-apply it with `@blaze-cardano/uplc` and compare it with the
   applied hash, size and code SHA-256 the CLI gives, which they pin.
4. Replace `src/blueprint/preprod.json` byte for byte with upstream's
   `offchain/networks/preprod.json`, update its SHA-256 pin in
   `test/blueprint.test.ts`, and copy its records into the parked-script
   catalogue, `src/blueprint/reference-scripts.ts`. Check on chain that each
   parked UTxO is unspent and carries the script its record names, at an
   address no transaction can spend from: builders rebuild those UTxOs from
   the catalogue and never look them up.
5. A new proxy hash is a new entry in the version registry in
   `src/contract-version.ts`, keyed by that hash; existing accounts keep their
   version. A new logic under the same proxy joins the entry's `logics` only
   once Lace reviews its rules and supports the change of logic.
6. Recompute the stake validator body bit length. The trailing filler of the
   unapplied program allows several lengths; only the right one reproduces the
   Aiken CLI vectors, which the tests must pin for the new build.

To re-pin the fee sponsor, port its rule changes into
`src/analysis/sponsor-rules.ts`, name the new revision in that file's header
and in the fee sponsor link above, and copy its refusal details again into
`apps/lace-sdk/test/custody/sponsor-detail-catalogue.ts`, so the SDK's tests
check how it reads typed errors out of them.

## Provenance and license

- Upstream: <https://github.com/Biglup/cardano-account-custody-contract>,
  revision `b48545f4be850c1044de2dbeb51751718b4b8e70`.
- Author: Angel Castillo (Biglup).
- License: Apache-2.0. `LICENSE` is the upstream license file. Upstream ships
  no NOTICE file.
- Blueprint: `src/blueprint/plutus.json`, vendored byte for byte, SHA-256
  `8b48096f70a5d0cb207659fcc7875b5f0639f7822604c6e7db439212b5374dde`.
- Preprod network setup: `src/blueprint/preprod.json`, upstream's
  `offchain/networks/preprod.json` vendored byte for byte, SHA-256
  `61c04cb9e6c36eac670fc155177b51d6d7dc24315813e1ca08d1879ff62991a6`.
- Both are listed in `.prettierignore` so formatting cannot change them.
- Compiler: Aiken v1.1.24 (`v1.1.24+bacbeb3`) with aiken-lang/stdlib v4.0.0,
  Plutus V3.
- Every file ported from upstream starts with a header naming the upstream
  file and revision and stating that it was modified for Lace.
