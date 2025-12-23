/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-explicit-any */

const util: any = {};
const cipher: any = {};

// ----------------------------------------------------------------------------- 
// Util Implementation
// ----------------------------------------------------------------------------- 

util.isNodejs = typeof process !== 'undefined' && process.versions && process.versions.node;

util.isArray = Array.isArray || function(x: any) {
  return Object.prototype.toString.call(x) === '[object Array]';
};

util.isArrayBuffer = function(x: any) {
  return typeof ArrayBuffer !== 'undefined' && x instanceof ArrayBuffer;
};

util.isArrayBufferView = function(x: any) {
  return x && util.isArrayBuffer(x.buffer) && x.byteLength !== undefined;
};

function _checkBitsParam(n: number) {
  if (!(n === 8 || n === 16 || n === 24 || n === 32)) {
    throw new Error('Only 8, 16, 24, or 32 bits supported: ' + n);
  }
}

// Text encoding/decoding
util.encodeUtf8 = function(str: string) {
  return unescape(encodeURIComponent(str));
};

util.decodeUtf8 = function(str: string) {
  return decodeURIComponent(escape(str));
};

// Binary tools
util.binary = {
  raw: {},
  hex: {},
  base64: {}
} as any;

util.binary.raw.encode = function(bytes: Uint8Array) {
  return String.fromCharCode.apply(null, Array.from(bytes));
};

util.binary.raw.decode = function(str: string, output: Uint8Array, offset?: number) {
  let out = output;
  if (!out) {
    out = new Uint8Array(str.length);
  }
  offset = offset || 0;
  let j = offset;
  for (let i = 0; i < str.length; ++i) {
    out[j++] = str.charCodeAt(i);
  }
  return output ? (j - offset) : out;
};

util.binary.hex.encode = function(bytes: any) {
  // Forward reference workaround or just implement here if simple
  return util.createBuffer(bytes).toHex();
};

util.binary.hex.decode = function(hex: string, output: Uint8Array, offset?: number) {
  let out = output;
  if (!out) {
    out = new Uint8Array(Math.ceil(hex.length / 2));
  }
  offset = offset || 0;
  let i = 0, j = offset;
  if (hex.length & 1) {
    i = 1;
    out[j++] = parseInt(hex[0], 16);
  }
  for (; i < hex.length; i += 2) {
    out[j++] = parseInt(hex.substr(i, 2), 16);
  }
  return output ? (j - offset) : out;
};

// Base64
const _base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const _base64Idx = [
  62, -1, -1, -1, 63,
  52, 53, 54, 55, 56, 57, 58, 59, 60, 61,
  -1, -1, -1, 64, -1, -1, -1,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
  13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
  -1, -1, -1, -1, -1, -1,
  26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
  39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51
];

util.binary.base64.encode = function(input: Uint8Array, maxline?: number) {
  let line = '';
  let output = '';
  let chr1, chr2, chr3;
  let i = 0;
  while (i < input.byteLength) {
    chr1 = input[i++];
    chr2 = input[i++];
    chr3 = input[i++];

    line += _base64.charAt(chr1 >> 2);
    line += _base64.charAt(((chr1 & 3) << 4) | (chr2 >> 4));
    if (isNaN(chr2)) {
      line += '==';
    } else {
      line += _base64.charAt(((chr2 & 15) << 2) | (chr3 >> 6));
      line += isNaN(chr3) ? '=' : _base64.charAt(chr3 & 63);
    }

    if (maxline && line.length > maxline) {
      output += line.substr(0, maxline) + '\r\n';
      line = line.substr(maxline);
    }
  }
  output += line;
  return output;
};

util.binary.base64.decode = function(input: string, output: Uint8Array, offset?: number) {
  let out = output;
  if (!out) {
    out = new Uint8Array(Math.ceil(input.length / 4) * 3);
  }
  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');
  offset = offset || 0;
  let enc1, enc2, enc3, enc4;
  let i = 0, j = offset;

  while (i < input.length) {
    enc1 = _base64Idx[input.charCodeAt(i++) - 43];
    enc2 = _base64Idx[input.charCodeAt(i++) - 43];
    enc3 = _base64Idx[input.charCodeAt(i++) - 43];
    enc4 = _base64Idx[input.charCodeAt(i++) - 43];

    out[j++] = (enc1 << 2) | (enc2 >> 4);
    if (enc3 !== 64) {
      out[j++] = ((enc2 & 15) << 4) | (enc3 >> 2);
      if (enc4 !== 64) {
        out[j++] = ((enc3 & 3) << 6) | enc4;
      }
    }
  }
  return output ? (j - offset) : out.subarray(0, j);
};

