@DAppConnector @Testnet
Feature: DAppConnector - Common

  Background:
    Given Lace is ready for test
    And I de-authorize all DApps in extended mode
    And I reclaim collateral (if active) in extended mode

  @LW-3760 @Mainnet
  Scenario: Limited wallet information when wallet is not connected
    When I open test DApp
    Then I see Lace wallet info in DApp when not connected

  @LW-6660 @Mainnet
  Scenario: DApp connection modal displayed after clicking 'Authorize'
    When I open test DApp
    Then I see DApp authorization window
    When I click 'Authorize' button in DApp authorization window
    Then I see DApp connection modal

  @LW-3756 @Mainnet
  Scenario: Canceling DApp connection
    When I open test DApp
    Then I see DApp authorization window
    When I click 'Cancel' button in DApp authorization window
    Then I don't see DApp window
    And I see Lace wallet info in DApp when not connected
    And I switch to window with Lace
    And I close all remaining tabs except current one
    When I open test DApp
    Then I see DApp authorization window

  @LW-4062 @LW-3753 @LW-9080 @Mainnet
  Scenario: Authorize app functions as expected when the user chooses 'Only once'
    Given I am on Tokens extended page
    And I save token: 'Cardano' balance
    When I open test DApp
    And I see DApp authorization window
    And I click 'Authorize' button in DApp authorization window
    And I click 'Only once' button in DApp authorization window
    Then I see Lace wallet info in DApp when connected
    And I am able to access all window.cardano.lace properties
    And I switch to window with Lace
    And I close all remaining tabs except current one
    When I open test DApp
    Then I see DApp authorization window

  @LW-3754 @LW-4064 @LW-3753 @Smoke @Mainnet
  Scenario: Authorize app functions as expected when the user chooses 'Always'
    When I open test DApp
    And I see DApp authorization window
    And I click 'Authorize' button in DApp authorization window
    And I click 'Always' button in DApp authorization window
    And I switch to window with Lace
    And I am on Tokens extended page
    And I save token: 'Cardano' balance
    And I close all remaining tabs except current one
    And I open test DApp
    Then I see Lace wallet info in DApp when connected
    And I don't see DApp window

  @LW-3807 @Mainnet @Pending
  @issue=LW-11988
  Scenario: 'No wallet' modal displayed after trying to connect Dapp when there is no wallet
    Given I remove wallet
    And I accept analytics banner on 'Get started' page
    And 'Get started' page is displayed
    When I open test DApp
    Then I see DApp no wallet page
    When I click 'Create or restore a wallet' button in DApp no wallet modal
    And I switch to window with Lace
    Then 'Get started' page is displayed

  @LW-3758 @Mainnet @Pending
  Scenario: Unlock Dapp page is displayed when wallet is locked, wallet can be unlocked
    Given I lock my wallet
    When I open test DApp
    Then I see DApp unlock page
    When I fill password input with correct password
    And I click 'Unlock' button on unlock screen
    Then I see DApp authorization window

  @LW-7082 @Mainnet @Pending
  Scenario: 'Forgot password' click and cancel on DApp wallet unlock page
    Given I lock my wallet
    When I open test DApp
    Then I see DApp unlock page
    When I click on 'Forgot password?' button on unlock screen
    Then I see 'Forgot password?' modal
    And I click on 'Cancel' button on 'Forgot password?' modal
    Then I see DApp unlock page

  @LW-7083 @Mainnet @Pending
  Scenario: 'Forgot password' click and proceed on DApp wallet unlock page
    Given I lock my wallet
    When I open test DApp
    Then I see DApp unlock page
    When I click on 'Forgot password?' button on unlock screen
    Then I see 'Forgot password?' modal
    And I click on 'Proceed' button on 'Forgot password?' modal
    Then I see DApp no wallet page
    When I switch to tab with restore wallet process
    Then 'Wallet setup' page is displayed

  @LW-4060
  Scenario Outline: DApp connector window displayed in <theme> mode
    Given I click the menu button
    And I set theme switcher to <theme> mode
    When I open test DApp
    Then I see DApp authorization window in <theme> mode
    And I click 'Authorize' button in DApp authorization window
    And I click 'Only once' button in DApp authorization window
    When I click 'Send ADA' 'Run' button in test DApp
    Then I see DApp connector 'Confirm transaction' page in <theme> mode
    When I click 'Confirm' button on 'Confirm transaction' page
    Then I see DApp connector 'Password' page in <theme> mode
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
    And I click 'Authorize' button in DApp authorization window
    And I click 'Only once' button in DApp authorization window
    And I switch to window with Lace
    And I close all remaining tabs except current one
    And I set theme switcher to dark mode
    And I open and authorize test DApp with 'Only once' setting
    When I click 'Send ADA' 'Run' button in test DApp
    Then I see DApp connector 'Confirm transaction' page in dark mode
    When I click 'Confirm' button on 'Confirm transaction' page
    Then I see DApp connector 'Password' page in dark mode

  @LW-4071
  Scenario: DApp remains authorised after choosing 'Always' and removing & restoring a wallet
    Given I open and authorize test DApp with 'Always' setting
    And I switch to window with Lace
    And I close all remaining tabs except current one
    And I remove wallet
    Then I accept analytics banner on 'Get started' page
    And I restore a wallet
    And I disable showing multi-address discovery modal
    And Wallet is synced
    And I switch network to: 'Preprod' in extended mode
    And Wallet is synced
    And I open settings from header menu
    When I click on 'Authorized DApps' setting
    Then I see test DApp on the Authorized DApps list
    When I open test DApp
    Then I don't see DApp window

  @LW-4070
  Scenario: Authorize Dapp with 'Only once' and leaving/closing DApp
    Given I open and authorize test DApp with 'Only once' setting
    And I switch to window with DApp
    And I close all remaining tabs except current one
    When I open test DApp
    Then I don't see DApp window
    And I navigate to home page on extended view
    And I close all remaining tabs except current one
    When I open test DApp
    Then I see DApp authorization window
    And I switch to window with Lace
    And I close all remaining tabs except current one
    When I open test DApp
    Then I see DApp authorization window

  @LW-9481 @Mainnet
  Scenario: Signing data / no errors in console
    Given I am on Tokens extended page
    And I save token: 'Cardano' balance
    And I open and authorize test DApp with 'Only once' setting
    And I enable console logs collection
    When I click 'Sign data' button in test DApp
    Then I see DApp connector Sign data 'Confirm transaction' page
    And I click 'Confirm' button on 'Confirm transaction' page
    And I see DApp connector 'Sign transaction' page
    And I fill correct password
    And I click 'Confirm' button on 'Sign transaction' page
    And I see DApp connector 'All done' page from 'data sign'
#    And I verify there are no errors in console logs # TODO: unblock when LW-12157 is resolved
    And I see Lace wallet info in DApp when connected

  @LW-11372
  Scenario: Test for bug LW-7832 - Wrong url displayed in DApp transaction confirmation screen
    When I open and authorize test DApp with 'Only once' setting
    And I click 'Send ADA' 'Run' button in test DApp
    And I switch to window with Lace
    Then I see DApp connector 'Confirm transaction' page with all UI elements and with following data in 'Transaction Summary' section:
      | -3.00 tADA - FEE |

  @LW-12422  @Mainnet
  Scenario Outline: CIP-0142 getNetworkMagic returns <magic> when network is <network>
    Given I open and authorize test DApp with 'Only once' setting
    And I switch to window with Lace
    And I switch network to: '<network>' in extended mode
    And I switch to window with DApp
    Then I verify network magic is <magic> for <network>
    Examples:
      | magic     | network |
      | 1         | Preprod |
      | 2         | Preview |
      | 764824073 | Mainnet |
