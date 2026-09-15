import {state, derived} from './signals.js'; import {h, txt} from './dom.js';
export default el=>{
  const v=state(''), usd=derived(()=>v.value?(+v.value*2.13).toFixed(2):'0.00');
  const inp=h('input',{class:'field',inputmode:'decimal',placeholder:'0.00',
    oninput:e=>v.value=e.target.value});
  el.replaceChildren(h('p',{class:'eyebrow'},'Amount'), inp,
    h('p',{class:'d'},txt(()=>`≈ $${usd.value} USD`)),
    h('button',{class:'btn','data-p':''},'Initiate withdrawal'));
};
