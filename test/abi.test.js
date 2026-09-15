// The wallet island encodes calldata itself (see src/islands/wallet.js for why). viem is the oracle:
// every vector here is checked against the library we no longer ship.
import { test, expect } from 'bun:test';
import { encodeFunctionData, encodeAbiParameters, formatUnits as viemFormatUnits, erc20Abi } from 'viem';
import { calls, decodeUint, formatUnits } from '../src/islands/wallet.js';

const rand = n => '0x' + Array.from({ length: n }, () => '0123456789abcdef'[(Math.random() * 16) | 0]).join('');
// mixed case must be a VALID EIP-55 checksum or viem refuses it — see the divergence test below
const addresses = ['0x0000000000000000000000000000000000000000', '0xffffffffffffffffffffffffffffffffffffffff',
  '0xeb5a5d39de4ea42c2aa6a57eca2894376683bb8e', '0xeB5a5d39dE4Ea42C2Aa6A57EcA2894376683bB8E',
  ...Array.from({ length: 12 }, () => rand(40))];
const amounts = [0n, 1n, 10n ** 18n, 123456789n, 2n ** 128n, (1n << 256n) - 1n,
  ...Array.from({ length: 12 }, () => BigInt(rand(40)))];

test('balanceOf calldata matches viem', () => {
  for (const a of addresses)
    expect(calls.balanceOf(a)).toBe(encodeFunctionData({ abi: erc20Abi, functionName: 'balanceOf', args: [a] }));
});

test('approve calldata matches viem', () => {
  for (const spender of addresses) for (const amount of amounts)
    expect(calls.approve(spender, amount)).toBe(encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [spender, amount] }));
});

test('uint256 decoding matches viem encoding, round trip', () => {
  for (const v of amounts) expect(decodeUint(encodeAbiParameters([{ type: 'uint256' }], [v]))).toBe(v);
});

test('formatUnits matches viem across decimals', () => {
  for (const v of amounts) for (const d of [0, 1, 6, 8, 18, 27])
    expect(formatUnits(v, d)).toBe(viemFormatUnits(v, d));
});

// The one place we knowingly differ: verifying an EIP-55 checksum needs keccak, which is the 4.5 KB we
// removed. Addresses reach this island from the injected provider and from build-time props, so a
// mistyped *mixed-case* address is caught by viem and not by us. Recorded, not hidden.
test('known divergence: no EIP-55 checksum verification', () => {
  const badChecksum = '0xEB5A5D39DE4EA42C2AA6A57ECA2894376683BB8E';
  expect(() => encodeFunctionData({ abi: erc20Abi, functionName: 'balanceOf', args: [badChecksum] })).toThrow();
  expect(calls.balanceOf(badChecksum)).toBe(calls.balanceOf(badChecksum.toLowerCase()));
});

test('malformed input throws rather than encoding garbage', () => {
  for (const bad of ['0x', '0xzz', '0x1234', 'eb5a5d39de4ea42c2aa6a57eca2894376683bb8e', '0x' + 'a'.repeat(41), null])
    expect(() => calls.balanceOf(bad)).toThrow();
  expect(() => calls.approve(addresses[0], -1n)).toThrow();
  expect(() => calls.approve(addresses[0], 1n << 256n)).toThrow();
});
