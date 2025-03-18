@Analytics @DAppExplorer-Extended @Testnet

Feature: Analytics - DApp Explorer

  Background:
    Given Wallet is synced

  @LW-12321
  Scenario: Extended View - DApp Explorer - open DApp and redirect
    Given I set up request interception for posthog analytics request(s)
    When I navigate to DApps extended page
    And I click on "DexHunter" DApp card
    Then I validate latest analytics single event "dapp explorer | dapp tile | click"
    When I click on DApp URL button
    Then I validate latest analytics single event "dapp explorer | detail drawer | redirect | click"
