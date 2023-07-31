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

  @LW-4062 @LW-3753 @Testnet @Mainnet
  Scenario: Authorize app functions as expected when the user chooses 'Only once'
    Given I save token: "Cardano" balance
    When I open test DApp
    And I see DApp authorization window
    And I click "Authorize" button in DApp authorization window
    And I click "Only once" button in DApp authorization modal
    Then I see Lace wallet info in DApp when connected
    And I switch to window with Lace
    And I close all remaining tabs except current one
    When I open test DApp
    Then I see DApp authorization window

  @LW-3754 @LW-4064 @LW-3753 @Smoke @Testnet @Mainnet
  Scenario: Authorize app functions as expected when the user chooses 'Always'
    When I open test DApp
    And I see DApp authorization window
    And I click "Authorize" button in DApp authorization window
    And I click "Always" button in DApp authorization modal
    And I switch to window with Lace
    And I save token: "Cardano" balance
    And I close all remaining tabs except current one
    And I open test DApp
    Then I see Lace wallet info in DApp when connected
    And I don't see DApp window
    And I de-authorize all DApps in extended mode

  @LW-3807 @Testnet @Mainnet
  Scenario: "No wallet" modal displayed after trying to connect Dapp when there is no wallet
    Given I remove wallet
    And "Get started" page is displayed
    When I open test DApp
    Then I see DApp no wallet page
    When I click "Create or restore a wallet" button in DApp no wallet modal
    And I switch to window with Lace
    Then "Get started" page is displayed

  @LW-3758 @Testnet @Mainnet
  Scenario: Unlock Dapp page is displayed when wallet is locked, wallet can be unlocked
    Given I lock my wallet
    When I open test DApp
    Then I see DApp unlock page
    When I fill password input with correct password
    And I click "Unlock" button on unlock screen
    Then I see DApp authorization window

  @LW-7082 @Testnet @Mainnet
  Scenario: "Forgot password" click and cancel on DApp wallet unlock page
    Given I lock my wallet
    When I open test DApp
    Then I see DApp unlock page
    When I click on "Forgot password?" button on unlock screen
    Then I see "Forgot password?" modal
    And I click on "Cancel" button on "Forgot password?" modal
    Then I see DApp unlock page

  @LW-7083 @Testnet @Mainnet
  Scenario: "Forgot password" click and proceed on DApp wallet unlock page
    Given I lock my wallet
    When I open test DApp
    Then I see DApp unlock page
    When I click on "Forgot password?" button on unlock screen
    Then I see "Forgot password?" modal
    And I click on "Proceed" button on "Forgot password?" modal
    Then I see DApp no wallet page
    When I switch to tab with restore wallet process
    Then "Wallet password" page is displayed in "Forgot password" flow

  @LW-7083 @Testnet @Mainnet
  Scenario: "Forgot password" click and proceed on DApp wallet unlock page
    Given I lock my wallet
    When I open test DApp
    Then I see DApp unlock page
    When I click on "Forgot password?" button on unlock screen
    Then I see "Forgot password?" modal
    And I click on "Proceed" button on "Forgot password?" modal
    Then I see DApp no wallet page
    When I switch to tab with restore wallet process
    Then "Wallet password" page is displayed in "Forgot password" flow

  @LW-4060
  Scenario Outline: DApp connector window displayed in <theme> mode
    Given I click the menu button
    And I set theme switcher to <theme> mode
    When I open test DApp
    Then I see DApp authorization window in <theme> mode
    And I click "Authorize" button in DApp authorization window
    And I click "Only once" button in DApp authorization modal
    When I click "Send ADA" "Run" button in test DApp
    Then I see DApp connector "Confirm transaction" page in <theme> mode
    Examples:
      | theme |
      | light |
      | dark  |

  @LW-7743
  Scenario: DApp connector window theme updated from light to dark while using DApp
    Given I click the menu button
    And I set theme switcher to light mode
    When I open test DApp
    Then I see DApp authorization window in light mode
    And I click "Authorize" button in DApp authorization window
    And I click "Only once" button in DApp authorization modal
    And I switch to window with Lace
    And I close all remaining tabs except current one
    And I set theme switcher to dark mode
    And I open test DApp
    When I click "Send ADA" "Run" button in test DApp
    Then I see DApp connector "Confirm transaction" page in dark mode
