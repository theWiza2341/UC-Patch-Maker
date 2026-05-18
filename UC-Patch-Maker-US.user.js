// ==UserScript==
// @name         UC Patch Maker - UnderScript Plugin
// @namespace    http://tampermonkey.net/
// @version      1.5.4
// @author       TheWiza2341
// @description  UnderScript plugin version of UC Patch Maker. Adds custom Undercards fanpatch editing/viewing tools to the game updates page.
// @match        https://undercards.net/*gameUpdates*
// @icon         https://i.imgur.com/qKHDfnB.png
// @updateURL    https://raw.githubusercontent.com/theWiza2341/UC-Patch-Maker/main/UC-Patch-Maker-US.user.js
// @downloadURL  https://raw.githubusercontent.com/theWiza2341/UC-Patch-Maker/main/UC-Patch-Maker-US.user.js
// @require      https://raw.githubusercontent.com/UCProjects/UnderScript/master/src/checkerV2.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_info
// ==/UserScript==

(function () {
'use strict';

// ================================================================
// UNDERSCRIPT PLUGIN WRAPPER
// ================================================================

const PATCH_MAKER_VERSION = "1.5.4";
const PLUGIN_NAME = "Patch Maker";

console.log(
    `[UC Patch Maker] Running version ${PATCH_MAKER_VERSION}`,
    {
        gmInfoVersion:
            typeof GM_info !== "undefined"
                ? GM_info.script.version
                : "GM_info unavailable",
        scriptName:
            typeof GM_info !== "undefined"
                ? GM_info.script.name
                : "Unknown",
        updateURL: typeof UC_PATCH_UPDATE_URL !== "undefined"
            ? UC_PATCH_UPDATE_URL
            : "Not initialized yet"
    }
);

let ucPatchPlugin = null;
let ucPatchLogger = console;
let ucPatchStarted = false;
let ucPatchSettings = null;
let debugLoggingSetting = null;
let hideControlsSetting = null;
let cardHoverSetting = null;
let ucPatchControlButtons = [];

//const UC_PATCH_UPDATE_URL = "https://github.com/theWiza2341/UC-Patch-Maker/raw/refs/heads/main/UC-Patch-Maker-US.user.js";
const UC_PATCH_UPDATE_URL = "https://raw.githubusercontent.com/theWiza2341/UC-Patch-Maker/main/UC-Patch-Maker-US.user.js";
//i swear one of these should work

console.log(
    `[UC Patch Maker] Running version ${PATCH_MAKER_VERSION}`,
    {
        gmInfoVersion:
            typeof GM_info !== "undefined"
                ? GM_info.script.version
                : "GM_info unavailable",
        scriptName:
            typeof GM_info !== "undefined"
                ? GM_info.script.name
                : "Unknown",
        updateURL: UC_PATCH_UPDATE_URL
    }
);
    
let openPatchNotesSetting = null;
const UC_PATCH_OPEN_DEFAULT = false;
const UC_PATCH_OPEN_KEY = "uc_patch_open_on_page";

let patchLanguageSetting = null;
const UC_PATCH_LANGUAGE_DEFAULT = "auto";
const UC_PATCH_LANGUAGE_KEY = "uc_patch_language";

const UC_PATCH_LANGUAGE_OPTIONS = [
    "Auto / Default",
    "English",
    "French",
    "Spanish",
    "Portuguese",
    "Chinese",
    "Italian",
    "Polish",
    "German",
    "Russian"
];

const UC_PATCH_DEBUG_DEFAULT = false;
const UC_PATCH_LOGGING_KEY = "uc_patch_logging_enabled";
const UC_PATCH_HIDE_CONTROLS_DEFAULT = false;
const UC_PATCH_HIDE_CONTROLS_KEY = "uc_patch_hide_controls";
const UC_PATCH_CARD_HOVER_DEFAULT = true;

function isPatchLoggingEnabled() {
    try {
        if (debugLoggingSetting && typeof debugLoggingSetting.value === "function") {
            return !!debugLoggingSetting.value();
        }
    } catch (e) {}

    try {
        if (typeof GM_getValue === "function") {
            return GM_getValue(UC_PATCH_LOGGING_KEY, UC_PATCH_DEBUG_DEFAULT);
        }
    } catch (e) {}
    return UC_PATCH_DEBUG_DEFAULT;
}

function setPatchLoggingEnabled(enabled) {
    try {
        if (debugLoggingSetting && typeof debugLoggingSetting.set === "function") {
            debugLoggingSetting.set(!!enabled);
            return;
        }
    } catch (e) {}

    try {
        if (typeof GM_setValue === "function") {
            GM_setValue(UC_PATCH_LOGGING_KEY, !!enabled);
        }
    } catch (e) {}
}

function togglePatchLogging() {
    const next = !isPatchLoggingEnabled();
    setPatchLoggingEnabled(next);
    console.log(`[UC Patch Maker] Debug logging ${next ? "enabled" : "disabled"}.`);
    return next;
}

function shouldOpenPatchNotesOnPageLoad() {
    try {
        if (openPatchNotesSetting && typeof openPatchNotesSetting.value === "function") {
            return !!openPatchNotesSetting.value();
        }
    } catch (e) {}

    try {
        if (typeof GM_getValue === "function") {
            return GM_getValue(UC_PATCH_OPEN_KEY, UC_PATCH_OPEN_DEFAULT);
        }
    } catch (e) {}

    return UC_PATCH_OPEN_DEFAULT;
}

function isPatchControlsHidden() {
    try {
        if (hideControlsSetting && typeof hideControlsSetting.value === "function") {
            return !!hideControlsSetting.value();
        }
    } catch (e) {}

    try {
        if (typeof GM_getValue === "function") {
            return GM_getValue(UC_PATCH_HIDE_CONTROLS_KEY, UC_PATCH_HIDE_CONTROLS_DEFAULT);
        }
    } catch (e) {}

    return UC_PATCH_HIDE_CONTROLS_DEFAULT;
}

function setPatchControlsHidden(hidden) {
    try {
        if (typeof GM_setValue === "function") {
            GM_setValue(UC_PATCH_HIDE_CONTROLS_KEY, !!hidden);
        }
    } catch (e) {}

    applyPatchControlVisibility();
}

function applyPatchControlVisibility() {
    const hidden = isPatchControlsHidden();
    ucPatchControlButtons.forEach(btn => {
        if (!btn) return;
        btn.style.visibility = hidden ? "hidden" : "visible";
        btn.style.pointerEvents = hidden ? "none" : "auto";
    });
}

function togglePatchControlsHidden() {
    const next = !isPatchControlsHidden();
    if (hideControlsSetting && typeof hideControlsSetting.set === "function") {
        hideControlsSetting.set(next);
    } else {
        setPatchControlsHidden(next);
    }
    console.log(`[UC Patch Maker] Patch controls ${next ? "hidden" : "visible"}.`);
    return next;
}

function areCardHoversEnabled() {
    try {
        if (cardHoverSetting && typeof cardHoverSetting.value === "function") {
            return !!cardHoverSetting.value();
        }
    } catch (e) {}

    return UC_PATCH_CARD_HOVER_DEFAULT;
}
const UC_PATCH_DEBUG_PREFIX = "[UC Patch Maker DEBUG]";

function getPatchLanguageSettingValue() {
    try {
        if (patchLanguageSetting && typeof patchLanguageSetting.value === "function") {
            const value = patchLanguageSetting.value();
            if (value) return value;
        }
    } catch (e) {}

    try {
        if (typeof GM_getValue === "function") {
            return GM_getValue(UC_PATCH_LANGUAGE_KEY, UC_PATCH_LANGUAGE_DEFAULT);
        }
    } catch (e) {}

    return UC_PATCH_LANGUAGE_DEFAULT;
}

function getResolvedPatchLanguage() {
    const selected = getPatchLanguageSettingValue();

    const languageMap = {
        "Auto / Default": "auto",
        "English": "en",
        "French": "fr",
        "Spanish": "es",
        "Portuguese": "pt",
        "Chinese": "cn",
        "Italian": "it",
        "Polish": "pl",
        "German": "de",
        "Russian": "ru"
    };

    const mapped = languageMap[selected] || "auto";

    if (mapped !== "auto") return mapped;

    try {
        const stored = localStorage.getItem("language");
        if (stored) return stored;
    } catch (e) {}

    return "en";
}

function refreshPatchMakerFormattingIfNeeded() {
    const overlay = document.getElementById('uc-patch-overlay');
    if (!overlay || !overlay.classList.contains('viewer-mode')) return;
    applyFormattingOverlay(overlay);
}

function debugLog(stage, data) {
    if (!isPatchLoggingEnabled()) return;

    const time = new Date().toLocaleTimeString();
    const msg = `${UC_PATCH_DEBUG_PREFIX} ${time} :: ${stage}`;

    try {
        if (data !== undefined) console.log(msg, data);
        else console.log(msg);
    } catch (e) {
        console.log(msg);
    }
}

function debugWarn(stage, data) {
    if (!isPatchLoggingEnabled()) return;
    const time = new Date().toLocaleTimeString();
    const msg = `${UC_PATCH_DEBUG_PREFIX} ${time} :: WARN :: ${stage}`;
    if (data !== undefined) console.warn(msg, data);
    else console.warn(msg);
}

function debugError(stage, data) {
    if (!isPatchLoggingEnabled()) return;
    const time = new Date().toLocaleTimeString();
    const msg = `${UC_PATCH_DEBUG_PREFIX} ${time} :: ERROR :: ${stage}`;
    if (data !== undefined) console.error(msg, data);
    else console.error(msg);
}

debugLog("Script parsed. Starting bootstrap checks.", {
    readyState: document.readyState,
    url: location.href,
    hasWindowUnderScript: !!window.underscript,
    hasGlobalUnderScript: typeof underscript !== "undefined",
    loggingEnabled: isPatchLoggingEnabled()
});

function getUnderScriptApi() {
    if (typeof underscript !== "undefined" && underscript && typeof underscript.plugin === "function") {
        return underscript;
    }

    if (window.underscript && typeof window.underscript.plugin === "function") {
        return window.underscript;
    }

    return null;
}

function getPluginLogger(plugin) {
    if (!plugin) return console;

    // Different UnderScript/plugin-template versions expose logging differently.
    if (typeof plugin.logger === "function") {
        try {
            const logger = plugin.logger();
            if (logger && typeof logger.log === "function") return logger;
        } catch (e) {
            debugWarn("plugin.logger() existed but threw; falling back to console.", e);
        }
    }

    if (plugin.logger && typeof plugin.logger.log === "function") {
        return plugin.logger;
    }

    if (typeof plugin.log === "function") {
        return {
            log: plugin.log.bind(plugin),
            warn: typeof plugin.warn === "function" ? plugin.warn.bind(plugin) : console.warn.bind(console),
            error: typeof plugin.error === "function" ? plugin.error.bind(plugin) : console.error.bind(console)
        };
    }

    return console;
}

function pluginLog(...args) {
    if (!isPatchLoggingEnabled()) return;
    try {
        ucPatchLogger.log(...args);
    } catch (e) {
        console.log(...args);
    }
}

function registerPatchMakerSettings() {
    if (!ucPatchPlugin || typeof ucPatchPlugin.settings !== "function") {
        debugWarn("Patch Maker settings skipped: plugin.settings() is unavailable.", {
            hasPlugin: !!ucPatchPlugin,
            pluginKeys: ucPatchPlugin ? Object.keys(ucPatchPlugin) : []
        });
        return;
    }

    try {
        ucPatchSettings = ucPatchPlugin.settings();

        debugLog("Patch Maker settings manager acquired.", {
            settingsType: typeof ucPatchSettings,
            settingsKeys: ucPatchSettings ? Object.keys(ucPatchSettings) : []
        });

        debugLoggingSetting = ucPatchSettings.add({
            key: "debugLogging",
            name: "Enable debug logging",
            category: "QoL",
            type: "boolean",
            default: UC_PATCH_DEBUG_DEFAULT,
            onChange: value => {
                try {
                    if (typeof GM_setValue === "function") {
                        GM_setValue(UC_PATCH_LOGGING_KEY, !!value);
                    }
                } catch (e) {}
                console.log(`[UC Patch Maker] Debug logging ${value ? "enabled" : "disabled"}.`);
            }
        });

        hideControlsSetting = ucPatchSettings.add({
            key: "hideControls",
            name: "Hide Patch Maker controls",
            category: "QoL",
            type: "boolean",
            default: UC_PATCH_HIDE_CONTROLS_DEFAULT,
            onChange: value => setPatchControlsHidden(value)
        });

        cardHoverSetting = ucPatchSettings.add({
            key: "enableCardHovers",
            name: "Enable card hovers",
            category: "QoL",
            type: "boolean",
            default: UC_PATCH_CARD_HOVER_DEFAULT,
            onChange: value => {
                const overlay = document.getElementById('uc-patch-overlay');
                if(!overlay) return;
                if(value) applyCardHovers(overlay);
            }
        });

        patchLanguageSetting = ucPatchSettings.add({
            key: "patchLanguage",
            name: "Select Language",
            category: "Accessibility",
            type: "select",
            options: UC_PATCH_LANGUAGE_OPTIONS,
            default: UC_PATCH_LANGUAGE_DEFAULT,
            onChange: value => {
                try {
                    if (typeof GM_setValue === "function") {
                        GM_setValue(UC_PATCH_LANGUAGE_KEY, value || UC_PATCH_LANGUAGE_DEFAULT);
                    }
                } catch (e) {}

                location.reload();
            }
        });

        openPatchNotesSetting = ucPatchSettings.add({
            key: "openPatchNotesOnPageLoad",
            name: "Auto-Load Patch Maker",
            category: "QoL",
            type: "boolean",
            default: UC_PATCH_OPEN_DEFAULT,
            onChange: value => {
                try {
                    if (typeof GM_setValue === "function") {
                        GM_setValue(UC_PATCH_OPEN_KEY, !!value);
                    }
                } catch (e) {}
            }
        });

        window.ucPatchMakerToggleLogging = togglePatchLogging;
        window.ucPatchMakerLoggingEnabled = isPatchLoggingEnabled;
        window.ucPatchMakerToggleControls = togglePatchControlsHidden;
        window.ucPatchMakerControlsHidden = isPatchControlsHidden;

        debugLog("Registered Patch Maker UnderScript settings.", {
            debugLoggingValue: debugLoggingSetting && typeof debugLoggingSetting.value === "function"
                ? debugLoggingSetting.value()
                : null,
            hideControlsValue: hideControlsSetting && typeof hideControlsSetting.value === "function"
                ? hideControlsSetting.value()
                : null,
            cardHoversValue: cardHoverSetting && typeof cardHoverSetting.value === "function"
                ? cardHoverSetting.value()
                : null
        });
    } catch (e) {
        console.error("[UC Patch Maker] Failed to register UnderScript settings.", e);
        debugError("Failed while registering Patch Maker settings.", e);
    }
}


function registerUnderScriptPlugin() {
    const us = getUnderScriptApi();

    debugLog("registerUnderScriptPlugin() entered.", {
        alreadyStarted: ucPatchStarted,
        hasWindowUnderScript: !!window.underscript,
        windowUnderScriptType: typeof window.underscript,
        hasGlobalUnderScript: typeof underscript !== "undefined",
        globalUnderScriptType: typeof underscript,
        hasResolvedUnderScript: !!us,
        hasPluginFunction: !!(us && typeof us.plugin === "function")
    });

    if (ucPatchStarted) {
        debugWarn("Bootstrap skipped because ucPatchStarted is already true.");
        return;
    }

    if (!us) {
        debugWarn("UnderScript API not ready yet; retrying shortly.");
        setTimeout(registerUnderScriptPlugin, 100);
        return;
    }

    ucPatchStarted = true;

    try {
        ucPatchPlugin = us.plugin(PLUGIN_NAME, PATCH_MAKER_VERSION);

        ucPatchPlugin.updater?.(UC_PATCH_UPDATE_URL);

        ucPatchLogger = getPluginLogger(ucPatchPlugin);
        pluginLog("[UC Patch Maker] Registered as UnderScript plugin.");
        debugLog("UnderScript plugin registration succeeded.", {
            pluginName: PLUGIN_NAME,
            version: PATCH_MAKER_VERSION,
            pluginObject: ucPatchPlugin,
            pluginKeys: ucPatchPlugin ? Object.keys(ucPatchPlugin) : []
        });
        registerPatchMakerSettings();
    } catch (e) {
        console.error("[UC Patch Maker] Failed to register UnderScript plugin. Continuing in compatibility mode.", e);
        debugError("UnderScript plugin registration threw an error.", e);
        ucPatchPlugin = null;
        ucPatchLogger = console;
    }

    debugLog("Calling startPatchMaker().");
    startPatchMaker();
}

// @require should normally make UnderScript available before this runs, but this keeps the port tolerant.
debugLog("Choosing bootstrap timing path.", { readyState: document.readyState });

if (document.readyState === "loading") {
    debugLog("Document still loading. Waiting for DOMContentLoaded.");
    document.addEventListener("DOMContentLoaded", () => {
        debugLog("DOMContentLoaded fired. Registering plugin.");
        registerUnderScriptPlugin();
    }, { once: true });
} else {
    debugLog("Document already ready enough. Registering plugin immediately.");
    registerUnderScriptPlugin();
}

function injectPatchMakerStyle(cssText) {
    debugLog("injectPatchMakerStyle() entered.", {
        cssLength: cssText.length,
        hasPlugin: !!ucPatchPlugin,
        hasPluginAddStyle: !!(ucPatchPlugin && typeof ucPatchPlugin.addStyle === "function"),
        hasDocumentHead: !!document.head
    });

    if (ucPatchPlugin && typeof ucPatchPlugin.addStyle === "function") {
        try {
            ucPatchPlugin.addStyle(cssText);
            debugLog("Style injected through UnderScript plugin.addStyle().");
            return;
        } catch (e) {
            debugError("plugin.addStyle() failed. Falling back to manual <style> injection.", e);
        }
    }

    const style = document.createElement("style");
    style.textContent = cssText;
    document.head.appendChild(style);
    debugLog("Style injected manually through document.head.appendChild().");
}

// ================================================================
// MAIN PATCH MAKER SCRIPT
// ================================================================

function startPatchMaker() {
    debugLog("startPatchMaker() entered.", {
        readyState: document.readyState,
        hasMainContentNow: !!document.querySelector('.mainContent'),
        hasBootstrapDialog: !!window.BootstrapDialog,
        hasGMGetValue: typeof GM_getValue === "function",
        hasGMSetValue: typeof GM_setValue === "function",
        hasGMDeleteValue: typeof GM_deleteValue === "function"
    });

// ================================================================
// GLOBAL STYLE — prevent horizontal scroll, match Undercards UI

injectPatchMakerStyle(`

html, body {
    overflow-x: hidden !important;
}

#uc-patch-overlay {
    min-height: 100vh;
    max-width: 100vw;
    overflow-y: visible !important;
    overflow-x: visible !important;
}

/* Inner container should also allow horizontal overflow */
#uc-patch-overlay > div {
    overflow-x: visible !important;
}

#uc-patch-overlay li.buff   { border-left: 3px solid #00c800; }
#uc-patch-overlay li.rework { border-left: 3px solid gold; }
#uc-patch-overlay li.nerf   { border-left: 3px solid red; }
#uc-patch-overlay li.other  { border-left: 3px solid gray; }
#uc-patch-overlay li.none   { border-left: none !important; }

#uc-patch-overlay.editor-mode p {
    background-color: rgba(255, 255, 0, 0.10);
}
#uc-patch-overlay.editor-mode li {
    background-color: rgba(173,216,230,0.12);
}

#uc-patch-overlay li {
    padding-left: 5px;
    border-radius: 3px;
    position: relative;
    margin: 10px 0;
    list-style-type: disc;
}

#uc-patch-overlay ul {
    margin-top: 0;
    margin-bottom: 10px;
    padding-left: 40px;
    list-style-position: outside;
}

/* Make <p> a positioning context for the collapse button */
#uc-patch-overlay p {
    position: relative;
    font-size: 14px;
}

#uc-patch-overlay li {
    font-size: 14px;
}

#uc-patch-overlay .uc-li-text:focus {
    outline: none;
}

#uc-patch-overlay li:focus-within {
    outline: 2px solid white;
    outline-offset: 3px;
    border-radius: 4px;
}

#uc-patch-overlay .uc-collapse-btn {
    position: absolute;
    right: -38px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    background-color: #0099cc;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    opacity: 0.9;
}

#uc-patch-overlay .uc-section-del {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 3px;
    color: white;
    cursor: pointer;
    opacity: 0.9;
    right: -64px;
    background-color: #e74c3c;
}

#uc-patch-overlay .uc-section-label:focus {
    outline: 2px solid white;
    outline-offset: 2px;
}

#uc-patch-overlay .uc-add-section-row {
    margin: 0 0 10px 0;
    background-color: rgba(255, 255, 0, 0.10);
    padding: 0 6px;
    border-radius: 3px;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 24px;
}

#uc-patch-overlay .uc-add-section-btn {
    width: 20px;
    height: 20px;
    line-height: 20px;
    padding: 0;
    background-color: #2ecc71;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    text-align: center;
    font-size: 14px;
    font-weight: bold;
}

#uc-patch-overlay .uc-card-section {
    margin: 8px 0 28px 0;
}

#uc-patch-overlay .uc-card-toolbar {
    display: none;
}

#uc-patch-overlay .uc-card-add-tile {
    width: 176px;
    height: 246px;
    background-color: rgba(255, 255, 0, 0.10);
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 3px;
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    flex: 0 0 auto;
}

#uc-patch-overlay .uc-card-add-btn {
    width: 20px;
    height: 20px;
    line-height: 20px;
    padding: 0;
    background-color: #2ecc71;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    text-align: center;
    font-size: 14px;
    font-weight: bold;
}

#uc-patch-overlay .uc-card-gallery {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-start;
    min-height: 246px;
}

#uc-patch-overlay .uc-card-item {
    position: relative;
    display: inline-block;
    outline: none;
}

#uc-patch-overlay .uc-card-item:focus {
    outline: 2px solid white;
    outline-offset: 3px;
}

#uc-patch-overlay .uc-card-frame {
    width: 176px;
    height: 246px;
    overflow: hidden;
    background: #000;
}

#uc-patch-overlay .uc-card-frame img {
    width: 176px;
    height: 246px;
    display: block;
    image-rendering: auto;
}

#uc-patch-overlay .uc-card-del {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 20px;
    height: 20px;
    line-height: 20px;
    padding: 0;
    border: none;
    border-radius: 3px;
    background-color: #e74c3c;
    color: white;
    cursor: pointer;
    text-align: center;
    opacity: 0.95;
}

#uc-patch-overlay .uc-li-add,
#uc-patch-overlay .uc-li-del {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 3px;
    color: white;
    cursor: pointer;
    text-align: center;
    opacity: 0.9;
}

#uc-patch-overlay .uc-li-add {
    right: -38px;
    background-color: #2ecc71;
}
#uc-patch-overlay .uc-li-del {
    right: -64px;
    background-color: #e74c3c;
}
#uc-patch-overlay .uc-li-del:disabled {
    background-color: #777;
    opacity: 0.4;
    cursor: not-allowed;
}

#uc-patch-overlay.viewer-mode .uc-li-add,
#uc-patch-overlay.viewer-mode .uc-li-del,
#uc-patch-overlay.viewer-mode .uc-collapse-btn,
#uc-patch-overlay.viewer-mode .uc-section-del,
#uc-patch-overlay.viewer-mode .uc-add-section-row,
#uc-patch-overlay.viewer-mode .uc-card-toolbar,
#uc-patch-overlay.viewer-mode .uc-card-del,
#uc-patch-overlay.viewer-mode .uc-card-add-tile,
#uc-patch-overlay.viewer-mode .uc-card-add-btn {
    display: none !important;
}
#uc-patch-overlay.viewer-mode p,
#uc-patch-overlay.viewer-mode li {
    background-color: transparent !important;
}

.uc-skip {
    all: unset;
}

`);

// ================================================================
// CONSTANTS

const STATE_KEY = "uc_patch_state_v0192";

// ================================================================
// COLOR WORDS (exact, case-sensitive)

const cycleOrder=[
    "none",
    "other",
    "buff",
    "rework",
    "nerf"
   ];

const WORD_COLORS = {
    "ATK":"#f0003c",
    "HP":"#0dd000",
    "cost":"#00d0ff",
    "DMG":"#ffcc00",

    "DETERMINATION":"red",
    "PATIENCE":"#41fcff",
    "BRAVERY":"#fca500",
    "INTEGRITY":"#0064ff",
    "PERSEVERANCE":"#d535d9",
    "KINDNESS":"#00c000",
    "JUSTICE":"#ffff00",

    "MONSTER":"#ffffff",
    "TOKEN":"#00c800",

    "BASE":"gray",
    "COMMON":"#fff",
    "RARE":"#00b8ff",
    "EPIC":"#d535d9",
    "LEGENDARY":"gold",

    "DT":"red",
    "COST":"#00d0ff",
    "G":"gold",
    "КР":"#d535d9", //I'm lazy so this is translated KR
    "KR":"#d535d9"

};

let LOCALIZED_WORD_COLORS = {};

// ================================================================
// UNDERLINE WORDS — keywords + tribes

const KEYWORD_IDS = [
  "determination","charge","haste","armor","disarmed","candy","support",
  "transparency","invulnerable","taunt","dodge","shock","loop","bullseye",
  "wanted","darkspawn","magic","dust","turn-start","turn-end","fatigue",
  "turbo","paralyze","silence","synergy","delay","generated","need",
  "program","erase","switch","catch"
];

const TRIBE_IDS = [
  "tem","dog","amalgamate","g-follower","lost-soul","frog","mold","snail",
  "bomb","plant","royal-guard","all-monster-tribes","chaos-weapon","piece",
  "arachnid","royal-invention","plug","thrashing-part","bargain","dance",
  "giga-attack","round","pack"
];

const SOUL_IDS = [
    "determination",
    "patience",
    "bravery",
    "integrity",
    "perseverance",
    "kindness",
    "justice"
];

const RARITY_IDS = [
    "base",
    "common",
    "rare",
    "epic",
    "legendary",
    "token"
];

const STAT_IDS = [
    "gold",
    "cost",
    "atk",
    "hp",
    "dmg"
];

const FALLBACK_KEYWORDS = [
  "Determination","Charge","Haste","Armor","Disarmed","Candy","Support",
  "Transparency","Invulnerable","Taunt","Dodge","Shock","Loop","Bullseye",
  "Wanted","Darkspawn","Magic","Dust","Turn start","Turn end","Fatigue",
  "Turbo","Paralyze","Silence","Synergy","Delay","Generated","Need",
  "Program","Erase","Switch","Catch"
];

const FALLBACK_TRIBES = [
  "Tem","Dog","Amalgamate","G Follower","Lost Soul","Frog","Mold","Snail",
  "Bomb","Plant","Royal Guard","All monster tribes","Chaos Weapon","Piece",
  "Arachnid","Royal Invention","Plug","Thrashing Part","Bargain","Dance",
  "Giga Attack","Round","Pack",

  "Tems","Dogs","Amalgamates","G Followers","Lost Souls","Frogs","Molds",
  "Snails","Bombs","Plants","Royal Guards","Chaos Weapons","Pieces",
  "Arachnids","Royal Inventions","Plugs","Thrashing Parts","Bargains",
  "Dances","Giga Attacks","Rounds","Packs"
];

let UNDERLINE_TOKENS = FALLBACK_KEYWORDS.concat(FALLBACK_TRIBES);
UNDERLINE_TOKENS.sort((a,b)=>b.length-a.length);

const loadedPatchLanguages = new Set();

function getPageWindowRef() {
    return (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
}

function getI18nRef() {
    const pageWindow = getPageWindowRef();
    return pageWindow.$ && pageWindow.$.i18n ? pageWindow.$.i18n : null;
}

function getTranslateVersionRef() {
    const pageWindow = getPageWindowRef();
    return typeof pageWindow.translateVersion !== "undefined"
        ? pageWindow.translateVersion
        : "";
}

function i18nDeferredToPromise(deferred) {
    return new Promise((resolve, reject) => {
        try {
            if (deferred && typeof deferred.done === "function") {
                deferred.done(resolve);
                if (typeof deferred.fail === "function") deferred.fail(reject);
            } else {
                resolve();
            }
        } catch (e) {
            reject(e);
        }
    });
}

async function ensurePatchLanguageLoaded(lang) {
    if (!lang || lang === "en" || loadedPatchLanguages.has(lang)) return;

    const i18n = getI18nRef();
    if (!i18n) return;

    const version = getTranslateVersionRef();
    const path = `/translation/${lang}.json${version ? "?v=" + version : ""}`;

    await i18nDeferredToPromise(i18n().load({ [lang]: path }));
    loadedPatchLanguages.add(lang);
}

function getLocalizedStringSafely(key, ...args) {
    const i18n = getI18nRef();
    if (!i18n) return "";

    try {
        const value = i18n.apply(i18n, [key, ...args]);
        if (!value || value === key) return "";
        return String(value).trim();
    } catch (e) {
        return "";
    }
}

async function rebuildLocalizedUnderlineTokens() {
    const i18n = getI18nRef();
    const lang = getResolvedPatchLanguage();

    const tokens = FALLBACK_KEYWORDS.concat(FALLBACK_TRIBES);
    LOCALIZED_WORD_COLORS = {};

    if (!i18n) {
        UNDERLINE_TOKENS = [...new Set(tokens)].filter(Boolean).sort((a,b)=>b.length-a.length);
        return;
    }

    const originalLocale = i18n().locale;

    try {
        await ensurePatchLanguageLoaded(lang);
        i18n().locale = lang;

        KEYWORD_IDS.forEach(id => {
            const text = getLocalizedStringSafely(`kw-${id}`);
            if (text) tokens.push(text);
        });

        TRIBE_IDS.forEach(id => {
            const singular = getLocalizedStringSafely(`tribe-${id}`, 1);
            const plural = getLocalizedStringSafely(`tribe-${id}`, 2);

            if (singular) tokens.push(singular);
            if (plural) tokens.push(plural);
        });
        SOUL_IDS.forEach(id => {
            const translated = getLocalizedStringSafely(`soul-${id}`);

            if (translated) {
                const clean = sanitizeText(decodeTranslationHtml(translated));
                const color = WORD_COLORS[id.toUpperCase()];

                if (clean && color) {
                    LOCALIZED_WORD_COLORS[clean] = color;
                    LOCALIZED_WORD_COLORS[clean.toUpperCase()] = color;
                }
            }
        });

        RARITY_IDS.forEach(id => {
            const translated = getLocalizedStringSafely(`rarity-${id}`);

            if (translated) {
                const clean = sanitizeText(decodeTranslationHtml(translated));
                const color = WORD_COLORS[id.toUpperCase()];

                if (clean && color) {
                    LOCALIZED_WORD_COLORS[clean] = color;
                    LOCALIZED_WORD_COLORS[clean.toUpperCase()] = color;
                }
            }
        });

        STAT_IDS.forEach(id => {
            const translated = getLocalizedStringSafely(`stat-${id}`, 1);

            if (translated) {
                const clean = sanitizeText(decodeTranslationHtml(translated));

                const colorKey = id === "gold" ? "G" : id.toUpperCase();
                const color = WORD_COLORS[colorKey] || WORD_COLORS[id];

                if (clean && color) {
                    LOCALIZED_WORD_COLORS[clean] = color;
                    LOCALIZED_WORD_COLORS[clean.toUpperCase()] = color;
                }
            }
        });

        const krText = getLocalizedStringSafely("status-kr");

        if (krText) {
            const clean = sanitizeText(decodeTranslationHtml(krText));

            if (clean) {
                LOCALIZED_WORD_COLORS[clean] = WORD_COLORS.KR;
                LOCALIZED_WORD_COLORS[clean.toUpperCase()] = WORD_COLORS.KR;
            }
        }

    } catch (e) {
        debugWarn("Failed to rebuild localized underline tokens.", e);
    } finally {
        try {
            i18n().locale = originalLocale;
        } catch (e) {}
    }

    UNDERLINE_TOKENS = [...new Set(tokens)]
        .filter(Boolean)
        .sort((a,b)=>b.length-a.length);

    debugLog("Localized underline tokens rebuilt.", {
        lang,
        tokenCount: UNDERLINE_TOKENS.length,
        sample: UNDERLINE_TOKENS.slice(0, 20)
    });
}

let localizedCardNameToId = new Map();

function decodeTranslationHtml(input) {
    if (!input) return "";

    try {
        const e = document.createElement("div");
        e.innerHTML = input;
        return e.childNodes.length === 0 ? "" : e.textContent.trim();
    } catch (e) {
        return String(input).trim();
    }
}

function getAllCardsRef() {
    const pageWindow = getPageWindowRef();

    const candidates = [
        pageWindow.allCards,
        pageWindow.cards,
        pageWindow.cardList,
        pageWindow.CardDatabase,
        pageWindow.ucCards
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate) && candidate.length) return candidate;
    }

    return [];
}

function addCardNameMapping(map, name, id) {
    const clean = sanitizeText(decodeTranslationHtml(name));
    if (!clean || !id) return;

    map.set(clean.toLowerCase(), id);
}

async function rebuildLocalizedCardNameMap(attempt = 0) {

    const i18n = getI18nRef();
    const lang = getResolvedPatchLanguage();
    const cards = getAllCardsRef();

    if (!cards.length && attempt < 40) {
        setTimeout(() => rebuildLocalizedCardNameMap(attempt + 1), 250);
        return;
    }

    const map = new Map();

    if (!cards.length) {
        localizedCardNameToId = map;
        debugWarn("Card name map skipped: allCards unavailable after retries.");
        return;
    }

    const originalLocale = i18n ? i18n().locale : null;

    try {
        if (i18n) {
            await ensurePatchLanguageLoaded(lang);
            i18n().locale = lang;
        }

        cards.forEach(card => {
            if (!card || !card.id) return;

            // English / internal card name fallback.
            if (card.name) {
                addCardNameMapping(map, card.name, card.id);

                const englishPlural = getLocalizedStringSafely(`card-name-${card.id}`, 2);
                if (englishPlural) {
                    addCardNameMapping(map, englishPlural, card.id);
                }
            }

            // Selected-language card name.
            if (i18n) {
                const translatedSingular = getLocalizedStringSafely(`card-name-${card.id}`, 1);
                const translatedPlural = getLocalizedStringSafely(`card-name-${card.id}`, 2);

                if (translatedSingular) {
                    addCardNameMapping(map, translatedSingular, card.id);
                }

                if (translatedPlural) {
                    addCardNameMapping(map, translatedPlural, card.id);
                }
            }
        });

    } catch (e) {
        debugWarn("Failed to rebuild localized card name map.", e);
    } finally {
        if (i18n && originalLocale) {
            try {
                i18n().locale = originalLocale;
            } catch (e) {}
        }
    }

    localizedCardNameToId = map;
 /* console.log("[UC Patch Maker] Card map debug", {
        lang,
        hasAllCards: cards.length,
        mappedNames: map.size,
        cafeLower: map.get("tables du café"),
        sampleMatches: [...map.entries()]
        .filter(([name]) => name.includes("café") || name.includes("cafe"))
        .slice(0, 20)
    });
 I was having some issues setting this up so this is for when whatever I was doing breaks again :( */

    debugLog("Localized card name map rebuilt.", {
        lang,
        cardCount: cards.length,
        mappedNames: localizedCardNameToId.size
    });
}

async function rebuildLocalizedPatchMakerData() {
    await rebuildLocalizedUnderlineTokens();
    await rebuildLocalizedCardNameMap();
}

const CARD_REF_REGEX = /\{([^{}]+?)\}/g;
const UL_OPEN="__UC_UL_OPEN__";
const UL_CLOSE="__UC_UL_CLOSE__";

// ================================================================
// Helper functions

function escapeRegExp(str){
  return str.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
}
function escapeHtml(str){
  return str
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}
function sanitizeText(str){
  return str ? str.replace(/\s+/g," ").trim() : "";
}

function showHelpDialog() {
    const message =
`<u><b>Basic Editing</b></u>
Click any balance change to begin editing
• Enter  = Confirm change


<u><b>Adding & Removing Entries</b></u>
• Green/Red +/- Button – Add a new entry / Remove entry


<u><b>Toggle Balance Sections</b></u>
• Blue +/- Button – Toggle visibility of a balance section
<span style="color:#ff5555;">NOTE:</span> Hidden sections will not appear in Viewer Mode


<u><b>Entry Class Type</b></u>
Each entry needs a category:
• Other (GRAY)
• Buff (GREEN)
• Rework (GOLD)
• Nerf (RED)
• None (EMPTY)


<u><b>Category Shortcuts</b></u>
• Ctrl  + Up / Down   → Change class type
• Shift + Up / Down   → Move entry up/down in section

<u><b>New Cards Sections</b></u>
• Select a image from your computer to be displayed as a new card
• Recommended to be paired with custom cards created from either of the following sites:
<a href="https://undercard.feildmaster.com/">Undercards Template Editor - by feildmaster</a>
<a href="https://uc-editor.vercel.app/">Undercards Card Editor - by Sernon158</a>

<u><b>Custom Balance Sections</b></u>
• Green + Button – Add a new custom balance section
• Red - Button - Remove custom balance section (Double Click Required)
• Click a section name to select it
• Shift + Up / Down – Move selected section up/down


<u><b>Automatic Highlighting</b></u>
The following are highlighted automatically:
• Stats: ATK, HP, COST, DMG
• Numeric stats: 3/2, +1/+1, 1/1/1
• Rarities, resources, keywords, and tribes


<u><b>Manually Ignore Formatting</b></u>
Use backwards slash to skip automatic formatting for words:
Red \\Snail -- \\ATK 2 > 1.


<u><b>Manual Underlining</b></u>
Use underscores to force underline:
Magic: Equip _Example_.


<u><b>Manual Switch Highlighting</b></u>
Use double brackets for switch effects:
Switch: [[Example 1]] or [[Example 2]]


<u><b>Manual Card References</b></u>
Use curly braces to reference cards:
Magic: Cast {Example}.


<u><b>Viewer Mode vs Editor Mode</b></u>
Editor Mode:
• Editable, no formatting

Viewer Mode:
• Read-only
• Formatting applied
• Clean display


<u><b>Saving & Reset</b></u>
• Changes save automatically
• Double-click Reset Data to clear everything

Version: v${PATCH_MAKER_VERSION}
Developed by TheWiza2341`;

    const pageWindow = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
    const BootstrapDialogRef =
        window.BootstrapDialog ||
        pageWindow.BootstrapDialog ||
        (typeof BootstrapDialog !== 'undefined' ? BootstrapDialog : null);

    debugLog('Help button clicked.', {
        hasWindowBootstrapDialog: !!window.BootstrapDialog,
        hasUnsafeBootstrapDialog: !!(pageWindow && pageWindow.BootstrapDialog),
        hasResolvedBootstrapDialog: !!BootstrapDialogRef
    });

    if (BootstrapDialogRef && typeof BootstrapDialogRef.alert === "function") {
        BootstrapDialogRef.alert({
            title: "Custom Patch Maker – Help",
            message,
            closable: true
        });
        return;
    }

    // Fallback only if UC/BootstrapDialog is genuinely unavailable.
    alert(message.replace(/<[^>]+>/g, ""));
}

// ================================================================
// INPUT SHIELD — Blocks UC & Underscript hotkeys while editing
// ================================================================

function ucInputBlocker(e) {
    const ae = document.activeElement;
    const editing =
        ae &&
        (
            ae.classList.contains("uc-li-text") ||
            ae.classList.contains("uc-section-label") ||
            (ae.tagName === "H2" && ae.getAttribute("contenteditable") === "true")
        );

    if (!editing) return;

    const overlay=document.getElementById('uc-patch-overlay');
    if(overlay && overlay.classList.contains('viewer-mode')) return;

    // Patch Maker-owned shortcuts still need to work.
    if (
        (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) ||
        (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && (e.key === "ArrowUp" || e.key === "ArrowDown"))
    ) {
        return;
    }

    // Stop UC / UnderScript / third-party global hotkeys while editing.
    // For normal printable characters, do NOT preventDefault(), otherwise typing breaks.
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Block only keys where Patch Maker has custom behavior.
    if (["Escape", "Enter"].includes(e.key)) {
        e.preventDefault();

        if (e.key === "Enter") {
            ae.blur();
        }
    }
}

function enableUCInputBlocker() {
    window.addEventListener("keydown", ucInputBlocker, true);
    window.addEventListener("keyup", ucInputBlocker, true);

    document.addEventListener("keydown", ucInputBlocker, true);
    document.addEventListener("keyup", ucInputBlocker, true);

    if (document.body) {
        document.body.addEventListener("keydown", ucInputBlocker, true);
        document.body.addEventListener("keyup", ucInputBlocker, true);
    }
}

function disableUCInputBlocker() {
    window.removeEventListener("keydown", ucInputBlocker, true);
    window.removeEventListener("keyup", ucInputBlocker, true);

    document.removeEventListener("keydown", ucInputBlocker, true);
    document.removeEventListener("keyup", ucInputBlocker, true);

    if (document.body) {
        document.body.removeEventListener("keydown", ucInputBlocker, true);
        document.body.removeEventListener("keyup", ucInputBlocker, true);
    }
}

// ================================================================
//   makeEditable() — with save hook

function makeEditable(el, placeholder){
    el.setAttribute("contenteditable","true");
    el.spellcheck=false;

    el.addEventListener('focus',()=>{
        el.dataset.prevText = el.textContent.trim();
        enableUCInputBlocker();
    });

    el.addEventListener('blur',()=>{
        let t=sanitizeText(el.textContent);
        if(!t) t=placeholder;
        el.textContent=t;

        saveState();
        disableUCInputBlocker();
    });

    el.addEventListener('keydown',e=>{
        const overlay=document.getElementById('uc-patch-overlay');
        if(overlay && overlay.classList.contains('viewer-mode')) return;

        if(e.key==="Enter"){
            e.preventDefault();
            el.blur();
        }
        if(e.key==="Escape"){
            e.preventDefault();
            el.textContent=el.dataset.prevText;
            el.blur();
        }
    });

    el.addEventListener('paste',e=>{
        const overlay=document.getElementById('uc-patch-overlay');
        if(overlay && overlay.classList.contains('viewer-mode')){
            e.preventDefault();
            return;
        }
        e.preventDefault();
        const txt=(e.clipboardData||window.clipboardData).getData('text')||"";
        document.execCommand('insertText',false,sanitizeText(txt));
    });
}

// ================================================================
//   Auto-underline markers

function insertUnderlineMarkers(text){
    let result=text;
    UNDERLINE_TOKENS.forEach(token=>{
        const re=new RegExp(
            '(^|[^A-Za-z0-9])(' + escapeRegExp(token) + ')(?=([^A-Za-z0-9]|$))',
            'g'
        );
        result = result.replace(re, (m,pre,word)=>pre+UL_OPEN+word+UL_CLOSE);
    });
    return result;
}

// ================================================================
//  Keyword color replacement

function applyColorWords(seg){
    const allColors = Object.assign({}, WORD_COLORS, LOCALIZED_WORD_COLORS);

    const colorKeys = Object.keys(allColors)
        .filter(Boolean)
        .sort((a,b)=>b.length-a.length)
        .map(escapeRegExp);

    if (!colorKeys.length) return seg;

    const COLOR_WORD_REGEX = new RegExp(
        '(^|[^\\p{L}\\p{N}_])(' + colorKeys.join("|") + ')(?=([^\\p{L}\\p{N}_]|$))',
        "giu"
    );

    return seg.replace(COLOR_WORD_REGEX, (match, pre, word) => {
        const c =
            allColors[word] ||
            allColors[word.toUpperCase()] ||
            allColors[word.toLowerCase()];

        if (!c) return match;

        return `${pre}<span style="color:${c};">${word}</span>`;
    });
}

// ================================================================
//   Card formatting: {...} — suppress all formatting inside

function applyCardFormatting(seg){
    const cardColor = WORD_COLORS["PATIENCE"] || "#41fcff";

    return seg.replace(CARD_REF_REGEX,(match,inner)=>{
        let cleaned=inner
            .replace(new RegExp(UL_OPEN,"g"),"")
            .replace(new RegExp(UL_CLOSE,"g"),"")
            .replace(/<[^>]*>/g,"");

        cleaned = cleaned.trim();

        return `<span class="uc-card-ref" style="color:${cardColor};">${escapeHtml(cleaned)}</span>`;
    });
}

// ================================================================
//   Stat formatting — +1/+1 or 3/3/3

function applyCardHovers(root=document) {
    if (!areCardHoversEnabled()) return;

    const pageWindow = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
    const getCardWithNameRef = pageWindow.getCardWithName;
    const displayCardHelpRef = pageWindow.displayCardHelp;
    const removeCardHoverRef = pageWindow.removeCardHover;

    if (
        typeof displayCardHelpRef !== 'function' ||
        typeof removeCardHoverRef !== 'function'
    ) {
        debugWarn('Card hover functions unavailable.');
        return;
    }

    root.querySelectorAll('.uc-card-ref').forEach(el => {
        if (el.dataset.ucHoverBound === 'true') return;

        const name = sanitizeText(el.textContent);
        let cardId = null;

        if (typeof getCardWithNameRef === 'function') {
            try {
                const card = getCardWithNameRef(name);
                if (card && card.id) {
                    cardId = card.id;
                }
            } catch (e) {
                debugWarn('getCardWithName() failed.', { name, error: e });
            }
        }

        if (!cardId && localizedCardNameToId instanceof Map) {
            cardId = localizedCardNameToId.get(name.toLowerCase()) || null;
        }

        if (!cardId) {
            debugWarn('Card not found for hover.', { name });
            return;
        }

        el.dataset.ucHoverBound = 'true';
        el.dataset.ucCardId = String(cardId);
        el.style.cursor = 'pointer';

        el.addEventListener('mouseover', function () {
            displayCardHelpRef(this, cardId);
        });

        el.addEventListener('mouseleave', function () {
            removeCardHoverRef();
        });
    });
}

function applyStatFormatting(seg) {
    const statPattern = /(?<!\d)([+-]?)(\d+)\/([+-]?)(\d+)(?:\/([+-]?)(\d+))?(?=[^\d/]|$)/g;

    return seg.replace(statPattern, (match, sign1, a, sign2, b, sign3, c) => {
        if (c !== undefined) {
            return `${sign1}<span style="color:${WORD_COLORS.cost}">${a}</span>/` +
                   `${sign2}<span style="color:${WORD_COLORS.ATK}">${b}</span>/` +
                   `${sign3}<span style="color:${WORD_COLORS.HP}">${c}</span>`;
        } else {
            return `${sign1}<span style="color:${WORD_COLORS.ATK}">${a}</span>/` +
                   `${sign2}<span style="color:${WORD_COLORS.HP}">${b}</span>`;
        }
    });
}

// ================================================================
//   Switch formatting — highlight wrapper only

function formatSwitchInner(rawText){
    if(!rawText) return "";

    const parts=[];
    const re=/_(.+?)_/g;
    let last=0, m;

    while((m=re.exec(rawText))!==null){
        if(m.index>last) parts.push({text:rawText.slice(last,m.index), manual:false});
        parts.push({text:m[1], manual:true});
        last=m.index+m[0].length;
    }
    if(last<rawText.length) parts.push({text:rawText.slice(last), manual:false});

    return parts.map(part=>{
        let seg=part.text;

        if(part.manual){
            seg = escapeHtml(seg.trim());
            return `<span style="text-decoration:underline;">${seg}</span>`;
        }

        seg = insertUnderlineMarkers(seg);
        seg = escapeHtml(seg);
        seg = applyColorWords(seg);
        seg = applyCardFormatting(seg);
        seg = applyStatFormatting(seg);

        seg = seg
            .replace(new RegExp(UL_OPEN,"g"), `<span style="text-decoration:underline;">`)
            .replace(new RegExp(UL_CLOSE,"g"), `</span>`);

        return seg;
    }).join('');
}

// ================================================================
//   Skip formatting — \Word (hard override)

function extractSkipTokens(text){
    const skipped = [];
    const work = text.replace(/\\([A-Za-z0-9\-]+)/g, (m, word) => {
        const idx = skipped.length;
        skipped.push(word);
        return `UCSK${idx}Z`;
    });
    return { work, skipped };
}

// ================================================================
//   Main line formatter — placeholder-based switch handling

function formatLine(rawText){
    if(!rawText) return "";

    const skipData = extractSkipTokens(rawText);
    rawText = skipData.work;

    const switchBlocks = [];
    let work = rawText.replace(/\[\[([^\]]+)\]\]/g, (match, inner) => {
        const idx = switchBlocks.length;
        switchBlocks.push(inner);
        return `UCXSW${idx}Y`;
    });

    const parts=[];
    const re=/_(.+?)_/g;
    let last=0, m;

    while((m=re.exec(work))!==null){
        if(m.index>last) parts.push({text:work.slice(last,m.index), manual:false});
        parts.push({text:m[1], manual:true});
        last=m.index+m[0].length;
    }
    if(last<work.length) parts.push({text:work.slice(last), manual:false});

    let formatted = parts.map(part=>{
        let seg = part.text;

        if(part.manual){
            seg = escapeHtml(seg.trim());
            return `<span style="text-decoration:underline;">${seg}</span>`;
        }

        seg = insertUnderlineMarkers(seg);
        seg = escapeHtml(seg);
        seg = applyColorWords(seg);
        seg = applyCardFormatting(seg);
        seg = applyStatFormatting(seg);

        seg = seg
            .replace(new RegExp(UL_OPEN,"g"), `<span style="text-decoration:underline;">`)
            .replace(new RegExp(UL_CLOSE,"g"), `</span>`);

        return seg;
    }).join('');

    let switchIndex = 0;
    formatted = formatted.replace(/UCXSW(\d+)Y/g, (match, idxStr) => {
        const rawInner = switchBlocks[Number(idxStr)] || "";
        const innerHtml = formatSwitchInner(rawInner);

        const isLeft = (switchIndex % 2 === 0);
        const bgColor = isLeft
            ? "rgba(0, 255, 255, 0.4)"
            : "rgba(255, 0, 0, 0.4)";
        switchIndex++;

        return `<span style="background-color:${bgColor};">${innerHtml}</span>`;
    });

    formatted = formatted.replace(/UCSK(\d+)Z/g, (m, idx) => {
        return escapeHtml(skipData.skipped[Number(idx)] || "");
    });

    return formatted;
}

// ================================================================
// Viewer / Editor mode

function applyFormattingOverlay(overlay){
    overlay.querySelectorAll('li').forEach(li=>{
        const span=li.querySelector('.uc-li-text');
        if(!span) return;
        span.innerHTML = formatLine(li.dataset.raw);
    });

    applyCardHovers(overlay);
}

function clearFormattingOverlay(overlay){
    overlay.querySelectorAll('li').forEach(li=>{
        const span=li.querySelector('.uc-li-text');
        if(span) span.textContent = li.dataset.raw;
    });
}

// ================================================================
// Wait for DOM

let ucPatchWaitAttempts = 0;
function wait(){
    ucPatchWaitAttempts++;
    const mc=document.querySelector('.mainContent');

    if(!mc) {
        if (ucPatchWaitAttempts === 1 || ucPatchWaitAttempts % 20 === 0) {
            debugLog("Waiting for .mainContent...", {
                attempts: ucPatchWaitAttempts,
                readyState: document.readyState,
                bodyChildren: document.body ? document.body.children.length : null
            });
        }
        return setTimeout(wait,50);
    }

    debugLog("Found .mainContent. Calling init().", {
        attempts: ucPatchWaitAttempts,
        mainChildCount: mc.children.length,
        navbarsFound: mc.querySelectorAll('.navbar.navbar-default').length,
        footerFound: !!mc.querySelector('footer')
    });

    init(mc);
}
wait();

// ================================================================
// NEW CARDS SECTION

function createNewCardsSection(container) {
    const p=document.createElement('p');
    p.className='uc-new-cards-header';

    const label=document.createElement('span');
    label.textContent='New cards';
    p.appendChild(label);

    const section=document.createElement('div');
    section.className='uc-card-section';

    const gallery=document.createElement('div');
    gallery.className='uc-card-gallery';
    section.appendChild(gallery);

    const collapseBtn=document.createElement('button');
    collapseBtn.className='uc-collapse-btn';
    collapseBtn.textContent='−';
    collapseBtn.onclick=()=>{
        const overlay=document.getElementById('uc-patch-overlay');
        if(overlay && overlay.classList.contains('viewer-mode')) return;

        const currentlyCollapsed = (section.style.display === 'none');
        const newState = !currentlyCollapsed;
        section.style.display = newState ? 'none' : '';
        collapseBtn.textContent = newState ? '+' : '−';
        saveState();
    };
    p.appendChild(collapseBtn);

    container.appendChild(p);
    container.appendChild(section);

    ensureCardAddTile(section);

    return { p, section, gallery };
}

function ensureCardAddTile(section) {
    const gallery=section.querySelector('.uc-card-gallery');
    if(!gallery) return null;

    let addTile=gallery.querySelector(':scope > .uc-card-add-tile');
    if(addTile) {
        gallery.appendChild(addTile);
        return addTile;
    }

    const fileInput=document.createElement('input');
    fileInput.type='file';
    fileInput.accept='image/*';
    fileInput.multiple=true;
    fileInput.style.display='none';

    addTile=document.createElement('div');
    addTile.className='uc-card-add-tile';

    const addBtn=document.createElement('button');
    addBtn.className='uc-card-add-btn';
    addBtn.textContent='+';
    addBtn.title='Add card image';
    addBtn.onclick=()=>{
        const overlay=document.getElementById('uc-patch-overlay');
        if(overlay && overlay.classList.contains('viewer-mode')) return;
        fileInput.click();
    };

    fileInput.addEventListener('change', async e=>{
        const files=[...(e.target.files || [])];
        if(!files.length) return;

        for(const file of files){
            if(!file.type.startsWith('image/')) continue;
            const dataUrl=await readFileAsDataURL(file);
            const normalizedDataUrl=await normalizeCardImage(dataUrl);
            addCardImage(section, normalizedDataUrl, file.name || 'Card image');
        }

        fileInput.value='';
        ensureCardAddTile(section);
        saveState();
    });

    addTile.appendChild(addBtn);
    addTile.appendChild(fileInput);
    gallery.appendChild(addTile);
    return addTile;
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result);
        reader.onerror=()=>reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function loadImageFromDataURL(dataUrl) {
    return new Promise((resolve, reject)=>{
        const img=new Image();
        img.onload=()=>resolve(img);
        img.onerror=reject;
        img.src=dataUrl;
    });
}

async function normalizeCardImage(dataUrl) {
    const TARGET_W = 176;
    const TARGET_H = 246;
    const FIELDMARKER_WATERMARK_CROP_PX = 14;

    const img = await loadImageFromDataURL(dataUrl);

    if (img.naturalWidth === TARGET_W && img.naturalHeight === TARGET_H) {
        return dataUrl;
    }

    let sx = 0;
    let sy = 0;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;

    if (img.naturalWidth === 163 && img.naturalHeight >= 250) {
        sh = Math.max(1, img.naturalHeight - FIELDMARKER_WATERMARK_CROP_PX);
    }

    const canvas=document.createElement('canvas');
    canvas.width=TARGET_W;
    canvas.height=TARGET_H;

    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0,0,TARGET_W,TARGET_H);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);

    return canvas.toDataURL('image/png');
}

