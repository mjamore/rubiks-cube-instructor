import {NAMES,COLOR_NAMES} from './cube-state.js';

export function pieceKind(position){
 return ['inside','center','edge','corner'][position.filter(n=>Math.abs(n)===1).length];
}
export function checkLearnPick(step,pick){
 return step.kind==='piece'?pieceKind(pick.position)===step.answer&&(!step.face||pick.face===step.face):step.kind==='face'&&pick.face===step.answer;
}
const faceSteps=['F','U','R','L','B','D'].map(face=>({
 kind:'face',answer:face,title:`${face} means ${NAMES[face].toLowerCase()}`,
 copy:({F:'Front faces you when you start. The opposite side is back.',U:'Up faces the ceiling. Its letter is U, just like “up”.',R:'Right is on your right when you face the front.',L:'Left is opposite right. Keep the same front as you explore.',B:'Back is opposite front. Drag to peek behind the cube.',D:'Down faces the floor. Its letter is D, just like “down”.'})[face],
 task:`${['B','D','L'].includes(face)?'Drag to find it, then tap':'Tap'} the ${NAMES[face].toLowerCase()} face. Any square on that side works.`,
 hint:`In this lesson, look for the ${COLOR_NAMES[face].toLowerCase()} center. Dragging to look does not rename the sides.`,
 success:`Yes! ${face} = ${NAMES[face]}. ${COLOR_NAMES[face]} is its center in this lesson.`
}));
export const LEARN_TOPICS=[
 {id:'pieces',name:'Parts of the cube',subtitle:'Faces/centers, edges, and corners',time:'2 min',symbol:'▦',takeaway:'A cube has 6 faces. Each center sets its face’s color. Centers have 1 color, edges have 2, and corners have 3.',steps:[
  {kind:'piece',answer:'center',face:'B',title:'Faces and centers',copy:'A cube has 6 sides called <strong>faces</strong>. Each face’s center piece sets its color. A <strong>blue</strong> <strong>center</strong> means that’s the <strong>blue face</strong>.',task:'Drag to rotate the cube to the blue face. Tap its center piece.',hint:'Look behind the cube for blue. Tap the middle square, or choose Blue in the flat view.',success:'Yes! The blue center marks the blue face.'},
  {kind:'piece',answer:'edge',face:'F',title:'Edges',copy:'An edge has 2 colors. It sits where 2 faces meet, between two corners.',task:'Drag to rotate the cube to the green face. Tap any edge piece on that face.',hint:'Find green. Tap a square directly above, below, left, or right of its center.',success:'That’s an edge: 2 colors on one piece.'},
  {kind:'piece',answer:'corner',face:'R',title:'Corners',copy:'A corner has 3 colors. It sits where 3 faces meet.',task:'Drag to rotate the cube to the red face. Tap any corner piece on that face.',hint:'Find red. Tap one of the four corner squares on that face.',success:'That’s a corner: 3 colors on one piece.'}
 ]},
 {id:'sides',name:'The 6 sides',subtitle:'U, D, F, B, R & L',time:'3 min',symbol:'U',takeaway:'U = Up · D = Down · F = Front · B = Back · R = Right · L = Left. Letters name positions, not colors. Pick how to hold a real cube first, then keep that front and up while following a move sequence.',steps:[
  {...faceSteps[0],copy:'A face is one whole side. Start with white facing up and green in front. Letters name positions, not colors. We use these colors to help you learn.'},
  ...faceSteps.slice(1),
  {kind:'face',answer:'U',title:'Can you remember U?',copy:'Try the letter on its own. You can always look back at a hint.',task:'Find and tap the U face.',hint:'U means Up. In this lesson it has a white center.',success:'U is Up. You’ve got it.'},
  {kind:'face',answer:'D',title:'And its opposite: D?',copy:'Look around without turning a layer. Keep your original front and up in mind.',task:'Find and tap the D face.',hint:'D means Down. Look underneath for the yellow center.',success:'D is Down. You found all six sides!'}
 ]},
 {id:'movement',name:'Look or turn?',subtitle:'Move your view, then a layer',time:'1 min',symbol:'↻',takeaway:'Looking around changes what you see. A face turn moves a layer of 9 pieces. The face is the outer surface; the layer includes the pieces behind it. Keep your starting front and up in mind as you look.',steps:[
  {kind:'view',answer:'B',title:'Look around the whole cube',copy:'Dragging in Learn lets you look around. No pieces change places. In Solve, drag outside the cube to look; swipe a face to turn a layer. In Practice, follow the animated moves on your own cube.',task:'Drag until the blue back face faces you. Then check your view.',hint:'Drag sideways to look behind the cube. Or open the flat view and choose the blue side.',success:'You changed your view. All the pieces stayed together, and back is still B.'},
  {kind:'turn',answer:'U',title:'Now turn just one layer',copy:'A layer is a slice of the cube. U turns the up layer a quarter turn clockwise, as seen looking down at the up face. The other two layers stay still.',task:'Make a U turn: tap U · Up, or swipe that face.',hint:'Leave Prime and Twice off, then tap U. Watch the row of side stickers move too.',success:'That moved one layer! Looking and turning do different jobs.'}
 ]},
 {id:'notation',name:'Read a move',subtitle:'Clockwise, prime & half turns',time:'2 min',symbol:'R′',takeaway:'For all 6 faces, look straight at the face you turn. A letter alone means a clockwise quarter turn. A prime (′) means counterclockwise. A 2 means a half turn in either direction. A move and its prime undo each other.',steps:[
  {kind:'turn',answer:'R',title:'R · Clockwise ↻',copy:'A letter alone means a quarter turn (90°) clockwise. Look straight at the face you turn: its top moves right, like a clock’s hands. This rule works for all 6 faces.',task:'Look at the right face. Make R: turn that layer a quarter turn clockwise.',hint:'Leave Prime and Twice off. Tap R · Right, or replay the animation first.',success:'R turns the right layer clockwise, viewed from the right face.'},
  {kind:'turn',answer:"R'",title:'R′ · Counterclockwise ↺',copy:'The mark ′ is called “prime”. R′ is read “R prime”. It means a quarter turn counterclockwise: looking straight at the right face, its top moves left.',task:'Make R′: turn the right layer a quarter turn counterclockwise.',hint:'Turn Prime on, leave Twice off, then tap R′ · Right.',success:'R′ turns the right layer counterclockwise. R and R′ undo each other.'},
  {kind:'turn',answer:'F2',title:'F2 · Half turn',copy:'A 2 means a half turn: two quarter turns of the same layer. Either direction ends in the same place.',task:'Make F2. Turn the front layer twice.',hint:'Choose Twice, then F · Front. Or make two matching quarter turns of F.',success:'F2: two quarter turns, or one half turn. That’s what the 2 means.'},
  {kind:'turn',answer:"D'",title:'D′ · Counterclockwise ↺',copy:'D′ means “D prime”. Look at the down face from underneath the cube, then turn it a quarter turn counterclockwise. Always judge direction from the face you turn.',task:'Make D′: turn the down layer counterclockwise, viewed from underneath.',hint:'Turn Prime on and Twice off, then tap D′ · Down. The face letters stay the same as you look around.',success:'D′ turns the down layer counterclockwise, viewed from underneath. The same rule works for every face.'}
 ]}
];

