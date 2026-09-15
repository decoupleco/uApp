// signals3 + DEEP reactivity via Proxy (nested objects & arrays), matching $state semantics
let active=null, queue=new Set(), scheduled=false;
const flush=()=>{scheduled=false;const q=[...queue];queue.clear();for(const e of q)e()};
const link=s=>{if(active){s.add(active);active.deps.add(s)}};
const clear=x=>{for(const s of x.deps)s.delete(x);x.deps.clear()};
const bump=s=>{for(const x of[...s])x.run()};
export function state(v){const s=new Set(); v=wrap(v);
  return{get value(){link(s);return v},set value(n){if(Object.is(n,v))return;v=wrap(n);bump(s)}}}
const RAW=Symbol(), cache=new WeakMap();
function wrap(o){
  if(!o||typeof o!=='object'||o[RAW])return o;
  if(cache.has(o))return cache.get(o);
  const sigs=new Map(), self=new Set();
  const sig=k=>{let s=sigs.get(k);if(!s){s=new Set();sigs.set(k,s)}return s};
  const p=new Proxy(o,{
    get(t,k){if(k===RAW)return t;link(sig(k));return wrap(Reflect.get(t,k))},
    set(t,k,v){const had=k in t, old=t[k], n=Array.isArray(t)&&k!=='length'?t.length:-1;
      Reflect.set(t,k,v);
      if(!had||!Object.is(old,v)){bump(sig(k));bump(self);
        if(n>=0&&t.length!==n)bump(sig('length'))}return true},
    deleteProperty(t,k){delete t[k];bump(sig(k));bump(self);return true},
    ownKeys(t){link(self);return Reflect.ownKeys(t)}});
  cache.set(o,p);return p}
export function derived(fn){let c,d=true;const s=new Set();
  const self={deps:new Set(),run(){if(!d){d=true;bump(s)}}};
  return{get value(){link(s);if(d){const p=active;active=self;clear(self);try{c=fn()}finally{active=p}d=false}return c}}}
export function effect(fn){
  const self={deps:new Set(),run(){queue.add(go);if(!scheduled){scheduled=true;queueMicrotask(flush)}}};
  const go=()=>{const p=active;active=self;clear(self);try{fn()}finally{active=p}};
  go();return()=>{queue.delete(go);clear(self)}}
export const settled=()=>new Promise(r=>queueMicrotask(()=>queueMicrotask(r)));

// --- Svelte store contract adapter: lets Svelte 5 components consume these as $signal ---
export function readable(sig){return{subscribe(fn){const off=effect(()=>fn(sig.value));return()=>off()}}}
