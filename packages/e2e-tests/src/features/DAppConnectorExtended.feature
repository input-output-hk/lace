@DAppConnector-Extended
Feature: DAppConnector - Extended view

  Background:
    Given Wallet is synced

  @LW-6688 @Testnet @Mainnet
  Scenario: Extended view - Authorized DApps section - empty state
    Given I open settings from header menu
    When I click on "Authorized DApps" setting
    Then I see "Authorized DApps" section empty state in extended mode

  @LW-6689 @Testnet @Mainnet
  Scenario: Extended view - Authorized DApp is displayed in Lace Authorized DApps section after clicking "Always"
    Given I open and authorize test DApp with "Always" setting
    And I switch to window with Lace
    And I open settings from header menu
    When I click on "Authorized DApps" setting
    Then I see test DApp on the Authorized DApps list
    And I de-authorize all DApps in extended mode

  @LW-6690 @Testnet @Mainnet
  Scenario: Extended View - Authorized DApp is not displayed in Lace Authorized DApps section after clicking "Once"
    Given I open and authorize test DApp with "Only once" setting
    And I switch to window with Lace
    And I open settings from header menu
    When I click on "Authorized DApps" setting
    Then I see "Authorized DApps" section empty state in extended mode
