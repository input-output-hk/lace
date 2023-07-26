@MultidelegationDelegatedFunds-Extended @Testnet @Mainnet @Pending
Feature: Staking Page - Funds already delegated - Extended Browser View

  Background:
    Given Wallet is synced

  @LW-2642 @Smoke
  Scenario: Extended View - Staking  - Currently staking component
    When I navigate to Staking extended page
    Then I see currently staking component for stake pool: "ADA Capital" in extended mode
