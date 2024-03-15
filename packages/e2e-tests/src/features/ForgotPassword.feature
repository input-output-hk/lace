@ForgotPassword @Mainnet @Testnet
Feature: Forgot password

  Background:
    Given Lace is ready for test

  @LW-2758
  Scenario: Unlock page - "Forgot password?" button click
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    When I click on "Forgot password?" button on unlock screen
    Then I see "Forgot password?" modal

  @LW-2762
  Scenario: "Forgot password?" modal - "Cancel" button click
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    When I click on "Forgot password?" button on unlock screen
    And I click on "Cancel" button on "Forgot password?" modal
    Then I see unlock wallet screen

  @LW-2458
  Scenario: "Forgot password?" modal - "Proceed" button click
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    When I click on "Forgot password?" button on unlock screen
    And I click on "Proceed" button on "Forgot password?" modal
    And I switch to tab with restore wallet process
    Then "Wallet name and password" page is displayed in forgot password flow
    And following keys are not present in Local Storage:
      | lock         |
      | keyAgentData |
      | lastStaking  |

  @LW-1592
    @issue=LW-10028
  Scenario Outline: "Forgot password?" - password page - Recommendation for password: <passw_err>, password: <password>, password confirmation: <password_conf>
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    When I click on "Forgot password?" button on unlock screen
    And I click on "Proceed" button on "Forgot password?" modal
    And I switch to tab with restore wallet process
    Then "Wallet name and password" page is displayed in forgot password flow
    When I enter password: "<password>" and password confirmation: "<password_conf>"
    Then Password recommendation: "<passw_err>", complexity bar level: "<complex_bar_lvl>" and password confirmation error: "<passw_conf_err>" are displayed
    Examples:
      | password    | password_conf | passw_err                | complex_bar_lvl | passw_conf_err                               |
      | a           | empty         | core.password.feedback.1 | 1               | empty                                        |
#      | aa          | empty         | core.password.feedback.5  | 1               | empty                                        |
#      | P@ss        | empty         | core.password.feedback.13 | 1               | empty                                        |
#      | N_8J@bne    | empty         | core.password.feedback.1  | 2               | empty                                        |
#      | N_8J@bne87  | empty         | empty                     | 3               | empty                                        |
      | N_8J@bne87A | N_8J@bne87    | empty                    | 4               | core.walletSetupRegisterStep.noMatchPassword |

  @LW-2354
  Scenario: "Forgot password?" - mnemonic verification - wrong mnemonic
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    When I click on "Forgot password?" button on unlock screen
    And I click on "Proceed" button on "Forgot password?" modal
    And I switch to tab with restore wallet process
    Then "Wallet name and password" page is displayed in forgot password flow
    When I enter password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    When I add characters "asd" in word 7
    Then "Next" button is disabled during onboarding process

  @LW-2446
  Scenario: "Forgot password?" - mnemonic verification - back button click
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    When I click on "Forgot password?" button on unlock screen
    And I click on "Proceed" button on "Forgot password?" modal
    And I switch to tab with restore wallet process
    Then "Wallet name and password" page is displayed in forgot password flow
    When I enter password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Forgot password" flow
    And I enter mnemonic words on "Mnemonic verification" page
    And I click "Back" button during wallet setup
    Then "Wallet name and password" page is displayed in forgot password flow

  @LW-2489
  Scenario Outline: "Forgot password?" - cancel restoration flow - <expected_page> page
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    When I click on "Forgot password?" button on unlock screen
    And I click on "Proceed" button on "Forgot password?" modal
    And all wallet related data is removed
    And I switch to tab with restore wallet process
    And I am on <expected_page> page of restoration flow
    And I leave "Forgot password" flow
    And I accept analytics banner on "Get started" page
    Then "Get started" page is displayed
    Examples:
      | expected_page         |
      | password              |
      | mnemonic verification |

    # this test should be executed as the last one in this suite
    # opening onboarding page & closing other tabs breaks webdriver session
  @LW-2786 @LW-2440 @Smoke
  Scenario: "Forgot password?" - happy path
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    When I click on "Forgot password?" button on unlock screen
    And I click on "Proceed" button on "Forgot password?" modal
    And I switch to tab with restore wallet process
    And I close all remaining tabs except current one
    Then "Wallet setup" page is displayed
    # Then "Wallet password" page is displayed in forgot password flow
    When I go to "Mnemonic verification" page from "Restore" wallet with correct mnemonics
    And I click "Enter wallet" button
    # When I enter password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    # And I click "Next" button during wallet setup
    # And I click "Next" button during wallet setup
    # And I am on "Mnemonic verification" last page from "Forgot password" and filled all words
    # And I click "Next" button during wallet setup
    Then I see LW homepage
    And I click the menu button
    Then header menu displays "TestAutomationWallet" as a wallet name
    When I close header menu
    And I navigate to Settings extended page
    Then Analytics toggle is enabled: false
