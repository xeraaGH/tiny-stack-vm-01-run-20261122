// Tiny stack VM: faithful interpreter of make.fun's tiny stack ISA v1 (kit
// generator/subject/ISA.md; reference VM generator/subject/vm.mjs is the rule).
// One run answers a set of 40: /input/<id>/{program,input}.bin ->
// /output/<id>/{stdout.bin,exit.txt}. 32-bit wrapping values, 256-value stack,
// 64-address call stack, 256 memory words, 1M steps, 65536 output bytes.
// Step order: step limit 10, pc out of range 9, unknown opcode 5, immediate cut
// off 9, then stack needs (underflow 2, overflow 3), then the instruction's own
// traps and effect. A trap keeps the output written before it.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
// [pops,pushes,immediate bytes] per opcode byte; absent = no opcode.
const N: Record<number, [number, number, number]> = {
  0: [0, 0, 0], 1: [0, 1, 1], 2: [0, 1, 4], 3: [1, 0, 0], 4: [1, 2, 0], 5: [2, 2, 0], 6: [2, 3, 0], 7: [3, 3, 0],
  16: [2, 1, 0], 17: [2, 1, 0], 18: [2, 1, 0], 19: [2, 1, 0], 20: [2, 1, 0], 21: [2, 1, 0], 22: [2, 1, 0],
  23: [1, 1, 0], 24: [2, 1, 0], 25: [2, 1, 0], 26: [2, 1, 0], 27: [1, 1, 0],
  28: [2, 1, 0], 29: [2, 1, 0], 30: [2, 1, 0], 32: [2, 1, 0], 33: [2, 1, 0], 34: [2, 1, 0],
  48: [0, 0, 2], 49: [1, 0, 2], 50: [1, 0, 2], 51: [0, 0, 2], 52: [0, 0, 0],
  64: [1, 1, 0], 65: [2, 0, 0], 80: [1, 0, 0], 81: [1, 0, 0], 82: [0, 1, 0], 83: [1, 0, 0],
};
function run(p: Uint8Array, q: Uint8Array): { o: Uint8Array; c: number } {
  const n = p.length, S = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256);
  const out = new Uint8Array(65536);
  let sp = 0, cp = 0, ol = 0, pc = 0, ip = 0, st = 0;
  const done = (c: number) => ({ o: out.slice(0, ol), c });
  for (;;) {
    if (st === 1e6) return done(10);
    if (pc < 0 || pc >= n) return done(9);
    const o = p[pc], nd = N[o];
    if (!nd) return done(5);
    const [pp, ps, im] = nd;
    if (pc + im >= n) return done(9);
    st++;
    const nx = pc + 1 + im;
    if (sp < pp) return done(2);
    if (sp - pp + ps > 256) return done(3);
    pc = nx;
    switch (o) {
      case 0: return done(0);
      case 1: S[sp++] = (p[nx - 1] << 24) >> 24; break; // PUSH8, sign-extended
      case 2: S[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); break;
      case 3: sp--; break;
      case 4: S[sp] = S[sp - 1]; sp++; break;
      case 5: { const t = S[sp - 1]; S[sp - 1] = S[sp - 2]; S[sp - 2] = t; break; }
      case 6: S[sp] = S[sp - 2]; sp++; break;
      case 7: { const a = S[sp - 3]; S[sp - 3] = S[sp - 2]; S[sp - 2] = S[sp - 1]; S[sp - 1] = a; break; }
      case 23: S[sp - 1] = -S[sp - 1] | 0; break; // NEG wraps: -INT_MIN stays INT_MIN
      case 27: S[sp - 1] = ~S[sp - 1]; break;
      case 16: case 17: case 18: case 19: case 20: case 21: case 22:
      case 24: case 25: case 26: case 28: case 29: case 30: case 32: case 33: case 34: {
        const b = S[sp - 1], a = S[sp - 2];
        let r: number;
        if (o === 16) r = (a + b) | 0;
        else if (o === 17) r = (a - b) | 0;
        else if (o === 18) r = Math.imul(a, b); // low 32 bits of the exact product
        else if (o === 19) { if (b === 0) return done(4); r = a === -2147483648 && b === -1 ? a : (a / b) | 0; }
        else if (o === 20) { if (b === 0) return done(4); r = b === -1 ? 0 : (a % b) | 0; }
        else if (o === 21) { if (b === 0) return done(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
        else if (o === 22) { if (b === 0) return done(4); r = ((a >>> 0) % (b >>> 0)) | 0; }
        else if (o === 24) r = a & b;
        else if (o === 25) r = a | b;
        else if (o === 26) r = a ^ b;
        else if (o === 28) r = a << (b & 31);
        else if (o === 29) r = a >> (b & 31);
        else if (o === 30) r = (a >>> (b & 31)) | 0;
        else if (o === 32) r = a === b ? 1 : 0;
        else if (o === 33) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        sp -= 2; S[sp++] = r; break;
      }
      case 48: case 49: case 50: { // JMP/JZ/JNZ: pc = next + signed 16-bit offset
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        let t = true;
        if (o !== 48) { const v = S[--sp]; t = o === 49 ? v === 0 : v !== 0; }
        if (t) pc = nx + rel;
        break;
      }
      case 51: // CALL: 64 held already traps 7
        if (cp === 64) return done(7);
        C[cp++] = nx; pc = p[nx - 2] | (p[nx - 1] << 8); break;
      case 52: // RET: empty call stack traps 8
        if (cp === 0) return done(8);
        pc = C[--cp]; break;
      case 64: { const a = S[sp - 1]; if (a < 0 || a >= 256) return done(6); S[sp - 1] = M[a]; break; }
      case 65: { const a = S[sp - 1], v = S[sp - 2]; if (a < 0 || a >= 256) return done(6); sp -= 2; M[a] = v; break; }
      case 80: { // PRINT: decimal ASCII, leading `-` only, no newline
        const s = String(S[sp - 1]);
        if (ol + s.length > 65536) return done(11);
        sp--;
        for (let i = 0; i < s.length; i++) out[ol++] = s.charCodeAt(i);
        break;
      }
      case 81: if (ol + 1 > 65536) return done(11); out[ol++] = S[--sp] & 255; break;
      case 82: S[sp++] = ip < q.length ? q[ip++] : -1; break; // IN: -1 past the input
      case 83: return done(S[--sp] & 255); // EXIT: low byte
    }
  }
}
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(new Uint8Array(readFileSync(join(I, id, 'program.bin'))), new Uint8Array(readFileSync(join(I, id, 'input.bin'))));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.o);
  writeFileSync(join(O, id, 'exit.txt'), `${r.c}\n`);
}
