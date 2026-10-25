import './style.css';
import {createIcons,ArrowRight, Camera, ChevronDown, CircleHelp, Eye, Maximize, Pause, Play, RotateCcw, Shuffle, StepBack, StepForward, Tags, Undo2, Volume2, VolumeX, X} from 'lucide';
const icons={ArrowRight, Camera, ChevronDown, CircleHelp, Eye, Maximize, Pause, Play, RotateCcw, Shuffle, StepBack, StepForward, Tags, Undo2, Volume2, VolumeX, X};
import {CubeView} from './cube-view.js';
import {Cube,FACES,COLORS,NAMES,COLOR_NAMES,SOLVED,LESSONS,lessonState,inverse,scramble,explain,validateState,classifyColor} from './cube-state.js';
import {nextPracticeMove,checkPracticeTurn} from './practice.js';
import {createNarrator} from './voice.js';
const $=id=>document.getElementById(id);
const refreshIcons=()=>createIcons({icons,attrs:{'aria-hidden':'true'}});
let cube=new Cube(),view,mode='playground',lesson=0,reverse=false,halfTurns=false,history=[],solution=[],solutionStart='',step=0,playing=false,playVersion=0,requestId=0,solving=false;
let toastTimer,solverTimer,lastFaceKey,voiceEnabled=true;
const narrator=createNarrator(window.speechSynthesis,window.SpeechSynthesisUtterance,window.Audio);
window.speechSynthesis?.getVoices();
$('voice-toggle').onclick=()=>{
 voiceEnabled=!voiceEnabled;narrator.setEnabled(voiceEnabled);
 $('voice-toggle').setAttribute('aria-pressed',voiceEnabled);
 $('voice-toggle').innerHTML=`<i data-lucide="${voiceEnabled?'volume-2':'volume-x'}"></i><span>Voice ${voiceEnabled?'on':'off'}</span>`;
 if(voiceEnabled)narrator.say('Let’s learn one move at a time.');
 refreshIcons();
};
const toast=message=>{$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3800);};

