@Settings-Extended
Feature: General Settings - Extended Browser View

  Background:
    Given Wallet is synced

  @LW-2789 @Mainnet @Testnet
  Scenario: Extended View - Settings - Help Create a ticket
    When I open settings from header menu
    When I click on "Help" setting
    And I click "Create a support ticket" button on Help drawer
    Then New tab with url containing "iohk.zendesk.com/hc/en-us/requests/new" is opened

  @LW-3629 @Mainnet @Testnet
  Scenario: Extended View - Settings - FAQ opening in a new tab
    When I open settings from header menu
    And I click on "FAQs" setting
    Then FAQ page is displayed

  @LW-3058 @LW-12253 @Mainnet @Testnet
  Scenario Outline: Extended view - Settings - <option_name> option displayed
    When I open settings from header menu
    Then I see <option_name> option with proper description and toggle
    Examples:
      | option_name  |
      | Beta Program |
      | Debugging    |

  @LW-3869 @Mainnet @Testnet
  Scenario: Extended view - Settings - Show passphrase displayed above Analytics under the Security section in the Settings page
    When I open settings from header menu
    Then "Show recovery phrase" option is displayed as 1st one under "Security" section

  @LW-3871 @Mainnet @Testnet
  Scenario: Extended view - Settings - Side drawer containing password field and "Show passphrase" button is displayed after click on the "Show passphrase" option
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    And "Password" field is displayed
    And "Show passphrase" button is displayed

  @LW-3873 @Mainnet @Testnet
  Scenario: Extended view - Settings - When user enters wrong password on the "Show 24-word passphrase" drawer then error state "Wrong password" is displayed and the "Show passphrase" button is disabled
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    When I fill incorrect password
    And I click on "Show passphrase" button
    Then I see "browserView.transaction.send.error.invalidPassword" password error
    And "Show passphrase" button is disabled on "Show 24-word recovery phrase" drawer

  @LW-3875 @Mainnet @Testnet
  Scenario: Extended view - Settings - "Show passphrase" button enabled after user fills correct password on the "Show 24-word passphrase" side drawer
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    When I fill correct password
    Then "Show passphrase" button is enabled on "Show 24-word recovery phrase" drawer

  @LW-3877 @LW-3879 @Mainnet @Testnet @memory-snapshot
  Scenario: Extended view - Settings - When user clicks on "Hide passphrase"/"Show passphrase" button on the "Show 24-word passphrase" side drawer all mnemonics are blurred/visible
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    When I fill correct password
    Then "Show passphrase" button is enabled on "Show 24-word recovery phrase" drawer
    When I click on "Show passphrase" button
    Then all mnemonics from "TestAutomationWallet" wallet are listed
    And valid password is not in snapshot
    When I click on "Hide passphrase" button
    Then all mnemonics are blurred
    When I click on "Show passphrase" button
    Then all mnemonics are not blurred
    And all mnemonics from "TestAutomationWallet" wallet are listed

  @LW-3919 @Mainnet @Testnet
  Scenario: Extended view - Settings - "Show passphrase" button enabled after user fills correct password on the "Show 24-word passphrase" side drawer
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    When I fill correct password
    Then "Show passphrase" button is enabled on "Show 24-word recovery phrase" drawer
    When I click on "Show passphrase" button
    And all mnemonics from "TestAutomationWallet" wallet are listed
    And "Hide passphrase" button is displayed
    And "Hide passphrase" button is enabled on "Show 24-word recovery phrase" drawer

  @LW-4049 @Mainnet @Testnet
  Scenario Outline: Extended view - Settings - User has to enter password again after leaving "Show 24-word passphrase" side drawer - <action>
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    When I fill correct password
    And I click on "Show passphrase" button
    Then all mnemonics from "TestAutomationWallet" wallet are listed
    When <step>
    And I click on "Show recovery phrase" setting
    Then Side drawer "Show 24-word passphrase" is displayed
    And Password field is empty
    Examples:
      | action             | step                                        |
      | click close button | I close the drawer by clicking close button |
      | click outside      | I click outside the drawer                  |

  @LW-4763 @Mainnet @Testnet
  Scenario: Extended View - Your keys - Enter and Escape buttons support
    When I open settings from header menu
    And I click on "Your keys" setting
    Then Drawer is displayed
    When I press keyboard Enter button
    Then I see "TestAutomationWallet" wallet public key
    When I press keyboard Escape button
    Then Drawer is not displayed

  @LW-4764 @Mainnet @Testnet
  Scenario: Extended View - Show passphrase - Enter and Escape buttons support
    When I open settings from header menu
    And I click on "Show recovery phrase" setting
    Then Drawer is displayed
    When I fill correct password
    And I press keyboard Enter button
    Then all mnemonics from "TestAutomationWallet" wallet are listed
    When I press keyboard Enter button
    Then all mnemonics are blurred
    When I press keyboard Escape button
    Then "Show passphrase" button is not displayed

  @LW-4875 @Mainnet @Testnet
  Scenario: Extended View - Help setting - Escape button support
    When I open settings from header menu
    When I click on "Help" setting
    Then "Create a support ticket" button is displayed
    When I press keyboard Escape button
    Then "Create a support ticket" button is not displayed

  @LW-4876 @Mainnet @Testnet
  Scenario: Extended View - Remove wallet - Enter and Escape buttons support
    When I open settings from header menu
    And I click on Remove wallet button
    Then "Remove wallet" modal is displayed
    When I press keyboard Enter button
    Then "Remove wallet" modal is not displayed
    And I click on Remove wallet button
    Then "Remove wallet" modal is displayed
    When I press keyboard Escape button
    Then "Remove wallet" modal is not displayed

  @LW-5821 @Mainnet @Testnet
  Scenario: Remove and Onboard new wallet - address has been changed
    When I open settings from header menu
    And I click on Remove wallet button
    And I click "Remove wallet" button on "Remove wallet" modal
    Then "Get started" page is displayed
    When I click "Create" button on wallet setup page
    And I go to "Wallet setup" page from "Create" wallet flow and fill values
    When I click "Enter wallet" button
    Then I see LW homepage
    And I see a different wallet address than in my initial wallet

  @LW-5822 @Mainnet @Testnet
  Scenario: Remove and Restore wallet - address has been changed
    When I open settings from header menu
    And I click on Remove wallet button
    And I click "Remove wallet" button on "Remove wallet" modal
    Then "Get started" page is displayed
    When I click "Restore" button on wallet setup page
    And I go to "Wallet setup" page with wallet TAWalletNoFunds from "Restore" wallet flow and fill values
    When I click "Enter wallet" button
    Then I see LW homepage
    And I see a different wallet address than in my initial wallet

  @LW-11314 @Mainnet @Testnet
  Scenario: Extended View - Custom submit API - open drawer
    When I open settings from header menu
    And I click on "Custom Submit API" setting
    Then "Custom submit API" drawer is displayed

  @LW-11316 @Mainnet @Testnet
  Scenario: Extended View - Custom submit API - Learn more - click
    When I open settings from header menu
    And I click on "Custom Submit API" setting
    And I click on "Learn more about Cardano-submit-API" link
    Then New tab with url containing "https://github.com/IntersectMBO/cardano-node/tree/master/cardano-submit-api" is opened

  @LW-11318 @Mainnet @Testnet
  Scenario: Extended View - Custom submit API - invalid URL
    When I open settings from header menu
    And I click on "Custom Submit API" setting
    And I enter "abc" into URL input on "Custom submit API" drawer
    And I click on "Enable" button on "Custom submit API" drawer
    Then "Invalid URL" error is displayed on "Custom submit API" drawer

  @LW-11320 @Mainnet @Testnet
  Scenario: Extended View - Custom submit API - enable/disable
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

  @LW-12255 @Mainnet @Testnet
  @skip(browserName="firefox")
  Scenario Outline: Extended view - Settings - Debugging option enables verbose logging in console
    Given I enable console logs collection
    When I open settings from header menu
    And Debugging toggle <debugging_enabled> enabled
    And I navigate to NFTs extended page
    Then I verify that logs <logs_collected> collected
    Examples:
      | debugging_enabled | logs_collected |
      | is not            | are not        |
      | is                | are            |

  # this test should be executed as the last one in this suite
  @LW-2521 @LW-9113 @Mainnet @Testnet
  Scenario: Extended View - Remove wallet and confirm
    And my local storage is fully initialized
    When I open settings from header menu
    Then I see Remove wallet section
    When I click on Remove wallet button
    And I click "Remove wallet" button on "Remove wallet" modal
    Then "Get started" page is displayed
    And I expect wallet repository and local storage to be empty
    And Mnemonic is not stored in background storage
