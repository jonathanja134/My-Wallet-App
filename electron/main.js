const { app, BrowserWindow } = require("electron")
const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")
const http = require("http")

const port = process.env.PORT || 3000
const startUrl = `http://localhost:${port}`
const shouldStartNext = process.env.ELECTRON_DISABLE_NEXT_START !== "true"
let nextProcess

function getAppRoot() {
  if (!app.isPackaged) {
    return path.join(__dirname, "..")
  }

  const unpackedPath = path.join(process.resourcesPath, "app")
  const asarPath = path.join(process.resourcesPath, "app.asar")
  return fs.existsSync(unpackedPath) ? unpackedPath : asarPath
}

// Dev-mode only: uses the local node_modules/next binary, which exists
// because you ran `npm install` in the project directory.
function getNextDevBinary() {
  const appRoot = getAppRoot()
  return path.join(appRoot, "node_modules", "next", "dist", "bin", "next")
}

// Production-mode only: the standalone server produced by
// `next build` + `output: 'standalone'` in next.config.mjs.
// This must point at the *unpacked* copy on real disk (not inside
// app.asar) because it's launched as a separate OS process, and a
// child process can't be given a working directory that lives inside
// an asar archive.
function getStandaloneServerPath() {
  if (!app.isPackaged) {
    return path.join(__dirname, "..", ".next", "standalone", "server.js")
  }
  return path.join(process.resourcesPath, "app.asar.unpacked", ".next", "standalone", "server.js")
}

function isDevelopment() {
  return !app.isPackaged
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  win.loadURL(startUrl)
  if (isDevelopment()) {
    win.webContents.openDevTools()
  }
}

function startNext() {
  const appRoot = getAppRoot()

  if (isDevelopment()) {
    const nextBinary = getNextDevBinary()
    nextProcess = spawn(process.execPath, [nextBinary, "dev", "--port", `${port}`], {
      cwd: appRoot,
      stdio: "inherit",
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_ENV: "development" },
    })
  } else {
    const serverPath = getStandaloneServerPath()

    if (!fs.existsSync(serverPath)) {
      console.error(
        `Standalone Next server not found at ${serverPath}. ` +
          `Make sure next.config.mjs has "output: 'standalone'" and that ` +
          `you ran the build + postbuild steps before packaging.`
      )
      return
    }

    nextProcess = spawn(process.execPath, [serverPath], {
      cwd: path.dirname(serverPath),
      stdio: "inherit",
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        NODE_ENV: "production",
        PORT: `${port}`,
        HOSTNAME: "localhost",
      },
    })
  }

  nextProcess.on("close", () => {
    if (process.platform !== "darwin") {
      app.quit()
    }
  })
}

function checkServerReady(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.destroy()
      resolve(true)
    })

    request.on("error", () => resolve(false))
    request.setTimeout(2000, () => {
      request.destroy()
      resolve(false)
    })
  })
}

function waitForServer(url, timeout = 20000) {
  const startTime = Date.now()

  return new Promise((resolve) => {
    const retry = async () => {
      if (await checkServerReady(url)) {
        resolve(true)
        return
      }
      if (Date.now() - startTime > timeout) {
        resolve(false)
        return
      }
      setTimeout(retry, 250)
    }
    retry()
  })
}

async function startApp() {
  let serverAvailable = await checkServerReady(startUrl)

  if (!serverAvailable && shouldStartNext) {
    startNext()
    serverAvailable = await waitForServer(startUrl)
    if (!serverAvailable) {
      console.warn(`Next server did not start on ${startUrl} within the expected time.`)
    }
  } else if (!serverAvailable) {
    serverAvailable = await waitForServer(startUrl)
    if (!serverAvailable) {
      console.warn(`Next server did not become available on ${startUrl}. Electron will still open the window.`)
    }
  }

  createWindow()
}

app.whenReady().then(startApp)

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("before-quit", () => {
  if (nextProcess) {
    nextProcess.kill()
  }
})