// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Watch the workspace root so changes to packages/parser hot-reload
config.watchFolders = [workspaceRoot];

// Allow Metro to resolve packages from both project and workspace node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Treat markdown files as static assets so `require("./assets/content/foo.md")` returns
// an asset module ID consumable by expo-asset.
config.resolver.assetExts.push("md");

// Don't try to transform .md as source code
config.resolver.sourceExts = config.resolver.sourceExts.filter((ext) => ext !== "md");

module.exports = config;
