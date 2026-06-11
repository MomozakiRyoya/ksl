import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kagoshimasuperleague.app",
  appName: "Kagoshima Super League",
  webDir: "out",
  server: {
    url: "https://kagoshimasuperleague.com",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