// decode64 implementation
util.decode64 = function(input: string) {
  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');
  let output = '';
  let enc1, enc2, enc3, enc4;
  let i = 0;

  while (i < input.length) {
    enc1 = _base64Idx[input.charCodeAt(i++) - 43];
    enc2 = _base64Idx[input.charCodeAt(i++) - 43];
    enc3 = _base64Idx[input.charCodeAt(i++) - 43];
    enc4 = _base64Idx[input.charCodeAt(i++) - 43];

    output += String.fromCharCode((enc1 << 2) | (enc2 >> 4));
    if (enc3 !== 64) {
      output += String.fromCharCode(((enc2 & 15) << 4) | (enc3 >> 2));
      if (enc4 !== 64) {
        output += String.fromCharCode(((enc3 & 3) << 6) | enc4);
      }
    }
  }
  return output;
};

// ByteStringBuffer
export class ByteStringBuffer {
  data: string;
  read: number;
  _constructedStringLength: number;

  constructor(b?: any) {
    this.data = '';
    this.read = 0;
    this._constructedStringLength = 0;

    if (typeof b === 'string') {
      this.data = b;
    } else if (util.isArrayBuffer(b) || util.isArrayBufferView(b)) {
      // Assuming Buffer checks are handled or environment specific.
      // Minimal implementation:
      const arr = new Uint8Array(b.buffer || b); // Handle TypedArray or ArrayBuffer
      this.data = String.fromCharCode.apply(null, Array.from(arr));
    } else if (b instanceof ByteStringBuffer) {
      this.data = b.data;
      this.read = b.read;
    }
  }

  _optimizeConstructedString(x: number) {
    this._constructedStringLength += x;
    if (this._constructedStringLength > 4096) {
      this.data.substr(0, 1);
      this._constructedStringLength = 0;
    }
  }

  length() {
    return this.data.length - this.read;
  }

  isEmpty() {
    return this.length() <= 0;
  }

  putByte(b: number) {
    return this.putBytes(String.fromCharCode(b));
  }

  fillWithByte(b: number, n: number) {
    let s = String.fromCharCode(b);
    let d = this.data;
    while (n > 0) {
      if (n & 1) d += s;
      n >>>= 1;
      if (n > 0) s += s;
    }
    this.data = d;
    this._optimizeConstructedString(n);
    return this;
  }

  putBytes(bytes: string) {
    this.data += bytes;
    this._optimizeConstructedString(bytes.length);
    return this;
  }

  putString(str: string) {
    return this.putBytes(util.encodeUtf8(str));
  }

  putInt16(i: number) {
    return this.putBytes(
      String.fromCharCode(i >> 8 & 0xFF) +
      String.fromCharCode(i & 0xFF));
  }

  putInt24(i: number) {
    return this.putBytes(
      String.fromCharCode(i >> 16 & 0xFF) +
      String.fromCharCode(i >> 8 & 0xFF) +
      String.fromCharCode(i & 0xFF));
  }

  putInt32(i: number) {
    return this.putBytes(
      String.fromCharCode(i >> 24 & 0xFF) +
      String.fromCharCode(i >> 16 & 0xFF) +
      String.fromCharCode(i >> 8 & 0xFF) +
      String.fromCharCode(i & 0xFF));
  }

  putInt16Le(i: number) {
    return this.putBytes(
      String.fromCharCode(i & 0xFF) +
      String.fromCharCode(i >> 8 & 0xFF));
  }

  putInt24Le(i: number) {
    return this.putBytes(
      String.fromCharCode(i & 0xFF) +
      String.fromCharCode(i >> 8 & 0xFF) +
      String.fromCharCode(i >> 16 & 0xFF));
  }

  putInt32Le(i: number) {
    return this.putBytes(
      String.fromCharCode(i & 0xFF) +
      String.fromCharCode(i >> 8 & 0xFF) +
      String.fromCharCode(i >> 16 & 0xFF) +
      String.fromCharCode(i >> 24 & 0xFF));
  }

  putInt(i: number, n: number) {
    _checkBitsParam(n);
    let bytes = '';
    do {
      n -= 8;
      bytes += String.fromCharCode((i >> n) & 0xFF);
    } while (n > 0);
    return this.putBytes(bytes);
  }

  putSignedInt(i: number, n: number) {
    if (i < 0) {
      i += 2 << (n - 1);
    }
    return this.putInt(i, n);
  }

