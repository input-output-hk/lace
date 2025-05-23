@DAppConnector-Popup
Feature: DAppConnector - Popup view

  Background:
    Given Wallet is synced
    And I de-authorize all DApps in popup mode

  @LW-6685 @Testnet @Mainnet
  Scenario: Popup view - Authorized DApps section - empty state
    Given I open settings from header menu
    When I click on 'Authorized DApps' setting
    Then I see 'Authorized DApps' section empty state in popup mode

  @LW-6686 @Testnet @Mainnet @skip(browserName='firefox') @issue=LW-12440
  Scenario: Popup view - Authorized DApp is displayed in Lace Authorized DApps section after clicking 'Always'
    Given I open and authorize test DApp with 'Always' setting
    And I switch to window with Lace
    And I open settings from header menu
    When I click on 'Authorized DApps' setting
    Then I see test DApp on the Authorized DApps list

  @LW-6687 @Testnet @Mainnet @skip(browserName='firefox') @issue=LW-12440
  Scenario: Popup View - Authorized DApp is not displayed in Lace Authorized DApps section after clicking 'Once'
    Given I open and authorize test DApp with 'Only once' setting
    And I switch to window with Lace
    And I open settings from header menu
    When I click on 'Authorized DApps' setting
    Then I see 'Authorized DApps' section empty state in popup mode

  @LW-6881 @Testnet @Mainnet
  Scenario: Popup view - Remove authorized DApp and cancel, DApp remains authorized
    Given I open and authorize test DApp with 'Always' setting
    And I switch to window with Lace
    And I close all remaining tabs except current one
    And I open settings from header menu
    And I click on 'Authorized DApps' setting
    And I see test DApp on the Authorized DApps list
    When I de-authorize test DApp in popup mode
    Then I see DApp removal confirmation window
    When I click 'Back' button in DApp removal confirmation modal
    Then I see test DApp on the Authorized DApps list
    When I open test DApp
    Then I don't see DApp window

  @LW-6882 @Testnet @Mainnet
  Scenario: Popup view - Remove authorized DApp, DApp requires authorization
    Given I open and authorize test DApp with 'Always' setting
    And I switch to window with Lace
    And I close all remaining tabs except current one
    And I open settings from header menu
    And I click on 'Authorized DApps' setting
    And I see test DApp on the Authorized DApps list
    When I de-authorize test DApp in popup mode
    Then I see DApp removal confirmation window
    When I click 'Disconnect DApp' button in DApp removal confirmation modal
    Then I see 'Authorized DApps' section empty state in popup mode
    When I open test DApp
    Then I see DApp authorization window
