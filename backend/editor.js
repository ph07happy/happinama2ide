require.config({
    paths:{
        vs:"https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs"
    }
});

let editor;
let currentLanguage="c";

const BACKEND_URL="https://happinama-backend.onrender.com";

const templates={
    c:`#include <stdio.h>

int main()
{
    printf("just happy things");
    return 0;
}`,
    cpp:`#include <iostream>
using namespace std;

int main()
{
    cout<<"just happy things";
    return 0;
}`,
    java:`public class Main
{
    public static void main(String[] args)
    {
        System.out.println("just happy things");
    }
}`,
    python:`print("just happy things")`,
    sql:`SELECT 'just happy things' AS message;`
};

const languageBuffers={
    c:templates.c,
    cpp:templates.cpp,
    java:templates.java,
    python:templates.python,
    sql:templates.sql
};

const monacoLanguageMap={
    c:"c",
    cpp:"cpp",
    java:"java",
    python:"python",
    sql:"sql"
};

let savedTheme="dark";
try{
    savedTheme=localStorage.getItem("theme")||"dark";
}catch(e){}

document.body.classList.add(savedTheme);

const runBtn=document.getElementById("runBtn");
const output=document.getElementById("output");
const status=document.getElementById("status");
const themeBtn=document.getElementById("themeBtn");
const undoBtn=document.getElementById("undoBtn");
const redoBtn=document.getElementById("redoBtn");
const clearOutputBtn=document.getElementById("clearOutputBtn");
const clearScreenBtn=document.getElementById("clearScreenBtn");

const cBtn=document.getElementById("cBtn");
const cppBtn=document.getElementById("cppBtn");
const javaBtn=document.getElementById("javaBtn");
const pythonBtn=document.getElementById("pythonBtn");
const sqlBtn=document.getElementById("sqlBtn");

const fileName=document.getElementById("fileName");

const langButtons=[cBtn,cppBtn,javaBtn,pythonBtn,sqlBtn];

require(["vs/editor/editor.main"],()=>{

    editor=monaco.editor.create(
        document.getElementById("editor"),
        {
            value:templates.c,
            language:"c",
            theme:savedTheme==="light"?"vs":"vs-dark",
            automaticLayout:true,
            fontSize:18,
            minimap:{enabled:true},
            scrollBeyondLastLine:false,
            roundedSelection:true,
            wordWrap:"on",
            fontFamily:"Consolas"
        }
    );

    window.editor=editor;

    editor.addCommand(
        monaco.KeyMod.CtrlCmd|monaco.KeyCode.Enter,
        ()=>executeProgram()
    );

    initEditorPinchZoom();
});

function initEditorPinchZoom(){

    const wrapper=document.querySelector(".editor-wrapper");
    const editorDom=document.getElementById("editor");

    let scale=1;
    const minScale=0.5;
    const maxScale=4;
    let initialDist=null;
    let lastScale=1;
    let originX=0;
    let originY=0;
    let translateX=0;
    let translateY=0;

    function getDistance(t){
        const dx=t[0].clientX-t[1].clientX;
        const dy=t[0].clientY-t[1].clientY;
        return Math.hypot(dx,dy);
    }

    function getMidpoint(t){
        return{
            x:(t[0].clientX+t[1].clientX)/2,
            y:(t[0].clientY+t[1].clientY)/2
        };
    }

    function applyTransform(){
        editorDom.style.transformOrigin="0 0";
        editorDom.style.transform=
            `translate(${translateX}px,${translateY}px) scale(${scale})`;
    }

    function resetTransform(){
        scale=1;
        translateX=0;
        translateY=0;
        editorDom.style.transform="none";
        if(window.editor) window.editor.layout();
    }

    wrapper.addEventListener("touchstart",e=>{
        if(e.touches.length===2){
            e.preventDefault();
            initialDist=getDistance(e.touches);
            lastScale=scale;
            const mid=getMidpoint(e.touches);
            const rect=wrapper.getBoundingClientRect();
            originX=mid.x-rect.left;
            originY=mid.y-rect.top;
        }
    },{passive:false});

    wrapper.addEventListener("touchmove",e=>{
        if(e.touches.length===2&&initialDist!==null){
            e.preventDefault();

            const dist=getDistance(e.touches);
            const ratio=dist/initialDist;
            const newScale=Math.min(maxScale,Math.max(minScale,lastScale*ratio));

            const mid=getMidpoint(e.touches);
            const rect=wrapper.getBoundingClientRect();
            const midX=mid.x-rect.left;
            const midY=mid.y-rect.top;

            translateX=midX-(midX-translateX)*(newScale/scale);
            translateY=midY-(midY-translateY)*(newScale/scale);
            scale=newScale;

            applyTransform();
        }
    },{passive:false});

    wrapper.addEventListener("touchend",e=>{
        if(e.touches.length<2){
            initialDist=null;
            if(scale<=1.05) resetTransform();
        }
    });

    wrapper.addEventListener("dblclick",resetTransform);
}

