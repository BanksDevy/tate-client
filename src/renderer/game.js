const { ipcRenderer, remote, webFrame } = require("electron");
const path = require("path");
const clientSett = require(path.join(__dirname, "../../settings.json"));
const Store = require("electron-store");
const defaultSettings = require(path.join(
  __dirname,
  "../../defaultSettings.json"
));
const config = new Store({
  defaults: defaultSettings,
});
const loadTwitchIntegration = require(path.join(__dirname, "twitch.js"));
const cssL = require(path.join(__dirname, "../../css.json"));

let fm = false;


function injectExitButton() {
  let clientExit = document.getElementById("clientExit");
  clientExit.style.display = "flex";
  clientExit.addEventListener("click", () => {
    let confirm = document.getElementById("confirmBtn");
    if (confirm.parentElement.classList.contains("clientExitPop"))
      confirm.onclick = () => remote.app.quit();
  });
}

let iS = false;
function injectSettings() {
  if (!window.windows) return setTimeout(injectSettings, 100);
  if (iS) return;
  iS = true;

  let settings = window.windows[0];
  let tabIndexes = {};

  for (var cat in settings.tabs) {
    let tab = settings.tabs[cat];
    tabIndexes[cat] =
      tab.push({
        name: "Client",
      }) - 1;
  }

  window.setClientSetting = function (k, v, el) {
    if (k == "style") {
      if (v == "ban") {
        alert("Femboy detected!! UNINSTALL NOW OR WAKE THE FUCK UP");
        femboyMode();
      } else {
        if (config.get("style") == "ban") {
          let fI = -1;
          [...el.children].forEach((c, i) => {
            if (c.value == "ban") fI = i;
          });
          el.selectedIndex = fI;
          return;
        }
      }
    }
    config.set(k, v);
  };

  let noSettings = "<div class='setHed'>No settings found</div>";
  let oGetSettings = settings.getSettings;
  settings.getSettings = function () {
    let settings;
    try {
      settings = oGetSettings.call(this);
    } catch {
      settings = noSettings;
    }
    let isClientTab =
      window.windows[0].tabIndex == tabIndexes[window.windows[0].settingType];
    if (!isClientTab && !window.windows[0].settingSearch) return settings;
    let html = "";

    if (isClientTab)
      html +=
        '<div class="setBodH"><div class="settName"><span style="color:#f00">*</span> Requires restart</div><div class="settName"><span style="color:#0ff">*</span> Requires refresh</div></div>';

    let search = window.windows[0].settingSearch;
    for (var cat in clientSett) {
      let appendCat =
        isClientTab ||
        (search &&
          (cat.toLowerCase().includes(search.toLowerCase()) ||
            clientSett[cat].some((s) =>
              s.name.toLowerCase().startsWith(search.toLowerCase())
            )));
      if (!appendCat) continue;
      html +=
        '<div class="setHed" id="setHed_' +
        cat.toLowerCase() +
        '" onclick="window.windows[0].collapseFolder(this)"><span class="material-icons plusOrMinus">keyboard_arrow_down</span> ' +
        cat +
        '</div><div class="setBodH" id="setBod_' +
        cat.toLowerCase() +
        '">';
      for (var sett of clientSett[cat]) {
        let showSett =
          isClientTab ||
          (search &&
            (cat.toLowerCase().includes(search.toLowerCase()) ||
              sett.name.toLowerCase().startsWith(search.toLowerCase())));
        if (!showSett) continue;
        html +=
          '<div class="settName">' +
          sett.name +
          (sett.restart || sett.refresh
            ? `<span style="color:${sett.restart ? "#f00" : "#0ff"}">*</span>`
            : "") +
          " ";
        switch (sett.type) {
          case "toggle":
            html += `<label class="switch" style="margin-left:10px"><input type="checkbox" ${
              config.get(sett.id, false) ? "checked" : ""
            } onclick="setClientSetting('${sett.id
              .replace(/"/g, '\\"')
              .replace(
                /'/g,
                "\\'"
              )}', this.checked)"><span class="slider"><span class="grooves"></span></span></label>`;
            break;
          case "select":
            html += `<select class="inputGrey2" onchange="setClientSetting('${sett.id
              .replace(/"/g, '\\"')
              .replace(/'/g, "\\'")}', this.value, this)">`;
            for (var opt of sett.options) {
              html += `<option value="${opt.value}" ${
                config.get(sett.id) == opt.value ? "selected" : ""
              }>${opt.name}</option>`;
            }
            html += "</select>";
            break;
          case "text":
            html += `<input type="text" class="inputGrey2" placeholder="${
              sett.placeholder || ""
            }" value="${config
              .get(sett.id, "")
              .replace(/"/g, '\\"')}" oninput="setClientSetting('${sett.id
              .replace(/"/g, '\\"')
              .replace(/'/g, "\\'")}', this.value)">`;
            break;
        }
        html += "</div>";
      }
      html += "</div>";
    }
    return html == ""
      ? settings
      : settings == noSettings
      ? html
      : settings + html;
  };
}