function addCardImage(section, src, name='Card image') {
    const gallery=section.querySelector('.uc-card-gallery');
    if(!gallery) return null;

    ensureCardAddTile(section);

    const item=document.createElement('div');
    item.className='uc-card-item';
    item.tabIndex=0;
    item.dataset.src=src;
    item.dataset.name=name;

    const frame=document.createElement('div');
    frame.className='uc-card-frame';

    const img=document.createElement('img');
    img.src=src;
    img.alt=name;

    frame.appendChild(img);
    item.appendChild(frame);

    const delBtn=document.createElement('button');
    delBtn.className='uc-card-del';
    delBtn.textContent='−';
    delBtn.title='Remove card image';
    delBtn.onclick=e=>{
        const overlay=document.getElementById('uc-patch-overlay');
        if(overlay && overlay.classList.contains('viewer-mode')) return;
        e.stopPropagation();
        item.remove();
        ensureCardAddTile(section);
        saveState();
    };
    item.appendChild(delBtn);

    item.addEventListener('keydown', e=>{
        const overlay=document.getElementById('uc-patch-overlay');
        if(overlay && overlay.classList.contains('viewer-mode')) return;

        const dir=getPatchArrowDirection(e);
        const isMove=e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && dir;
        if(!isMove) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        moveCardItem(item, dir);
    }, true);

    const addTile=gallery.querySelector(':scope > .uc-card-add-tile');
    if(addTile) gallery.insertBefore(item, addTile);
    else gallery.appendChild(item);

    ensureCardAddTile(section);
    return item;
}

