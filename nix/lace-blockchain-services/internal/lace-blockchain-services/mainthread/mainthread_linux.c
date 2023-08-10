#include <stdlib.h>
#include <gtk/gtk.h>

extern void lbs__mainthread__call_current_function();

gboolean lbs__mainthread__schedule_wrapper(gpointer plain_func) {
  lbs__mainthread__call_current_function();
  return FALSE;  // run it only once
}

void lbs__mainthread__schedule() {
  g_idle_add(lbs__mainthread__schedule_wrapper, NULL);
}
