@Staking-DelegatedFunds-Popup @Testnet @Mainnet @Pending
Feature: Staking Page - Funds already delegated - Popup View

  Background:
    Given Wallet is synced

  @LW-2653
  Scenario: Popup View - Staking - Details of currently staked pool
    And I navigate to Staking popup page
    When I click pool name in currently staking component
    Then I see drawer with "ADA Ocean" stake pool details

