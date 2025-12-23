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

// Exports
export const createBuffer = util.createBuffer;
export const decode64 = util.decode64;
export const createDecipher = cipher.createDecipher;