  putBuffer(buffer: ByteStringBuffer) {
    return this.putBytes(buffer.getBytes());
  }

  getByte() {
    return this.data.charCodeAt(this.read++);
  }

  getInt16() {
    const rval = (
      this.data.charCodeAt(this.read) << 8 ^
      this.data.charCodeAt(this.read + 1));
    this.read += 2;
    return rval;
  }

  getInt24() {
    const rval = (
      this.data.charCodeAt(this.read) << 16 ^
      this.data.charCodeAt(this.read + 1) << 8 ^
      this.data.charCodeAt(this.read + 2));
    this.read += 3;
    return rval;
  }

  getInt32() {
    const rval = (
      this.data.charCodeAt(this.read) << 24 ^
      this.data.charCodeAt(this.read + 1) << 16 ^
      this.data.charCodeAt(this.read + 2) << 8 ^
      this.data.charCodeAt(this.read + 3));
    this.read += 4;
    return rval;
  }

  getInt16Le() {
    const rval = (
      this.data.charCodeAt(this.read) ^
      this.data.charCodeAt(this.read + 1) << 8);
    this.read += 2;
    return rval;
  }

  getInt24Le() {
    const rval = (
      this.data.charCodeAt(this.read) ^
      this.data.charCodeAt(this.read + 1) << 8 ^
      this.data.charCodeAt(this.read + 2) << 16);
    this.read += 3;
    return rval;
  }

  getInt32Le() {
    const rval = (
      this.data.charCodeAt(this.read) ^
      this.data.charCodeAt(this.read + 1) << 8 ^
      this.data.charCodeAt(this.read + 2) << 16 ^
      this.data.charCodeAt(this.read + 3) << 24);
    this.read += 4;
    return rval;
  }

  getInt(n: number) {
    _checkBitsParam(n);
    let rval = 0;
    do {
      rval = (rval << 8) + this.data.charCodeAt(this.read++);
      n -= 8;
    } while (n > 0);
    return rval;
  }

  getSignedInt(n: number) {
    let x = this.getInt(n);
    const max = 2 << (n - 2);
    if (x >= max) {
      x -= max << 1;
    }
    return x;
  }

  getBytes(count?: number) {
    let rval;
    if (count) {
      count = Math.min(this.length(), count);
      rval = this.data.slice(this.read, this.read + count);
      this.read += count;
    } else if (count === 0) {
      rval = '';
    } else {
      rval = (this.read === 0) ? this.data : this.data.slice(this.read);
      this.clear();
    }
    return rval;
  }

  bytes(count?: number) {
    return (typeof (count) === 'undefined' ?
      this.data.slice(this.read) :
      this.data.slice(this.read, this.read + count));
  }

  at(i: number) {
    return this.data.charCodeAt(this.read + i);
  }

  setAt(i: number, b: number) {
    this.data = this.data.substr(0, this.read + i) +
      String.fromCharCode(b) +
      this.data.substr(this.read + i + 1);
    return this;
  }

  last() {
    return this.data.charCodeAt(this.data.length - 1);
  }

  copy() {
    const c = util.createBuffer(this.data);
    c.read = this.read;
    return c;
  }

  compact() {
    if (this.read > 0) {
      this.data = this.data.slice(this.read);
      this.read = 0;
    }
    return this;
  }

  clear() {
    this.data = '';
    this.read = 0;
    return this;
  }

  truncate(count: number) {
    const len = Math.max(0, this.length() - count);
    this.data = this.data.substr(this.read, len);
    this.read = 0;
    return this;
  }

  toHex() {
    let rval = '';
    for (let i = this.read; i < this.data.length; ++i) {
      const b = this.data.charCodeAt(i);
      if (b < 16) {
        rval += '0';
      }
      rval += b.toString(16);
    }
    return rval;
  }

  toString() {
    return util.decodeUtf8(this.bytes());
  }
}

util.ByteStringBuffer = ByteStringBuffer;
util.createBuffer = function(input: any, encoding: string) {
  encoding = encoding || 'raw';
  if (input !== undefined && encoding === 'utf8') {
    input = util.encodeUtf8(input);
  }
  return new ByteStringBuffer(input);
};


// ----------------------------------------------------------------------------- 
// Cipher Implementation
// ----------------------------------------------------------------------------- 

cipher.algorithms = {};

