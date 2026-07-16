import { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.sunilkeyal.zoonote",
  appName: "ZooNote",
  webDir: ".next",
  server: {
    url: "https://YOUR-VERCEL-APP.vercel.app",
    cleartext: false,
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#000000",
    },
    Keyboard: {
      resize: "body",
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#000000",
      showSpinner: true,
    },
  },
}

export default config
