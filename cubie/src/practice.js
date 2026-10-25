import {FACES} from './cube-state.js';
export function nextPracticeMove(previous,includeHalfTurns,faces=FACES){
 const suffixes=includeHalfTurns?['',"'",'2']:['',"'"];
 const choices=faces.flatMap(face=>suffixes.map(suffix=>face+suffix)).filter(move=>move!==previous);
 return choices[Math.floor(Math.random()*choices.length)];
}
export function checkPracticeTurn(prompt,move,partial=null){
 if(prompt===move)return {result:partial?'wrong':'correct',partial:null};
 if(prompt.endsWith('2')&&move[0]===prompt[0]&&!move.endsWith('2')){
  return partial?{result:partial===move?'correct':'wrong',partial:null}:{result:'partial',partial:move};
 }
 return {result:'wrong',partial:null};
}