cipher.createCipher = function(algorithm: string | any, key: any) {
  let api = algorithm;
  if (typeof api === 'string') {
    api = cipher.getAlgorithm(api);
    if (api) {
      api = api();
    }
  }
  if (!api) {
    throw new Error('Unsupported algorithm: ' + algorithm);
  }

  return new cipher.BlockCipher({
    algorithm: api,
    key: key,
    decrypt: false
  });
};

cipher.createDecipher = function(algorithm: string | any, key: any) {
  let api = algorithm;
  if (typeof api === 'string') {
    api = cipher.getAlgorithm(api);
    if (api) {
      api = api();
    }
  }
  if (!api) {
    throw new Error('Unsupported algorithm: ' + algorithm);
  }

  return new cipher.BlockCipher({
    algorithm: api,
    key: key,
    decrypt: true
  });
};

cipher.registerAlgorithm = function(name: string, algorithm: any) {
  name = name.toUpperCase();
  cipher.algorithms[name] = algorithm;
};

cipher.getAlgorithm = function(name: string) {
  name = name.toUpperCase();
  if (name in cipher.algorithms) {
    return cipher.algorithms[name];
  }
  return null;
};

cipher.BlockCipher = function(this: any, options: any) {
  this.algorithm = options.algorithm;
  this.mode = this.algorithm.mode;
  this.blockSize = this.mode.blockSize;
  this._finish = false;
  this._input = null;
  this.output = null;
  this._op = options.decrypt ? this.mode.decrypt : this.mode.encrypt;
  this._decrypt = options.decrypt;
  this.algorithm.initialize(options);
};

cipher.BlockCipher.prototype.start = function(options: any) {
  options = options || {};
  const opts: any = {};
  for (const key in options) {
    opts[key] = options[key];
  }
  opts.decrypt = this._decrypt;
  this._finish = false;
  this._input = util.createBuffer();
  this.output = options.output || util.createBuffer();
  this.mode.start(opts);
};

cipher.BlockCipher.prototype.update = function(input: any) {
  if (input) {
    this._input.putBuffer(input);
  }

  while (!this._op.call(this.mode, this._input, this.output, this._finish) &&
    !this._finish) { }

  this._input.compact();
};

cipher.BlockCipher.prototype.finish = function(pad: any) {
  if (pad && (this.mode.name === 'ECB' || this.mode.name === 'CBC')) {
    this.mode.pad = function(input: any) {
      return pad(this.blockSize, input, false);
    };
    this.mode.unpad = function(output: any) {
      return pad(this.blockSize, output, true);
    };
  }

  const options: any = {};
  options.decrypt = this._decrypt;
  options.overflow = this._input.length() % this.blockSize;

  if (!this._decrypt && this.mode.pad) {
    if (!this.mode.pad(this._input, options)) {
      return false;
    }
  }

  this._finish = true;
  this.update(undefined);

  if (this._decrypt && this.mode.unpad) {
    if (!this.mode.unpad(this.output, options)) {
      return false;
    }
  }

  if (this.mode.afterFinish) {
    if (!this.mode.afterFinish(this.output, options)) {
      return false;
    }
  }

  return true;
};


// -----------------------------------------------------------------------------
// Cipher Modes Implementation
// -----------------------------------------------------------------------------

cipher.modes = {};

cipher.modes.ecb = function(options: any) {
  options = options || {};
  this.name = 'ECB';
  this.cipher = options.cipher;
  this.blockSize = options.blockSize || 16;
  this._input = null;
  this._output = null;
  this._inBlock = new Uint32Array(this.blockSize / 4);
  this._outBlock = new Uint32Array(this.blockSize / 4);
};

cipher.modes.ecb.prototype.start = function(options: any) {
  // no IV required for ECB
};

cipher.modes.ecb.prototype.encrypt = function(input: any, output: any, finish: any) {
  // not needed for this use case, but for completeness/safety
  // naive implementation similar to decrypt
  this._input = input;
  this._output = output;
  
  while(this._input.length() >= this.blockSize) {
    // get next block
    for(let i = 0; i < this._inBlock.length; ++i) {
      this._inBlock[i] = this._input.getInt32();
    }

    // encrypt block
    this.cipher.encrypt(this._inBlock, this._outBlock);

    // write output
    for(let i = 0; i < this._outBlock.length; ++i) {
      this._output.putInt32(this._outBlock[i]);
    }
  }
  return true;
};

cipher.modes.ecb.prototype.decrypt = function(input: any, output: any, finish: any) {
  this._input = input;
  this._output = output;

  while(this._input.length() >= this.blockSize) {
    // get next block
    for(let i = 0; i < this._inBlock.length; ++i) {
      this._inBlock[i] = this._input.getInt32();
    }

    // decrypt block
    this.cipher.decrypt(this._inBlock, this._outBlock);

    // write output
    for(let i = 0; i < this._outBlock.length; ++i) {
      this._output.putInt32(this._outBlock[i]);
    }
  }
  return true;
};

