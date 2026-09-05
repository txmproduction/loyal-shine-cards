import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.fideoloyalty.card",
  appName: "Fidéo",
  // Interface compilée embarquée dans l'app (aucun server.url distant : l'app
  // n'est pas un simple conteneur de site web, guideline Apple 4.2).
  webDir: "dist/mobile",
  ios: {
    contentInset: "always",
    backgroundColor: "#0B0B12",
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#0B0B12",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
