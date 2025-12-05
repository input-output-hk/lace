const TESTNET_ADDR_REGEX = /^addr_test1[\da-z]+$/;
const ADA_VALUE_REGEX = /\d{1,50}.\d{2} ₳/;
const ADA_LITERAL_VALUE_REGEX = /\d*.\d{0,2}\s?ADA/;
const ADA_LITERAL_VALUE_REGEX_OR_0 = /(\d*.\d{0,2}\s?ADA)|0/;
const USD_VALUE_REGEX = /\d{1,50}.\d{2} USD/;
const USD_VALUE_NO_SUFFIX_REGEX = /\$\s?(\d*\.)?\d+/;
const SHA256_REGEX = /.{50,64}/;
const DATE_REGEX = /\d{4}-\d{2}-\d{2}/;
const TIME_REGEX = /\d{2}:\d{2}:\d{2}/;
const TRANSACTIONS_DATE_LIST_REGEX = /\d{1,2}?\s\w{3,9}?\s\d{4}?/;
const NUMBER_REGEX = /^\d*$/;
const NUMBER_DOUBLE_REGEX = /(\d*\.)?\d+/;
const COUNTER_REGEX = /\(\d+\)/;
const PERCENT_DOUBLE_REGEX = /(\d*\.)?\d+\s?%|-%/;
const STAKE_POOL_LIST_COST_REGEX = /(\d*\.)?\d+\s?%(\s\+\s\d*ADA)?/;
const TIMESTAMP_REGEX = /\d{2}:\d{2}:\d{2}/;
const ABBREVIATED_NUMBER_REGEX = /^\d{1,3}(\.\d{0,2})?[BKM]?$/;
const BLOCKS_REGEX = /^(-|\d*)$/;
const TOKEN_VALUE_FIAT_REGEX = /^([\d+,.])+\.\d+\s\D{2,3}$/;
const TOKEN_VALUE_ADA_REGEX = /^\d+\.\d+$/;
const TOKEN_PRICE_CHANGE = /^([+-])\d+\.\d{2}$/;

export const TestnetPatterns = {
  TESTNET_ADDR_REGEX,
  ADA_VALUE_REGEX,
  ADA_LITERAL_VALUE_REGEX,
  ADA_LITERAL_VALUE_REGEX_OR_0,
  USD_VALUE_REGEX,
  USD_VALUE_NO_SUFFIX_REGEX,
  SHA256_REGEX,
  TIME_REGEX,
  DATE_REGEX,
  TRANSACTIONS_DATE_LIST_REGEX,
  NUMBER_REGEX,
  COUNTER_REGEX,
  PERCENT_DOUBLE_REGEX,
  NUMBER_DOUBLE_REGEX,
  STAKE_POOL_LIST_COST_REGEX,
  TIMESTAMP_REGEX,
  ABBREVIATED_NUMBER_REGEX,
  BLOCKS_REGEX,
  TOKEN_VALUE_FIAT_REGEX,
  TOKEN_VALUE_ADA_REGEX,
  TOKEN_PRICE_CHANGE
};