// -----------------------------------------------------------------------------
// DES Implementation
// -----------------------------------------------------------------------------

const des: any = {};

des.Algorithm = function(this: any, name: string, mode: any) {
  this.name = name;
  this.mode = new mode({
    blockSize: 8,
    cipher: {
      encrypt: (inBlock: any, outBlock: any) => {
        return _updateBlock(this._keys, inBlock, outBlock, false);
      },
      decrypt: (inBlock: any, outBlock: any) => {
        return _updateBlock(this._keys, inBlock, outBlock, true);
      }
    }
  });
  this._init = false;
};

des.Algorithm.prototype.initialize = function(options: any) {
  if(this._init) {
    return;
  }

  const key = util.createBuffer(options.key);
  if(this.name.indexOf('3DES') === 0) {
    if(key.length() !== 24) {
      throw new Error('Invalid Triple-DES key size: ' + key.length() * 8);
    }
  }

  this._keys = _createKeys(key);
  this._init = true;
};

const spfunction1 = [0x1010400,0,0x10000,0x1010404,0x1010004,0x10404,0x4,0x10000,0x400,0x1010400,0x1010404,0x400,0x1000404,0x1010004,0x1000000,0x4,0x404,0x1000400,0x1000400,0x10400,0x10400,0x1010000,0x1010000,0x1000404,0x10004,0x1000004,0x1000004,0x10004,0,0x404,0x10404,0x1000000,0x10000,0x1010404,0x4,0x1010000,0x1010400,0x1000000,0x1000000,0x400,0x1010004,0x10000,0x10400,0x1000004,0x400,0x4,0x1000404,0x10404,0x1010404,0x10004,0x1010000,0x1000404,0x1000004,0x404,0x10404,0x1010400,0x404,0x1000400,0x1000400,0,0x10004,0x10400,0,0x1010004];
const spfunction2 = [-0x7fef7fe0,-0x7fff8000,0x8000,0x108020,0x100000,0x20,-0x7fefffe0,-0x7fff7fe0,-0x7fffffe0,-0x7fef7fe0,-0x7fef8000,-0x80000000,-0x7fff8000,0x100000,0x20,-0x7fefffe0,0x108000,0x100020,-0x7fff7fe0,0,-0x80000000,0x8000,0x108020,-0x7ff00000,0x100020,-0x7fffffe0,0,0x108000,0x8020,-0x7fef8000,-0x7ff00000,0x8020,0,0x108020,-0x7fefffe0,0x100000,-0x7fff7fe0,-0x7ff00000,-0x7fef8000,0x8000,-0x7ff00000,-0x7fff8000,0x20,-0x7fef7fe0,0x108020,0x20,0x8000,-0x80000000,0x8020,-0x7fef8000,0x100000,-0x7fffffe0,0x100020,-0x7fff7fe0,-0x7fffffe0,0x100020,0x108000,0,-0x7fff8000,0x8020,-0x80000000,-0x7fefffe0,-0x7fef7fe0,0x108000];
const spfunction3 = [0x208,0x8020200,0,0x8020008,0x8000200,0,0x20208,0x8000200,0x20008,0x8000008,0x8000008,0x20000,0x8020208,0x20008,0x8020000,0x208,0x8000000,0x8,0x8020200,0x200,0x20200,0x8020000,0x8020008,0x20208,0x8000208,0x20200,0x20000,0x8000208,0x8,0x8020208,0x200,0x8000000,0x8020200,0x8000000,0x20008,0x208,0x20000,0x8020200,0x8000200,0,0x200,0x20008,0x8020208,0x8000200,0x8000008,0x200,0,0x8020008,0x8000208,0x20000,0x8000000,0x8020208,0x8,0x20208,0x20200,0x8000008,0x8020000,0x8000208,0x208,0x8020000,0x20208,0x8,0x8020008,0x20200];
const spfunction4 = [0x802001,0x2081,0x2081,0x80,0x802080,0x800081,0x800001,0x2001,0,0x802000,0x802000,0x802081,0x81,0,0x800080,0x800001,0x1,0x2000,0x800000,0x802001,0x80,0x800000,0x2001,0x2080,0x800081,0x1,0x2080,0x800080,0x2000,0x802080,0x802081,0x81,0x800080,0x800001,0x802000,0x802081,0x81,0,0,0x802000,0x2080,0x800080,0x800081,0x1,0x802001,0x2081,0x2081,0x80,0x802081,0x81,0x1,0x2000,0x800001,0x2001,0x802080,0x800081,0x2001,0x2080,0x800000,0x802001,0x80,0x800000,0x2000,0x802080];
const spfunction5 = [0x100,0x2080100,0x2080000,0x42000100,0x80000,0x100,0x40000000,0x2080000,0x40080100,0x80000,0x2000100,0x40080100,0x42000100,0x42080000,0x80100,0x40000000,0x2000000,0x40080000,0x40080000,0,0x40000100,0x42080100,0x42080100,0x2000100,0x42080000,0x40000100,0,0x42000000,0x2080100,0x2000000,0x42000000,0x80100,0x80000,0x42000100,0x100,0x2000000,0x40000000,0x2080000,0x42000100,0x40080100,0x2000100,0x40000000,0x42080000,0x2080100,0x40080100,0x100,0x2000000,0x42080000,0x42080100,0x80100,0x42000000,0x42080100,0x2080000,0,0x40080000,0x42000000,0x80100,0x2000100,0x40000100,0x80000,0,0x40080000,0x2080100,0x40000100];
const spfunction6 = [0x20000010,0x20400000,0x4000,0x20404010,0x20400000,0x10,0x20404010,0x400000,0x20004000,0x404010,0x400000,0x20000010,0x400010,0x20004000,0x20000000,0x4010,0,0x400010,0x20004010,0x4000,0x404000,0x20004010,0x10,0x20400010,0x20400010,0,0x404010,0x20404000,0x4010,0x404000,0x20404000,0x20000000,0x20004000,0x10,0x20400010,0x404000,0x20404010,0x400000,0x4010,0x20000010,0x400000,0x20004000,0x20000000,0x4010,0x20000010,0x20404010,0x404000,0x20400000,0x404010,0x20404000,0,0x20400010,0x10,0x4000,0x20400000,0x404010,0x4000,0x400010,0x20004010,0,0x20404000,0x20000000,0x400010,0x20004010];
const spfunction7 = [0x200000,0x4200002,0x4000802,0,0x800,0x4000802,0x200802,0x4200800,0x4200802,0x200000,0,0x4000002,0x2,0x4000000,0x4200002,0x802,0x4000800,0x200802,0x200002,0x4000800,0x4000002,0x4200000,0x4200800,0x200002,0x4200000,0x800,0x802,0x4200802,0x200800,0x2,0x4000000,0x200800,0x4000000,0x200800,0x200000,0x4000802,0x4000802,0x4200002,0x4200002,0x2,0x200002,0x4000000,0x4000800,0x200000,0x4200800,0x802,0x200802,0x4200800,0x802,0x4000002,0x4200802,0x4200000,0x200800,0,0x2,0x4200802,0,0x200802,0x4200000,0x800,0x4000002,0x4000800,0x800,0x200002];
const spfunction8 = [0x10001040,0x1000,0x40000,0x10041040,0x10000000,0x10001040,0x40,0x10000000,0x40040,0x10040000,0x10041040,0x41000,0x10041000,0x41040,0x1000,0x40,0x10040000,0x10000040,0x10001000,0x1040,0x41000,0x40040,0x10040040,0x10041000,0x1040,0,0,0x10040040,0x10000040,0x10001000,0x41040,0x40000,0x41040,0x40000,0x10041000,0x1000,0x40,0x10040040,0x1000,0x41040,0x10001000,0x40,0x10000040,0x10040000,0x10040040,0x10000000,0x40000,0x10001040,0,0x10041040,0x40040,0x10000040,0x10040000,0x10001000,0x10001040,0,0x10041040,0x41000,0x41000,0x1040,0x1040,0x40040,0x10000000,0x10041000];

