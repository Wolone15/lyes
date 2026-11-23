import {analyzeSignal} from './analysis.js';
self.onmessage=e=>{try{const {samples,sampleRate,duration}=e.data;self.postMessage({result:analyzeSignal(samples,sampleRate,duration)});}catch{self.postMessage({error:'L’analyse du fichier audio n’a pas pu être terminée.'});}};
