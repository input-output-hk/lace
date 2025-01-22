@GeneratePaperWallet @Testnet @Mainnet
Feature: General Settings - Extended Browser View

  Background:
    Given Wallet is synced

  @LW-11193
  Scenario: Extended view - Settings - Generate paper wallet - open
    When I open settings from header menu
    And I click on "Generate paper wallet" setting
    Then "Secure your paper wallet" drawer is displayed

  @LW-11194
  Scenario: Extended view - Settings - Generate paper wallet - Secure your paper wallet - close
    When I open settings from header menu
    And I click on "Generate paper wallet" setting
    And I close the drawer by clicking close button
    Then I see settings page

  @LW-11195
  Scenario: Extended view - Settings - Generate paper wallet - Secure your paper wallet - enter valid public PGP key
    When I open settings from header menu
    And I click on "Generate paper wallet" setting
    And I enter valid key into "Your PUBLIC PGP key block" input
    Then public PGP key fingerprint is displayed: "F960 B291 7BFB A908 C031 A5AA 23E4 0848 BAB6 E1CB"
    And "Next" button is enabled on "Secure your paper wallet" drawer

  @LW-11196
  Scenario Outline: Extended view - Settings - Generate paper wallet - Secure your paper wallet - enter invalid public PGP key - <error_case>
    When I open settings from header menu
    And I click on "Generate paper wallet" setting
    And I enter <error_case> into "Your PUBLIC PGP key block" input
    Then error message is displayed for public PGP key input with <error_case>
    And "Next" button is disabled on "Secure your paper wallet" drawer
    Examples:
      | error_case    |
      | malformed key |
      | private key   |
      | too weak key  |

  @LW-11197
  Scenario: Extended view - Settings - Generate paper wallet - Secure your paper wallet - click "Next" button
    When I open settings from header menu
    And I click on "Generate paper wallet" setting
    And I enter "Paper Wallet Test 1" into "PGP key name" input
    And I enter valid key into "Your PUBLIC PGP key block" input
    And I click "Next" button on "Secure your paper wallet" page
    Then "Enter your password" page is displayed for "Generate paper wallet" flow

  @LW-11198
  Scenario: Extended view - Settings - Generate paper wallet - Enter your password - invalid password
    When I open settings from header menu
    And I click on "Generate paper wallet" setting
    And I enter "Paper Wallet Test 1" into "PGP key name" input
    And I enter valid key into "Your PUBLIC PGP key block" input
    And I click "Next" button on "Secure your paper wallet" page
    And I fill incorrect password
    And I click "Generate paper wallet" button on "Enter your password" drawer
    Then I see "browserView.transaction.send.error.invalidPassword" password error

  @LW-11199 @LW-11201
  Scenario: Extended view - Settings - Generate paper wallet - Enter your password - valid password - click "Generate paper wallet" button
    When I open settings from header menu
    And I click on "Generate paper wallet" setting
    And I enter "Paper Wallet Test 1" into "PGP key name" input
    And I enter valid key into "Your PUBLIC PGP key block" input
    And I click "Next" button on "Secure your paper wallet" page
    And I fill correct password
    Then "Generate paper wallet" button is enabled on "Enter your password" drawer
    When I click "Generate paper wallet" button on "Enter your password" drawer
    Then "Save your paper wallet" drawer is displayed with "TestAutomationWallet_PaperWallet.pdf" file name

  @LW-11200
  Scenario: Extended view - Settings - Generate paper wallet - Enter your password - close
    When I open settings from header menu
    And I click on "Generate paper wallet" setting
    And I enter "Paper Wallet Test 1" into "PGP key name" input
    And I enter valid key into "Your PUBLIC PGP key block" input
    And I click "Next" button on "Secure your paper wallet" page
    And I close the drawer by clicking close button
    Then I see settings page

  @LW-11202
  Scenario: Extended view - Settings - Generate paper wallet - Save your paper wallet - close
    When I open settings from header menu
    And I click on "Generate paper wallet" setting
    And I enter "Paper Wallet Test 1" into "PGP key name" input
    And I enter valid key into "Your PUBLIC PGP key block" input
    And I click "Next" button on "Secure your paper wallet" page
    And I fill correct password
    And I click "Generate paper wallet" button on "Enter your password" drawer
    And I close the drawer by clicking close button
    Then I see settings page