function _createKeys(key: any) {
  const pc2bytes0  = [0,0x4,0x20000000,0x20000004,0x10000,0x10004,0x20010000,0x20010004,0x200,0x204,0x20000200,0x20000204,0x10200,0x10204,0x20010200,0x20010204];
  const pc2bytes1  = [0,0x1,0x100000,0x100001,0x4000000,0x4000001,0x4100000,0x4100001,0x100,0x101,0x100100,0x100101,0x4000100,0x4000101,0x4100100,0x4100101];
  const pc2bytes2  = [0,0x8,0x800,0x808,0x1000000,0x1000008,0x1000800,0x1000808,0,0x8,0x800,0x808,0x1000000,0x1000008,0x1000800,0x1000808];
  const pc2bytes3  = [0,0x200000,0x8000000,0x8200000,0x2000,0x202000,0x8002000,0x8202000,0x20000,0x220000,0x8020000,0x8220000,0x22000,0x222000,0x8022000,0x8222000];
  const pc2bytes4  = [0,0x40000,0x10,0x40010,0,0x40000,0x10,0x40010,0x1000,0x41000,0x1010,0x41010,0x1000,0x41000,0x1010,0x41010];
  const pc2bytes5  = [0,0x400,0x20,0x420,0,0x400,0x20,0x420,0x2000000,0x2000400,0x2000020,0x2000420,0x2000000,0x2000400,0x2000020,0x2000420];
  const pc2bytes6  = [0,0x10000000,0x80000,0x10080000,0x2,0x10000002,0x80002,0x10080002,0,0x10000000,0x80000,0x10080000,0x2,0x10000002,0x80002,0x10080002];
  const pc2bytes7  = [0,0x10000,0x800,0x10800,0x20000000,0x20010000,0x20000800,0x20010800,0x20000,0x30000,0x20800,0x30800,0x20020000,0x20030000,0x20020800,0x20030800];
  const pc2bytes8  = [0,0x40000,0,0x40000,0x2,0x40002,0x2,0x40002,0x2000000,0x2040000,0x2000000,0x2040000,0x2000002,0x2040002,0x2000002,0x2040002];
  const pc2bytes9  = [0,0x10000000,0x8,0x10000008,0,0x10000000,0x8,0x10000008,0x400,0x10000400,0x408,0x10000408,0x400,0x10000400,0x408,0x10000408];
  const pc2bytes10 = [0,0x20,0,0x20,0x100000,0x100020,0x100000,0x100020,0x2000,0x2020,0x2000,0x2020,0x102000,0x102020,0x102000,0x102020];
  const pc2bytes11 = [0,0x1000000,0x200,0x1000200,0x200000,0x1200000,0x200200,0x1200200,0x4000000,0x5000000,0x4000200,0x5000200,0x4200000,0x5200000,0x4200200,0x5200200];
  const pc2bytes12 = [0,0x1000,0x8000000,0x8001000,0x80000,0x81000,0x8080000,0x8081000,0x10,0x1010,0x8000010,0x8001010,0x80010,0x81010,0x8080010,0x8081010];
  const pc2bytes13 = [0,0x4,0x100,0x104,0,0x4,0x100,0x104,0x1,0x5,0x101,0x105,0x1,0x5,0x101,0x105];

  const iterations = key.length() > 8 ? 3 : 1;
  const keys = [];
  const shifts = [0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0];

  let n = 0, tmp;
  for(let j = 0; j < iterations; j++) {
    let left = key.getInt32();
    let right = key.getInt32();

    tmp = ((left >>> 4) ^ right) & 0x0f0f0f0f;
    right ^= tmp;
    left ^= (tmp << 4);

    tmp = ((right >>> -16) ^ left) & 0x0000ffff;
    left ^= tmp;
    right ^= (tmp << -16);

    tmp = ((left >>> 2) ^ right) & 0x33333333;
    right ^= tmp;
    left ^= (tmp << 2);

    tmp = ((right >>> -16) ^ left) & 0x0000ffff;
    left ^= tmp;
    right ^= (tmp << -16);

    tmp = ((left >>> 1) ^ right) & 0x55555555;
    right ^= tmp;
    left ^= (tmp << 1);

    tmp = ((right >>> 8) ^ left) & 0x00ff00ff;
    left ^= tmp;
    right ^= (tmp << 8);

    tmp = ((left >>> 1) ^ right) & 0x55555555;
    right ^= tmp;
    left ^= (tmp << 1);

    tmp = (left << 8) | ((right >>> 20) & 0x000000f0);

    left = ((right << 24) | ((right << 8) & 0xff0000) |
      ((right >>> 8) & 0xff00) | ((right >>> 24) & 0xf0));
    right = tmp;

    for(let i = 0; i < shifts.length; ++i) {
      if(shifts[i]) {
        left = (left << 2) | (left >>> 26);
        right = (right << 2) | (right >>> 26);
      } else {
        left = (left << 1) | (left >>> 27);
        right = (right << 1) | (right >>> 27);
      }
      left &= -0xf;
      right &= -0xf;

      const lefttmp = (
        pc2bytes0[left >>> 28] | pc2bytes1[(left >>> 24) & 0xf] |
        pc2bytes2[(left >>> 20) & 0xf] | pc2bytes3[(left >>> 16) & 0xf] |
        pc2bytes4[(left >>> 12) & 0xf] | pc2bytes5[(left >>> 8) & 0xf] |
        pc2bytes6[(left >>> 4) & 0xf]);
      const righttmp = (
        pc2bytes7[right >>> 28] | pc2bytes8[(right >>> 24) & 0xf] |
        pc2bytes9[(right >>> 20) & 0xf] | pc2bytes10[(right >>> 16) & 0xf] |
        pc2bytes11[(right >>> 12) & 0xf] | pc2bytes12[(right >>> 8) & 0xf] |
        pc2bytes13[(right >>> 4) & 0xf]);
      tmp = ((righttmp >>> 16) ^ lefttmp) & 0x0000ffff;
      keys[n++] = lefttmp ^ tmp;
      keys[n++] = righttmp ^ (tmp << 16);
    }
  }

  return keys;
}