function injectCSSTab() {
  let cssEl = document.createElement("style");
  document.head.appendChild(cssEl);

  window.applyCSS = function (i) {
    cssEl.innerHTML = cssL[i].css;
    config.set("css", i);
  };
  applyCSS(config.get("css", 0));

  let mods = document.getElementById("menuBtnMods");
  mods.parentElement.insertAdjacentHTML(
    "afterend",
    '<div class="menuItem" onmouseenter="playTick()" onclick="playSelect()"><span class="material-icons-outlined menBtnIcn" style="color:#40c4cd">format_paint</span><div class="menuItemTitle" id="menuBtnCSS">CSS</div></div>'
  );
  let css = document.getElementById("menuBtnCSS");
  css.parentElement.addEventListener("click", () => {
    let menuWindow = document.getElementById("menuWindow");
    let windowHolder = document.getElementById("windowHolder");

    menuWindow.className = "dark";
    windowHolder.classList.add("popupWin");
    windowHolder.style.display = "block";
    menuWindow.style.width = "1200px";

    menuWindow.innerHTML = "";

    for (let i in cssL) {
      menuWindow.innerHTML += `<div style="background-size:cover;background-position:center;background-image:linear-gradient(90deg, #000C, #0000),url(${(
        cssL[i].image || ""
      ).replace(
        /"/g,
        '\\"'
      )})" class="bigMFeatHold"><div id="bigMFeatName" style="top:50%;transform:translateY(-50%)">${
        cssL[i].name
      }</div><div style="padding:10px" id="bigMFeatPBtn" onclick="applyCSS(${i})">Apply</div></div>`;
    }
  });
}

function injectLoadingScreen() {
  if (!config.get("loadScreen")) return;
  let loader = document.getElementById("initLoader");
  loader.style.backgroundImage = "url(" + config.get("loadScreen") + ")";
  loader.style.backgroundSize = "cover";
  loader.style.backgroundPosition = "center";
}