function moveCardItem(item, dir) {
    const gallery=item.parentElement;
    if(!gallery) return;
    const items=[...gallery.querySelectorAll(':scope > .uc-card-item')];
    const idx=items.indexOf(item);
    if(idx < 0 || items.length <= 1) return;

    const newIdx=(idx+dir+items.length)%items.length;
    const target=items[newIdx];

    if(dir < 0) {
        if(idx === 0) gallery.appendChild(item);
        else gallery.insertBefore(item, target);
    } else {
        if(idx === items.length - 1) gallery.insertBefore(item, items[0]);
        else gallery.insertBefore(item, target.nextElementSibling);
    }

    ensureCardAddTile(gallery.parentElement);
    saveState();
    setTimeout(()=>item.focus(),0);
}

function collectNewCardsState(container) {
    const header=container.querySelector('p.uc-new-cards-header');
    const section=header ? header.nextElementSibling : null;
    if(!header || !section) return { collapsed:false, cards:[] };

    return {
        collapsed: section.style.display === 'none',
        cards: [...section.querySelectorAll('.uc-card-item')].map(item=>({
            src: item.dataset.src || '',
            name: item.dataset.name || 'Card image'
        })).filter(card=>card.src)
    };
}

function restoreNewCardsState(container, newCards) {
    const header=container.querySelector('p.uc-new-cards-header');
    const section=header ? header.nextElementSibling : null;
    if(!header || !section) return;

    const btn=header.querySelector('.uc-collapse-btn');
    section.style.display = newCards && newCards.collapsed ? 'none' : '';
    if(btn) btn.textContent = newCards && newCards.collapsed ? '+' : '−';

    const gallery=section.querySelector('.uc-card-gallery');
    if(gallery) gallery.innerHTML='';

    ensureCardAddTile(section);

    ((newCards && newCards.cards) || []).forEach(card=>{
        if(card && card.src) addCardImage(section, card.src, card.name || 'Card image');
    });

    ensureCardAddTile(section);
}

