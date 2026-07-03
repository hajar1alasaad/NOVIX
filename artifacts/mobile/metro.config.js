const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
// Walk up two levels: artifacts/mobile -> artifacts -> workspace root
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the entire monorepo so Metro can resolve workspace packages
config.watchFolders = [workspaceRoot];

// 2. Let Metro resolve workspace packages from both the project and workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Enable unstable package exports support so that workspace lib packages
//    with an "exports" field in their package.json are resolved correctly.
config.resolver.unstable_enablePackageExports = true;

// 4. Ensure TypeScript source files from workspace libs can be transformed
//    (Expo Metro already handles .ts/.tsx by default, but be explicit)
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  "ts",
  "tsx",
  "cjs",
  "mjs",
];

module.exports = config;
