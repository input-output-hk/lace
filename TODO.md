## Handle resolution service

1. _Pseudo-service_ which runs in the service worker scope.
2. Init the _pseudo-service_ at wallet init time with the right `network` parameter.
3. The _pseudo-service_ has to init its own cache _section_.
4. The _pseudo-service_ has to initialize an `httpHandleProvider`.
5. The _pseudo-service_ has to expose an `HandleProvider` which must be accessible from the UI as well.
