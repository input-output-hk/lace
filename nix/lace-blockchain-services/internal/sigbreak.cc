#include <stdio.h>
#include <stdlib.h>
#include <Windows.h>

// XXX: it’s not possible to ignore Ctrl+Break, so we have to explicitly ignore it in our own
// registered handler, or else sigbreak.exe will return exit code 0xc000013a. In this handler,
// TRUE means we handled it, and FALSE passes the event to the next registered handler (the
// default one in this case).

BOOL WINAPI IgnoringCtrlHandler(DWORD fdwCtrlType)
{
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


int main (int argc, char *argv[]) {
  if (argc != 2) {
    printf("usage: %s <console-app-PID-to-Ctrl-Break>\n", argv[0]);
    printf("\n");
    printf("Note: for this to work, the process of PID has to be started with the CREATE_NEW_PROCESS_GROUP flag!\n");
    return 1;
  }

  DWORD pid = strtoul(argv[1], NULL, 10);

  if (!FreeConsole()) return 2;
  if (!AttachConsole(pid)) return 3;
  if (!SetConsoleCtrlHandler(IgnoringCtrlHandler, true)) return 4;
  if (!GenerateConsoleCtrlEvent(CTRL_BREAK_EVENT, pid)) return 5;
  if (!FreeConsole()) return 6;

  return 0;
}
