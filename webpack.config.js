const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const MergeManifestPlugin = require("./merge-manifest-plugin");

module.exports = {
  mode: "development",
  devtool: "source-map",
  entry: {
    "sw-bundle": path.join(__dirname, "src", "sw-bundle.js"),
    "popup-bundle": path.join(__dirname, "src", "popup-bundle.js"),
  },
  output: {
    filename: "[name].js",
    path: path.join(__dirname, "dist"),
  },
  resolve: {
    extensions: [".js", ".json"],
  },
  plugins: [
    new MergeManifestPlugin(),
    new CopyPlugin({
      patterns: [
        // Copy assets
        {
          from: path.join(__dirname, "assets"),
          to: path.join(__dirname, "dist"),
        },
        // Copy entire LMP dist
        // Luckily, there are no conflicting filenames so we can copy both to root dist/
        {
          from: path.join(
            __dirname,
            "v2",
            "apps",
            "midnight-extension",
            "dist"
          ),
          to: path.join(__dirname, "dist"),
          globOptions: {
            ignore: ["**/manifest.json", "**/popup.html"],
          },
        },
        // Copy entire V1 dist
        {
          from: path.join(
            __dirname,
            "v1",
            "apps",
            "browser-extension-wallet",
            "dist"
          ),
          to: path.join(__dirname, "dist"),
          globOptions: {
            ignore: ["**/manifest.json", "**/popup.html", "**/load-popup.js"],
          },
        },
      ],
    }),
  ],
};
