const { BrowserWindow, screen, app, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const defaultSettings = require(path.join(__dirname, '../defaultSettings.json'));
const config = new Store({
    defaults: defaultSettings
});

const screenSize = screen.getPrimaryDisplay().workAreaSize;
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36';

let iconPath = null;
switch(config.get('style', 'andrew')) {
    case 'andrew':
        iconPath = path.join(__dirname, '../icons/andrew.png');
        break;
    case 'tristan':
        iconPath = path.join(__dirname, '../icons/tristan.png');
        break;
}

const mainWindow = new BrowserWindow({
    width: config.get('window.width', screenSize.width),
    height: config.get('window.height', screenSize.height),
    x: config.get('window.x', 0),
    y: config.get('window.y', 0),
    fullscreen: config.get('window.fullscreen', false),
    webPreferences: {
        preload: path.join(__dirname, 'renderer/game.js'),
        enableRemoteModule: true
    },
    icon: iconPath,
    show: false,
    title: 'Tate Client'
});
mainWindow.setMenu(null);
mainWindow.loadURL('https://krunker.io', { userAgent });

mainWindow.webContents.on('did-finish-load', () => mainWindow.show());
mainWindow.on('page-title-updated', ev => ev.preventDefault());

app.on('before-quit', () => {
    config.set('window', {
        width: config.get('window.width', screenSize.width),
        height: config.get('window.height', screenSize.height),
        x: config.get('window.x', 0),
        y: config.get('window.y', 0),
        fullscreen: config.get('window.fullscreen', false)
    });
});

function newWindowHandler(ev, url) {
    ev.preventDefault();
    let urlObj = new URL(url);
    if(urlObj.hostname === 'krunker.io') {
        switch(urlObj.pathname) {
            case '/':
                mainWindow.loadURL(url, { userAgent });
                break;
            default:
                let win = new BrowserWindow({
                    width: Math.floor(screenSize.width * 0.5),
                    height: Math.floor(screenSize.height * 0.5),
                });
                win.setMenu(null);
                win.loadURL(url, { userAgent });
                win.on('closed', () => win = null);
                win.webContents.on('new-window', newWindowHandler);
                win.webContents.on('will-navigate', (ev, url) => {
                    let urlObj = new URL(url);
                    if(urlObj.hostname !== 'krunker.io') {
                        ev.preventDefault();
                        shell.openExternal(url);
                    } else newWindowHandler(ev, url);
                });

                win.webContents.on('before-input-event', (ev, input) => {
                    if(input.type !== 'keyDown') return;
                    if(input.key == 'F11') (ev.preventDefault(), win.setFullScreen(!win.isFullScreen()));
                    if(input.key == 'F5') (ev.preventDefault(), win.reload());
                    if(input.key == 'F12' && !app.isPackaged) (ev.preventDefault(), win.webContents.openDevTools());
                });
                break;
        }
    } else shell.openExternal(url);
}

mainWindow.webContents.on('new-window', newWindowHandler);
mainWindow.webContents.on('will-navigate', (ev, url) => {
    let urlObj = new URL(url);
    if(urlObj.hostname !== 'krunker.io') {
        ev.preventDefault();
        shell.openExternal(url);
    } else newWindowHandler(ev, url);
});

mainWindow.webContents.on('before-input-event', (ev, input) => {
    if(input.type !== 'keyDown') return;
    if(input.key == 'F11') (ev.preventDefault(), mainWindow.setFullScreen(!mainWindow.isFullScreen()));
    if(input.key == 'F5') (ev.preventDefault(), mainWindow.reload());
    if(input.key == 'F12' && !app.isPackaged) (ev.preventDefault(), mainWindow.webContents.openDevTools());
    if(input.key == 'F6') (ev.preventDefault(), mainWindow.loadURL('https://krunker.io', { userAgent }));
});