// ================================================================
// PATCH MAKER KEYBOARD SHORTCUTS

function getFocusedPatchElement() {
    const active = document.activeElement;
    if (!active) return null;

    if (active.classList.contains('uc-li-text')) {
        return { type: 'li', el: active, li: active.closest('li') };
    }

    if (active.classList.contains('uc-section-label')) {
        return { type: 'section', el: active, p: active.closest('p.uc-section-header') };
    }

    return null;
}

function getPatchArrowDirection(e) {
    const key = e.key || '';
    const code = e.code || '';
    const keyCode = e.keyCode || e.which || 0;

    if (key === 'ArrowUp' || key === 'Up' || code === 'ArrowUp' || keyCode === 38) return -1;
    if (key === 'ArrowDown' || key === 'Down' || code === 'ArrowDown' || keyCode === 40) return 1;
    return 0;
}

function isPatchShortcut(e) {
    if (!getPatchArrowDirection(e)) return false;
    if (e.altKey || e.metaKey) return false;
    return e.ctrlKey || e.shiftKey;
}

function handlePatchMakerShortcutEvent(e) {
    const overlay=document.getElementById('uc-patch-overlay');
    if(!overlay || overlay.classList.contains('viewer-mode')) return false;

    const focused = getFocusedPatchElement();
    if (!focused || !isPatchShortcut(e)) return false;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const dir = getPatchArrowDirection(e);

    debugLog('Patch Maker shortcut captured.', {
        key: e.key,
        code: e.code,
        keyCode: e.keyCode || e.which,
        dir,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        type: focused.type
    });

    if (focused.type === 'li' && focused.li) {
        if(e.ctrlKey && !e.shiftKey) cycleCategory(focused.li, dir);
        if(e.shiftKey && !e.ctrlKey) moveLi(focused.li, dir, true);

        return true;
    }

    if (focused.type === 'section' && focused.p) {
        if(e.shiftKey && !e.ctrlKey) moveSection(focused.p, dir);

        const label=focused.p.querySelector('.uc-section-label');
        if(label) setTimeout(()=>label.focus(), 0);

        return true;
    }

    return true;
}

