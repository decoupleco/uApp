// 190 B DOM helper: h() builds, bind() re-renders a node from a reactive fn
import {effect} from './signals.js';
export const h=(t,p={},...c)=>{const e=document.createElement(t);
  for(const k in p) k[0]==='o'&&k[1]==='n'?e.addEventListener(k.slice(2),p[k]):
    k==='class'?e.className=p[k]:e.setAttribute(k,p[k]);
  e.append(...c.flat().filter(x=>x!=null)); return e};
export const txt=fn=>{const n=document.createTextNode('');effect(()=>n.data=fn());return n};
export const list=(el,fn)=>effect(()=>el.replaceChildren(...fn()));