async function executeProgram(){

    if(!editor) return;

    const code=editor.getValue();

    if(!code.trim()){
        output.textContent="nothing to execute.";
        return;
    }

    runBtn.disabled=true;
    status.innerHTML="<b>compiling...</b>";
    output.textContent="running...";

    try{

        const res=await fetch(`${BACKEND_URL}/execute`,{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
                language:currentLanguage,
                source_code:code,
                stdin:""
            })
        });

        if(!res.ok){
            const err=await res.json().catch(()=>({}));
            output.textContent=`error ${res.status}: ${err.detail||res.statusText}`;
            status.innerHTML="<b>execution failed.</b>";
            return;
        }

        const data=await res.json();
        output.textContent=data.output;

        const ok=data.status==="Accepted";
        status.innerHTML=ok
            ?"<b>executed successfully.</b>"
            :`<b>${data.status}</b>`;

    }catch(e){

        output.textContent=
`could not reach backend.
make sure FastAPI is running at ${BACKEND_URL}

error: ${e.message}`;
        status.innerHTML="<b>backend unreachable.</b>";

    }finally{

        runBtn.disabled=false;

        setTimeout(()=>{
            status.innerHTML="<b>© 2026 happinama. All rights reserved.</b>";
        },4000);
    }
}

runBtn.addEventListener("click",executeProgram);

function updateThemeIcon(){
    themeBtn.textContent=
        document.body.classList.contains("light")?"☼":"☾";
}

updateThemeIcon();

themeBtn.addEventListener("click",()=>{

    if(!editor) return;

    const goingLight=document.body.classList.contains("dark");

    document.body.classList.replace(
        goingLight?"dark":"light",
        goingLight?"light":"dark"
    );

    try{
        localStorage.setItem("theme",goingLight?"light":"dark");
    }catch(e){}

    monaco.editor.setTheme(goingLight?"vs":"vs-dark");

    updateThemeIcon();
});

undoBtn.addEventListener("click",()=>{
    if(!editor) return;
    editor.trigger("","undo");
    editor.focus();
});

redoBtn.addEventListener("click",()=>{
    if(!editor) return;
    editor.trigger("","redo");
    editor.focus();
});

function clearLanguageSelection(){
    langButtons.forEach(btn=>{
        btn.classList.remove("active-lang");
        btn.setAttribute("aria-pressed","false");
    });
}

function setLanguage(language,file,button){

    if(!editor) return;
    if(language===currentLanguage) return;

    languageBuffers[currentLanguage]=editor.getValue();

    currentLanguage=language;

    fileName.textContent=file;

    clearLanguageSelection();

    button.classList.add("active-lang");
    button.setAttribute("aria-pressed","true");

    monaco.editor.setModelLanguage(
        editor.getModel(),
        monacoLanguageMap[language]
    );

    editor.setValue(languageBuffers[language]);

    editor.focus();
}

cBtn.addEventListener("click",
    ()=>setLanguage("c","main.c",cBtn));

cppBtn.addEventListener("click",
    ()=>setLanguage("cpp","main.cpp",cppBtn));

javaBtn.addEventListener("click",
    ()=>setLanguage("java","Main.java",javaBtn));

pythonBtn.addEventListener("click",
    ()=>setLanguage("python","main.py",pythonBtn));

sqlBtn.addEventListener("click",
    ()=>setLanguage("sql","query.sql",sqlBtn));

clearOutputBtn.addEventListener("click",()=>{
    output.textContent="";
});

clearScreenBtn.addEventListener("click",()=>{

    if(!editor) return;

    editor.executeEdits("clear-screen",[{
        range:editor.getModel().getFullModelRange(),
        text:""
    }]);

    editor.pushUndoStop();
    editor.focus();

    output.textContent="";
});
