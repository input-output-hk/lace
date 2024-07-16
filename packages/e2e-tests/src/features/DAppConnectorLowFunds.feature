@DAppConnectorLowFunds @Testnet
Feature: DAppConnector - Low Funds

  Background:
    Given Wallet is synced
    And I de-authorize all DApps in extended mode
    And I reclaim collateral (if active) in extended mode

  @LW-8407
  Scenario: Automatically trigger collateral setup - Insufficient funds modal - add funds click
    Given I switch network to: "Mainnet" in extended mode
    And I open and authorize test DApp with "Only once" setting
    When I click "Set Collateral" button in test DApp
    Then I see DApp insufficient funds window
    When I click "Add funds" button in DApp insufficient funds window
    And I switch to last window
    Then I see Lace extension main page in extended mode

  @LW-8408
  Scenario: Automatically trigger collateral setup - Insufficient funds modal - cancel click
    Given I switch network to: "Mainnet" in extended mode
    And I open and authorize test DApp with "Only once" setting
    When I click "Set Collateral" button in test DApp
    Then I see DApp insufficient funds window
    When I click "Cancel" button in DApp insufficient funds window
    And I switch to window with DApp
    Then I don't see DApp window