function _updateBlock(keys: any, input: any, output: any, decrypt: boolean) {
  const iterations = keys.length === 32 ? 3 : 9;
  let looping;
  if(iterations === 3) {
    looping = decrypt ? [30, -2, -2] : [0, 32, 2];
  } else {
    looping = (decrypt ?
      [94, 62, -2, 32, 64, 2, 30, -2, -2] :
      [0, 32, 2, 62, 30, -2, 64, 96, 2]);
  }

  let tmp;

  let left = input[0];
  let right = input[1];

  tmp = ((left >>> 4) ^ right) & 0x0f0f0f0f;
  right ^= tmp;
  left ^= (tmp << 4);

  tmp = ((left >>> 16) ^ right) & 0x0000ffff;
  right ^= tmp;
  left ^= (tmp << 16);

  tmp = ((right >>> 2) ^ left) & 0x33333333;
  left ^= tmp;
  right ^= (tmp << 2);

  tmp = ((right >>> 8) ^ left) & 0x00ff00ff;
  left ^= tmp;
  right ^= (tmp << 8);

  tmp = ((left >>> 1) ^ right) & 0x55555555;
  right ^= tmp;
  left ^= (tmp << 1);

  left = ((left << 1) | (left >>> 31));
  right = ((right << 1) | (right >>> 31));

  for(let j = 0; j < iterations; j += 3) {
    const endloop = looping[j + 1];
    const loopinc = looping[j + 2];

    for(let i = looping[j]; i != endloop; i += loopinc) {
      const right1 = right ^ keys[i];
      const right2 = ((right >>> 4) | (right << 28)) ^ keys[i + 1];

      tmp = left;
      left = right;
      right = tmp ^ (
        spfunction2[(right1 >>> 24) & 0x3f] |
        spfunction4[(right1 >>> 16) & 0x3f] |
        spfunction6[(right1 >>>  8) & 0x3f] |
        spfunction8[right1 & 0x3f] |
        spfunction1[(right2 >>> 24) & 0x3f] |
        spfunction3[(right2 >>> 16) & 0x3f] |
        spfunction5[(right2 >>>  8) & 0x3f] |
        spfunction7[right2 & 0x3f]);
    }
    tmp = left;
    left = right;
    right = tmp;
  }

  left = ((left >>> 1) | (left << 31));
  right = ((right >>> 1) | (right << 31));

  tmp = ((left >>> 1) ^ right) & 0x55555555;
  right ^= tmp;
  left ^= (tmp << 1);

  tmp = ((right >>> 8) ^ left) & 0x00ff00ff;
  left ^= tmp;
  right ^= (tmp << 8);

  tmp = ((right >>> 2) ^ left) & 0x33333333;
  left ^= tmp;
  right ^= (tmp << 2);

  tmp = ((left >>> 16) ^ right) & 0x0000ffff;
  right ^= tmp;
  left ^= (tmp << 16);

  tmp = ((left >>> 4) ^ right) & 0x0f0f0f0f;
  right ^= tmp;
  left ^= (tmp << 4);

  output[0] = left;
  output[1] = right;
}

function registerAlgorithm(name: string, mode: any) {
  const factory = function() {
    return new des.Algorithm(name, mode);
  };
  cipher.registerAlgorithm(name, factory);
}

// Register DES-ECB
registerAlgorithm('DES-ECB', cipher.modes.ecb);

// Exports
export const createBuffer = util.createBuffer;
export const decode64 = util.decode64;
export const createDecipher = cipher.createDecipher;
