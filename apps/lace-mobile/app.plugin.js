const path = require('path');

// Load the plugin directly from source (no build step needed)
module.exports = require(path.join(__dirname, './expo-build-plugin/src'));