function oldReliableLiShortcutHandler(e) {
    const overlay=document.getElementById('uc-patch-overlay');
    if(!overlay || overlay.classList.contains('viewer-mode')) return false;

    const active=document.activeElement;
    if(!active || !active.classList.contains('uc-li-text')) return false;

    const li=active.closest('li');
    if(!li) return false;

    const dir = getPatchArrowDirection(e);
    if(!dir) return false;

    const isCategoryShortcut = e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey;
    const isMoveShortcut = e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey;

    if(!isCategoryShortcut && !isMoveShortcut) return false;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    debugLog('Old reliable LI shortcut handler fired.', {
        key: e.key,
        code: e.code,
        keyCode: e.keyCode || e.which,
        dir,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        raw: li.dataset.raw,
        currentCategory: cycleOrder.find(c=>li.classList.contains(c)) || 'other'
    });

    if(isCategoryShortcut) cycleCategory(li, dir);
    if(isMoveShortcut) moveLi(li, dir, true);

    return true;
}

function sectionShortcutHandler(e) {
    const overlay=document.getElementById('uc-patch-overlay');
    if(!overlay || overlay.classList.contains('viewer-mode')) return false;

    const active=document.activeElement;
    if(!active || !active.classList.contains('uc-section-label')) return false;

    const p=active.closest('p.uc-section-header');
    if(!p) return false;

    const dir = getPatchArrowDirection(e);
    if(!dir) return false;

    const isMoveShortcut = e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey;
    if(!isMoveShortcut) return false;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    debugLog('Section shortcut handler fired.', {
        key: e.key,
        code: e.code,
        keyCode: e.keyCode || e.which,
        dir,
        label: active.textContent.trim()
    });

    moveSection(p, dir);
    const label=p.querySelector('.uc-section-label');
    if(label) setTimeout(()=>label.focus(), 0);

    return true;
}

