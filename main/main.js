const { ElectronBlocker } = require('@cliqz/adblocker-electron');
const { app, BrowserWindow, dialog, Menu, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const fetch = require('cross-fetch');
const contextMenu = require('electron-context-menu');

if (require('electron-squirrel-startup')) app.quit();

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        minWidth: 1024,
        minHeight: 768,
        titleBarStyle: 'hidden',
        frame: false,
        webPreferences: {
            webviewTag: true,
            devTools: true,
            sandbox: false,
            preload: path.join(__dirname, 'preload.js'),
            spellcheck: true
        },
        title: 'Catalyst',
        icon: path.join(__dirname, '../assets/icon.png'),
    });
    mainWindow.loadFile('./src/index.html');
    mainWindow.setMenuBarVisibility(false);
    require('update-electron-app')();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
app.on('web-contents-created', function (event, contents) {
    if (contents.getType() === 'webview') {
        contents.on('new-window', function (newWindowEvent) {
            newWindowEvent.preventDefault();
        });
    }
});

try {
    require('electron-reloader')(module);
} catch { }

/*
async function checkForUpdate(windowToDialog) {
    try {
        const githubFetch = await fetch(
            "https://api.github.com/repos/JaydenDev/Catalyst/releases"
        );
        if (!githubFetch.ok) {
            alert("There was an error checking for a new update, check your WiFi connection and try again from the menubar.");
            return;
        }
        const releaseJSON = await githubFetch.json();
        const replacerRegex = /["."]/gm;
        const appVersionStr = app.getVersion();
        const tagVersionInt = Number(appVersionStr.replace(replacerRegex, ""));
        for (let i in releaseJSON) {
            const release = releaseJSON[i];
            if (release.draft || release.prerelease) continue;
            const replaced = release["tag_name"].replace(replacerRegex, "");
            if (
                tagVersionInt <
                Number(replaced.startsWith("v") ? replaced.slice(1) : replaced)
            ) {
                dialog.showMessageBox(windowToDialog, {
                    message: "An update is available for Catalyst.",
                    detail: `Go to github.com/JaydenDev/Catalyst/releases to install Catalyst ${release["tag_name"]}`,
                    type: "info",
                });
                return;
            }
        }
    } catch (error) {
        console.error(error);
    }
}
*/

let ver = app.getVersion();
let appName = app.getName();

function aboutApp() {
    dialog.showMessageBoxSync({
        title: `About ${appName}`,
        message: `${appName} ${ver}`,
        buttons: ['OK'],
        icon: './assets/icon.png'
    });
}

const template = [{
    label: 'About',
    click: function () {
        aboutApp();
    }
},
{
    label: 'Quit',
    click: function () {
        app.quit();
    }
},
{
    label: 'New Tab',
    accelerator: 'CmdOrCtrl+T',
    click: function () {
        mainWindow.webContents.executeJavaScript('createTab()');
    }
},
{
    label: 'Close Tab',
    accelerator: 'CmdOrCtrl+W',
    click: function () {
        mainWindow.webContents.executeJavaScript('removeTab()');
    }
},
{
    label: 'DevTools',
    accelerator: 'CmdOrCtrl+I',
    click: function () {
        mainWindow.webContents.toggleDevTools();
    }
}/*
    {
        label: "Check for Updates",
        accelerator: "CmdOrCtrl+U",
        click: function() {
            checkForUpdate(mainWindow);
        }
    }*/
];

app.on('web-contents-created', (e, contents) => {
    contextMenu({
        window: contents,
        showSaveImageAs: true,
        showSaveImage: true,
        showInspectElement: true,
        showLearnSpelling: true,
        showSearchWithGoogle: true,
        showSelectAll: true,
        showCopyImageAddress: true,
        showCopyVideoAddress: true,
        showSaveVideoAs: true,
        showCopyLink: true,
    });
});

ipcMain.handle('enable-ad-blocker', (event) => {
    ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
        blocker.enableBlockingInSession(session.defaultSession);
    });
});

ipcMain.handle('loadExt', async (event, ext) => {
    session.defaultSession.loadExtension(ext);
});

ipcMain.handle('read-user-data', async (event, fileName) => {
    const path = app.getPath('userData');
    const buf = fs.readFileSync(`${path}/${fileName}`, { encoding: 'utf8', flag: 'r' });
    return buf;
});

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);