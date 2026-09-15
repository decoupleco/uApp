// node contrast.mjs — WCAG 2.x contrast for μi (fg, surface) pairs in both luminances. Gate: ≥ 4.5 text, ≥ 3 large/ui.
const L=h=>{const c=h.replace('#','').match(/.{2}/g).map(x=>parseInt(x,16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const cr=(a,b)=>{const x=L(a),y=L(b);return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};
const T={
 light:{n0:'#ffffff',n1:'#f8fafc',n2:'#f1f5f9',fg:'#020617',fg2:'#475569',fg3:'#5f6b7d','ac-f':'#1d4ed8','ok-f':'#047857','wa-f':'#b45309','no-f':'#b91c1c','ac-s':'#eff6ff','ok-s':'#ecfdf5','wa-s':'#fffbeb','no-s':'#fef2f2',ac:'#2563eb','on-ac':'#ffffff'},
 dark: {n0:'#12151a',n1:'#0a0c0f',n2:'#1a1e24',fg:'#e8ebf0',fg2:'#aab2be',fg3:'#8b95a3','ac-f':'#8fbaff','ok-f':'#5fd8a8','wa-f':'#f2c14e','no-f':'#ff8f8f','ac-s':'#0f1b33','ok-s':'#0b2219','wa-s':'#2a1d08','no-s':'#2b1010',ac:'#3b82f6','on-ac':'#06101f'},
};
let fail=0;
for(const [mode,t] of Object.entries(T)){
  console.log(`\n${mode}`);
  const pairs=[['fg','n0'],['fg','n1'],['fg2','n0'],['fg2','n1'],['fg3','n0'],['fg3','n1'],['fg3','n2'],['ac-f','ac-s'],['ok-f','ok-s'],['wa-f','wa-s'],['no-f','no-s'],['ac-f','n0'],['ok-f','n0'],['wa-f','n0'],['no-f','n0'],['on-ac','ac']];
  for(const [f,s] of pairs){const r=cr(t[f],t[s]);const ok=r>=4.5;if(!ok)fail++;console.log(`  ${ok?'PASS':'FAIL'} ${f.padEnd(6)} on ${s.padEnd(5)} ${r}`)}
}
console.log(fail?`\n${fail} FAIL`:'\nall pass'); process.exit(fail?1:0)