function normalizeShortcutFocus(el) {
    // Helps avoid contenteditable caret/selection weirdness after repeated ArrowUp/ArrowDown shortcuts.
    if(!el || typeof el.focus !== 'function') return;
    setTimeout(()=>{
        try {
            el.focus();
            const sel = window.getSelection && window.getSelection();
            if(sel && el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
                const range=document.createRange();
                range.selectNodeContents(el);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        } catch(e) {}
    },0);
}

function installPatchShortcutHandlers() {
    document.addEventListener('keydown', e => {
        const overlay=document.getElementById('uc-patch-overlay');
        if(!overlay || overlay.classList.contains('viewer-mode')) return;

        const active=document.activeElement;
        if(!active) return;

        const dir = getPatchArrowDirection(e);
        if(!dir) return;

        const isCategoryShortcut = e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey;
        const isMoveShortcut = e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey;
        if(!isCategoryShortcut && !isMoveShortcut) return;

        // LI shortcuts: Ctrl+Arrow changes class, Shift+Arrow moves entry.
        if(active.classList.contains('uc-li-text')) {
            const li=active.closest('li');
            if(!li) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            debugLog('Single shortcut handler fired for LI.', {
                key: e.key,
                code: e.code,
                keyCode: e.keyCode || e.which,
                dir,
                ctrlKey: e.ctrlKey,
                shiftKey: e.shiftKey,
                raw: li.dataset.raw,
                currentCategory: cycleOrder.find(c=>li.classList.contains(c)) || 'other'
            });

            if(isCategoryShortcut) cycleCategory(li, dir);
            if(isMoveShortcut) moveLi(li, dir, true);
            normalizeShortcutFocus(active);
            return;
        }

        // Section shortcuts: Shift+Arrow moves focused section.
        if(active.classList.contains('uc-section-label') && isMoveShortcut) {
            const p=active.closest('p.uc-section-header');
            if(!p) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            debugLog('Single shortcut handler fired for section.', {
                key: e.key,
                code: e.code,
                keyCode: e.keyCode || e.which,
                dir,
                label: active.textContent.trim()
            });

            moveSection(p, dir);
            const label=p.querySelector('.uc-section-label');
            if(label) normalizeShortcutFocus(label);
        }
    }, true);

    debugLog('Patch Maker single document keydown shortcut handler installed.');
}

// ================================================================
// SECTION CREATION / EDITING / REORDERING

function getSectionPairs(container) {
    const pairs = [];
    container.querySelectorAll('p.uc-section-header').forEach(p => {
        const ul = p.nextElementSibling;
        if (ul && ul.tagName === 'UL') pairs.push({ p, ul });
    });
    return pairs;
}

function appendSection(container, labelText, isCustom = false, focusName = false, beforeNode = null) {
    const p=document.createElement('p');
    p.className = 'uc-section-header';
    p.dataset.custom = isCustom ? 'true' : 'false';

    const label=document.createElement('span');
    label.className = 'uc-section-label';
    label.textContent = labelText || '[New Balance Section]';
    label.setAttribute('contenteditable', isCustom ? 'true' : 'false');
    label.setAttribute('tabindex', '0');
    label.spellcheck = false;

    label.addEventListener('focus', () => {
        label.dataset.prevText = label.textContent.trim();
        enableUCInputBlocker();
    });

    label.addEventListener('blur', () => {
        if (!isCustom) return;
        let t = sanitizeText(label.textContent);
        if (!t) t = '[New Balance Section]';
        label.textContent = t;
        saveState();
        disableUCInputBlocker();
    });

    label.addEventListener('keydown', e => {
        if (handlePatchMakerShortcutEvent(e)) return;

        if (!isCustom) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            label.blur();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            label.textContent = label.dataset.prevText || '[New Balance Section]';
            label.blur();
        }
    }, true);

    p.appendChild(label);

    const ul=document.createElement('ul');
    ul.appendChild(createNewLI());

    const collapseBtn=document.createElement('button');
    collapseBtn.className='uc-collapse-btn';
    collapseBtn.textContent='−';
    collapseBtn.onclick=()=>{
        const overlay=document.getElementById('uc-patch-overlay');
        if(overlay && overlay.classList.contains('viewer-mode')) return;

        const currentlyCollapsed = (ul.style.display === 'none');
        const newState = !currentlyCollapsed;
        ul.style.display = newState ? 'none' : '';
        collapseBtn.textContent = newState ? '+' : '−';
        saveState();
    };
    p.appendChild(collapseBtn);

    if (isCustom) {
        const delBtn=document.createElement('button');
        delBtn.className='uc-section-del';
        delBtn.textContent='−';
        delBtn.title='Double-click to delete custom section';
        delBtn.onclick=(e)=>{
            const overlay=document.getElementById('uc-patch-overlay');
            if(overlay && overlay.classList.contains('viewer-mode')) return;

            if(e.detail !== 2) return;

            ul.remove();
            p.remove();
            saveState();
        };
        p.appendChild(delBtn);
    }

    if (beforeNode) {
        container.insertBefore(p, beforeNode);
        container.insertBefore(ul, beforeNode);
    } else {
        container.appendChild(p);
        container.appendChild(ul);
    }

    updateDeleteState(ul);

    if (focusName) setTimeout(()=>label.focus(), 0);

    return { p, ul };
}

