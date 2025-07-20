# Swaps

## Purpose

## Concept

swap provider

## Dex/Aggregator API

must conform to the shape

```typescript
const sdf = sdf;
```

## Business Logic

- [ ] if the user has no funds, there should be a modal/empty screen displayed to get user to onboard
- [ ] if user presses select on the you sell field, overlay modal appears and shows the assets available in wallet, if user has
- [ ] if the user has already selected an item from the list there is a selection indicator
- [ ] if the user selects token from that list, overlay closes and selected token is shown in the you sell field with ticker/name and balance

## UI/UX

- [x] menu icons + component (popup + extended)
- [x] routing
  - [x] if trying to access from popup- opens extended
- [x] conditional request on the routing from posthog
  - [x] load of the feature flag and payload

### Pages/Sheets

- [ ] main swap section
  - [ ] no quotes
  - [ ] not enough funds
  - [ ] with quotes
- [ ] select token drawer (sell)
- [ ] select token drawer (buy)
- [ ] select token drawer (empty search state)
- [ ] select token drawer (empty wallet state)
- [ ] liquidity sources drawer
- [ ] swap review drawer
- [ ] swap confirm tx drawer
- [ ] swap adjust slippage drawer
- [ ] swap tx success
- [ ] swap tx failure

## Flows

- [ ] happy path - in memory
- [ ] happy path - ledger
- [ ] happy path - trezor

## MISC

- [ ] extract translations keys
