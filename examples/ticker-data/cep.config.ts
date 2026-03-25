import { CEP_Config } from "vite-cep-plugin";
import { version } from "./package.json";

const config: CEP_Config = {
  version,
  id: "com.ae-ai-starter.ticker-data",
  displayName: "Ticker Data",
  symlink: "local",
  port: 3002,
  servePort: 5002,
  startingDebugPort: 8862,
  extensionManifestVersion: 6.0,
  requiredRuntimeVersion: 9.0,
  hosts: [{ name: "AEFT", version: "[0.0,99.9]" }],
  type: "Panel",
  iconDarkNormal: "./src/assets/light-icon.svg",
  iconNormal: "./src/assets/dark-icon.svg",
  iconDarkNormalRollOver: "./src/assets/light-icon.svg",
  iconNormalRollOver: "./src/assets/dark-icon.svg",
  parameters: ["--v=0", "--enable-nodejs", "--mixed-context"],
  width: 420,
  height: 720,
  panels: [
    {
      mainPath: "./main/index.html",
      name: "main",
      panelDisplayName: "Ticker Data",
      autoVisible: true,
      width: 420,
      height: 720,
    },
  ],
  build: { jsxBin: "off", sourceMap: true },
  zxp: {
    country: "US",
    province: "CA",
    org: "ae-ai-starter",
    password: "password",
    tsa: ["http://timestamp.digicert.com/", "http://timestamp.apple.com/ts01"],
    allowSkipTSA: false,
    sourceMap: false,
    jsxBin: "off",
  },
  installModules: [],
  copyAssets: [],
  copyZipAssets: [],
};
export default config;