// Each beat uses the real cube, not a video: the same pieces remain visible as the view moves.
export function learnDemo(step){
 const face=step.face||step.answer[0];
 if(step.kind==='piece'&&step.answer==='center')return [
  {face:'F',look:[5,5,8],focus:'cube',label:'6 sides',caption:'A cube has 6 sides.',detail:'Let’s look at the color of each side.'},
  {label:'The 6 colored sides',caption:'Let’s look at all 6 sides.',scenes:['F','R','B','L','U','D'].map((face,i)=>({face,focus:'face',label:`${COLOR_NAMES[face]} side`,caption:`This side is ${COLOR_NAMES[face].toLowerCase()}.`,detail:`Side ${i+1} of 6 · Look at the whole highlighted side.`,colors:[face]}))},
  {face:'F',focus:'face',label:'1 side = 1 face',caption:'Each side is called a face.',detail:'There are 6 sides, so a cube has 6 faces.'},
  {label:'Centers name the faces',caption:'The center color names the face.',scenes:['F','R','B','L','U','D'].map(face=>({face,focus:'center',label:`${COLOR_NAMES[face]} center`,caption:'The center color names the face.',detail:`The ${COLOR_NAMES[face].toLowerCase()} center marks the ${COLOR_NAMES[face].toLowerCase()} face. Look at the middle square.`,colors:[face]}))}
 ];
 if(step.kind==='piece'){
  const edge=step.answer==='edge';
  return [
   {face:'F',focus:step.answer,label:edge?'12 edges':'8 corners',caption:edge?'Edges join 2 faces.':'Corners join 3 faces.'},
   {face:'F',look:[5,5,8],focus:step.answer,position:edge?[0,1,1]:[1,1,1],label:edge?'1 edge · 2 colors':'1 corner · 3 colors',caption:'One piece. Several stickers.',colors:edge?['F','U']:['F','U','R']},
   {face:edge?'U':'R',look:edge?[-5,6,7]:[7,5,5],focus:step.answer,position:edge?[0,1,1]:[1,1,1],label:'Same piece',caption:edge?'2 colors stay together.':'3 colors stay together.',colors:edge?['F','U']:['F','U','R']}
  ];
 }
 if(step.kind==='face')return [
  {face:'F',look:[0,5.4,10.7],focus:'face',label:'F · Front',caption:'Start here: green front, white up.'},
  {face,focus:'face',label:`${face} · ${NAMES[face]}`,caption:'Letters name positions, not colors.',colors:[face]}
 ];
 if(step.kind==='view')return ['F','R','B'].map(face=>({face,focus:'face',label:`${face} · ${NAMES[face]}`,caption:'Look around. No pieces move.'}));
 const move=step.answer,half=move.endsWith('2'),prime=move.endsWith("'");
 return [
  {face,look:[5,5,8],focus:'layer',label:'1 layer · 9 pieces',caption:'Only this slice moves.'},
  {face,focus:'layer',label:`${move.replace("'",'′')} · ${half?'180°':prime?'↺ 90°':'↻ 90°'}`,caption:'Look straight at the face you turn.',arrow:prime?-1:1,half,turn:half?face:move},
  ...(half?[{face,focus:'layer',label:`${face}2 · 180°`,caption:'Two quarter turns = one half turn.',arrow:1,half:true,turn:face}]:[]),
  {face,look:[5,5,8],focus:'layer',label:'Same layer',caption:'The other 2 layers stayed still.'}
 ];
}

