import './style.css';
import {createIcons,ArrowRight, Camera, ChevronDown, CircleHelp, Eye, Maximize, Pause, Play, Square, RotateCcw, Shuffle, StepBack, StepForward, Tags, Undo2, Volume2, VolumeX, X} from 'lucide';
const icons={ArrowRight, Camera, ChevronDown, CircleHelp, Eye, Maximize, Pause, Play, Square, RotateCcw, Shuffle, StepBack, StepForward, Tags, Undo2, Volume2, VolumeX, X};
import {CubeView} from './cube-view.js';
import {Cube,FACES,COLORS,NAMES,COLOR_NAMES,SOLVED,LESSONS,lessonState,inverse,scramble,explain,validateState,classifyColor,coordinates} from './cube-state.js';
import {nextPracticeMove,checkPracticeTurn} from './practice.js';
import {LEARN_TOPICS,checkLearnPick,pieceKind,learnDemo,learnTask,readLearnProgress,createLearnClock} from './learn.js';
import {createNarrator} from './voice.js';
const $=id=>document.getElementById(id);
const refreshIcons=()=>createIcons({icons,attrs:{'aria-hidden':'true'}});
let cube=new Cube(),view,mode='',lesson=0,reverse=false,halfTurns=false,history=[],solution=[],solutionStart='',step=0,playing=false,playVersion=0,requestId=0,solving=false;
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
function updateState(){renderFaces();const item=mode==='learn'?currentLearnStep():null;$('cube-status').textContent=mode==='learn'?(item?item.kind==='turn'?`Try ${item.answer.replace("'",'′')}`:item.kind==='piece'?`Find ${item.answer==='edge'?'an':'a'} ${item.answer}`:item.kind==='face'?`Find ${item.answer} · ${NAMES[item.answer]}`:'Look at the back face':'Choose a topic to begin'):cube.isSolved()?'All colors match':mode==='practice'?'Practice cube':'Your cube';$('undo').disabled=!history.length||isBusy();}
async function perform(move,{manual=false,record=true,duration}={}){if(isBusy()||(manual&&mode==='practice'))return false;if(manual&&mode==='learn')return learnTurn(move);if(manual)invalidate();const next=cube.clone();next.move(move);if(record)history.push(move);cube=next;updateState();try{await view.turn(move,cube.asString(),(mode==='learn'?!learning.motion:matchMedia('(prefers-reduced-motion: reduce)').matches)?0:duration??550);}finally{updateState();}return true;}
function renderFaces(){const key=String(reverse)+String(halfTurns)+cube.asString().split('').filter((_,i)=>i%9===4).join('');if(key===lastFaceKey)return;lastFaceKey=key;const node=$('face-buttons');node.innerHTML=FACES.map(f=>`<button class="face-button" data-face="${f}" aria-label="Turn ${NAMES[f].toLowerCase()} side ${halfTurns?'half turn':reverse?'counterclockwise':'clockwise'}"><b><span class="face-dot" style="--face:${COLORS[cube.asString()[FACES.indexOf(f)*9+4]]}"></span>${f}${halfTurns?'2':reverse?'′':''}</b><span>${NAMES[f]}</span></button>`).join('');node.querySelectorAll('button').forEach(b=>b.onclick=()=>perform(b.dataset.face+(halfTurns?'2':reverse?"'":''),{manual:true}));}
$('half-turns').onclick=()=>{halfTurns=!halfTurns;$('half-turns').setAttribute('aria-pressed',halfTurns);renderFaces();};
$('reverse').onclick=()=>{halfTurns=false;$('half-turns').setAttribute('aria-pressed',false);reverse=!reverse;$('reverse').setAttribute('aria-pressed',reverse);renderFaces();};
$('scramble').onclick=()=>{if(isBusy())return;stopTrainer();invalidate();const moves=scramble();cube.move(moves.join(' '));history.push(...moves);view.setState(cube.asString());updateState();toast('Mixed! Try a move.');};
$('reset').onclick=()=>{if(isBusy())return;stopTrainer();invalidate();cube=new Cube();history=[];view.setState(cube.asString());updateState();toast('All colors match.');};
$('undo').onclick=async()=>{if(isBusy()||!history.length)return;stopTrainer();invalidate();const move=history.pop();await perform(inverse(move),{record:false});};
$('home-view').onclick=()=>{if(!learning.demo)view?.resetCamera(mode==='practice'?.8:1);};
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
let savedWorkspace;
function changeMode(next){
 if(isBusy()){toast('Wait for this turn to finish.');return;}
 stopTrainer();pause();stopLearnDemo();learnVersion++;
 document.querySelector('.workspace').appendChild(document.querySelector('.manual-controls'));
 $('stage').appendChild($('cube-canvas'));
 $('stage').appendChild(document.querySelector('.stage-bottom'));
 if(next==='learn'&&mode!=='learn'){
  savedWorkspace={cube,history,solution,solutionStart,step};invalidate();cube=new Cube();history=[];learning.moves=[];view.setState(cube.asString());
 }else if(mode==='learn'&&next!=='learn'&&savedWorkspace){
  ({cube,history,solution,solutionStart,step}=savedWorkspace);view.setState(cube.asString());view.resetCamera();
 }
 if(next==='practice'&&cube.asString()[4]!=='U'){invalidate();cube=new Cube();history=[];view.setState(cube.asString());}
 if(next==='practice'&&mode!=='practice'){trainer.prompt=trainer.before=null;displayPrompt();$('trainer-replay').disabled=true;}
 if(next==='practice')view.resetCamera(.8);
 if(next!=='learn')document.querySelector('.manual-controls').querySelectorAll('button').forEach(button=>button.disabled=false);
 mode=next;
 $('learn-panel').classList.toggle('hidden',next!=='learn');
 $('learn-lesson').classList.toggle('hidden',next!=='learn'||!currentLearnStep());
 $('learn-visual').classList.toggle('hidden',next!=='learn'||!currentLearnStep());
 $('trainer-panel').classList.toggle('hidden',next!=='practice');
 $('learning-panel').classList.toggle('hidden',['learn','practice'].includes(next));
 document.querySelector('.workspace').classList.toggle('learn-mode',next==='learn');
 document.querySelector('.workspace').classList.toggle('learning-active',next==='learn'&&!!currentLearnStep());
 document.querySelector('.workspace').classList.toggle('practice-mode',next==='practice');
 $('practice-prompt').classList.toggle('hidden',next!=='practice'||!trainer.prompt);
 $('method').value=next==='beginner'?'beginner':next==='quick'?'quick':'guided';
 ['learn','solve','practice'].forEach(name=>{const active=name==='solve'?['beginner','guided','quick'].includes(next):name===next;$(name+'-nav').classList.toggle('active',active);$(name+'-nav').setAttribute('aria-pressed',active);});
 $('learn-flat').classList.toggle('hidden',next!=='learn');
 document.querySelector('.cube-actions').classList.toggle('hidden',next==='learn');
 document.querySelector('.manual-controls').classList.toggle('hidden',['learn','practice'].includes(next));
 $('cube-canvas').setAttribute('aria-label',next==='practice'?'Animated practice cube. Follow each move on your physical cube. Drag to look around.':next==='learn'?'Interactive learning cube. Drag to look around. Tap a piece to answer, or use the flat view below.':'3D cube. Swipe a face to turn a layer. Drag outside to look around. Side buttons provide precise turns.');
 document.querySelector('.stage-bottom').textContent=next==='practice'?'Green in front. White on top.':next==='learn'?'':'Swipe a face to turn. Drag outside to look.';
 $('face-labels').classList.add('hidden');$('labels-toggle').setAttribute('aria-pressed',false);
 if(next==='learn')renderLearn();
 renderLessons();renderPlayback();updateState();
}
$('method').onchange=event=>changeMode(event.target.value);
$('learn-nav').onclick=()=>changeMode('learn');
$('solve-nav').onclick=()=>changeMode('guided');
$('practice-nav').onclick=()=>changeMode('practice');
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
function bindDialog(id,open,close){$(open).onclick=()=>{pause();stopTrainer();if(mode==='learn')pauseLearnDemo();$(id).showModal();};$(close).onclick=()=>$(id).close();$(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close();}});}
bindDialog('help-dialog','help-button','close-help');
// Practice demonstrates turns; the physical cube stays in the user's hands.
const trainer={active:false,prompt:null,before:null,deadline:0,timer:null};
const practiceInterval=()=>Math.max(Number($('trainer-pace').value)*1000,Number($('trainer-animation-speed').value)+300);
const trainerFaces=()=>Array.from($('trainer-faces').querySelectorAll('input:checked'),input=>input.value);
function renderTrainerFaces(){
 $('trainer-faces').innerHTML=FACES.map(face=>`<label><input type="checkbox" value="${face}" checked><span>${NAMES[face]} (${face}/${face}′)</span></label>`).join('');
 $('trainer-faces').querySelectorAll('input').forEach(input=>input.onchange=()=>{
  const selected=trainerFaces();
  $('trainer-faces').querySelectorAll('input').forEach(option=>option.disabled=option.checked&&selected.length===1);
 });
}
renderTrainerFaces();
function displayPrompt(){$('trainer-move').textContent=trainer.prompt?.replace("'",'′')??'';$('practice-prompt').classList.toggle('hidden',!trainer.prompt||mode!=='practice');}
function trainerFeedback(text){$('trainer-feedback').textContent=text;$('trainer-feedback').classList.toggle('hidden',!text);}
function nextPrompt(){
 trainer.before=cube.asString();
 trainer.prompt=nextPracticeMove(trainer.prompt,$('trainer-doubles').checked,trainerFaces());displayPrompt();
 demonstratePracticeMove();
}
function demonstratePracticeMove(){
 $('trainer-replay').disabled=true;
 trainer.deadline=performance.now()+practiceInterval();
 narrator.say(`${trainer.prompt[0]}${trainer.prompt.endsWith("'")?' prime':trainer.prompt.endsWith('2')?' two':''}`);
 perform(trainer.prompt,{record:false,duration:Number($('trainer-animation-speed').value)}).catch(()=>{stopTrainer();trainerFeedback('The animation stopped. Press Start to try again.');}).finally(()=>{$('trainer-replay').disabled=false;});
}
function tickTrainer(){
 if(!trainer.active)return;
 if(performance.now()>=trainer.deadline&&!isBusy())nextPrompt();
 trainer.timer=requestAnimationFrame(tickTrainer);
}
function stopTrainer(){
 narrator.cancel();trainer.active=false;cancelAnimationFrame(trainer.timer);
 $('trainer-start').innerHTML='<i data-lucide="play"></i>Start';
 trainerFeedback('');refreshIcons();
}
$('trainer-start').onclick=()=>{
 if(trainer.active){stopTrainer();return;}
 if(isBusy())return;
 invalidate();history=[];trainer.active=true;trainer.deadline=0;
 trainerFeedback('Follow each move on your own cube.');
 $('trainer-start').innerHTML='<i data-lucide="square"></i>Stop';refreshIcons();tickTrainer();
};
$('trainer-replay').onclick=()=>{
 if(mode!=='practice'||!trainer.before||isBusy())return;
 cube=Cube.fromString(trainer.before);view.setState(trainer.before);
 demonstratePracticeMove();
};
$('trainer-pace').onchange=$('trainer-animation-speed').onchange=()=>{if(trainer.active)trainer.deadline=performance.now()+practiceInterval();};
// Learn uses its own prepared cube; leaving restores the user's solve/practice state.
let savedLearnMotion,savedLearnPositions=readLearnProgress();try{savedLearnMotion=localStorage.getItem('cubie-learn-motion');savedLearnPositions=readLearnProgress(localStorage.getItem('cubie-learn-progress'));}catch{}
const learning={motion:savedLearnMotion?savedLearnMotion==='on':!matchMedia('(prefers-reduced-motion: reduce)').matches,topic:null,positions:savedLearnPositions,completed:[...savedLearnPositions],answered:false,partial:null,flatFace:'F',moves:[],demo:false,beat:0,clock:createLearnClock(),phase:'try',controller:null,run:null};
let learnVersion=0;
const currentLearnTopic=()=>LEARN_TOPICS[learning.topic];
const currentLearnStep=()=>currentLearnTopic()?.steps[learning.positions[learning.topic]];
const topicDone=index=>learning.completed[index]===LEARN_TOPICS[index].steps.length;
function learnFeedback(text,kind=''){
 $('learn-feedback').textContent=text;$('learn-feedback').className='learn-feedback '+kind;
}
function resetLearnCube(){
 cube=new Cube();history=[];learning.moves=[];learning.flatFace='F';view.clearTeaching();view.setState(cube.asString());
 reverse=halfTurns=false;$('reverse').setAttribute('aria-pressed',false);$('half-turns').setAttribute('aria-pressed',false);updateState();
}
function renderLearnFlat(){
 $('learn-flat-faces').innerHTML=FACES.map(f=>`<button data-look="${f}" aria-pressed="${f===learning.flatFace}"><span class="face-dot" style="--face:${COLORS[f]}"></span>${COLOR_NAMES[f]}</button>`).join('');
 $('learn-flat-faces').querySelectorAll('button').forEach(button=>button.onclick=()=>{
  if(isBusy()||learning.demo)return;learning.flatFace=button.dataset.look;view.lookAtFace(learning.flatFace,8.8);renderLearnFlat();$('learn-flat-grid').querySelector('button').focus({preventScroll:true});
 });
 $('learn-flat-grid').innerHTML=Array.from({length:9},(_,i)=>`<button data-square="${i}" style="--sticker:${COLORS[learning.flatFace]}" aria-label="${COLOR_NAMES[learning.flatFace]} face, row ${Math.floor(i/3)+1}, column ${i%3+1}">${i===4?'●':''}</button>`).join('');
 $('learn-flat-grid').querySelectorAll('button').forEach(button=>button.onclick=()=>learnPick({face:learning.flatFace,position:coordinates(learning.flatFace,Number(button.dataset.square))}));
}
function renderLearn({focus=false}={}){
 if(learning.answered&&learning.topic!==null)learning.positions[learning.topic]=learning.completed[learning.topic];
 const topic=currentLearnTopic(),item=currentLearnStep(),complete=topic&&topicDone(learning.topic);
 $('cube-canvas').setAttribute('aria-label',item?.kind==='turn'?'3D learning cube. Swipe a face to turn a layer, or use the side buttons under the task. Drag outside the cube to look around.':'3D learning cube. Drag to look around. Tap a piece to answer, or use the flat view.');
 stopLearnDemo();learning.answered=false;learning.partial=null;learning.phase=item?'watch':'try';learnVersion++;narrator.cancel();
 view.clearTeaching();updateState();
 document.querySelector('.workspace').classList.toggle('learning-active',!!item);
 $('stage').appendChild($('learn-lesson'));
 $('learn-panel').appendChild($('learn-flat'));
 if(item){
  document.querySelector('.learn-watch-row').after($('learn-visual'));
  $('learn-visual').after($('cube-canvas'));
  $('learn-beats').after(document.querySelector('.stage-bottom'));
  $('learn-feedback').after($('learn-demo-controls'));
  $('learn-lesson').appendChild($('learn-explanation'));
  $('learn-lesson').appendChild($('learn-flat'));
 }
 $('learn-visual').classList.toggle('hidden',!item);
 $('learn-explanation').open=false;
 $('learn-menu').classList.toggle('hidden',!!topic);
 $('learn-lesson').classList.toggle('hidden',!item);
 $('learn-complete').classList.toggle('hidden',!complete);
 $('learn-flat').classList.toggle('hidden',!item||item.kind==='turn');
 const controls=document.querySelector('.manual-controls');
 controls.classList.toggle('hidden',item?.kind!=='turn');
 if(item?.kind==='turn')document.querySelector('.learn-task').after(controls);else document.querySelector('.workspace').appendChild(controls);
 document.querySelector('.cube-actions').classList.toggle('hidden',mode==='learn');
 $('learn-total').textContent=`${LEARN_TOPICS.filter((_,i)=>topicDone(i)).length} / 4 topics learned`;
 $('learn-practice').classList.toggle('hidden',!LEARN_TOPICS.every((_,i)=>topicDone(i)));
 $('learn-topics').innerHTML=LEARN_TOPICS.map((t,i)=>`<button data-topic="${i}" class="learn-topic"><span class="topic-symbol" aria-hidden="true">${topicDone(i)?'✓':t.symbol}</span><span><strong>${t.name}</strong><small>${t.subtitle}</small></span><span class="topic-time">${topicDone(i)?'Learned':learning.completed[i]?`Resume · ${learning.completed[i]}/${t.steps.length}`:t.time}<span aria-hidden="true"> →</span></span></button>`).join('');
 $('learn-topics').querySelectorAll('button').forEach(button=>button.onclick=()=>openLearnTopic(Number(button.dataset.topic)));
 if(item){
  $('learn-topic-name').textContent=topic.name;$('learn-count').textContent=`${learning.positions[learning.topic]+1} / ${topic.steps.length}`;
  $('learn-progress').max=topic.steps.length;$('learn-progress').value=learning.positions[learning.topic];
  $('learn-title').textContent=item.title;$('learn-copy').innerHTML=item.copy;$('learn-task').textContent=learnTask(item);
  $('learn-direction').classList.toggle('hidden',item.kind!=='turn');
  $('learn-hint-copy').textContent=item.hint;$('learn-hint-copy').classList.add('hidden');$('learn-hint').setAttribute('aria-expanded',false);
  $('learn-next').disabled=true;$('learn-next').innerHTML=`${learning.positions[learning.topic]===topic.steps.length-1?'Finish topic':'Continue'}<i data-lucide="arrow-right"></i>`;
  $('learn-check-view').classList.toggle('hidden',item.kind!=='view');
  $('learn-demo-controls').appendChild($('learn-next'));
  $('learn-beats').innerHTML=learnDemo(item).map((beat,i)=>`<button data-beat="${i}" aria-label="Watch scene ${i+1}: ${beat.label}">${i+1}</button>`).join('');
  $('learn-beats').querySelectorAll('button').forEach(button=>button.onclick=()=>startLearnDemo(Number(button.dataset.beat),false));
  learnFeedback('');renderLearnFlat();
  if(focus)$('learn-title').focus({preventScroll:true});
 }else if(complete){
  $('learn-complete-title').textContent=`${topic.name}: learned!`;$('learn-takeaway').textContent=topic.takeaway;
  const next=LEARN_TOPICS.findIndex((_,i)=>!topicDone(i));
  $('learn-continue').textContent=next===-1?'Put it to work in Practice →':`Next: ${LEARN_TOPICS[next].name} →`;
  $('learn-continue').onclick=()=>next===-1?changeMode('practice'):openLearnTopic(next);
  if(focus)$('learn-complete-title').focus({preventScroll:true});
 }
 refreshIcons();
 if(focus&&item)$('stage').scrollIntoView({block:'start'});
 if(item)queueMicrotask(()=>startLearnDemo());
}
function openLearnTopic(index){if(isBusy())return;learning.topic=index;learning.positions[index]=learning.completed[index];learning.answered=false;renderLearn({focus:true});}
function finishLearnAnswer(){
 learning.answered=true;setLearnPhase('checked');$('learn-caption').textContent='You got it!';$('learn-next').disabled=false;$('cube-status').textContent='You got it!';
 $('learn-progress').value=learning.positions[learning.topic]+1;
 learning.completed[learning.topic]=Math.max(learning.completed[learning.topic],learning.positions[learning.topic]+1);saveLearnProgress();learnFeedback(currentLearnStep().success,'correct');$('learn-next').focus({preventScroll:true});
}
function learnPick(pick){
 const item=currentLearnStep();if(mode!=='learn'||!item||learning.answered||isBusy()||learning.phase!=='try'||!['piece','face'].includes(item.kind))return;
 const correct=checkLearnPick(item,pick),selected=pieceKind(pick.position);view.markPiece(pick.position);
 if(correct)finishLearnAnswer();
 else if(item.face&&pick.face!==item.face)learnFeedback(`That’s the ${COLOR_NAMES[pick.face].toLowerCase()} face. ${learnTask(item)}`,'wrong');
 else learnFeedback(item.kind==='piece'?`That’s ${selected==='edge'?'an':'a'} ${selected}. Try ${item.answer==='edge'?'an':'a'} ${item.answer}. Use a hint if you need one.`:`That’s ${pick.face} · ${NAMES[pick.face]}. Try again. You can drag to look around.`,'wrong');
}
async function learnTurn(move){
 const item=currentLearnStep();if(!item||item.kind!=='turn'||learning.answered||learning.phase!=='try')return false;
 const version=learnVersion,checked=checkPracticeTurn(item.answer,move,learning.partial);
 await perform(move,{record:false});learning.moves.push(move);
 if(version!==learnVersion)return false;
 learning.partial=checked.partial;
 if(checked.result==='correct')finishLearnAnswer();
 else if(checked.result==='partial')learnFeedback('Yes — one more quarter turn the same way.');
 else{await rewindLearnMoves(new AbortController().signal);resetLearnCube();learning.partial=null;learnFeedback(`That was ${move.replace("'",'′')}. The cube is reset. Try ${item.answer.replace("'",'′')} again, or replay the demo.`,'wrong');}
 return true;
}
$('learn-back').onclick=$('learn-all').onclick=()=>{if(isBusy())return;learning.topic=null;renderLearn();$('learn-topics').querySelector('button').focus({preventScroll:true});};
$('learn-review').onclick=()=>{learning.positions[learning.topic]=learning.completed[learning.topic]=0;learning.answered=false;saveLearnProgress();renderLearn({focus:true});};
$('learn-next').onclick=()=>{if(!learning.answered||isBusy())return;learning.positions[learning.topic]++;learning.answered=false;saveLearnProgress();renderLearn({focus:true});};
$('learn-hint').onclick=()=>{const hidden=$('learn-hint-copy').classList.toggle('hidden');$('learn-hint').setAttribute('aria-expanded',!hidden);};
 $('learn-hear').onclick=()=>{const item=currentLearnStep();if(item)narrator.say(`${$('learn-copy').textContent} ${item.task}`);};
