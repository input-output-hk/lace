@Runner4 @DAppConnector-Extended
Feature: DAppConnector - Extended view

  Background:
    Given Wallet is synced
    And I de-authorize all DApps in extended mode

  @LW-6688 @Testnet @Mainnet
  Scenario: Extended view - Authorized DApps section - empty state
    Given I open settings from header menu
    When I click on "Authorized DApps" setting
    Then I see "Authorized DApps" section empty state in extended mode

  @LW-6689 @Smoke @Testnet @Mainnet
  Scenario: Extended view - Authorized DApp is displayed in Lace Authorized DApps section after clicking "Always"
    Given I open and authorize test DApp with "Always" setting
    And I switch to window with Lace
    And I open settings from header menu
    When I click on "Authorized DApps" setting
    Then I see test DApp on the Authorized DApps list

  @LW-6690 @Testnet @Mainnet
  Scenario: Extended View - Authorized DApp is not displayed in Lace Authorized DApps section after clicking "Once"
    Given I open and authorize test DApp with "Only once" setting
    And I switch to window with Lace
    And I open settings from header menu
    When I click on "Authorized DApps" setting
    Then I see "Authorized DApps" section empty state in extended mode

  @LW-6879 @Testnet @Mainnet
  Scenario: Extended view - Remove authorized DApp and cancel, DApp remains authorized
    Given I open and authorize test DApp with "Always" setting
    And I switch to window with Lace
    And I close all remaining tabs except current one
    And I open settings from header menu
    And I click on "Authorized DApps" setting
    And I see test DApp on the Authorized DApps list
    When I de-authorize test DApp in extended mode
    Then I see DApp removal confirmation window
    When I click "Back" button in DApp removal confirmation modal
    Then I see test DApp on the Authorized DApps list
    When I open test DApp
    Then I don't see DApp window

  @LW-6880 @Testnet @Mainnet
  Scenario: Extended view - Remove authorized DApp, DApp requires authorization
    Given I open and authorize test DApp with "Always" setting
    And I switch to window with Lace
    And I close all remaining tabs except current one
    And I open settings from header menu
    And I click on "Authorized DApps" setting
    And I see test DApp on the Authorized DApps list
    When I de-authorize test DApp in extended mode
    Then I see DApp removal confirmation window
    When I click "Disconnect DApp" button in DApp removal confirmation modal
    Then I see "Authorized DApps" section empty state in extended mode
    When I open test DApp
    Then I see DApp authorization window
    And I see Lace wallet info in DApp when not connected