// Thanks to AspectQuote for writting this script 
function keyStrokes() {
  // ==UserScript==
  // @name Keystrokes
  // @author AspectQuote
  // @version 0
  // @desc Shows multiple configurable keys on the HUD + Mouse Movement. Original by KraXen72
  // @src
  // ==/UserScript==

  //You are free to modify it for your own purposes (unpublished)
  //if you are going to publish your modification, add a link to the gist and credit KraXen72

  // CONFIGURATION VARIABLES
  const size = 2.5; //how many rem will one of the keys be in height and width
  const color1 = `#262626`; // Primary Color of the key UI stuff (background)
  const color2 = `#b3b3b3`; // Primary Color of the text stuff
  const bordercolor = `rgba(255,255,255,0.2)`;

  const color3 = `#2429a3`; // Secondary Color of the key UI stuff (like when a key is pressed) (background)
  const color4 = `#ffffff`; // Secondary Color of the text stuff (like when a key is pressed)

  const hiddenkeys = ["CTRL", "MMB"]; // Add a Key here if you don't want it shown on the hud element

  // You may want to hide mouse input if you have a high polling rate on your mouse. (higher than double your monitor's refresh rate) it can look really odd.
  const hidemouseinput = false; // Hides the mouse movement tracker (if you're really *that* performance desperate)
  const mouseinputsmoother = 0.5; // If you do choose to play with a high polling rate, you may want to increase this a bit to increase visual clarity.

  let prependCSS = "";

  //ok don't touch it past this point unless you know what you're doing
  const log = console.log; // those stinkys at krunker hq disabled normal logging so I have to const this one early
  var keysHTML = `${
    !hidemouseinput
      ? `<div class='mousemovecontainer'><div class='remsize' style='width: 1rem;'></div><canvas id='mousemovecanvas'></canvas></div>`
      : ``
  }`;
  var keys = [
    //if you use some other keybinds change the keycodes for it here. to get keycodes go to: https://keycode.info
    // When defining your own keybind layout, keep in mind that 'keyname' is just what it appears as! make sure you use the correct keycode.
    // "none" creates blank spaces for your layout, and "break" creates a linebreak
    // {ishidden: true, size: 1} will do the same thing as a "none" but increasing the 'size' attribute will increase the amount of spaces the blank space covers
    { keyCode: 81, keyname: "Q" },
    { keyCode: 87, keyname: "W" },
    { keyCode: 69, keyname: "E" },
    { keyCode: 82, keyname: "R" },
    "none",
    "break",
    { keyCode: 65, keyname: "A" },
    { keyCode: 83, keyname: "S" },
    { keyCode: 68, keyname: "D" },
    "none",
    "none",
    "break",
    { keyCode: 16, keyname: "SHIFT", size: 2 },
    { keyCode: 32, keyname: "SPACE", size: 5 },
    { keyCode: 17, keyname: "CTRL", size: 2 },
  ];
  function precisionRound(number, precision = 2) {
    let factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
  }
  keys.forEach((key) => {
    if (hiddenkeys.includes(key.keyname)) {
      key.ishidden = true;
    }
    var keysize = (key?.size || 1) * size;
    const sizeoffset = ((key?.size || 1) - 1) * 0.1 * size;
    keysize = precisionRound(keysize + sizeoffset);
    keysize = `${keysize}rem`;
    if (typeof key === "object" && !key?.ishidden) {
      keysHTML += `<span class='key key${key.keyname
        .replace(/\ /g, "")
        .toLowerCase()}${key.keyCode}' style='width: ${keysize};'>${
        key.keyname
      }</span>`;
    } else {
      if (key === "break") {
        keysHTML += `<div></div>`;
      } else {
        keysHTML += `<span class='key nokey' style='width: ${keysize};'>NONE</span>`;
      }
    }
  });
  let css = `
    ${prependCSS}
    .keystrokes-hold {
        position: absolute;
        bottom: 2rem;
        left: 31rem;
        text-align: left;
    }
    .key {
        background: ${color1};
        color: ${color2};
        font-family: gamefont;
        font-size: ${precisionRound(size / 2.7)}rem;
        font-weight: bold;
        border: 3px solid ${bordercolor};
        border-radius: 5px;
        width: ${size}rem;
        height: ${size}rem;
        box-sizing: border-box;
        display: inline-block;
        text-align: center;
        margin: ${size * 0.1}rem;
        transform: translateY(-${size * 0.2}rem);
        box-shadow: 0px ${size * 0.1}rem 0px ${color3};
        transition: 0.1s;
        line-height: ${size}rem;
    }
    .key-sft, .key-space {
        font-size: ${precisionRound(size / 2)}rem;
    }
    .nokey {
        opacity: 0;
    }
    .active {
        transition: 0s;
        background: ${color3};
        color: ${color4};
        transform: translateY(0rem);
        box-shadow: 0px 0rem 0px ${color2};
    }
    .mousemovecontainer {
        position: absolute;
        left: 80%;
        bottom: 5%;
        height: ${size * 3}rem;
        width: ${size * 3}rem;
        border: 4px solid ${bordercolor};
        background: ${color1};
        overflow: hidden;
    }
    .mousemovecontainer:after {
        content: '';
        top: 0;
        left: 50%;
        background: ${color3};
        width: 2px;
        transform: translateX(-50%);
        height: 100%;
        position: absolute;
    }
    .mousemovecontainer:before {
        content: '';
        top: 50%;
        left: 0;
        background: ${color3};
        width: 100%;
        transform: translateY(-50%);
        height: 2px;
        position: absolute;
    }
    .mousemovepixel {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: ${size * 0.3}rem;
        height: ${size * 0.3}rem;
        border-radius: 50%;
        background-color: ${color4};
        z-index: 1;
    }
    #mousemovecanvas {
        position: relative;
        z-index: 1;
    }
`;

  const injectSettingsCss = (css, classId = "keystrokes-css") => {
    let s = document.createElement("style");
    //s.setAttribute("class", classId);
    s.setAttribute("id", classId);
    s.innerHTML = css;
    document.head.appendChild(s);
  };

  injectSettingsCss(css);
  const hold = document.createElement("div");
  hold.classList.add("keystrokes-hold");
  hold.innerHTML = keysHTML;
  document.getElementById("inGameUI").appendChild(hold);
  var mousectx;
  if (!hidemouseinput) {
    var mousecanvas = document.querySelector("#mousemovecanvas");
    mousectx = mousecanvas.getContext("2d");
  }
  keys.forEach((keyobj) => {
    if (typeof keyobj === "object" && !keyobj?.ishidden) {
      keyobj.elem = document.querySelector(
        `.keystrokes-hold .key.key${keyobj.keyname
          .replace(/\ /g, "")
          .toLowerCase()}${keyobj.keyCode}`
      );
    }
  });

  function handleKeyDown(event) {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (
        event.keyCode ===
        key.keyCode /*&& !key.elem.classList.contains("active")*/
      ) {
        key.elem.classList.add("active");
      }
    }
  }

  function handleKeyUp(event) {
    if (event.keyCode == 80) debugger;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (
        event.keyCode ===
        key.keyCode /*&& key.elem.classList.contains("active")*/
      ) {
        key.elem.classList.remove("active");
      }
    }
  }

  function handleMouseDown(event) {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (
        event.which === key.keyCode &&
        key.mouse /*&& !key.elem.classList.contains("active")*/
      ) {
        key.elem.classList.add("active");
      }
    }
  }

  function handleMouseUp(event) {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (
        event.which === key.keyCode &&
        key.mouse /*&& key.elem.classList.contains("active")*/
      ) {
        key.elem.classList.remove("active");
      }
    }
  }
  var remchecker = document.querySelector(".remsize");
  var heightchecker = document.querySelector(".mousemovecontainer");
  var olcanvassize = 0;
  function handleMouseMove(event) {
    if (hidemouseinput) return;
    var remsize = remchecker.offsetWidth;
    if (
      olcanvassize !== heightchecker.offsetHeight &&
      heightchecker.offsetHeight !== 0
    ) {
      mousecanvas.height = heightchecker.offsetHeight;
      mousecanvas.width = heightchecker.offsetHeight;
      olcanvassize = heightchecker.offsetHeight;
    }
    mousectx.clearRect(0, 0, mousecanvas.width, mousecanvas.height);
    mousectx.beginPath();
    var lw = remsize * 0.6;
    mousectx.moveTo(
      mousecanvas.width / 2 - lw / 2,
      mousecanvas.height / 2 - lw / 2
    );
    var x =
      mousecanvas.width / 2 +
      event.movementX * mouseinputsmoother * remsize -
      mouseinputsmoother * remsize;
    var y =
      mousecanvas.height / 2 +
      event.movementY * mouseinputsmoother * remsize -
      mouseinputsmoother * remsize;
    mousectx.lineTo(x, y);
    mousectx.strokeStyle = color3;
    mousectx.lineWidth = lw;
    mousectx.lineCap = "round";
    mousectx.stroke();
    mousectx.beginPath();
    mousectx.fillStyle = color4;
    mousectx.arc(x, y, 7, 0, 2 * Math.PI);
    mousectx.fill();
  }

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);

  document.addEventListener("mousedown", handleMouseDown, { capture: true }); // capture: true, because when krunker hides our cursor, it changes the firing element to some weird bullshit
  document.addEventListener("mouseup", handleMouseUp);

  document.addEventListener("mousemove", handleMouseMove, { capture: true });

  addEventListener("resize", (event) => {
    log(`Rem Size: ${document.querySelector(".remsize").offsetWidth}`);
  });

  this.unload = () => {
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);

    document.removeEventListener("mousedown", handleMouseDown, {
      capture: true,
    }); // we have to remember that capture events are different from normal ones, we have to remove it separately
    document.removeEventListener("mouseup", handleMouseUp);

    document.removeEventListener("mousemove", handleMouseMove, {
      capture: true,
    });

    document.querySelector(".keystrokes-hold").textContent = "";
    document.querySelector(".keystrokes-hold").remove();
  };

  return this;
}

let oR = window.requestAnimationFrame;
let l = 0;
window.requestAnimationFrame = function (cb) {
  if (Date.now() - l > 1000 / 15 || !fm) {
    l = Date.now();
    oR(cb);
  } else {
    oR(() => window.requestAnimationFrame(cb));
  }
};

window.onload = () => {
  injectLoadingScreen();
  injectExitButton();
  injectSettings();
  injectCSSTab();
  loadTwitchIntegration();
    //   keystrokes test
    if(config.get('keystrokeEnable', true)) {
        keyStrokes();
    }
};

document.addEventListener("keydown", (e) => {
  if (e.key == "Escape") document.exitPointerLock();
});
