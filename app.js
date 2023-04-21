const { app, BrowserWindow, screen } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const Store = require("electron-store");
const config = new Store();

let oLog = console.log;
console.log = (...args) =>
  oLog.apply(console, ["\x1b[32m[INFO]\x1b[0m", ...args]);
console.warn = (...args) =>
  oLog.apply(console, ["\x1b[33m[WARN]\x1b[0m", ...args]);
console.error = (...args) =>
  oLog.apply(console, ["\x1b[31m[ERROR]\x1b[0m", ...args]);
console.debug = (...args) =>
  oLog.apply(console, ["\x1b[34m[DEBUG]\x1b[0m", ...args]);

let iconPath = null;
switch (config.get("style", "andrew")) {
  case "andrew":
    iconPath = path.join(__dirname, "icons/andrew.png");
    break;
  case "tristan":
    iconPath = path.join(__dirname, "icons/tristan.png");
    break;
}

function checkForUpdates() {
  return new Promise((resolve, reject) => {
    autoUpdater.on("update-available", (info) => {
      resolve(info);
    });
    autoUpdater.on("update-not-available", () => {
      resolve(false);
    });
    autoUpdater.on("error", (err) => {
      reject(err);
    });
    autoUpdater.on("update-downloaded", () =>
      autoUpdater.quitAndInstall(true, true)
    );
    try {
      autoUpdater.checkForUpdates().catch((err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

function createSplash() {
  console.debug("App ready. Creating splash screen...");
  let maxDimension = Math.max(
    screen.getPrimaryDisplay().workAreaSize.width,
    screen.getPrimaryDisplay().workAreaSize.height
  );
  let splashDimensions = {
    width: Math.floor(maxDimension * 0.25),
    height: Math.floor((maxDimension / 16) * 9 * 0.25),
  };
  console.debug("Splash screen dimensions:", splashDimensions);
  const splash = new BrowserWindow({
    width: splashDimensions.width,
    height: splashDimensions.height,
    frame: false,
    resizable: false,
    show: false,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
    },
  });
  splash.setMenu(null);
  splash.loadFile(path.join(__dirname, "src/html/splash.html"));

  function destroySplash() {
    splash.hide();
    splash.destroy();
  }

  function launchGame() {
    let antiQuit = (ev) => ev.preventDefault();
    app.on("window-all-closed", antiQuit);
    destroySplash();
    app.off("window-all-closed", antiQuit);
    require(path.join(__dirname, "src/main.js"));
  }

  let setSplashText = (text) =>
    splash.webContents.executeJavaScript(
      `setText('${text.replace(/'/g, "\\'")}')`
    );
  splash.once("ready-to-show", async () => {
    splash.show();
    console.debug("Splash screen ready. Checking for updates...");

    if (!app.isPackaged)
      console.debug("Running in dev mode. Skipping update check.");
    else setSplashText("Checking for updates...");

    let updateAvail =
      app.isPackaged && config.get("update", true)
        ? await checkForUpdates().catch((err) => false)
        : false;
    if (updateAvail) {
      console.debug("Update found:", updateAvail);
      setSplashText("Update found. (v" + updateAvail.version + ")");
      autoUpdater.on("download-progress", (progress) => {
        setSplashText(
          "Downloading update... " + Math.floor(progress.percent) + "%"
        );
      });
    } else {
      console.debug("No update available.");
      setSplashText("No update available.");
      await splash.webContents.executeJavaScript("videoFinish()");
      setTimeout(launchGame, 1000);
    }
  });
}

app.whenReady().then(createSplash);

// Chrome flags
if (config.get("flags.uncap", false)) {
  app.commandLine.appendSwitch("disable-frame-rate-limit");
  app.commandLine.appendSwitch("disable-gpu-vsync");
}
if (config.get("flags.webgl2", false))
  app.commandLine.appendSwitch("enable-webgl2-compute-context");
if (config.get("flags.angle", "default") !== "default")
  app.commandLine.appendSwitch("use-angle", config.get("flags.angle"));

// ####### EXPERIMENTS
if (config.get("experimentalFeatures", true)) {
    // LATENCY FLAGS
  app.commandLine.appendSwitch("enable-highres-timer"); // supposedly lowers latency
  app.commandLine.appendSwitch("enable-quic"); // enables an experimental low-latency protocol
  app.commandLine.appendSwitch("enable-accelerated-2d-canvas");

  app.commandLine.appendSwitch('double-buffer-compositing');
  app.commandLine.appendSwitch('enable-skia-renderer', 'true');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('disable-matrics');
  app.commandLine.appendSwitch('no-zygote');
  app.commandLine.appendSwitch('disable-matrics');
  app.commandLine.appendSwitch('disable-ipc-flooding-protection')

    //   LIMITS PUSHER
  app.commandLine.appendSwitch('renderer-process-limit', '100');
  app.commandLine.appendSwitch('disable-logging');
  app.commandLine.appendSwitch('disable-hang-monitor');
  app.commandLine.appendSwitch('disable-component-update');
  app.commandLine.appendSwitch("disable-background-networking")

    //   ping and backend test
  app.commandLine.appendSwitch('no-pings');
  app.commandLine.appendSwitch('no-proxy-server');
          
          
  app.commandLine.appendSwitch('use-angle=d3d9');
  app.commandLine.appendSwitch('enable-viz-display-compositor');
  app.commandLine.appendSwitch('enable-drdc');
  app.commandLine.appendSwitch('disable-background-blur');
  app.commandLine.appendSwitch('enable-high-resolution-time');
  app.commandLine.appendSwitch('disable-print-preview');
  app.commandLine.appendSwitch('disable-swiftshade');
  app.commandLine.appendSwitch('use-dns-https-svcb-alpn');
  app.commandLine.appendSwitch('enable-webrtc-capture-multi-channel-audio-processing');

  // POINTER LOCK EVENTS
  app.commandLine.appendSwitch('enable-pointer-lock-options')
  app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
}
