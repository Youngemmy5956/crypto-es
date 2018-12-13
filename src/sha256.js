import {
  WordArray,
  Hasher,
} from './core';

// Initialization and round constants tables
const H = [];
const K = [];

// Compute constants
const isPrime = (n) => {
  const sqrtN = Math.sqrt(n);
  for (let factor = 2; factor <= sqrtN; factor += 1) {
    if (!(n % factor)) {
      return false;
    }
  }

  return true;
};

const getFractionalBits = n => ((n - (n | 0)) * 0x100000000) | 0;

let n = 2;
let nPrime = 0;
while (nPrime < 64) {
  if (isPrime(n)) {
    if (nPrime < 8) {
      H[nPrime] = getFractionalBits(n ** (1 / 2));
    }
    K[nPrime] = getFractionalBits(n ** (1 / 3));

    nPrime += 1;
  }

  n += 1;
}

// Reusable object
const W = [];

/**
 * SHA-256 hash algorithm.
 */
class _SHA256 extends Hasher {
  _doReset() {
    this._hash = new WordArray(H.slice(0));
  }

  _doProcessBlock(M, offset) {
    // Shortcut
    const H = this._hash.words;

    // Working variables
    const a = H[0];
    const b = H[1];
    const c = H[2];
    const d = H[3];
    const e = H[4];
    const f = H[5];
    const g = H[6];
    const h = H[7];

    // Computation
    for (const i = 0; i < 64; i++) {
        if (i < 16) {
            W[i] = M[offset + i] | 0;
        } else {
            const gamma0x = W[i - 15];
            const gamma0  = ((gamma0x << 25) | (gamma0x >>> 7))  ^
                          ((gamma0x << 14) | (gamma0x >>> 18)) ^
                           (gamma0x >>> 3);

            const gamma1x = W[i - 2];
            const gamma1  = ((gamma1x << 15) | (gamma1x >>> 17)) ^
                          ((gamma1x << 13) | (gamma1x >>> 19)) ^
                           (gamma1x >>> 10);

            W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16];
        }

        const ch  = (e & f) ^ (~e & g);
        const maj = (a & b) ^ (a & c) ^ (b & c);

        const sigma0 = ((a << 30) | (a >>> 2)) ^ ((a << 19) | (a >>> 13)) ^ ((a << 10) | (a >>> 22));
        const sigma1 = ((e << 26) | (e >>> 6)) ^ ((e << 21) | (e >>> 11)) ^ ((e << 7)  | (e >>> 25));

        const t1 = h + sigma1 + ch + K[i] + W[i];
        const t2 = sigma0 + maj;

        h = g;
        g = f;
        f = e;
        e = (d + t1) | 0;
        d = c;
        c = b;
        b = a;
        a = (t1 + t2) | 0;
    }

    // Intermediate hash value
    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h) | 0;
}

_doFinalize() {
    // Shortcuts
    const data = this._data;
    const dataWords = data.words;

    const nBitsTotal = this._nDataBytes * 8;
    const nBitsLeft = data.sigBytes * 8;

    // Add padding
    dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
    dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 0x100000000);
    dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
    data.sigBytes = dataWords.length * 4;

    // Hash final blocks
    this._process();

    // Return final computed hash
    return this._hash;
}

clone() {
  const clone = super.clone.call(this);
  clone._hash = this._hash.clone();

  return clone;
}
}