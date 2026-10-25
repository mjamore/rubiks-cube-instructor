import Cube from './vendor/cubejs/cube.js';
export const FACES = ['U','R','F','D','L','B'];
export const COLORS = {U:'#f8f6ed',R:'#e85453',F:'#48b591',D:'#f5cc54',L:'#f49b47',B:'#528bd4'};
export const NAMES = {U:'Top',R:'Right',F:'Front',D:'Bottom',L:'Left',B:'Back'};
export const COLOR_NAMES = {U:'White',R:'Red',F:'Green',D:'Yellow',L:'Orange',B:'Blue'};
export const SOLVED = FACES.map(f=>f.repeat(9)).join('');
export const TURN = {U:['y',1,-1],R:['x',1,-1],F:['z',1,-1],D:['y',-1,1],L:['x',-1,1],B:['z',-1,1]};
export function inverse(move){return move.endsWith('2')?move:move.endsWith("'")?move[0]:move+"'";}
export function inverseSequence(moves){return [...moves].reverse().map(inverse);}
export function coordinates(face,index){const row=Math.floor(index/3),col=index%3;switch(face){case'U':return[col-1,1,row-1];case'R':return[1,1-row,1-col];case'F':return[col-1,1-row,1];case'D':return[col-1,-1,1-row];case'L':return[-1,1-row,col-1];case'B':return[1-col,1-row,-1];}}
const parity = p => p.reduce((n,x,i)=>n+p.slice(i+1).filter(y=>x>y).length,0)%2;
export function validateState(state){
 if(typeof state!=='string'||state.length!==54||FACES.some(f=>[...state].filter(x=>x===f).length!==9))throw new Error('Each color needs exactly 9 squares. Check your colors and try again.');
 if(FACES.some((f,i)=>state[i*9+4]!==f))throw new Error('The center colors must match the side labels.');
 let cube;try{cube=Cube.fromString(state);}catch{throw new Error('These pieces don’t make a possible cube. Check each face and its orientation.');}
 const valid=(a,n)=>a.length===n&&new Set(a).size===n&&a.every(x=>Number.isInteger(x)&&x>=0&&x<n);
 if(!valid(cube.cp,8)||!valid(cube.ep,12)||cube.co.some(x=>!Number.isInteger(x))||cube.eo.some(x=>!Number.isInteger(x))||cube.co.reduce((a,b)=>a+b,0)%3||cube.eo.reduce((a,b)=>a+b,0)%2||parity(cube.cp)!==parity(cube.ep)||cube.asString()!==state)throw new Error('This cube can’t be solved as scanned. Check for a flipped square, rotated face, or swapped colors.');
 return cube;
}
export function scramble(length=20){const moves=[];let last='';for(let i=0;i<length;i++){const choices=FACES.filter(f=>TURN[f][0]!==last);const face=choices[Math.floor(Math.random()*choices.length)];moves.push(face+['',"'",'2'][Math.floor(Math.random()*3)]);last=TURN[face][0];}return moves;}
export function explain(move){const name=NAMES[move[0]].toLowerCase();return {title:move.endsWith('2')?`Turn the ${name} side twice`: `Turn the ${name} side ${move.endsWith("'")?'backward':'clockwise'}`,detail:move.endsWith('2')?'Two clicks.':"Look straight at this side."};}
// Each prepared example ends in a solved cube; these are concept demonstrations, not a full beginner solving algorithm.
export const LESSONS = [
 {name:'Make a white cross',description:'Make a white plus sign. Match each edge to the center beside it.',algorithm:'F2',tip:'White on top, green in front. Turn the green face twice. Watch the white edge come home.'},
 {name:'Finish the white corners',description:'Corners have three colors. Match each corner to its three centers.',algorithm:"R' D' R D R' D' R D",tip:'This right-and-bottom pattern brings a white corner home. Watch the same corner through every turn.'},
 {name:'Build the middle layer',description:'Put edges with no yellow or white in the middle row.',algorithm:"U R U' R' U' F' U F",tip:'This eight-turn pattern inserts a middle-layer edge. In this example we use the white side on the bottom.'},
 {name:'Make a yellow cross',description:'Make a yellow plus sign. Leave the corners for later.',algorithm:"F R U R' U' F'",tip:'Yellow on top. This pattern changes the top edges. Notice the cross appear at the end.'},
 {name:'Turn the yellow face',description:'Turn the yellow corners so yellow faces up.',algorithm:"R U R' U R U2 R'",tip:'Yellow on top. Follow one yellow corner as the right-and-top pattern turns it into place.'},
 {name:'Put the corners in place',description:'Move the corners until their side colors match the centers.',algorithm:"R' F R' B2 R F' R' B2 R2",tip:'Watch the corner pieces trade places. We are matching all three colors, not just the top one.'},
 {name:'Bring the last edges home',description:'Move the last edges home. Keep the corners where they are.',algorithm:"R U' R U R U R U' R' U' R2",tip:'Yellow on top. This edge cycle moves the last pieces while keeping the finished corners together.'}
];
export function lessonState(index){const solution=LESSONS[index].algorithm.split(' ');const cube=new Cube();if(index>=2)cube.move('z2');cube.move(inverseSequence(solution).join(' '));return {cube,solution};}
export function canonicalize(state){const centers=FACES.map((_,i)=>state[i*9+4]);return [...state].map(color=>FACES[centers.indexOf(color)]).join('');}
export function classifyColor(rgb){const [r,g,b]=rgb.map(v=>v/255),max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min,s=max?delta/max:0;let h=delta===0?0:max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;h=(h*60+360)%360;if(s<.23&&max>.35)return'U';if(h<15||h>345)return'R';if(h<43)return'L';if(h<80)return'D';if(h<175)return'F';return'B';}
export {Cube};
