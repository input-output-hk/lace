@AddressBook-popup @Mainnet @Testnet
Feature: Address book - popup view

  Background: 
    Given Lace is ready for test

  @LW-4473
  Scenario: Popup-view - Address Book - Empty the address book and confirm
    Given I don't have any addresses added to my address book in popup mode
    Then I see empty address book

  @LW-4474
  Scenario: Popup-view - Address Book - Copy address button
    Given I close wallet synced toast
    And I have 3 addresses in my address book in popup mode
    When I click address on the list with name "Byron"
    And I click "Copy" button on address details page
    Then I see a toast with message: "Copied to clipboard"
    And address is saved to clipboard

  @LW-4475
  Scenario Outline: Popup-view - Address Book - Edit address: <edited_address>
    Given I have 3 addresses in my address book in popup mode
    When I click address on the list with name "<edited_address>"
    And I click "Edit" button on address details page
    And I fill address form with "<wallet_name>" name and "<address>" address
    And I click "Done" button on "Edit address" drawer
    Then I see a toast with message: "Edited successfully"
    And I see address row with name "<wallet_name>" and address "<address_label>" on the list in popup mode

    Examples: 
      | edited_address | wallet_name  | address                                                                                                            | address_label  |
      | Shelley        | Shelley_edit | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja       | addr_tes...6ja |
      | Byron          | Byron_edit   | 37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbnm67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp | 37btjrVy...Dzp |

  @LW-4476
  Scenario: Popup-view - Address Book - Edit address and cancel
    Given I have 3 addresses in my address book in popup mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    When I click "Cancel" button on "Edit address" drawer
    Then I see address detail page in popup mode with details of "Shelley" address

  @LW-4566
  Scenario Outline: Popup-view - Address Book - Edit wallet name/address and display error message - name error: <name_error>, address error: <address_error>
    Given I have 3 addresses in my address book in popup mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    And I fill address form with "<wallet_name>" name and "<address>" address
    Then Contact "<name_error>" name error and "<address_error>" address error are displayed
    And "Done" button is disabled on "Edit address" drawer

    Examples: 
      | wallet_name               | address                                                                                                         | name_error                       | address_error                       |
      | empty                     | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja    | Name field is required           | empty                               |
      | too_long_name_123456789   | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja    | Max 20 Characters                | empty                               |
      | " name preceded by space" | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja    | Name has unnecessary white space | empty                               |
      | valid wallet name         | invalid_address                                                                                                 | empty                            | Invalid Cardano address             |
      | valid wallet name         | " addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" | empty                            | Address has unnecessary white space |
      | valid wallet name         | "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja " | empty                            | Address has unnecessary white space |
      | "name followed by space " | invalid_address                                                                                                 | Name has unnecessary white space | Invalid Cardano address             |
