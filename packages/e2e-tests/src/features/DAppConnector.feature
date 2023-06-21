@DAppConnector
Feature: DAppConnector - Common

  Background:
    Given Wallet is synced

  @LW-3760 @Testnet @Mainnet
  Scenario: Extended View - Limited wallet information when wallet is not connected
    When I open test DApp
    Then I see Lace wallet info in DApp when not connected

  @LW-6660 @Testnet @Mainnet
  Scenario: DApp connection modal displayed after clicking "Authorize"
    When I open test DApp
    Then I see DApp authorization window
    When I click "Authorize" button in DApp authorization window
    Then I see DApp connection modal

  @LW-3756 @Testnet @Mainnet
  Scenario: Canceling DApp connection
    When I open test DApp
    Then I see DApp authorization window
    When I click "Cancel" button in DApp authorization window
    Then I don't see DApp window
    And I see Lace wallet info in DApp when not connected
    And I switch to window with Lace
    And I close all remaining tabs except current one
    When I open test DApp
    Then I see DApp authorization window

  @LW-4062 @Testnet @Mainnet
  Scenario: Authorize app functions as expected when the user chooses 'Only once'
    When I open test DApp
    And I see DApp authorization window
    And I click "Authorize" button in DApp authorization window
    And I click "Only once" button in DApp authorization modal
    And I switch to window with Lace
    And I close all remaining tabs except current one
    And I open test DApp
    Then I see DApp authorization window

  @LW-3754 @LW-4064 @Testnet @Mainnet
  Scenario: Authorize app functions as expected when the user chooses 'Always'
    When I open test DApp
    And I see DApp authorization window
    And I click "Authorize" button in DApp authorization window
    And I click "Always" button in DApp authorization modal
    And I switch to window with Lace
    And I close all remaining tabs except current one
    And I open test DApp
    Then I don't see DApp window

  @LW-3807 @Testnet @Mainnet
  Scenario: "No wallet" modal displayed after trying to connect Dapp when there is no wallet
    Given I remove wallet
    And "Get started" page is displayed
    When I open test DApp
    And I close all remaining tabs except current one
    Then I see DApp no wallet modal
    When I click "Create or restore a wallet" button in DApp no wallet modal
    And I switch to window with Lace
    Then "Get started" page is displayed

