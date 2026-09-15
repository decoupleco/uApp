import {state, derived} from './signals.js'; import {h, txt, list} from './dom.js';
export default (el,{stages=[]}={})=>{
  const i=state(1), pct=derived(()=>Math.round(i.value/stages.length*100));
  const ol=h('ol',{class:'tl'});
  list(ol,()=>stages.map((s,n)=>h('li',{'data-s':n<i.value?'done':n===i.value?'now':''},
    h('span',{class:'n'},n<i.value?'✓':String(n+1)), h('div',{},h('p',{class:'t'},s)))));
  el.replaceChildren(
    h('p',{class:'eyebrow'},txt(()=>`Progress ${pct.value}%`)),
    h('h2',{},'Withdrawal progress'), ol,
    h('button',{class:'btn',onclick:()=>i.value=Math.min(i.value+1,stages.length)},'Advance'));
};
