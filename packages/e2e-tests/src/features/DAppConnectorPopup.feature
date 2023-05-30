@DAppConnector-Popup
Feature: DAppConnector - Popup view

  Background:
    Given Wallet is synced

  @LW-6685 @Testnet @Mainnet
  Scenario: Popup view - Authorized DApps section - empty state
    Given I open settings from header menu
    When I click on "Authorized DApps" setting
    Then I see "Authorized DApps" section empty state in popup mode

  @LW-6686 @Testnet @Mainnet
  Scenario: Popup view - Authorized DApp is displayed in Lace Authorized DApps section after clicking "Always"
    Given I open and authorize test DApp with "Always" setting
    And I switch to window with Lace
    And I open settings from header menu
    When I click on "Authorized DApps" setting
    Then I see test DApp on the Authorized DApps list
    And I de-authorize all DApps in popup mode

  @LW-6687 @Testnet @Mainnet
  Scenario: Popup View - Authorized DApp is not displayed in Lace Authorized DApps section after clicking "Once"
    Given I open and authorize test DApp with "Only once" setting
    And I switch to window with Lace
    And I open settings from header menu
    When I click on "Authorized DApps" setting
    Then I see "Authorized DApps" section empty state in popup mode
