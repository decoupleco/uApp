// Tier 3: wallet via the injected provider. No client layer, no signing library (the provider signs), and —
// measured 2026-09-14 — no ABI library either.
//
// viem's encodeAbiParameters/decodeAbiParameters cost 7,582 B brotli here, because encoding an address
// reaches isAddress → checksumAddress → keccak (@noble/hashes sha3, 4.5 KB raw) and decoding statically
// imports the same, plus a byte cursor and five error-class modules. Every call a token μApp makes is a
// 4-byte selector followed by 32-byte static words, which is the arithmetic below. test/abi.test.js checks
// it against viem on random vectors, so viem stays as the oracle — a devDependency, not a payload.
//
// One deliberate divergence: viem rejects a mixed-case address whose EIP-55 checksum doesn't match, and
// verifying that needs the keccak we removed. Addresses here come from the injected provider and from
// build-time props, so shape-checking is the trade. test/abi.test.js pins this so it can't drift silently.
//
// If a view ever needs dynamic types (string, bytes, arrays) or address *outputs*, import viem's coder for
// that island and accept the bytes; don't extend this.
const MAX_UINT256 = (1n << 256n) - 1n;
const word = hex => hex.replace(/^0x/, '').toLowerCase().padStart(64, '0');
const addressWord = a => {
  if (!/^0x[0-9a-fA-F]{40}$/.test(a)) throw new Error(`not an address: ${a}`);
  return word(a);
};
const uintWord = v => {
  const n = BigInt(v);
  if (n < 0n || n > MAX_UINT256) throw new Error(`uint256 out of range: ${v}`);
  return word(`0x${n.toString(16)}`);
};
export const decodeUint = data => BigInt(`0x${data.slice(2, 66) || '0'}`);
// Selectors are constants, not runtime hashes. Regenerate with:
//   bun -e 'import{toFunctionSelector}from"viem";console.log(toFunctionSelector("balanceOf(address)"))'
const SELECTOR = { balanceOf: '0x70a08231', approve: '0x095ea7b3' };   // balanceOf(address) · approve(address,uint256)

export const calls = {
  balanceOf: account => SELECTOR.balanceOf + addressWord(account),
  approve: (spender, amount) => SELECTOR.approve + addressWord(spender) + uintWord(amount),
};

// 12.34 from 12340000000000000000n at 18 decimals, without a bignum formatter.
export const formatUnits = (value, decimals) => {
  if (!decimals) return value.toString();
  const s = (value < 0n ? -value : value).toString().padStart(decimals + 1, '0');
  const frac = s.slice(-decimals).replace(/0+$/, '');
  return `${value < 0n ? '-' : ''}${s.slice(0, -decimals)}${frac ? `.${frac}` : ''}`;
};

const rpc = (method, params) => window.ethereum.request({ method, params });

export async function connect() { const [account] = await rpc('eth_requestAccounts'); return account; }

export async function balanceOf(token, account, decimals = 18) {
  const data = await rpc('eth_call', [{ to: token, data: calls.balanceOf(account) }, 'latest']);
  return formatUnits(decodeUint(data), decimals);
}

export const approve = (account, token, spender, amount) =>
  rpc('eth_sendTransaction', [{ from: account, to: token, data: calls.approve(spender, amount) }]);

// Adopts the static markup's shape: eyebrow · status line · one secondary button (Connect is not the view's [data-p]).
export default (el, { token, decimals = 18, symbol = '' } = {}) => {
  const has = typeof window.ethereum !== 'undefined';
  const eyebrow = Object.assign(document.createElement('p'), { className: 'eyebrow', textContent: 'Wallet' });
  const status = Object.assign(document.createElement('p'), { className: 'd', textContent: has ? 'No wallet connected' : 'No injected wallet found' });
  const btn = Object.assign(document.createElement('button'), { className: 'btn', textContent: 'Connect', disabled: !has });
  btn.onclick = async () => {
    try {
      const a = await connect();
      status.textContent = `${a.slice(0, 6)}…${a.slice(-4)}`; btn.textContent = 'Connected'; btn.disabled = true;
      if (token) status.textContent += ` · ${await balanceOf(token, a, decimals)} ${symbol}`;
    } catch (e) { status.textContent = e.message; }
  };
  el.replaceChildren(eyebrow, status, btn);
};
