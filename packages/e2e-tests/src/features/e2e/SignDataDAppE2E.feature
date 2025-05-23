@SignDataDApp-E2E @E2E @Testnet
Feature: Sign data from DApp

  Background:
    Given Wallet is synced

  @LW-11535
  Scenario: DApp - sign data - happy path
    When I open and authorize test DApp with 'Always' setting
    And I click 'Sign data' button in test DApp
    Then I see DApp connector 'Confirm data' page with correct address and data
    When I click 'Confirm' button on 'Confirm data' page
    Then I see DApp connector 'Sign transaction' page
    When I fill correct password
    And I click 'Confirm' button on 'Sign transaction' page
    Then I see DApp connector 'All done' page from 'data sign'
