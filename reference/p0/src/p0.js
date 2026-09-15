import tl from './isl-timeline.js'; import am from './isl-amount.js';
const R={timeline:tl,amount:am}, r=document.documentElement;
addEventListener('click',e=>{const b=e.target.closest('[data-set-theme]');
  if(b){r.dataset.t=b.dataset.setTheme;try{localStorage.mui=r.dataset.t}catch{}}});
for(const el of document.querySelectorAll('[data-island]'))
  R[el.dataset.island](el,JSON.parse(el.dataset.props||'{}'));
