// ==UserScript==
// @name         UC Patch Maker (BETA)
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @author       TheWiza2341
// @description  Ever wanted to make custom Undercards fanpatches? Now you can! Featuring save/load functionality, keyword/card implementations, and more! check out the UCO thread for more information!
// @match        https://undercards.net/*gameUpdates*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=undercards.net
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// ==/UserScript==

(function () {
'use strict';

// ================================================================
// GLOBAL STYLE — prevent horizontal scroll, match Undercards UI

const style = document.createElement('style');
style.textContent = `

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
    outline-offset: 3px;   /* pushes outline outward so class-color strip stays visible */
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
#uc-patch-overlay.viewer-mode .uc-collapse-btn {
    display: none !important;
}
#uc-patch-overlay.viewer-mode p,
#uc-patch-overlay.viewer-mode li {
    background-color: transparent !important;
}

`;
document.head.appendChild(style);

// ================================================================
// CONSTANTS

const STATE_KEY = "uc_patch_state_v0192";

// ================================================================
// COLOR WORDS (exact, case-sensitive)

const cycleOrder=[
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
    "G":"gold"
};

// ================================================================
// UNDERLINE WORDS — keywords + tribes

const KEYWORDS = [
  "Determination","Charge","Haste","Armor","Disarmed","Candy","Support",
  "Transparency","Invulnerable","Taunt","Dodge","Shock","Loop","Bullseye",
  "Wanted","Darkspawn","Magic","Dust","Turn start","Turn end","Fatigue",
  "Turbo","Paralyze","Silence","Synergy","Delay","Generated","Need",
  "Program","Erase","Switch","Catch"
];

const TRIBES = [
  "Tem","Dog","Amalgamate","G Follower","Lost Soul","Frog","Mold","Snail",
  "Bomb","Plant","Royal Guard","All monster tribes","Chaos Weapon","Piece",
  "Arachnid","Royal Invention","Plug","Thrashing Part","Bargain","Dance",
  "Giga Attack","Round","Pack",

  "Tems","Dogs","Amalgamates","G Followers","Lost Souls","Frogs","Molds",
  "Snails","Bombs","Plants","Royal Guards","Chaos Weapons","Pieces",
  "Arachnids","Royal Inventions","Plugs","Thrashing Parts","Bargains",
  "Dances","Giga Attacks","Rounds","Packs"
];

const UNDERLINE_TOKENS = KEYWORDS.concat(TRIBES);
UNDERLINE_TOKENS.sort((a,b)=>b.length-a.length);

const CARD_REF_REGEX = /\{([^{}]+?)\}/g;
const UL_OPEN="__UC_UL_OPEN__";
const UL_CLOSE="__UC_UL_CLOSE__";

// ================================================================
// Helper functions

// Went back to debug some stuff wtf is this regex code even
// My ass is NOT getting hired anytime soon for this shit

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

// ================================================================
// INPUT SHIELD — Blocks UC & Underscript hotkeys while editing
// ================================================================

function ucInputBlocker(e) {
    const ae = document.activeElement;
    const editing =
        ae &&
        (
            ae.classList.contains("uc-li-text") ||
            (ae.tagName === "H2" && ae.getAttribute("contenteditable") === "true")
        );

    if (!editing) return;

    // Block only harmful global keys
    if (["Escape", "Enter", "+", "="].includes(e.key)) {
        e.stopImmediatePropagation();
        e.preventDefault();

        // Custom behavior: Enter ALWAYS blurs the active editor
        if (e.key === "Enter") {
            ae.blur();
        }
    }
}

function enableUCInputBlocker() {
    // Block BEFORE site scripts
    window.addEventListener("keydown", ucInputBlocker, true);
    window.addEventListener("keyup", ucInputBlocker, true);

    document.addEventListener("keydown", ucInputBlocker, true);
    document.addEventListener("keyup", ucInputBlocker, true);

    // UC uses body-level handlers as well
    document.body.addEventListener("keydown", ucInputBlocker, true);
    document.body.addEventListener("keyup", ucInputBlocker, true);
}

function disableUCInputBlocker() {
    window.removeEventListener("keydown", ucInputBlocker, true);
    window.removeEventListener("keyup", ucInputBlocker, true);

    document.removeEventListener("keydown", ucInputBlocker, true);
    document.removeEventListener("keyup", ucInputBlocker, true);

    document.body.removeEventListener("keydown", ucInputBlocker, true);
    document.body.removeEventListener("keyup", ucInputBlocker, true);
}

// ================================================================
//   makeEditable() — FIXED & RESTORED (with save hook)

function makeEditable(el, placeholder){
    el.setAttribute("contenteditable","true");
    el.spellcheck=false;

    el.addEventListener('focus',()=>{
        el.dataset.prevText = el.textContent.trim();
        enableUCInputBlocker(); // Enabled Input Shield
    });

    el.addEventListener('blur',()=>{
        let t=sanitizeText(el.textContent);
        if(!t) t=placeholder;
        el.textContent=t;

        saveState();
        disableUCInputBlocker(); // Disable Input Shield
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
    const COLOR_WORD_REGEX = new RegExp(
        "\\b(" + Object.keys(WORD_COLORS).map(escapeRegExp).join("|") + ")\\b","g"
    );

    return seg.replace(COLOR_WORD_REGEX,match=>{
        const c=WORD_COLORS[match];
        return `<span style="color:${c};">${match}</span>`;
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

        return `<span style="color:${cardColor};">${cleaned}</span>`;
    });
}

// ================================================================
//   Stat formatting — +1/+1 or 3/3/3

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
//   Main line formatter — placeholder-based switch handling

function formatLine(rawText){
    if(!rawText) return "";

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
}

function clearFormattingOverlay(overlay){
    overlay.querySelectorAll('li').forEach(li=>{
        const span=li.querySelector('.uc-li-text');
        if(span) span.textContent = li.dataset.raw;
    });
}

// ================================================================
// Wait for DOM

//She waiting on my DOM until I fully compile
//no no uhhh i inject my script into her DOM until she fucking breaks and i go insane because i need to recompile the entire structure so it doesn't have a stroke
// I think this section is driving me insane

function wait(){
    const mc=document.querySelector('.mainContent');
    if(!mc) return setTimeout(wait,50);
    init(mc);
}
wait();

// ================================================================
// THE MAIN INITIALIZER

function init(main){
    console.log("[UC Overlay v0.19.2] Init...");

    const navbars=main.querySelectorAll('.navbar.navbar-default');
    const headerNav=navbars[0];
    const footer=main.querySelector('footer');

    const between=[];
    let ptr=headerNav.nextElementSibling;
    while(ptr && ptr!==footer){
        between.push(ptr);
        ptr = ptr.nextElementSibling;
    }

    let h3=null, hr1=null, h2=null, hr2=null;
    for(const el of between){
        if(!h3&&el.tagName==="H3"){h3=el.cloneNode(true); continue;}
        if(!hr1&&el.tagName==="HR"){hr1=el.cloneNode(true); continue;}
        if(!h2&&el.tagName==="H2"){h2=el.cloneNode(true); continue;}
        if(!hr2&&el.tagName==="HR"){hr2=el.cloneNode(true); continue;}
    }

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

    const sections=[
        "Balancing (Monsters)",
        "Balancing (Spells)",
        "Balancing (Artifacts)",
        "Balancing (Souls)",
        "Balancing (Other)"
    ];

    sections.forEach(label=>{
        const p=document.createElement('p');
        p.textContent=label;

        const ul=document.createElement('ul');
        ul.appendChild(createNewLI());

        container.appendChild(p);
        container.appendChild(ul);
    });

    endBRs.forEach(br=>container.appendChild(br));
    overlay.appendChild(container);
    headerNav.insertAdjacentElement('afterend',overlay);

    // Collapse buttons (with save hook)
    container.querySelectorAll('p').forEach(p=>{
        const ul=p.nextElementSibling;
        if(!ul) return;

        const btn=document.createElement('button');
        btn.className="uc-collapse-btn";
        btn.textContent="−";
        let collapsed=false;

        btn.onclick=()=>{
            if(overlay.classList.contains('viewer-mode')) return;
            collapsed=!collapsed;
            btn.textContent = collapsed? "+" : "−";
            ul.style.display = collapsed? "none" : "";

            // Save when section collapse state changes
            saveState();
        };

        p.appendChild(btn);
    });

    const overlayH2 = container.querySelector('h2');
    if(overlayH2) makeEditable(overlayH2,"[Untitled Patch]");

    container.querySelectorAll('ul > li').forEach(li=>{
        ensureLiTextSpan(li);
        setupLiTextEditing(li);
        //setupColorCycling(li);
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

    // Reset button (only visible when custom notes are active)
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
        } else {
            overlay.style.display="none";
            between.forEach(n=>n.style.display="");
            toggle.textContent="Show Custom Patch Notes";
            modeToggle.style.display="none";
            resetBtn.style.display="none";

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

    // Reset: clear TM state and reload (only active in custom view)
    resetBtn.onclick = (e) => {
    if (!custom) return;

    // Only trigger on DOUBLE CLICK
    if (e.detail === 2) {
        resetState();
        location.reload();
    }
};

    document.addEventListener('keydown',e=>{
        if(!custom) return;
        if(overlay.classList.contains('viewer-mode')) return;

        const active=document.activeElement;
        if(!active || !active.classList.contains('uc-li-text')) return;

        const li=active.closest('li');
        if(!li) return;

        if(e.ctrlKey && e.key==="ArrowDown"){ e.preventDefault(); cycleCategory(li,1); }
        if(e.ctrlKey && e.key==="ArrowUp") { e.preventDefault(); cycleCategory(li,-1); }

        if(e.shiftKey && e.key==="ArrowUp") { e.preventDefault(); moveLi(li,-1); }
        if(e.shiftKey && e.key==="ArrowDown") { e.preventDefault(); moveLi(li,1); }
    });

    // Load any previously saved state right after building overlay
    loadState();

    console.log("[UC Overlay v0.19.2] Fully loaded.");
}

// ================================================================
// CATEGORY CYCLING

function cycleCategory(li,dir){
    const idx=cycleOrder.findIndex(c=>li.classList.contains(c));
    const newIdx=(idx+dir+cycleOrder.length)%cycleOrder.length;
    li.classList.remove(...cycleOrder);
    li.classList.add(cycleOrder[newIdx]);
}


    /*function setupColorCycling(li){
    li.addEventListener('click',e=>{
        const overlay=document.getElementById('uc-patch-overlay');
        if(overlay && overlay.classList.contains('viewer-mode')) return;

        if(
            e.target.classList.contains('uc-li-add') ||
            e.target.classList.contains('uc-li-del') ||
            e.target.classList.contains('uc-li-text')
        ) return;

        cycleCategory(li,1);
    });
}*/
//Personally I just find click cycle annoying, just use the keyboard inputs ngl.

// Part 2 of my Torment

// ================================================================
// REORDERING

function setupReordering(li){}
function moveLi(li,dir){
    const ul=li.parentElement;
    const items=[...ul.children];
    const idx=items.indexOf(li);
    const newIdx=idx+dir;

    if(newIdx<0 || newIdx>=items.length) return;

    if(dir<0) ul.insertBefore(li,items[newIdx]);
    else ul.insertBefore(li,items[newIdx].nextSibling);

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
        enableUCInputBlocker(); // Input Shield
    });

    span.addEventListener('blur',()=>{
        let t=sanitizeText(span.textContent);
        if(!t) t="[New entry]";
        span.textContent=t;
        li.dataset.raw=t;

        saveState();
        disableUCInputBlocker(); // You get the gist
    });

    span.addEventListener('keydown',e=>{
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
    });

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
    //setupColorCycling(li);
    setupReordering(li);

    addBtn.onclick=e=>{
        const overlay=document.getElementById('uc-patch-overlay');
        if(overlay && overlay.classList.contains('viewer-mode')) return;

        e.stopPropagation();

        const ul=li.parentElement;
        const newLi=createNewLI();
        ul.insertBefore(newLi,li.nextSibling);
        updateDeleteState(ul);

        // Save when a new LI is added
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

        // Save when an LI is deleted
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

// Extract the current patch state into a plain object
function collectState() {
    const overlay=document.getElementById('uc-patch-overlay');
    if(!overlay) return null;

    const container=overlay.querySelector('div');
    if(!container) return null;

    const state={
        title:"",
        sections:[]
    };

    const h2=container.querySelector('h2');
    if(h2) state.title = h2.textContent.trim();

    const pList=[...container.querySelectorAll('p')];

    pList.forEach(p=>{
        const label=p.childNodes[0].nodeValue.trim(); // ensure text only, ignore button
        const ul=p.nextElementSibling;
        if(!ul) return;

        const collapsed = (ul.style.display === "none");

        const items=[...ul.querySelectorAll(':scope > li')].map(li=>({
            raw: li.dataset.raw || "",
            category: cycleOrder.find(c=>li.classList.contains(c)) || "other"
        }));

        state.sections.push({
            label,
            collapsed,
            items
        });
    });

    return state;
}

// Persist the collected state
function saveState(){
    try{
        const state=collectState();
        if(state){
            GM_setValue(STATE_KEY, JSON.stringify(state));
        }
    } catch(e){
        console.error("[UC SAVE ERROR]", e);
    }
}

// Restore saved UI state
function loadState() {
    let text = GM_getValue(STATE_KEY, "");
    if(!text) return;

    let saved=null;
    try { saved = JSON.parse(text); }
    catch(e){
        console.error("[UC LOAD ERROR] Invalid JSON:", e);
        return;
    }
    if(!saved || !saved.sections) return;

    const overlay=document.getElementById('uc-patch-overlay');
    if(!overlay) return;
    const container=overlay.querySelector('div');
    if(!container) return;

    // Title restore
    const h2=container.querySelector('h2');
    if(h2 && saved.title) h2.textContent = saved.title;

    const pList=[...container.querySelectorAll('p')];

    saved.sections.forEach((sec,i)=>{
        const p=pList[i];
        if(!p) return;

        const ul=p.nextElementSibling;
        if(!ul) return;

        const btn=p.querySelector('.uc-collapse-btn');

        // Apply collapse state from saved data
        ul.style.display = sec.collapsed ? "none" : "";
        if(btn) btn.textContent = sec.collapsed ? "+" : "−";

        // Rebuild LI items cleanly
        ul.innerHTML = "";
        sec.items.forEach(item=>{
            const li=createNewLI();
            li.dataset.raw=item.raw;

            li.classList.remove(...cycleOrder);
            li.classList.add(item.category || "other");

            const span=li.querySelector('.uc-li-text');
            if(span) span.textContent = item.raw;

            ul.appendChild(li);
        });

        updateDeleteState(ul);

        // FIX collapse button breaking after load
        if(btn){
            btn.onclick = () => {
                const overlay=document.getElementById('uc-patch-overlay');
                if(overlay && overlay.classList.contains('viewer-mode')) return;

                // Determine collapse state from DOM, *not* stale variable
                const currentlyCollapsed = (ul.style.display === "none");
                const newState = !currentlyCollapsed;

                ul.style.display = newState ? "none" : "";
                btn.textContent = newState ? "+" : "−";

                saveState();
            };
        }
    });
}

// Remove all stored data
function resetState(){
    GM_deleteValue(STATE_KEY);
}

//FINALLY ITS OVER IM FREE FROM MY SUFFERING AHHHHH

})();
