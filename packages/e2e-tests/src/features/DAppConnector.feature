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
