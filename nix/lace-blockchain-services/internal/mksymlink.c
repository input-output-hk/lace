#include <windows.h>
#include <stdio.h>

int main(int argc, char* argv[]) {
  if (argc < 3) {
    printf("Usage: %s <LinkPath> <TargetPath>\n", argv[0]);
    return 1;
  }

  // Change to the directory of the future symlink for relative symlinks:
  CHAR linkDir[MAX_PATH];
  strcpy(linkDir, argv[1]);
  CHAR* lastSlash = strrchr(linkDir, '\\');
  if (lastSlash) {
    *lastSlash = '\0'; // Null-terminate at the last slash to get the directory
    if (!SetCurrentDirectory(linkDir)) {
      fprintf(stderr, "Failed to change directory. Error: %lu\n", GetLastError());
      return 1;
    }
  }

  DWORD dwAttrs = GetFileAttributes(argv[2]);
  if (dwAttrs == INVALID_FILE_ATTRIBUTES) {
    fprintf(stderr, "Error retrieving TargetPath attributes. Error: %lu\n", GetLastError());
    return 2;
  }

  DWORD flags = 0;

  if (dwAttrs & FILE_ATTRIBUTE_DIRECTORY) {
    flags |= SYMBOLIC_LINK_FLAG_DIRECTORY;
  }

  BOOL result = CreateSymbolicLink(argv[1], argv[2], flags);
  if (!result) {
    fprintf(stderr, "Error creating symbolic link. Error: %lu\n", GetLastError());
    return 3;
  }

  printf("Symbolic link created successfully.\n");
  return 0;
}
