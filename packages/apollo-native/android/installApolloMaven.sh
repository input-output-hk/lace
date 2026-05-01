#!/bin/bash

set -eo pipefail

echo "Install Apollo android debug on maven local"
echo $HOME/.m2/repository

mvn install:install-file \
    -Dfile=apollo-debug.aar \
    -DpomFile=pom-debug.xml \
    -DgroupId=org.hyperledger.identus.apollo \
    -DartifactId=apollo-android-debug \
    -Dversion=1.6.0 \
    -Dpackaging=aar \
    -DlocalRepositoryPath=$HOME/.m2/repository

echo "Install Apollo android release on maven local"

mvn install:install-file \
    -Dfile=apollo-release.aar \
    -DpomFile=pom-release.xml \
    -DgroupId=org.hyperledger.identus.apollo \
    -DartifactId=apollo-android \
    -Dversion=1.6.0 \
    -Dpackaging=aar \
    -DlocalRepositoryPath=$HOME/.m2/repository
