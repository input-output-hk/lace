#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <Windows.h>

// XXX: it’s not possible to ignore Ctrl+Break, so we have to explicitly ignore it in our own
// registered handler, or else sigbreak.exe will return exit code 0xc000013a. In this handler,
// TRUE means we handled it, and FALSE passes the event to the next registered handler (the
// default one in this case).

BOOL WINAPI IgnoringCtrlHandler(DWORD fdwCtrlType) {
  switch (fdwCtrlType) {

  case CTRL_C_EVENT:
    printf("; sigbreak.exe got Ctrl-C, ignoring\n");
    return TRUE;

  case CTRL_BREAK_EVENT:
    printf("; sigbreak.exe got Ctrl-Break, ignoring\n");
    return TRUE;

  default:
    return FALSE;

  }
}

void usage(char *exe) {
  printf("usage: %s break|interrupt <console-app-PID-to-Ctrl-Break>\n", exe);
  printf("\n");
  printf("Note: for this to work, the process of PID has to be started with the CREATE_NEW_PROCESS_GROUP flag!\n");
  exit(1);
}

int main (int argc, char **argv) {
  if (argc != 3) usage(argv[0]);

  DWORD dwProcessGroupId = strtoul(argv[2], NULL, 10);
  DWORD dwCtrlEvent;

  if (!strcmp("break", argv[1])) dwCtrlEvent = CTRL_BREAK_EVENT;
  else if (!strcmp("interrupt", argv[1])) dwCtrlEvent = CTRL_C_EVENT;
  else usage(argv[0]);

  if (!FreeConsole()) return 2;
  if (!AttachConsole(dwProcessGroupId)) return 3;
  if (!SetConsoleCtrlHandler(IgnoringCtrlHandler, true)) return 4;
  if (!GenerateConsoleCtrlEvent(dwCtrlEvent, dwProcessGroupId)) return 5;
  if (!FreeConsole()) return 6;

  return 0;
}