function handleSectionShortcutEvent(e, p) {
    const overlay=document.getElementById('uc-patch-overlay');
    if(overlay && overlay.classList.contains('viewer-mode')) return false;

    if (!e.shiftKey || e.ctrlKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return false;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    moveSection(p, e.key === 'ArrowUp' ? -1 : 1);

    const label=p.querySelector('.uc-section-label');
    if(label) setTimeout(()=>label.focus(), 0);

    return true;
}

function moveSection(p, dir) {
    const overlay=document.getElementById('uc-patch-overlay');
    if(overlay && overlay.classList.contains('viewer-mode')) return;

    const container=p.parentElement;
    const ul=p.nextElementSibling;
    if(!container || !ul || ul.tagName !== 'UL') return;

    const pairs=getSectionPairs(container);
    const idx=pairs.findIndex(pair=>pair.p===p);
    if(idx < 0 || pairs.length <= 1) return;

    const newIdx=(idx+dir+pairs.length)%pairs.length;
    if(newIdx === idx) return;

    const target=pairs[newIdx];

    if(dir < 0) {
        // Moving above the previous section. If idx is 0, wrapping above means moving after the final section.
        if(idx === 0) {
            const addSectionRow = container.querySelector('.uc-add-section-row');
            container.insertBefore(p, addSectionRow || null);
            container.insertBefore(ul, addSectionRow || null);
        } else {
            container.insertBefore(p, target.p);
            container.insertBefore(ul, target.p);
        }
    } else {
        // Moving below the next section. If idx is last, wrapping down means moving before the first section.
        if(idx === pairs.length - 1) {
            container.insertBefore(ul, pairs[0].p);
            container.insertBefore(p, ul);
        } else {
            const afterTarget = target.ul.nextElementSibling;
            container.insertBefore(p, afterTarget);
            container.insertBefore(ul, afterTarget);
        }
    }

    saveState();
}

// ================================================================
// THE MAIN INITIALIZER

function init(main){
    debugLog("init() entered.", {
        mainExists: !!main,
        mainChildren: main ? main.children.length : null,
        existingOverlay: !!document.getElementById('uc-patch-overlay')
    });

    pluginLog("[UC Patch Maker UnderScript Plugin v0.0.1] Init...");

    if (document.getElementById('uc-patch-overlay')) {
        ucPatchLogger.warn("[UC Patch Maker] Overlay already exists; aborting duplicate init.");
        debugWarn("init() aborted because #uc-patch-overlay already exists.");
        return;
    }

    const navbars=main.querySelectorAll('.navbar.navbar-default');
    const headerNav=navbars[0];
    const footer=main.querySelector('footer');

    debugLog("init() queried page anchors.", {
        navbarCount: navbars.length,
        hasHeaderNav: !!headerNav,
        hasFooter: !!footer
    });

    if (!headerNav) {
        console.error("[UC Patch Maker] Could not find header navbar.");
        debugError("init() aborted: header navbar missing.", {
            mainHTMLPreview: main ? main.innerHTML.slice(0, 500) : null
        });
        return;
    }

    const between=[];
    let ptr=headerNav.nextElementSibling;
    while(ptr && ptr!==footer){
        between.push(ptr);
        ptr = ptr.nextElementSibling;
    }

    debugLog("Collected original patch note DOM nodes between navbar and footer.", {
        count: between.length,
        tags: between.slice(0, 20).map(el => el.tagName)
    });

    let h3=null, hr1=null, h2=null, hr2=null;
    for(const el of between){
        if(!h3&&el.tagName==="H3"){h3=el.cloneNode(true); continue;}
        if(!hr1&&el.tagName==="HR"){hr1=el.cloneNode(true); continue;}
        if(!h2&&el.tagName==="H2"){h2=el.cloneNode(true); continue;}
        if(!hr2&&el.tagName==="HR"){hr2=el.cloneNode(true); continue;}
    }

    debugLog("Cloned header pieces.", {
        hasH3: !!h3,
        hasHr1: !!hr1,
        hasH2: !!h2,
        hasHr2: !!hr2,
        h2Text: h2 ? h2.textContent.trim() : null
    });

    const endBRs=[];
    for(let i=between.length-1; i>=0; i--){
        if(between[i].tagName==="BR") endBRs.push(between[i].cloneNode(true));
        else break;
    }
    endBRs.reverse();

    const overlay=document.createElement('div');
    overlay.id="uc-patch-overlay";
    overlay.style.display="none";
    overlay.classList.add("editor-mode");

    const container=document.createElement('div');

    if(h3) container.appendChild(h3);
    if(hr1) container.appendChild(hr1);
    if(h2) container.appendChild(h2);
    if(hr2) container.appendChild(hr2);

    const newCardsSec = createNewCardsSection(container);
    newCardsSec.section.style.display = "none";
    const newCardsBtn = newCardsSec.p.querySelector('.uc-collapse-btn');
    if(newCardsBtn) newCardsBtn.textContent = "+";

    const sections=[
        "Balancing (Monsters)",
        "Balancing (Spells)",
        "Balancing (Artifacts)",
        "Balancing (Board Slots)",
        "Balancing (Souls)",
        "Balancing (Other)"
    ];

    const defaultOpenSections = new Set([
        "Balancing (Monsters)",
        "Balancing (Spells)",
        "Balancing (Artifacts)"
    ]);

    sections.forEach(label=>{
        const sec = appendSection(container, label, false, false);

        if(!defaultOpenSections.has(label)) {
            const btn = sec.p.querySelector('.uc-collapse-btn');
            sec.ul.style.display = "none";
            if(btn) btn.textContent = "+";
        }
    });

    const addSectionRow = document.createElement('div');
    addSectionRow.className = 'uc-add-section-row';

    const addSectionBtn = document.createElement('button');
    addSectionBtn.className = 'uc-add-section-btn';
    addSectionBtn.textContent = '+';
    addSectionBtn.onclick = () => {
        if(overlay.classList.contains('viewer-mode')) return;

        const sec = appendSection(container, '[New Balance Section]', true, true, addSectionRow);
        const label = sec.p.querySelector('.uc-section-label');
        saveState();
        if(label) setTimeout(()=>label.focus(), 0);
    };

    addSectionRow.appendChild(addSectionBtn);
    container.appendChild(addSectionRow);

    endBRs.forEach(br=>container.appendChild(br));
    overlay.appendChild(container);
    headerNav.insertAdjacentElement('afterend',overlay);
    debugLog("Overlay inserted after header navbar.", {
        overlayInDOM: !!document.getElementById('uc-patch-overlay'),
        sectionCount: container.querySelectorAll('p').length,
        liCount: container.querySelectorAll('li').length
    });

    // Section controls are created by appendSection().

    const overlayH2 = container.querySelector('h2');
    if(overlayH2) makeEditable(overlayH2,"[Untitled Patch]");

    container.querySelectorAll('ul > li').forEach(li=>{
        ensureLiTextSpan(li);
        setupLiTextEditing(li);
        setupReordering(li);
    });

    container.querySelectorAll('ul').forEach(ul=>updateDeleteState(ul));

    const toggle=document.createElement('button');
    toggle.textContent="Show Custom Patch Notes";
    Object.assign(toggle.style,{
        position:"fixed",
        left:"10px",
        bottom:"10px",
        padding:"8px 12px",
        background:"#333",
        color:"white",
        border:"none",
        borderRadius:"6px",
        cursor:"pointer",
        zIndex:"99999"
    });
    document.body.appendChild(toggle);
    debugLog("Main toggle button appended.");

    const modeToggle=document.createElement('button');
    modeToggle.textContent="Switch to Viewer Mode";
    Object.assign(modeToggle.style,{
        position:"fixed",
        left:"10px",
        bottom:"50px",
        padding:"8px 12px",
        background:"#333",
        color:"white",
        border:"none",
        borderRadius:"6px",
        cursor:"pointer",
        zIndex:"99999",
        fontSize:"14px"
    });
    modeToggle.style.display="none";
    document.body.appendChild(modeToggle);
    debugLog("Mode toggle button appended.");

    const resetBtn=document.createElement('button');
    resetBtn.textContent="Reset Data";
    Object.assign(resetBtn.style,{
        position:"fixed",
        left:"10px",
        bottom:"90px",
        padding:"8px 12px",
        background:"#aa3333",
        color:"white",
        border:"none",
        borderRadius:"6px",
        cursor:"pointer",
        zIndex:"99999",
        fontSize:"14px"
    });
    resetBtn.style.display="none";
    document.body.appendChild(resetBtn);
    debugLog("Reset button appended.");

    const helpBtn = document.createElement('button');
    helpBtn.textContent = "Help";
    Object.assign(helpBtn.style, {
        position: "fixed",
        left: "130px",
        bottom: "90px",
        padding: "8px 12px",
        background: "#3366cc",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        zIndex: "99999",
        fontSize: "14px"
    });

    helpBtn.style.display = "none";
    document.body.appendChild(helpBtn);
    debugLog("Help button appended.");

    ucPatchControlButtons = [toggle, modeToggle, resetBtn, helpBtn];
    applyPatchControlVisibility();

    let custom=false;
    let isViewerMode=false;

    toggle.onclick=()=>{
        custom=!custom;
        if(custom){
            overlay.style.display="";
            between.forEach(n=>n.style.display="none");
            toggle.textContent="Show Original Patch Notes";
            modeToggle.style.display="inline-block";
            resetBtn.style.display="inline-block";
            helpBtn.style.display="inline-block";
        } else {
            overlay.style.display="none";
            between.forEach(n=>n.style.display="");
            toggle.textContent="Show Custom Patch Notes";
            modeToggle.style.display="none";
            resetBtn.style.display="none";
            helpBtn.style.display="none";

            if(isViewerMode){
                isViewerMode=false;
                overlay.classList.remove('viewer-mode');
                overlay.classList.add('editor-mode');
                modeToggle.textContent="Switch to Viewer Mode";
                clearFormattingOverlay(overlay);
                setEditingEnabled(overlay,true);
            }
        }
    };

    if (shouldOpenPatchNotesOnPageLoad()) {
        setTimeout(() => {
            if (!custom) {
                toggle.click();
            }
        }, 0);
    }

    modeToggle.onclick=()=>{
        if(!custom) return;

        isViewerMode=!isViewerMode;

        if(isViewerMode){
            overlay.classList.remove('editor-mode');
            overlay.classList.add('viewer-mode');
            modeToggle.textContent="Switch to Editor Mode";

            container.querySelectorAll('p').forEach(p=>{
                const ul=p.nextElementSibling;
                if(ul && ul.style.display==="none") p.style.display="none";
            });

            setEditingEnabled(overlay,false);
            applyFormattingOverlay(overlay);

        } else {
            overlay.classList.remove('viewer-mode');
            overlay.classList.add('editor-mode');
            modeToggle.textContent="Switch to Viewer Mode";

            container.querySelectorAll('p').forEach(p=>p.style.display="");

            clearFormattingOverlay(overlay);
            setEditingEnabled(overlay,true);
        }
    };

    resetBtn.onclick = (e) => {
        if (!custom) return;

        if (e.detail === 2) {
            resetState();
            location.reload();
        }
    };

    helpBtn.onclick = showHelpDialog;

    installPatchShortcutHandlers();

    rebuildLocalizedPatchMakerData();

    debugLog("About to call loadState().");
    loadState();

    debugLog("init() completed successfully.", {
        overlayExists: !!document.getElementById('uc-patch-overlay'),
        toggleText: toggle.textContent,
        modeToggleDisplay: modeToggle.style.display,
        resetDisplay: resetBtn.style.display,
        helpDisplay: helpBtn.style.display
    });

    pluginLog("[UC Patch Maker UnderScript Plugin v0.0.1] Fully loaded.");
}

// ================================================================
// CATEGORY CYCLING

function cycleCategory(li,dir){
    const idx=cycleOrder.findIndex(c=>li.classList.contains(c));
    const safeIdx = idx === -1 ? 0 : idx;
    const newIdx=(safeIdx+dir+cycleOrder.length)%cycleOrder.length;
    li.classList.remove(...cycleOrder);
    li.classList.add(cycleOrder[newIdx]);
    saveState();
}

// ================================================================
// REORDERING

function setupReordering(li){}
function moveLi(li,dir,wrap=false){
    const ul=li.parentElement;
    const items=[...ul.children];
    const idx=items.indexOf(li);
    const newIdx=idx+dir;

    if(newIdx<0 || newIdx>=items.length) {
        if(!wrap || items.length <= 1) return;

        if(dir < 0) {
            ul.appendChild(li);
        } else {
            ul.insertBefore(li, items[0]);
        }

        saveState();

        const span=li.querySelector('.uc-li-text');
        if(span) setTimeout(()=>span.focus(),0);
        return;
    }

    if(dir<0) ul.insertBefore(li,items[newIdx]);
    else ul.insertBefore(li,items[newIdx].nextSibling);

    saveState();

    const span=li.querySelector('.uc-li-text');
    if(span) setTimeout(()=>span.focus(),0);
}

// ================================================================
// INLINE EDITING (with save on blur)

function ensureLiTextSpan(li){
    let span=li.querySelector('.uc-li-text');
    if(!span){
        span=document.createElement('span');
        span.className="uc-li-text";

        const mv=[];
        for(const child of [...li.childNodes]){
            if(child.nodeType===1 &&
               (child.classList.contains('uc-li-add') ||
                child.classList.contains('uc-li-del')))
                break;
            mv.push(child);
        }
        mv.forEach(n=>span.appendChild(n));
        li.insertBefore(span,li.firstChild);
    }

    if(!li.dataset.raw) li.dataset.raw = span.textContent || "[New entry]";
    span.textContent = li.dataset.raw;
}

function setupLiTextEditing(li){
    const span=li.querySelector('.uc-li-text');
    if(!span) return;

    span.setAttribute("contenteditable","true");
    span.spellcheck=false;

    span.addEventListener('focus',()=>{
        span.dataset.prevText = span.textContent.trim();
        enableUCInputBlocker();
    });

    span.addEventListener('blur',()=>{
        let t=sanitizeText(span.textContent);
        if(!t) t="[New entry]";
        span.textContent=t;
        li.dataset.raw=t;

        saveState();
        disableUCInputBlocker();
    });

    span.addEventListener('keydown',e=>{
        if (handlePatchMakerShortcutEvent(e)) return;

        const overlay=document.getElementById('uc-patch-overlay');
        if(overlay && overlay.classList.contains('viewer-mode')) return;

        if(e.key==="Enter"){
            e.preventDefault();
            span.blur();
        }
        if(e.key==="Escape"){
            e.preventDefault();
            span.textContent=span.dataset.prevText;
            li.dataset.raw=span.dataset.prevText;
            span.blur();
        }
    }, true);

    span.addEventListener('paste',e=>{
        const overlay=document.getElementById('uc-patch-overlay');
        if(overlay && overlay.classList.contains('viewer-mode')){
            e.preventDefault();
            return;
        }
        e.preventDefault();
        const txt=(e.clipboardData||window.clipboardData).getData('text')||"";
        document.execCommand('insertText',false,sanitizeText(txt));
    });
}

// ================================================================
// EDIT ENABLE/DISABLE

function setEditingEnabled(overlay,enabled){
    const h2=overlay.querySelector('h2');
    if(h2) h2.setAttribute("contenteditable", enabled ? "true" : "false");

    overlay.querySelectorAll('.uc-li-text').forEach(span=>{
        span.setAttribute("contenteditable", enabled ? "true" : "false");
    });

    overlay.querySelectorAll('p.uc-section-header[data-custom="true"] .uc-section-label').forEach(label=>{
        label.setAttribute("contenteditable", enabled ? "true" : "false");
    });
}

// ================================================================
// NEW LI CREATION (with SAVE hooks on add/delete)

function createNewLI(){
    const li=document.createElement('li');
    li.classList.add("other");
    li.dataset.raw="[New entry]";

    const span=document.createElement('span');
    span.className="uc-li-text";
    span.textContent=li.dataset.raw;
    li.appendChild(span);

    const addBtn=document.createElement('button');
    addBtn.className="uc-li-add";
    addBtn.textContent="+";

    const delBtn=document.createElement('button');
    delBtn.className="uc-li-del";
    delBtn.textContent="−";

    li.appendChild(addBtn);
    li.appendChild(delBtn);

    setupLiTextEditing(li);
    setupReordering(li);

    addBtn.onclick=e=>{
        const overlay=document.getElementById('uc-patch-overlay');
        if(overlay && overlay.classList.contains('viewer-mode')) return;

        e.stopPropagation();

        const ul=li.parentElement;
        const newLi=createNewLI();
        ul.insertBefore(newLi,li.nextSibling);
        updateDeleteState(ul);

        saveState();
    };

    delBtn.onclick=e=>{
        const overlay=document.getElementById('uc-patch-overlay');
        if(overlay && overlay.classList.contains('viewer-mode')) return;

        e.stopPropagation();

        const ul=li.parentElement;
        if(ul.children.length <= 1) return;

        li.remove();
        updateDeleteState(ul);

        saveState();
    };

    return li;
}

// ================================================================
// DELETE BUTTON ENABLE/DISABLE

function updateDeleteState(ul){
    const lis=ul.querySelectorAll(':scope > li');
    const disable = lis.length <= 1;
    lis.forEach(li=>{
        const btn=li.querySelector('.uc-li-del');
        if(btn) btn.disabled = disable;
    });
}

//================================================================
// SAVE / LOAD / RESET SYSTEM

function collectState() {
    const overlay=document.getElementById('uc-patch-overlay');
    if(!overlay) return null;

    const container=overlay.querySelector('div');
    if(!container) return null;

    const state={
        title:"",
        newCards: collectNewCardsState(container),
        sections:[]
    };

    const h2=container.querySelector('h2');
    if(h2) state.title = h2.textContent.trim();

    const pList=[...container.querySelectorAll('p.uc-section-header')];

    pList.forEach(p=>{
        const labelEl = p.querySelector('.uc-section-label');
        const label = labelEl ? labelEl.textContent.trim() : p.textContent.trim();
        const ul=p.nextElementSibling;
        if(!ul) return;

        const collapsed = (ul.style.display === "none");

        const items=[...ul.querySelectorAll(':scope > li')].map(li=>({
            raw: li.dataset.raw || "",
            category: cycleOrder.find(c=>li.classList.contains(c)) || "other"
        }));

        state.sections.push({
            label,
            custom: p.dataset.custom === 'true',
            collapsed,
            items
        });
    });

    return state;
}

function saveState(){
    try{
        debugLog("saveState() entered.");
        const state=collectState();
        if(state){
            const json = JSON.stringify(state);
            GM_setValue(STATE_KEY, json);
            debugLog("saveState() wrote state.", {
                sectionCount: state.sections.length,
                byteLength: json.length
            });
        } else {
            debugWarn("saveState() skipped because collectState() returned null.");
        }
    } catch(e){
        console.error("[UC SAVE ERROR]", e);
        debugError("saveState() threw.", e);
    }
}

function loadState() {
    debugLog("loadState() entered.", {
        hasGMGetValue: typeof GM_getValue === "function",
        stateKey: STATE_KEY
    });

    let text = GM_getValue(STATE_KEY, "");
    debugLog("loadState() read raw storage.", {
        hasText: !!text,
        length: text ? text.length : 0
    });

    if(!text) return;

    let saved=null;
    try { saved = JSON.parse(text); }
    catch(e){
        console.error("[UC LOAD ERROR] Invalid JSON:", e);
        debugError("loadState() failed to parse saved JSON.", e);
        return;
    }
    if(!saved || !saved.sections) {
        debugWarn("loadState() parsed JSON but saved.sections was missing.", saved);
        return;
    }

    debugLog("loadState() parsed saved state.", {
        title: saved.title,
        sectionCount: saved.sections.length
    });

    const overlay=document.getElementById('uc-patch-overlay');
    if(!overlay) {
        debugError("loadState() aborted: overlay missing.");
        return;
    }
    const container=overlay.querySelector('div');
    if(!container) {
        debugError("loadState() aborted: overlay container missing.");
        return;
    }

    const h2=container.querySelector('h2');
    if(h2 && saved.title) h2.textContent = saved.title;

    restoreNewCardsState(container, saved.newCards);

    const addSectionRow = container.querySelector('.uc-add-section-row');

    // Rebuild all sections from saved data so custom sections/order persist cleanly.
    getSectionPairs(container).forEach(pair => {
        pair.ul.remove();
        pair.p.remove();
    });

    saved.sections.forEach((sec,i)=>{
        debugLog("loadState() restoring section.", {
            index: i,
            label: sec.label,
            custom: !!sec.custom,
            collapsed: sec.collapsed,
            itemCount: sec.items ? sec.items.length : null
        });

        const pair = appendSection(container, sec.label || '[New Balance Section]', !!sec.custom, false, addSectionRow);
        const p = pair.p;
        const ul = pair.ul;
        const btn=p.querySelector('.uc-collapse-btn');

        ul.style.display = sec.collapsed ? "none" : "";
        if(btn) btn.textContent = sec.collapsed ? "+" : "−";

        ul.innerHTML = "";
        (sec.items || [{ raw: '[New entry]', category: 'other' }]).forEach(item=>{
            const li=createNewLI();
            li.dataset.raw=item.raw;

            li.classList.remove(...cycleOrder);
            li.classList.add(item.category || "other");

            const span=li.querySelector('.uc-li-text');
            if(span) span.textContent = item.raw;

            ul.appendChild(li);
        });

        updateDeleteState(ul);
    });
}

function resetState(){
    debugWarn("resetState() deleting saved state.", { stateKey: STATE_KEY });
    GM_deleteValue(STATE_KEY);
}

} // end startPatchMaker()

})();