#      | valid wallet name         | empty                                                                                                           | empty                            | Address field is required           | # TODO: Uncomment when LW-7419 is fixed
#      | empty                     | empty                                                                                                           | Name field is required           | Address field is required           | # TODO: Uncomment when LW-7419 is fixed

  @LW-4568
  Scenario Outline: Popup-view - Address Book - Edit address book entry - Uniqueness validation and toast display with text <toast_message>
    Given I have 3 addresses in my address book in popup mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    And I fill address form with "<wallet_name>" name and address from "<wallet_address>" address
    And "Done" button is enabled on "Edit address" drawer
    Then I click "Done" button on "Edit address" drawer
    And I see a toast with message: "<toast_message>"

    Examples: 
      | wallet_name | wallet_address | toast_message                |
      | Byron       | Byron          | Given name already exist     |
      | SomeWallet  | Byron          | Given address already exists |

  @LW-4534
  Scenario: Popup-view - Address Book - Edit address and click back button
    Given I have 3 addresses in my address book in popup mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    When I close the drawer by clicking back button
    Then I see address detail page in popup mode with details of "Shelley" address

  @LW-4477
  Scenario: Popup-view - Address Book - Remove address
    Given I have 3 addresses in my address book in popup mode
    When I click address on the list with name "Byron"
    And I see address detail page in popup mode with details of "Byron" address
    And I click "Delete" button on address details page
    Then I see delete address modal
    When I click "Delete address" button on delete address modal
    Then I don't see address row with name "Byron" and address "37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbnm67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp" on the list in popup mode

  @LW-4478
  Scenario: Popup-view - Address Book - Remove address and cancel
    Given I have 3 addresses in my address book in popup mode
    When I click address on the list with name "Byron"
    And I see address detail page in popup mode with details of "Byron" address
    And I click "Delete" button on address details page
    And I click "Cancel" button on delete address modal
    Then I see address detail page in popup mode with details of "Byron" address

  @LW-4479
  Scenario Outline: Popup-view - Address Book - Add new address <wallet_name>
    Given I don't have any addresses added to my address book in popup mode
    When I click "Add address" button on address book page
    Then I see "Add new address" drawer in popup mode
    And "Save address" button is disabled on "Add new address" drawer
    When I fill address form with "<wallet_name>" name and address from "<wallet_address>" address
    And I click "Save address" button on "Add new address" drawer
    Then I see a toast with message: "Address added"
    And I see address row with name "<wallet_name>" and address "<wallet_address>" on the list in popup mode

    Examples: 
      | wallet_name          | wallet_address |
      | Byron_man            | Byron          |
      | Shelley_man          | Shelley        |
      | Icarus_man           | Icarus         |
      | 12345678901234567890 | Shelley        |
      | !@#$%^&*(){}:,./     | Shelley        |
      | ęóąśłżźćń_ASDFÓŚ     | Shelley        |

  @LW-4480
  Scenario Outline: Popup-view - Address Book - Add new address and display error message  - Name: <name_error> - Address: <address_error>
    Given I don't have any addresses added to my address book in popup mode
    When I click "Add address" button on address book page
    And I fill address form with "<wallet_name>" name and "<address>" address
    Then Contact "<name_error>" name error and "<address_error>" address error are displayed
    And "Save address" button is disabled on "Add new address" drawer

    Examples: 
      | wallet_name               | address                                                                  | name_error                       | address_error                       |
      | too_long_name_123456789   | addr_invalid                                                             | Max 20 Characters                | Invalid Cardano address             |
      | name_ok                   | addr_invalid                                                             | empty                            | Invalid Cardano address             |
      | too_long_name_123456789   |    2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | Max 20 Characters                | empty                               |
      | "name followed by space " | "2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf " | Name has unnecessary white space | Address has unnecessary white space |
      | " name preceded by space" | " 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf" | Name has unnecessary white space | Address has unnecessary white space |

  @LW-4555
  Scenario Outline: Popup-view - Address Book - Add empty name/address and display error message - Name: <name_error> - Address: <address_error>
    Given I don't have any addresses added to my address book in popup mode
    When I click "Add address" button on address book page
    And I fill address form with "<wallet_name>" name and "<address>" address
    And I fill address form with "<wallet_name2>" name and "<address2>" address
    Then Contact "<name_error>" name error and "<address_error>" address error are displayed
    And "Save address" button is disabled on "Add new address" drawer

    Examples: 
      | wallet_name | wallet_name2 | address                                                               | address2                                                              | name_error             | address_error             |
      | name_ok     | empty        | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | Name field is required | empty                     |
      | name_ok     | name_ok      | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | empty                                                                 | empty                  | Address field is required |
      | name_ok     | empty        | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | empty                                                                 | Name field is required | Address field is required |

  @LW-4481
  Scenario Outline: Popup-view - Address Book - Uniqueness validation and toast display with text <toast_message>
    Given I have 3 addresses in my address book in popup mode
    When I click "Add address" button on address book page
    And I fill address form with "<wallet_name>" name and address from "<wallet_address>" address
    And I click "Save address" button on "Add new address" drawer
    Then I see a toast with message: "<toast_message>"

    Examples: 
      | wallet_name | wallet_address | toast_message                |
      | Byron       | Byron          | Given name already exist     |
      | SomeWallet  | Byron          | Given address already exists |

  @LW-4784 @Pending @issue=LW-7419
  Scenario: Popup-view - Address Book - Display error message after filling name and clicking outside with empty address
    Given I don't have any addresses added to my address book in popup mode
    When I click "Add address" button on address book page
    Then I see "Add new address" drawer in popup mode
    When I fill address form with "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" address
    When I fill address form with "empty" name
    And I click outside address form to lose focus
    Then Contact "Name field is required" name error and "empty" address error are displayed

  @LW-4783 @Pending @issue=LW-7419
  Scenario: Popup-view - Address Book - No error is displayed when leaving both fields empty
    Given I don't have any addresses added to my address book in popup mode
    When I click "Add address" button on address book page
    Then I see "Add new address" drawer in popup mode
    When I fill address form with "name_ok" name and "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" address
    And I clear name field value in address form
    And I clear address field value in address form
    And I click outside address form to lose focus
    Then Contact "empty" name error and "empty" address error are displayed
    And "Save address" button is disabled on "Add new address" drawer

  @LW-4785 @Pending @issue=LW-7419
  Scenario: Popup-view - Address Book - Display error message after filling name and clicking outside with empty address
    Given I don't have any addresses added to my address book in popup mode
    When I click "Add address" button on address book page
    Then I see "Add new address" drawer in popup mode
    When I fill address form with "name_ok" name
    And I fill address form with "empty" address
    And I click outside address form to lose focus
    Then Contact "empty" name error and "Address field is required" address error are displayed