$('learn-check-view').onclick=()=>{const item=currentLearnStep();if(!item||learning.answered||learning.phase!=='try')return;if(view.isFacing(item.answer))finishLearnAnswer();else learnFeedback('Keep looking around until the blue face points toward you. Then check again.','wrong');};
function setLearnPhase(phase){
 learning.phase=phase;
 $('learn-visual').classList.toggle('is-exercise',phase==='try');
 for(const [id,value] of [['learn-watch-status','watch'],['learn-try-status','try'],['learn-check-status','checked']])$(id).classList.toggle('active',phase===value);
 $('learn-task').textContent=learnTask(currentLearnStep());
 $('learn-try').classList.toggle('hidden',phase!=='watch');
 $('learn-play').classList.toggle('hidden',phase!=='watch');
 $('learn-next').classList.toggle('hidden',phase==='watch');
 $('learn-check-view').disabled=phase!=='try';
 document.querySelector('.manual-controls').classList.toggle('hidden',phase!=='try'||currentLearnStep().kind!=='turn');
 document.querySelector('.manual-controls').querySelectorAll('button').forEach(button=>button.disabled=phase!=='try');
 $('learn-flat').classList.toggle('hidden',phase!=='try'||currentLearnStep().kind==='turn');
 $('learn-direction').classList.toggle('hidden',phase==='watch'||currentLearnStep().kind!=='turn');
}
function saveLearnProgress(){
 const completed=Object.fromEntries(LEARN_TOPICS.map((topic,i)=>[topic.id,learning.completed[i]]));
 try{localStorage.setItem('cubie-learn-progress',JSON.stringify(completed));}catch{toast('Progress couldn’t be saved in this browser.');}
}
function renderLearnPlay(){
 const playing=learning.demo&&!learning.clock.paused;
 $('learn-play').innerHTML=`<i data-lucide="${playing?'pause':'play'}"></i>${playing?'Pause':'Play'}`;refreshIcons();
}
function pauseLearnDemo(){
 if(!learning.demo)return;
 learning.clock.pause();renderLearnPlay();
}
function stopLearnDemo(){
 learning.controller?.abort();learning.controller=null;learning.demo=false;learning.clock.play();
 if(view){view.focusVersion=(view.focusVersion||0)+1;view.controls.enabled=true;view.focusing=false;}
 renderLearnPlay();
}
function demoHold(ms,signal,clock){
 return new Promise(resolve=>{
  const start=clock.now();
  const frame=()=>{if(signal.aborted||clock.now()-start>=ms)resolve();else requestAnimationFrame(frame);};
  requestAnimationFrame(frame);
 });
}
async function rewindLearnMoves(signal){
 view.clearTeaching();
 if(learning.moves.length)$('learn-caption').textContent='Rewinding…';
 while(learning.moves.length&&!signal.aborted){
  const move=inverse(learning.moves.pop());cube.move(move);await view.turn(move,cube.asString(),learning.motion?700:0,{clock:learning.clock});
 }
}
function startLearnTry(){
 const version=learnVersion,previous=learning.run;stopLearnDemo();
 const controller=new AbortController();learning.controller=controller;learning.demo=true;
 renderLearnPlay();
 learning.run=(async()=>{
  await previous;
  if(version!==learnVersion||controller.signal.aborted||mode!=='learn'||!currentLearnStep())return;
  await rewindLearnMoves(controller.signal);
  if(controller.signal.aborted)return;
  resetLearnCube();
  const item=currentLearnStep();
  await view.focusTeaching({face:item.kind==='turn'?item.answer[0]:'F',...(item.kind==='turn'?{}:{look:[0,5.4,10.7]})},{signal:controller.signal,clock:learning.clock,duration:learning.motion?1000:0});
  if(controller.signal.aborted)return;
  learning.demo=false;learning.controller=null;learning.partial=null;learning.answered=false;setLearnPhase('try');
  renderLearnPlay();
  $('learn-caption').textContent=learnTask(item);$('learn-colors').replaceChildren();
  $('learn-beats').querySelectorAll('button').forEach(button=>button.removeAttribute('aria-current'));
  learnFeedback('');renderLearnFlat();updateState();
 })();
}
function startLearnDemo(start=0,autoplay=true){
 if(mode!=='learn'||!currentLearnStep()||isBusy()&&!learning.demo)return;
 const previous=learning.run;stopLearnDemo();
 const controller=new AbortController(),{signal}=controller,version=learnVersion;
 learning.controller=controller;learning.demo=true;renderLearnPlay();
 learning.run=(async()=>{
  await previous;
  if(signal.aborted||version!==learnVersion)return;
  const item=currentLearnStep(),beats=learnDemo(item),reduced=!learning.motion,clock=learning.clock;
  await rewindLearnMoves(signal);if(signal.aborted||version!==learnVersion)return;
  resetLearnCube();learning.partial=null;learning.answered=false;$('learn-next').disabled=true;setLearnPhase('watch');learnFeedback('');
  renderLearnPlay();
  for(const beat of beats.slice(0,start))if(beat.turn){cube.move(beat.turn);learning.moves.push(beat.turn);await view.turn(beat.turn,cube.asString(),reduced?0:700,{clock});if(signal.aborted)return;}
  try{
   for(let i=start;i<beats.length;i++){
    if(signal.aborted||version!==learnVersion)return;
    const beat=beats[i];learning.beat=i;view.teach(beat);
    $('learn-caption').textContent=beat.caption;
    $('learn-colors').innerHTML=(beat.colors||[]).map(face=>`<span><i style="background:${COLORS[face]}"></i>${COLOR_NAMES[face]}</span>`).join('');
    $('learn-beats').querySelectorAll('button').forEach((button,index)=>{if(index===i)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
    await view.focusTeaching(beat,{signal,clock,duration:reduced?0:1000});
    if(signal.aborted||version!==learnVersion)return;
    if(beat.turn){
     cube.move(beat.turn);learning.moves.push(beat.turn);await view.turn(beat.turn,cube.asString(),reduced?0:1500,{clock});
    }
    if(!autoplay)return;
    await demoHold(beat.turn?900:1400,signal,clock);
   }
  }catch(error){console.error(error);if(!signal.aborted)learnFeedback('Replay the demo, or try it yourself.');return;}
  finally{
   if(learning.controller===controller){learning.demo=false;renderLearnPlay();}
  }
  if(!signal.aborted&&version===learnVersion){
   // Leave the demo promise before entering Try, which waits for any in-flight turn.
   queueMicrotask(()=>startLearnTry());
  }
 })();
}
function renderLearnMotion(){
 $('learn-motion').setAttribute('aria-pressed',learning.motion);$('learn-motion').title=learning.motion?'Animation on':'Animation off';
}
$('learn-motion').onclick=()=>{
 learning.motion=!learning.motion;try{localStorage.setItem('cubie-learn-motion',learning.motion?'on':'off');}catch{}
 renderLearnMotion();if(learning.phase==='watch')startLearnDemo(Number($('learn-beats').querySelector('[aria-current=step]')?.dataset.beat||0),false);
};
renderLearnMotion();
$('learn-play').onclick=()=>{if(!learning.demo)startLearnDemo(learning.beat);else if(learning.clock.paused){learning.clock.play();renderLearnPlay();}else pauseLearnDemo();};
$('learn-demo').onclick=()=>startLearnDemo();
$('learn-try').onclick=startLearnTry;
$('learn-practice').onclick=()=>changeMode('practice');
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
window.addEventListener('keydown',event=>{if(document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)||event.metaKey||event.ctrlKey||event.altKey||event.repeat)return;const key=event.key.toUpperCase();if(FACES.includes(key)){event.preventDefault();perform(key+(event.shiftKey?"'":''),{manual:true});}else if(key==='S'&&!['learn','practice'].includes(mode)){event.preventDefault();$('scramble').click();}else if(event.code==='Space'){if(mode==='learn'||document.activeElement?.tagName==='BUTTON')return;event.preventDefault();if(mode==='practice')$('trainer-start').click();else if(mode!=='learn')play();}});
window.addEventListener('pagehide',()=>{stopTrainer();stopLearnDemo();stopCamera();worker.terminate();view?.dispose();});document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();if(mode==='learn')pauseLearnDemo();if(trainer.active){stopTrainer();trainerFeedback('Practice paused. Come back when you’re ready.');}if(stream)stopCamera();}});
$('cube-canvas').addEventListener('pointerdown',()=>{if(mode==='learn'&&learning.demo)stopLearnDemo();},{capture:true});
view?.enableFaceTurns(move=>{if(!document.querySelector('dialog[open]'))perform(move,{manual:true});},{canTurn:()=>mode!=='practice'&&(mode!=='learn'||learning.phase==='try'&&currentLearnStep()?.kind==='turn'),onPick:pick=>{if(!document.querySelector('dialog[open]'))learnPick(pick);}});
renderFaces();renderLessons();renderPlayback();displayPrompt();updateState();refreshIcons();changeMode('learn');
