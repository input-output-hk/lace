const defaultsuggestionListLength = 3;
const defaultOptions = { suggestionListLength: defaultsuggestionListLength, isCaseSensitive: false };

export const wordListSearch = (
  searchWord: string,
  wordList: Array<string>,
  options?: {
    suggestionListLength?: number;
    isCaseSensitive?: boolean;
  }
): Array<string> => {
  const { suggestionListLength, isCaseSensitive } = { ...defaultOptions, ...options };
  const suggestionList: Array<string> = [];
  let continueSearching = true;
  let currentLetterIdx = 0;
  let currentWordIdx = 0;

  if (!searchWord || !wordList?.length) return suggestionList;

  const parsedSearchWord = isCaseSensitive ? searchWord : searchWord.toLowerCase();
  let parsedSearchWordRegExp;
  try {
    parsedSearchWordRegExp = new RegExp(`^${parsedSearchWord}.*$`);
  } catch {
    return suggestionList;
  }

  while (continueSearching) {
    const currentWord = wordList[currentWordIdx];
    const currentLetter = currentWord[currentLetterIdx];
    const searchWordLetter = parsedSearchWord[currentLetterIdx];

    if (currentLetter === searchWordLetter) {
      currentLetterIdx++;
    } else {
      currentWordIdx++;
    }

    if (currentLetterIdx >= parsedSearchWord.length || currentWordIdx >= wordList.length) {
      continueSearching = false;
    }
  }

  for (let idx = 0; idx < suggestionListLength; idx++) {
    const currentWord = wordList[currentWordIdx + idx];

    if (parsedSearchWordRegExp.test(currentWord)) {
      suggestionList.push(currentWord);
    }
  }

  return suggestionList;
};
