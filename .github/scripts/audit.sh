#!/bin/bash

yarn audit --groups dependencies --level critical; [[ $? -ge 16 ]] && exit 1 || exit 0;
