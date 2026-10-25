import './vendor/cubejs/solve.js';
import Cube from './vendor/cubejs/cube.js';
import {validateState,canonicalize} from './cube-state.js';
let ready=false;
self.onmessage=({data})=>{try{const cube=validateState(canonicalize(data.state));if(!ready){Cube.initSolver();ready=true;}const solution=cube.isSolved()?[]:cube.solve().trim().split(/\s+/);const check=cube.clone();check.move(solution.join(' '));if(!check.isSolved())throw new Error('We couldn’t verify this solution. Please check your cube and try again.');self.postMessage({id:data.id,solution});}catch(error){self.postMessage({id:data.id,error:error.message});}};
