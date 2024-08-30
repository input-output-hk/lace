export const EMAIL_REGEX =
  /[\d!#$%&'*+/=?^_`a-z{|}~-]+(?:\.[\d!#$%&'*+/=?^_`a-z{|}~-]+)*@(?:[\da-z](?:[\da-z-]*[\da-z])?\.)+[\da-z](?:[\da-z-]*[\da-z])?/gm;

export const URL_REGEX = /[\w#%+.:=@~-]{1,256}\.[\d()A-Za-z]{1,6}\b([\w#%&()+./:=?@~-]*)/gm;

export const LETTERS_AND_NUMBERS_REGEX = /^[\d A-Za-z]+$/gm;
