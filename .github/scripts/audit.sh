#!/bin/bash

yarn audit --groups dependencies --level high; [[ $? -ge 8 ]] && exit 1 || exit 0;
