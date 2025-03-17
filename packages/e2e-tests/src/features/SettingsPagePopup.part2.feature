@Settings-Popup
Feature: General Settings - Popup View

  Background:
    Given Lace is ready for test

  @LW-2775 @Mainnet @Testnet
  Scenario: Popup View - Settings - Terms and Conditions copy
    When I open settings from header menu
    When I click on "Terms and conditions" setting
    Then "Terms and conditions" are displayed in new tab

  @LW-2782 @Mainnet @Testnet
  Scenario: Popup View - Settings - Privacy policy copy
    When I open settings from header menu
    When I click on "Privacy policy" setting
    Then "Privacy policy" is displayed in new tab

  @LW-5831 @Mainnet @Testnet
  Scenario: Popup View - Settings - Cookie policy copy
    When I open settings from header menu
    And I click on "Cookie policy" setting
    Then "Cookie policy" is displayed in new tab

  @LW-2790 @Mainnet @Testnet @skip(browserName="firefox") @issue=LW-12440
  Scenario: Popup View - Settings - Visibility of Help drawer
    When I open settings from header menu
    When I click on "Help" setting
    Then I see help details drawer in popup mode

  @LW-2791 @Mainnet @Testnet
  Scenario: Popup View - Settings - Help Create a ticket
    When I open settings from header menu
    When I click on "Help" setting
    And I click "Create a support ticket" button on Help drawer
    Then New tab with url containing "iohk.zendesk.com/hc/en-us/requests/new" is opened

  @LW-3630 @Mainnet @Testnet
  Scenario: Popup View - Settings - FAQ opening in a new tab
    When I open settings from header menu
    And I click on "FAQs" setting
    Then FAQ page is displayed

  @LW-3870 @Mainnet @Testnet
  Scenario: Extended view - Settings - Show passphrase displayed above Analytics under the Security section in the Settings page
    When I open settings from header menu
    Then "Show recovery phrase" option is displayed as 1st one under "Security" section

  @LW-3872 @Mainnet @Testnet
  Scenario: Popup view - Settings - Side drawer containing password field and "Show passphrase" button is displayed after click on the "Show passphrase" option
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    And "Password" field is displayed
    And "Show passphrase" button is displayed

  @LW-3874 @Mainnet @Testnet
  Scenario: Popup view - Settings - When user enter wrong password on the "Show 24-word passphrase" drawer then error state "Wrong password" is displayed and the "Show passphrase" button is disabled
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    When I fill incorrect password
    And I click on "Show passphrase" button
    Then I see "browserView.transaction.send.error.invalidPassword" password error
    And "Show passphrase" button is disabled on "Show 24-word recovery phrase" drawer

  @LW-3878 @LW-3890 @Mainnet @Testnet
  Scenario: Popup view - Settings - When user clicks on "Hide passphrase"/"Show passphrase" button on the "Show 24-word passphrase" side drawer all mnemonics are blurred/visible
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    When I fill correct password
    Then "Show passphrase" button is enabled on "Show 24-word recovery phrase" drawer
    When I click on "Show passphrase" button
    Then all mnemonics from "TestAutomationWallet" wallet are listed
    When I click on "Hide passphrase" button
    Then all mnemonics are blurred
    When I click on "Show passphrase" button
    Then all mnemonics are not blurred
    And all mnemonics from "TestAutomationWallet" wallet are listed

  @LW-3920 @Mainnet @Testnet
  Scenario: Popup view - Settings - "Show passphrase" button enabled after user fills correct password on the "Show 24-word passphrase" side drawer
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    When I fill correct password
    Then "Show passphrase" button is enabled on "Show 24-word recovery phrase" drawer
    When I click on "Show passphrase" button
    Then all mnemonics from "TestAutomationWallet" wallet are listed
    And "Hide passphrase" button is displayed
    And "Hide passphrase" button is enabled on "Show 24-word recovery phrase" drawer

  @LW-4050 @Mainnet @Testnet
  Scenario: Popup view - Settings - User has to enter password again after leaving "Show 24-word passphrase" side drawer
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    When I fill correct password
    And I click on "Show passphrase" button
    Then all mnemonics from "TestAutomationWallet" wallet are listed
    When I close the drawer by clicking back button
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    And Password field is empty

  @LW-3061 @LW-12252 @Mainnet @Testnet
  Scenario Outline: Popup view - Settings -  <option_name> option displayed
    When I open settings from header menu
    Then I see <option_name> option with proper description and toggle
    Examples:
      | option_name  |
      | Analytics    |
      | Beta Program |
      | Debugging    |

  @LW-11315 @Mainnet @Testnet @skip(browserName="firefox") @issue=LW-12440
  Scenario: Popup View - Custom submit API - open drawer
    When I open settings from header menu
    And I click on "Custom Submit API" setting
    Then "Custom submit API" drawer is displayed

  @LW-11317 @Mainnet @Testnet
  Scenario: Popup View - Custom submit API - Learn more - click
    When I open settings from header menu
    And I click on "Custom Submit API" setting
    And I click on "Learn more about Cardano-submit-API" link
    Then New tab with url containing "https://github.com/IntersectMBO/cardano-node/tree/master/cardano-submit-api" is opened

  @LW-11319 @Mainnet @Testnet
  Scenario: Popup View - Custom submit API - invalid URL
    When I open settings from header menu
    And I click on "Custom Submit API" setting
    And I enter "abc" into URL input on "Custom submit API" drawer
    And I click on "Enable" button on "Custom submit API" drawer
    Then "Invalid URL" error is displayed on "Custom submit API" drawer

  @LW-11321 @Mainnet @Testnet
  Scenario: Popup View - Custom submit API - enable/disable
    When I open settings from header menu
    And I click on "Custom Submit API" setting
    And I click on "Enable" button on "Custom submit API" drawer
    Then I see a toast with text: "Your custom submit API is enabled..."
    And I close a toast message
    When I close "Custom submit API" drawer
    Then "Custom submit API" is marked as enabled on Settings page
    When I click on "Custom Submit API" setting
    And I click on "Disable" button on "Custom submit API" drawer
    Then I see a toast with text: "Your custom submit API is disabled..."
    And I close a toast message
    When I close "Custom submit API" drawer
    Then "Custom submit API" is marked as disabled on Settings page

  @LW-12254 @Mainnet @Testnet
  @skip(browserName="firefox")
  Scenario Outline: Popup view - Settings - Debugging option enables verbose logging in console
    Given I enable console logs collection
    When I open settings from header menu
    And Debugging toggle <debugging_enabled> enabled
    And I navigate to NFTs popup page
    Then I verify that logs <logs_collected> collected
    Examples:
      | debugging_enabled | logs_collected |
      | is not            | are not        |
      | is                | are            |

    # this test should be executed as the last one in this suite
  @LW-2708 @Mainnet @Testnet
  Scenario: Popup View - Remove wallet and confirm
    Given I am on Tokens popup page
    And my local storage is fully initialized
    When I open settings from header menu
    And I click on Remove wallet button
    And I click "Remove wallet" button on "Remove wallet" modal
    And I switch to last window
    Then I see Analytics banner
    And I expect wallet repository and local storage to be empty
    And Mnemonic is not stored in background storage