export function learnSceneTiming(scene){
 return {camera:1400,turn:scene.turn?2000:0,hold:Math.max(3200,`${scene.caption} ${scene.detail||''}`.length*55)};
}
export function learnDemoDuration(beat){
 return (beat.scenes||[beat]).reduce((total,scene)=>total+Object.values(learnSceneTiming(scene)).reduce((sum,ms)=>sum+ms,0),0);
}

export function learnTask(step){
 if(step.kind==='piece'&&step.answer==='center')return `Rotate to the ${COLOR_NAMES[step.face].toLowerCase()} face. Tap the center.`;
 if(step.kind==='piece')return `Find ${COLOR_NAMES[step.face].toLowerCase()}. Tap ${step.answer==='center'?'the':step.answer==='edge'?'an':'a'} ${step.answer}.`;
 if(step.kind==='face')return `Find and tap ${step.answer} · ${NAMES[step.answer]}.`;
 if(step.kind==='view')return 'Drag to blue. Make it face you.';
 return `Make ${step.answer.replace("'",'′')}. Swipe the layer or use the buttons.`;
}

export function readLearnProgress(raw){
 let saved;try{saved=JSON.parse(raw);}catch{}
 return LEARN_TOPICS.map(topic=>{
  const count=saved?.[topic.id];
  return Number.isInteger(count)&&count>=0&&count<=topic.steps.length?count:0;
 });
}

// Paused time does not count toward camera motion, layer turns, or scene holds.
export function createLearnClock(now=()=>performance.now()){
 let paused=false,rate=1,previous=now(),elapsed=0;
 function tick(){const current=now();if(!paused)elapsed+=(current-previous)*rate;previous=current;return elapsed;}
 return {
  get paused(){return paused;},
  now:tick,
  pause(){tick();paused=true;},
  play(){tick();paused=false;},
  setRate(value){if(!Number.isFinite(value)||value<=0)return;tick();rate=value;}
 };
}
