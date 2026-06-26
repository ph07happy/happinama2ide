const fullscreenBtn=document.getElementById("fullscreenBtn");
const divider=document.getElementById("divider");
const outputContainer=document.querySelector(".output-container");

let previousOutputWidth="420px";
let resizingOutput=false;
let rafPending=false;

function isMobile(){
    return window.innerWidth<=768;
}

function isLandscapeMobile(){
    return window.innerWidth<=768 &&
           window.innerHeight<=500 &&
           window.screen.orientation?.type?.startsWith("landscape");
}

function updateFullscreenIcon(){
    fullscreenBtn.textContent=
        document.fullscreenElement?"▣":"□";
    fullscreenBtn.setAttribute(
        "aria-label",
        document.fullscreenElement
            ?"Exit fullscreen"
            :"Enter fullscreen"
    );
}

fullscreenBtn.addEventListener("click",()=>{

    if(!document.fullscreenElement){

        previousOutputWidth=
            outputContainer.style.width||"420px";

        document.documentElement
            .requestFullscreen()
            .catch(()=>{});

    }else{

        document.exitFullscreen().catch(()=>{});
    }
});

document.addEventListener("fullscreenchange",()=>{

    updateFullscreenIcon();

    if(!document.fullscreenElement&&!isMobile()){
        outputContainer.style.width=previousOutputWidth;
    }

    if(window.editor){
        setTimeout(()=>window.editor.layout(),100);
    }
});

function applyResize(clientX,clientY){

    if(isMobile()&&!isLandscapeMobile()){

        const mainRect=
            document.querySelector("main")
            .getBoundingClientRect();

        const height=mainRect.bottom-clientY;

        if(height>120&&height<window.innerHeight*0.7){
            outputContainer.style.height=height+"px";
        }

    }else{

        const width=window.innerWidth-clientX;

        if(width>250&&width<1000){
            outputContainer.style.width=width+"px";
        }
    }

    if(window.editor) window.editor.layout();
}

function startResize(){
    resizingOutput=true;
    document.body.style.userSelect="none";
    document.body.style.cursor=
        isMobile()&&!isLandscapeMobile()
            ?"row-resize"
            :"col-resize";
}

function stopResize(){
    resizingOutput=false;
    document.body.style.userSelect="";
    document.body.style.cursor="";
}

divider.addEventListener("mousedown",e=>{
    e.preventDefault();
    startResize();
});

document.addEventListener("mousemove",e=>{

    if(!resizingOutput) return;

    if(rafPending) return;
    rafPending=true;

    requestAnimationFrame(()=>{
        applyResize(e.clientX,e.clientY);
        rafPending=false;
    });
});

document.addEventListener("mouseup",stopResize);

divider.addEventListener("touchstart",e=>{
    e.preventDefault();
    startResize();
},{passive:false});

document.addEventListener("touchmove",e=>{

    if(!resizingOutput) return;

    if(rafPending) return;
    rafPending=true;

    const touch=e.touches[0];

    requestAnimationFrame(()=>{
        applyResize(touch.clientX,touch.clientY);
        rafPending=false;
    });
},{passive:true});

document.addEventListener("touchend",stopResize);
document.addEventListener("touchcancel",stopResize);

divider.addEventListener("keydown",e=>{

    const step=20;
    const mobile=isMobile()&&!isLandscapeMobile();

    if(mobile){

        const current=
            outputContainer.offsetHeight;

        if(e.key==="ArrowUp"){
            e.preventDefault();
            const h=current+step;
            if(h<window.innerHeight*0.7)
                outputContainer.style.height=h+"px";
        }

        if(e.key==="ArrowDown"){
            e.preventDefault();
            const h=current-step;
            if(h>120)
                outputContainer.style.height=h+"px";
        }

    }else{

        const current=
            outputContainer.offsetWidth;

        if(e.key==="ArrowLeft"){
            e.preventDefault();
            const w=current+step;
            if(w<1000)
                outputContainer.style.width=w+"px";
        }

        if(e.key==="ArrowRight"){
            e.preventDefault();
            const w=current-step;
            if(w>250)
                outputContainer.style.width=w+"px";
        }
    }

    if(window.editor) window.editor.layout();
});
