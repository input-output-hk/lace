@SignMessage-Extended @Testnet
Feature: Sign message

  Background:
    Given Wallet is synced

  @LW-11536
  Scenario: Extended view - Sign message - open "Message signing" drawer
    When I click the menu button
    And I click on the "Sign message" option
    Then "Message signing" drawer is displayed

  @LW-11537
  Scenario: Extended view - Sign message - main account - show available addresses
    When I click the menu button
    And I click on the "Sign message" option
    And I click on "Select an address to use" button
    Then the list of all available addresses is shown and contains:
      # For main account from TestAutomationWallet
      | addr_test1qp9u2f6e2ss4knzs04m...x93qthjq8z23gl |
      | addr_test1qp9u2f6e2ss4knzs04m...xmgcmf0slx7s84 |
      | addr_test1qp9u2f6e2ss4knzs04m...3yw552rsa35vu9 |
      | addr_test1qp9u2f6e2ss4knzs04m...wteklwfqfsgj2x |
      | addr_test1qp9u2f6e2ss4knzs04m...lw4gl99qhgxzrl |
      | addr_test1qp9u2f6e2ss4knzs04m...uaygdyks7e5s3g |
      | addr_test1qp9u2f6e2ss4knzs04m...455y702qp5mtrx |
      | addr_test1qp9u2f6e2ss4knzs04m...mvem3g3shynqpt |
      | addr_test1qp9u2f6e2ss4knzs04m...5wrsahtq9j6654 |
      | addr_test1qp9u2f6e2ss4knzs04m...n538zfzs46wd06 |
      | addr_test1qpeql2df7cjfhgv39q6...x93qthjqmm4c2z |
      | addr_test1qz30ws0yr2ftty6t6mn...x93qthjqaqej44 |

  @LW-11538
  Scenario: Extended view - Sign message - additional account - show available addresses
    Given One of additional accounts is active
    When I click the menu button
    And I click on the "Sign message" option
    And I click on "Select an address to use" button
    Then the list of all available addresses is shown and contains:
      # For 3rd account from TestAutomationWallet
      | addr_test1qpvl49m3p8z8cmlqrmm...mhy2p8sqj0rsdf |

  @LW-11539
  Scenario: Extended view - Sign message - happy path
    When I click the menu button
    And I click on the "Sign message" option
    And I click on "Select an address to use" button
    And I select a random address from the list
    Then selected address is displayed on a drawer
    When I fill "Message to sign" field
    And I click on "Sign message" button
    Then "Sign confirmation" drawer is displayed
    When I fill password input with correct password
    And I click on "Sign message" button
    Then "All done" drawer is displayed for message signing flow
    When I click on "Copy signature to clipboard" button
    Then I see a toast with text: "Copied to clipboard"
    And signature in clipboard is equal to the one displayed on drawer
    When I click on "Close" button on "All done!" drawer for message signing
    Then Drawer is not displayed
