@Staking-DelegatedFunds-Popup @Testnet @Mainnet @Pending
Feature: Staking Page - Funds already delegated - Popup View

  Background:
    Given Wallet is synced

  @LW-2652
  Scenario: Popup View - Staking  - Currently staking component
    When I navigate to Staking popup page
    Then I see currently staking component for stake pool: "ADA Ocean" in popup mode

  @LW-2653
  Scenario: Popup View - Staking - Details of currently staked pool
    And I navigate to Staking popup page
    When I click pool name in currently staking component
    Then I see drawer with "ADA Ocean" stake pool details

