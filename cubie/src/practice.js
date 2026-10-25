import {FACES} from './cube-state.js';
export function nextPracticeMove(previous,includeHalfTurns){
 const suffixes=includeHalfTurns?['',"'",'2']:['',"'"];
 const choices=FACES.flatMap(face=>suffixes.map(suffix=>face+suffix)).filter(move=>move!==previous);
 return choices[Math.floor(Math.random()*choices.length)];
}
export function checkPracticeTurn(prompt,move,partial=null){
 if(prompt===move)return {result:'correct',partial:null};
 if(prompt.endsWith('2')&&move[0]===prompt[0]&&!move.endsWith('2')){
  return partial===move?{result:'correct',partial:null}:{result:'partial',partial:move};
 }
 return {result:'wrong',partial:null};
}