try{view=new CubeView($('cube-canvas'),cube.asString());}catch(error){$('cube-canvas').textContent='Your browser couldn’t start 3D graphics. Please enable WebGL or try a different browser.';console.error(error);}
const isBusy=()=>!view||view.busy;
function pause(){playing=false;playVersion++;narrator.cancel();updateTransport();}
function invalidate(){pause();solution=[];step=0;requestId++;solving=false;clearTimeout(solverTimer);renderPlayback();}
function updateState(){renderFaces();$('cube-status').textContent=cube.isSolved()?'All colors match':mode==='practice'?'Practice cube':'Your cube';$('undo').disabled=!history.length||isBusy();}
async function perform(move,{manual=false,record=true,duration}={}){if(isBusy())return false;if(manual){invalidate();if(mode==='practice'&&trainer.active)trainerAnswer(move);}const next=cube.clone();next.move(move);if(record)history.push(move);cube=next;updateState();try{await view.turn(move,cube.asString(),duration??550);}finally{updateState();}if(manual&&mode==='practice'&&trainer.pending){trainer.pending=false;nextPrompt();}return true;}
function renderFaces(){const key=String(reverse)+String(halfTurns)+cube.asString().split('').filter((_,i)=>i%9===4).join('');if(key===lastFaceKey)return;lastFaceKey=key;const node=$('face-buttons');node.innerHTML=FACES.map(f=>`<button class="face-button" data-face="${f}" aria-label="Turn ${NAMES[f].toLowerCase()} side ${halfTurns?'half turn':reverse?'counterclockwise':'clockwise'}"><b><span class="face-dot" style="--face:${COLORS[cube.asString()[FACES.indexOf(f)*9+4]]}"></span>${f}${halfTurns?'2':reverse?'′':''}</b><span>${NAMES[f]}</span></button>`).join('');node.querySelectorAll('button').forEach(b=>b.onclick=()=>perform(b.dataset.face+(halfTurns?'2':reverse?"'":''),{manual:true}));}
$('half-turns').onclick=()=>{halfTurns=!halfTurns;$('half-turns').setAttribute('aria-pressed',halfTurns);renderFaces();};
$('reverse').onclick=()=>{halfTurns=false;$('half-turns').setAttribute('aria-pressed',false);reverse=!reverse;$('reverse').setAttribute('aria-pressed',reverse);renderFaces();};
$('scramble').onclick=()=>{if(isBusy())return;stopTrainer();invalidate();const moves=scramble();cube.move(moves.join(' '));history.push(...moves);view.setState(cube.asString());updateState();toast('Mixed! Try a move.');};
$('reset').onclick=()=>{if(isBusy())return;stopTrainer();invalidate();cube=new Cube();history=[];view.setState(cube.asString());updateState();toast('All colors match.');};
$('undo').onclick=async()=>{if(isBusy()||!history.length)return;stopTrainer();invalidate();const move=history.pop();await perform(inverse(move),{record:false});};
$('home-view').onclick=()=>view?.resetCamera();
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('stage').requestFullscreen)await $('stage').requestFullscreen();else toast('Full screen isn’t available in this browser.');}catch{toast('Full screen isn’t available here.');}};
$('labels-toggle').onclick=()=>{const visible=$('face-labels').classList.toggle('hidden')===false;$('labels-toggle').setAttribute('aria-pressed',visible);if(visible)view?.resetCamera();};
function renderLessons(){
 const beginner=mode==='beginner',data=LESSONS[lesson];
 $('lesson-picker').classList.toggle('hidden',!beginner);
 $('lesson-list').innerHTML=LESSONS.map((item,i)=>`<button class="lesson-step ${i===lesson?'active':''}" data-lesson="${i}" aria-current="${i===lesson?'step':'false'}"><span class="lesson-number">${i+1}</span>${item.name}</button>`).join('');
 $('lesson-list').querySelectorAll('button').forEach(button=>button.onclick=()=>{
  if(isBusy())return;invalidate();lesson=Number(button.dataset.lesson);$('lesson-picker').open=false;renderLessons();
 });
 $('lesson-title').textContent=beginner?data.name:'Solve your cube';
 $('lesson-description').textContent=beginner?data.description:'Scan your cube, or solve the one on screen.';
 $('try-lesson').innerHTML=`${beginner?'Start lesson':'Find the moves'}<i data-lucide="arrow-right"></i>`;
 refreshIcons();
}
function changeMode(next){
 if(isBusy()){toast('Wait for this turn to finish.');return;}
 stopTrainer();pause();
 if(next==='practice'&&cube.asString()[4]!=='U'){invalidate();cube=new Cube();history=[];view.setState(cube.asString());}
 if(next==='practice')view.resetCamera();
 mode=next;
 $('trainer-panel').classList.toggle('hidden',next!=='practice');
 $('learning-panel').classList.toggle('hidden',next==='practice'||next==='playground');
 $('coach').classList.toggle('hidden',next==='playground');
 document.querySelector('.workspace').classList.toggle('playground-mode',next==='playground');
 $('method').value=next==='beginner'?'beginner':next==='quick'?'quick':'guided';
 ['playground','learn','practice'].forEach(name=>{const active=name==='learn'?['beginner','guided','quick'].includes(next):name===next;$(name+'-nav').classList.toggle('active',active);$(name+'-nav').setAttribute('aria-pressed',active);});
 renderLessons();renderPlayback();updateState();
}
$('method').onchange=event=>changeMode(event.target.value);
$('playground-nav').onclick=()=>changeMode('playground');
$('learn-nav').onclick=()=>changeMode('guided');
$('practice-nav').onclick=()=>changeMode('practice');
$('play-practice').onclick=()=>changeMode('practice');
function loadLesson(){if(isBusy())return false;stopTrainer();invalidate();const data=lessonState(lesson);cube=data.cube;solution=data.solution;solutionStart=cube.asString();history=[];step=0;view.setState(cube.asString());view.resetCamera();updateState();renderPlayback();narrator.say(LESSONS[lesson].description);return true;}
const worker=new Worker(new URL('./solver.worker.js',import.meta.url),{type:'module'});
worker.onmessage=({data})=>{if(data.id!==requestId)return;clearTimeout(solverTimer);solving=false;if(data.error){toast(data.error);renderPlayback();return;}solution=data.solution;solutionStart=cube.asString();step=0;history=[];renderPlayback();updateState();toast(solution.length?`${solution.length} moves. Press Play.`:'Already solved! Mix it up to make a new puzzle.');};
worker.onerror=()=>{solving=false;clearTimeout(solverTimer);toast('The solver couldn’t start. Reload the page and try again.');renderPlayback();};
function solve(){if(isBusy())return;invalidate();if(cube.isSolved()){toast('Every color is already home. Mix it up first.');return;}solving=true;const id=++requestId;worker.postMessage({id,state:cube.asString()});renderPlayback();solverTimer=setTimeout(()=>{if(id===requestId){solving=false;requestId++;renderPlayback();toast('This solution is taking longer than expected. Try again.');}},45000);}
$('try-lesson').onclick=()=>mode==='beginner'?loadLesson():solve();
function updateTransport(){$('play').innerHTML=`<i data-lucide="${playing?'pause':'play'}"></i><span>${playing?'Pause':'Play'}</span>`;$('play').setAttribute('aria-label',playing?'Pause solution':'Play solution');refreshIcons();}
function renderPlayback(){
 const move=solution[step],description=move?explain(move):null;
 $('move-progress').textContent=solving?'Thinking…':solution.length?`${step} / ${solution.length}`:'Ready';
 $('move-token').textContent=move?move.replace("'",'′'):solution.length?'✓':'—';
 $('move-title').textContent=description?mode==='quick'?move.replace("'",'′'):description.title:solution.length?'You did it!':solving?'Finding the moves…':'Ready?';
 $('move-description').textContent=description?description.detail:solution.length?'All the colors match.':solving?'This may take a moment.':mode==='beginner'?'Start the lesson.':'Find the moves to begin.';
 $('previous').disabled=!solution.length||step===0;
 $('restart-playback').disabled=!solution.length||step===0;
 $('next').disabled=!move;$('last').disabled=!move;
 $('play').disabled=solving;$('try-lesson').disabled=solving;
 updateTransport();
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function nextStep(){
 if(isBusy()||!solution[step])return false;
 const token=playVersion,move=solution[step];
 await narrator.say(explain(move).title);
 if(token!==playVersion)return false;
 await perform(move,{duration:[1000,700,450,280][Number($('speed').value)]});
 step++;renderPlayback();
 if(step===solution.length){playing=false;updateTransport();toast('You did it! All the colors match.');narrator.say('You did it! All the colors match.');}
 return token===playVersion;
}
async function play(){if(playing){pause();return;}if(isBusy())return;if(!solution.length){if(mode==='beginner')loadLesson();else{solve();return;}}if(step===solution.length){cube=Cube.fromString(solutionStart);view.setState(solutionStart);step=0;history=[];renderPlayback();}playing=true;const token=++playVersion;updateTransport();while(playing&&token===playVersion&&step<solution.length){if(!await nextStep())break;if(playing)await delay([1000,500,200,60][Number($('speed').value)]);}if(token===playVersion){playing=false;updateTransport();}}
$('play').onclick=play;$('next').onclick=async()=>{pause();await nextStep();};
function seek(target){if(isBusy()||!solution.length)return;pause();cube=Cube.fromString(solutionStart);cube.move(solution.slice(0,target).join(' '));step=target;history=solution.slice(0,target);view.setState(cube.asString());renderPlayback();updateState();}
$('previous').onclick=async()=>{
 if(isBusy()||!step)return;pause();
 await perform(inverse(solution[step-1]),{record:false,duration:700});
 step--;history=solution.slice(0,step);renderPlayback();
};
$('restart-playback').onclick=()=>seek(0);
$('last').onclick=()=>{if(!playing)play();};
$('speed').oninput=()=>{$('speed-value').textContent=['Slow','Steady','Quick','Fast'][Number($('speed').value)];};
$('speak').onclick=()=>narrator.say(solution[step]?explain(solution[step]).title:'You did it! All the colors match.');
function bindDialog(id,open,close){$(open).onclick=()=>{pause();stopTrainer();$(id).showModal();};$(close).onclick=()=>$(id).close();$(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close();}});}
bindDialog('help-dialog','help-button','close-help');bindDialog('movement-dialog','movement-guide-button','close-movement');
// The movement drill judges virtual turns only; a physical cube has no live tracking.
const trainer={active:false,prompt:"R'",correct:0,streak:0,pending:false,deadline:0,timer:null,half:null,version:0};
function displayPrompt(){$('trainer-move').textContent=trainer.prompt.replace("'",'′');const e=explain(trainer.prompt);$('trainer-hint').textContent=$('trainer-hints').checked?e.title:'Your turn.';}
function trainerStats(){$('trainer-correct').textContent=trainer.correct;$('trainer-streak').textContent=trainer.streak;}
function trainerFeedback(text,kind=''){$('trainer-feedback').textContent=text;$('trainer-feedback').className='trainer-feedback '+kind;}
function nextPrompt(){
 if(!trainer.active)return;
 trainer.half=null;trainer.deadline=0;
 const version=++trainer.version;
 trainer.prompt=nextPracticeMove(trainer.prompt,$('trainer-doubles').checked);displayPrompt();
 const pace=Number($('trainer-pace').value);
 const spoken=pace&&pace<6?`${trainer.prompt[0]} ${trainer.prompt.endsWith("'")?'prime':trainer.prompt.endsWith('2')?'two':''}`:explain(trainer.prompt).title;
 $('trainer-timer-bar').style.transform='scaleX(1)';
 narrator.say(spoken).then(()=>{if(trainer.active&&version===trainer.version)trainer.deadline=pace?performance.now()+pace*1000:0;});
}
function tickTrainer(){if(!trainer.active)return;const pace=Number($('trainer-pace').value);if(pace&&trainer.deadline&&!isBusy()){const left=Math.max(0,(trainer.deadline-performance.now())/(pace*1000));$('trainer-timer-bar').style.transform=`scaleX(${left})`;if(left===0){trainer.streak=0;trainerStats();trainerFeedback(`That was ${trainer.prompt.replace("'",'′')}. No worries — here’s another.`);nextPrompt();}}trainer.timer=requestAnimationFrame(tickTrainer);}
function stopTrainer(){narrator.cancel();trainer.version++;trainer.active=false;trainer.pending=false;cancelAnimationFrame(trainer.timer);$('trainer-start').innerHTML='<i data-lucide="play"></i>Start';$('trainer-timer-bar').style.transform='scaleX(1)';refreshIcons();}
function trainerAnswer(move){const checked=checkPracticeTurn(trainer.prompt,move,trainer.half);trainer.half=checked.partial;if(checked.result==='partial'){trainerFeedback('One more turn the same way.');narrator.say('One more turn the same way.');return;}if(checked.result==='correct')move=trainer.prompt;if(move===trainer.prompt){trainer.correct++;trainer.streak++;trainerFeedback(['That’s it!','You got it!','Great turn!'][trainer.correct%3],'correct');trainer.pending=true;trainer.deadline=0;}else{trainer.streak=0;trainerFeedback(`That was ${move.replace("'",'′')}. Try ${trainer.prompt.replace("'",'′')}.`,'wrong');}trainerStats();}
$('trainer-start').onclick=()=>{if(trainer.active){stopTrainer();trainerFeedback('Paused.');return;}if(isBusy())return;invalidate();trainer.active=true;trainerFeedback('Try the move shown.');$('trainer-start').innerHTML='<i data-lucide="pause"></i>Pause';refreshIcons();nextPrompt();tickTrainer();};
$('trainer-demo').onclick=async()=>{
 if(isBusy())return;
 trainer.deadline=0;const version=++trainer.version,prompt=trainer.prompt;
 trainerFeedback('Watch this side turn.');
 await Promise.all([narrator.say(explain(prompt).title),perform(prompt,{duration:1100})]);
 if(version!==trainer.version)return;
 trainerFeedback('Your turn. Try that move.');
 const pace=Number($('trainer-pace').value);if(trainer.active)trainer.deadline=pace?performance.now()+pace*1000:0;
};
$('trainer-hints').onchange=displayPrompt;$('trainer-doubles').onchange=()=>{if(trainer.active)nextPrompt();};$('trainer-pace').onchange=()=>{if(trainer.active)nextPrompt();};$('trainer-reset').onclick=()=>{stopTrainer();trainer.correct=trainer.streak=0;trainerStats();trainerFeedback('Press Start to try again.');};
$('movement-grid').innerHTML=FACES.map(f=>`<div class="movement-card"><div><span class="face-dot" style="--face:${COLORS[f]}"></span><b>${f}</b><span>${NAMES[f]}</span></div><p>${COLOR_NAMES[f]} center · ${NAMES[f].toLowerCase()} face</p><div>${['',"'",'2'].map(s=>`<button data-demo="${f+s}" aria-label="${explain(f+s).title}">${f+s.replace("'",'′')}</button>`).join('')}</div></div>`).join('');$('movement-grid').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(isBusy())return;$('movement-dialog').close();changeMode('practice');trainer.prompt=b.dataset.demo;displayPrompt();perform(b.dataset.demo,{manual:true});toast(`${b.dataset.demo.replace("'",'′')}: ${explain(b.dataset.demo).title}. Open the movement guide for another.`);});$('start-from-guide').onclick=()=>{$('movement-dialog').close();changeMode('practice');$('trainer-start').click();};
// Six-face capture and manual correction. No frame or face data leaves this device.
let cameraVersion=0,stream=null,scanFace=0,paint='U',scanState=SOLVED.split(''),reviewed=new Set();
const orientations={U:'White toward the camera, with the blue side along the top edge.',R:'Red toward the camera, with the white side along the top edge.',F:'Green toward the camera, with the white side along the top edge.',D:'Yellow toward the camera, with the green side along the top edge.',L:'Orange toward the camera, with the white side along the top edge.',B:'Blue toward the camera, with the white side along the top edge.'};
function stopCamera(){cameraVersion++;stream?.getTracks().forEach(t=>t.stop());stream=null;$('video').srcObject=null;$('camera-placeholder').classList.remove('hidden');$('capture').disabled=true;}
function renderScan(){const face=FACES[scanFace];$('scan-face-tabs').innerHTML=FACES.map((f,i)=>`<button class="${i===scanFace?'active ':''}${reviewed.has(i)?'checked':''}" data-index="${i}" aria-label="${COLOR_NAMES[f]} ${NAMES[f]} side" aria-pressed="${i===scanFace}">${f}</button>`).join('');$('scan-face-tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{reviewed.add(scanFace);scanFace=Number(b.dataset.index);renderScan();});$('scan-face-name').textContent=`${COLOR_NAMES[face]} · ${NAMES[face].toLowerCase()} side`;$('scan-instruction').textContent=orientations[face];$('color-palette').innerHTML=FACES.map(f=>`<button style="background:${COLORS[f]}" data-color="${f}" class="${f===paint?'selected':''}" aria-label="Paint ${COLOR_NAMES[f].toLowerCase()}" aria-pressed="${f===paint}"></button>`).join('');$('color-palette').querySelectorAll('button').forEach(b=>b.onclick=()=>{paint=b.dataset.color;renderScan();});$('edit-face').innerHTML=Array.from({length:9},(_,i)=>`<button style="background:${COLORS[scanState[scanFace*9+i]]}" data-square="${i}" aria-label="Square ${i+1}: ${COLOR_NAMES[scanState[scanFace*9+i]]}" ${i===4?'disabled':''}></button>`).join('');$('edit-face').querySelectorAll('button').forEach(b=>b.onclick=()=>{scanState[scanFace*9+Number(b.dataset.square)]=paint;reviewed.add(scanFace);renderScan();});$('previous-face').disabled=scanFace===0;$('next-face').textContent=scanFace===5?'Mark side checked ✓':'Next side →';$('scan-validation').textContent=`${reviewed.size} / 6 sides checked. Review every square before using your cube.`;}
$('scan').onclick=()=>{if(isBusy())return;pause();stopTrainer();scanFace=0;scanState=SOLVED.split('');reviewed=new Set();renderScan();$('scan-dialog').showModal();$('capture').disabled=true;};$('close-scan').onclick=()=>$('scan-dialog').close();$('scan-dialog').addEventListener('close',stopCamera);
$('enable-camera').onclick=async()=>{if(!navigator.mediaDevices?.getUserMedia){$('camera-message').textContent='Camera access requires HTTPS or localhost and a supported browser. You can enter colors manually.';return;}const version=++cameraVersion;$('enable-camera').disabled=true;try{const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:1280}},audio:false});if(version!==cameraVersion||!$('scan-dialog').open){acquired.getTracks().forEach(t=>t.stop());return;}stream=acquired;$('video').srcObject=stream;await $('video').play();$('camera-placeholder').classList.add('hidden');$('capture').disabled=false;$('camera-message').textContent='Line up one face inside the grid. Use even light, avoid glare, and check every detected color.';}catch{$('camera-message').textContent='We couldn’t access your camera. Check browser permissions, or paint the squares manually.';stopCamera();}finally{$('enable-camera').disabled=false;}};
$('capture').onclick=()=>{const video=$('video');if(!video.videoWidth){toast('Wait a moment for the camera, then try again.');return;}const size=Math.min(video.videoWidth,video.videoHeight),canvas=document.createElement('canvas');canvas.width=canvas.height=300;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,(video.videoWidth-size)/2,(video.videoHeight-size)/2,size,size,0,0,300,300);const colors=[];for(let i=0;i<9;i++){const x=51+(i%3+.5)*66,y=51+(Math.floor(i/3)+.5)*66,data=ctx.getImageData(x-4,y-4,9,9).data;const rgb=[0,1,2].map(c=>{const values=[];for(let j=c;j<data.length;j+=4)values.push(data[j]);return values.sort((a,b)=>a-b)[40];});colors.push(rgb);}for(let i=0;i<9;i++)scanState[scanFace*9+i]=i===4?FACES[scanFace]:classifyColor(colors[i]);reviewed.add(scanFace);renderScan();$('camera-message').textContent='Captured! Check the colors, correct any mistakes, then turn to the next side.';};
$('previous-face').onclick=()=>{reviewed.add(scanFace);scanFace=Math.max(0,scanFace-1);renderScan();};$('next-face').onclick=()=>{reviewed.add(scanFace);scanFace=Math.min(5,scanFace+1);renderScan();};
$('apply-scan').onclick=()=>{reviewed.add(scanFace);if(reviewed.size!==6){$('scan-validation').textContent='Visit and check all six sides first.';return;}try{const scanned=validateState(scanState.join(''));invalidate();cube=scanned;history=[];view.setState(cube.asString());view.resetCamera();$('scan-dialog').close();changeMode('guided');updateState();if(!cube.isSolved())solve();else toast('Your cube is already solved. All six colors are home!');}catch(error){$('scan-validation').textContent=error.message;}};
window.addEventListener('keydown',event=>{if(document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)||event.metaKey||event.ctrlKey||event.altKey||event.repeat)return;const key=event.key.toUpperCase();if(FACES.includes(key)){event.preventDefault();perform(key+(event.shiftKey?"'":''),{manual:true});}else if(key==='S'){event.preventDefault();$('scramble').click();}else if(event.code==='Space'){if(document.activeElement?.tagName==='BUTTON')return;event.preventDefault();if(mode==='practice')$('trainer-start').click();else if(mode!=='playground')play();}});
window.addEventListener('pagehide',()=>{stopCamera();worker.terminate();view?.dispose();});document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();if(trainer.active){stopTrainer();trainerFeedback('Practice paused. Come back when you’re ready.');}if(stream)stopCamera();}});
view?.enableFaceTurns(move=>{if(!document.querySelector('dialog[open]'))perform(move,{manual:true});});
renderFaces();renderLessons();renderPlayback();displayPrompt();trainerStats();updateState();refreshIcons();
