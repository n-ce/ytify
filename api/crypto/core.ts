/* eslint-disable no-use-before-define */

import type { X64WordArray } from './x64-core';

/**
 * Encoder interface for encoding strategies
 */
export interface Encoder {
  /**
   * Converts a word array to a string representation
   * @param wordArray - The word array to stringify
   * @returns The string representation
   */
  stringify(wordArray: WordArray): string;
  
  /**
   * Converts a string to a word array
   * @param str - The string to parse
   * @returns The word array representation
   */
  parse(str: string): WordArray;
}

/**
 * Configuration options for hashers
 */
export interface HasherCfg {
  /** Output length for SHA3 */
  outputLength?: number;
}

/**
 * Type definition for hash functions
 */
export type HashFn = (message: WordArray | string, cfg?: HasherCfg) => WordArray;

/**
 * Type definition for HMAC hash functions
 */
export type HMACHashFn = (message: WordArray | string, key: WordArray | string) => WordArray;

/**
 * Type for supported typed arrays
 */
type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | 
                  Int16Array | Uint16Array | 
                  Int32Array | Uint32Array |
                  Float32Array | Float64Array;

/**
 * Type for word array input
 */
type WordArrayInput = number[] | ArrayBuffer | TypedArray;

/**
 * Get global crypto object across different environments
 */
declare const global: any;
const crypto: Crypto | undefined =
  (typeof globalThis !== 'undefined' ? globalThis : void 0)?.crypto ||
  (typeof global !== 'undefined' ? (global as any) : void 0)?.crypto ||
  (typeof window !== 'undefined' ? window : void 0)?.crypto ||
  (typeof self !== 'undefined' ? self : void 0)?.crypto ||
  (typeof frames !== 'undefined' ? (frames as any) : void 0)?.[0]?.crypto;

/**
 * Random word array generator function
 */
let randomWordArray: (nBytes: number) => WordArray;

if (crypto) {
  randomWordArray = (nBytes: number): WordArray => {
    const words: number[] = [];

    for (let i = 0; i < nBytes; i += 4) {
      words.push(crypto.getRandomValues(new Uint32Array(1))[0]);
    }

    return new WordArray(words, nBytes);
  };
} else {
  // Because there is no global crypto property in this context, cryptographically unsafe Math.random() is used.
  randomWordArray = (nBytes: number): WordArray => {
    const words: number[] = [];
  
    const r = (m_w: number): () => number => {
      let _m_w = m_w;
      let _m_z = 0x3ade68b1;
      const mask = 0xffffffff;
  
      return (): number => {
        _m_z = (0x9069 * (_m_z & 0xFFFF) + (_m_z >> 0x10)) & mask;
        _m_w = (0x4650 * (_m_w & 0xFFFF) + (_m_w >> 0x10)) & mask;
        let result = ((_m_z << 0x10) + _m_w) & mask;
        result /= 0x100000000;
        result += 0.5;
        return result * (Math.random() > 0.5 ? 1 : -1);
      };
    };
  
    let rcache: number | undefined;
    for (let i = 0; i < nBytes; i += 4) {
      const _r = r((rcache || Math.random()) * 0x100000000);
  
      rcache = _r() * 0x3ade67b7;
      words.push((_r() * 0x100000000) | 0);
    }
  
    return new WordArray(words, nBytes);
  };
}

/**
 * Base class for inheritance.
 * Provides basic object-oriented programming utilities.
 */
export class Base {
  /**
   * Creates a new instance of this class with the provided arguments.
   * This is a factory method that provides an alternative to using 'new'.
   * 
   * @param args - Arguments to pass to the constructor
   * @returns A new instance of this class
   * @static
   * @example
   * ```javascript
   * const instance = MyType.create(arg1, arg2);
   * ```
   */
  static create<T extends Base>(this: new (...args: any[]) => T, ...args: any[]): T {
    return new this(...args);
  }

  /**
   * Copies properties from the provided object into this instance.
   * Performs a shallow merge of properties.
   * 
   * @param properties - The properties to mix in
   * @returns This instance for method chaining
   * @example
   * ```javascript
   * instance.mixIn({ field: 'value', another: 123 });
   * ```
   */
  mixIn(properties: Record<string, unknown>): this {
    return Object.assign(this, properties);
  }

  /**
   * Creates a deep copy of this object.
   * 
   * @returns A clone of this instance
   * @example
   * ```javascript
   * const clone = instance.clone();
   * ```
   */
  clone(): this {
    const clone = new (this.constructor as new () => this)();
    Object.assign(clone, this);
    return clone;
  }
}

/**
 * An array of 32-bit words.
 * This is the core data structure used throughout the library for representing binary data.
 * 
 * @property words - The array of 32-bit words
 * @property sigBytes - The number of significant bytes in this word array
 */
export class WordArray extends Base {
  /** The array of 32-bit words */
  words!: number[];
  
  /** The number of significant bytes in this word array */
  sigBytes!: number;

  /**
   * Initializes a newly created word array.
   * Can accept various input formats including regular arrays, typed arrays, and ArrayBuffers.
   * 
   * @param words - An array of 32-bit words, typed array, or ArrayBuffer
   * @param sigBytes - The number of significant bytes in the words (defaults to words.length * 4)
   * @example
   * ```javascript
   * const wordArray = new WordArray();
   * const wordArray = new WordArray([0x00010203, 0x04050607]);
   * const wordArray = new WordArray([0x00010203, 0x04050607], 6);
   * const wordArray = new WordArray(new Uint8Array([1, 2, 3, 4]));
   * ```
   */
  constructor(words: WordArrayInput = [], sigBytes?: number) {
    super();

    // Handle ArrayBuffer input
    if (words instanceof ArrayBuffer) {
      const typedArray = new Uint8Array(words);
      this._initFromUint8Array(typedArray);
      return;
    }

    // Handle typed array input
    if (ArrayBuffer.isView(words)) {
      let uint8Array: Uint8Array;
      
      if (words instanceof Uint8Array) {
        uint8Array = words;
      } else {
        // Convert other typed arrays to Uint8Array
        uint8Array = new Uint8Array(
          words.buffer, 
          words.byteOffset, 
          words.byteLength
        );
      }
      
      this._initFromUint8Array(uint8Array);
      return;
    }

    // Handle regular array input
    this.words = words as number[];
    this.sigBytes = sigBytes !== undefined ? sigBytes : this.words.length * 4;
  }

  /**
   * Initialize from Uint8Array
   * @private
   */
  private _initFromUint8Array(typedArray: Uint8Array): void {
    const typedArrayByteLength = typedArray.byteLength;
    const words: number[] = [];
    
    for (let i = 0; i < typedArrayByteLength; i += 1) {
      words[i >>> 2] |= typedArray[i] << (24 - (i % 4) * 8);
    }

    this.words = words;
    this.sigBytes = typedArrayByteLength;
  }

  /**
   * Creates a word array filled with cryptographically strong random bytes.
   * Uses Web Crypto API if available, falls back to Math.random() if not.
   * 
   * @param nBytes - The number of random bytes to generate
   * @returns The random word array
   * @static
   * @example
   * ```javascript
   * const randomBytes = WordArray.random(16); // Generate 16 random bytes
   * ```
   */
  static random = randomWordArray;

  /**
   * Converts this word array to a string using the specified encoding.
   * 
   * @param encoder - The encoding strategy to use (defaults to Hex)
   * @returns The stringified word array
   * @example
   * ```javascript
   * const hexString = wordArray.toString();
   * const base64String = wordArray.toString(Base64);
   * const utf8String = wordArray.toString(Utf8);
   * ```
   */
  toString(encoder: Encoder = Hex): string {
    return encoder.stringify(this);
  }

  /**
   * Concatenates a word array to this word array.
   * Modifies this word array in place.
   * 
   * @param wordArray - The word array to append
   * @returns This word array for method chaining
   * @example
   * ```javascript
   * wordArray1.concat(wordArray2);
   * const combined = wordArray1.concat(wordArray2).concat(wordArray3);
   * ```
   */
  concat(wordArray: WordArray): this {
    const thisWords = this.words;
    const thatWords = wordArray.words;
    const thisSigBytes = this.sigBytes;
    const thatSigBytes = wordArray.sigBytes;

    // Clamp excess bits
    this.clamp();

    // Concat
    if (thisSigBytes % 4) {
      // Copy one byte at a time for unaligned data
      for (let i = 0; i < thatSigBytes; i += 1) {
        const thatByte = (thatWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        thisWords[(thisSigBytes + i) >>> 2] |= thatByte << (24 - ((thisSigBytes + i) % 4) * 8);
      }
    } else {
      // Copy one word at a time for aligned data
      for (let i = 0; i < thatSigBytes; i += 4) {
        thisWords[(thisSigBytes + i) >>> 2] = thatWords[i >>> 2];
      }
    }
    this.sigBytes += thatSigBytes;

    return this;
  }

  /**
   * Removes insignificant bits from the end of the word array.
   * This ensures the word array only contains the exact number of significant bytes.
   * 
   * @example
   * ```javascript
   * wordArray.clamp();
   * ```
   */
  clamp(): void {
    const { words, sigBytes } = this;

    // Clamp
    words[sigBytes >>> 2] &= 0xffffffff << (32 - (sigBytes % 4) * 8);
    words.length = Math.ceil(sigBytes / 4);
  }

  /**
   * Creates a copy of this word array.
   * 
   * @returns The cloned word array
   * @example
   * ```javascript
   * const clone = wordArray.clone();
   * ```
   */
  clone(): this {
    const clone = super.clone();
    clone.words = this.words.slice(0);
    return clone;
  }
}

/**
 * Hex encoding strategy.
 * Converts between word arrays and hexadecimal strings.
 */
export const Hex: Encoder = {
  /**
   * Converts a word array to a hex string.
   * 
   * @param wordArray - The word array to convert
   * @returns The hex string representation
   * @example
   * ```javascript
   * const hexString = Hex.stringify(wordArray);
   * ```
   */
  stringify(wordArray: WordArray): string {
    const { words, sigBytes } = wordArray;
    const hexChars: string[] = [];
    
    for (let i = 0; i < sigBytes; i += 1) {
      const bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      hexChars.push((bite >>> 4).toString(16));
      hexChars.push((bite & 0x0f).toString(16));
    }

    return hexChars.join('');
  },

  /**
   * Converts a hex string to a word array.
   * 
   * @param hexStr - The hex string to parse
   * @returns The word array representation
   * @example
   * ```javascript
   * const wordArray = Hex.parse('48656c6c6f');
   * ```
   */
  parse(hexStr: string): WordArray {
    const hexStrLength = hexStr.length;
    const words: number[] = [];
    
    for (let i = 0; i < hexStrLength; i += 2) {
      words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << (24 - (i % 8) * 4);
    }

    return new WordArray(words, hexStrLength / 2);
  }
};

/**
 * Latin1 encoding strategy.
 * Converts between word arrays and Latin-1 (ISO-8859-1) strings.
 */
export const Latin1: Encoder = {
  /**
   * Converts a word array to a Latin1 string.
   * 
   * @param wordArray - The word array to convert
   * @returns The Latin1 string representation
   * @example
   * ```javascript
   * const latin1String = Latin1.stringify(wordArray);
   * ```
   */
  stringify(wordArray: WordArray): string {
    const { words, sigBytes } = wordArray;
    const latin1Chars: string[] = [];
    
    for (let i = 0; i < sigBytes; i += 1) {
      const bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      latin1Chars.push(String.fromCharCode(bite));
    }

    return latin1Chars.join('');
  },

  /**
   * Converts a Latin1 string to a word array.
   * 
   * @param latin1Str - The Latin1 string to parse
   * @returns The word array representation
   * @example
   * ```javascript
   * const wordArray = Latin1.parse('Hello');
   * ```
   */
  parse(latin1Str: string): WordArray {
    const latin1StrLength = latin1Str.length;
    const words: number[] = [];
    
    for (let i = 0; i < latin1StrLength; i += 1) {
      words[i >>> 2] |= (latin1Str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
    }

    return new WordArray(words, latin1StrLength);
  }
};

/**
 * UTF-8 encoding strategy.
 * Converts between word arrays and UTF-8 strings.
 */
export const Utf8: Encoder = {
  /**
   * Converts a word array to a UTF-8 string.
   * 
   * @param wordArray - The word array to convert
   * @returns The UTF-8 string representation
   * @throws Error if the data is malformed UTF-8
   * @example
   * ```javascript
   * const utf8String = Utf8.stringify(wordArray);
   * ```
   */
  stringify(wordArray: WordArray): string {
    try {
      return decodeURIComponent(escape(Latin1.stringify(wordArray)));
    } catch (e) {
      throw new Error('Malformed UTF-8 data');
    }
  },

  /**
   * Converts a UTF-8 string to a word array.
   * 
   * @param utf8Str - The UTF-8 string to parse
   * @returns The word array representation
   * @example
   * ```javascript
   * const wordArray = Utf8.parse('Hello, 世界');
   * ```
   */
  parse(utf8Str: string): WordArray {
    return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
  }
};

/**
 * Abstract buffered block algorithm template.
 * Provides a base implementation for algorithms that process data in fixed-size blocks.
 * 
 * @property _minBufferSize - The number of blocks that should be kept unprocessed in the buffer
 */
export abstract class BufferedBlockAlgorithm extends Base {
  /** The number of blocks that should be kept unprocessed in the buffer */
  protected _minBufferSize: number = 0;
  
  /** The data buffer */
  protected _data!: WordArray;
  
  /** The number of bytes in the data buffer */
  protected _nDataBytes!: number;
  
  /** The block size in 32-bit words */
  abstract blockSize: number;

  constructor() {
    super();
    // Don't call reset() here - let subclasses do it after they've initialized their properties
  }

  /**
   * Resets this block algorithm's data buffer to its initial state.
   * 
   * @example
   * ```javascript
   * bufferedBlockAlgorithm.reset();
   * ```
   */
  reset(): void {
    this._data = new WordArray();
    this._nDataBytes = 0;
  }

  /**
   * Adds new data to this block algorithm's buffer.
   * 
   * @param data - The data to append (strings are converted to WordArray using UTF-8)
   * @example
   * ```javascript
   * bufferedBlockAlgorithm._append('data');
   * bufferedBlockAlgorithm._append(wordArray);
   * ```
   */
  protected _append(data: WordArray | string): void {
    let m_data: WordArray;

    // Convert string to WordArray, else assume WordArray already
    if (typeof data === 'string') {
      m_data = Utf8.parse(data);
    } else {
      m_data = data;
    }

    // Append
    this._data.concat(m_data);
    this._nDataBytes += m_data.sigBytes;
  }

  /**
   * Processes available data blocks.
   * This method invokes _doProcessBlock(dataWords, offset), which must be implemented by a concrete subtype.
   * 
   * @param doFlush - Whether all blocks and partial blocks should be processed
   * @returns The processed data
   * @example
   * ```javascript
   * const processedData = bufferedBlockAlgorithm._process();
   * const processedData = bufferedBlockAlgorithm._process(true); // Flush
   * ```
   */
  protected _process(doFlush?: boolean): WordArray {
    let processedWords: number[] | undefined;

    const data = this._data;
    const dataWords = data.words;
    const dataSigBytes = data.sigBytes;
    const blockSizeBytes = this.blockSize * 4;

    // Count blocks ready
    let nBlocksReady = dataSigBytes / blockSizeBytes;
    if (doFlush) {
      // Round up to include partial blocks
      nBlocksReady = Math.ceil(nBlocksReady);
    } else {
      // Round down to include only full blocks,
      // less the number of blocks that must remain in the buffer
      nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
    }

    // Count words ready
    const nWordsReady = nBlocksReady * this.blockSize;

    // Count bytes ready
    const nBytesReady = Math.min(nWordsReady * 4, dataSigBytes);

    // Process blocks
    if (nWordsReady) {
      for (let offset = 0; offset < nWordsReady; offset += this.blockSize) {
        // Perform concrete-algorithm logic
        this._doProcessBlock(dataWords, offset);
      }

      // Remove processed words
      processedWords = dataWords.splice(0, nWordsReady);
      data.sigBytes -= nBytesReady;
    }

    // Return processed words
    return new WordArray(processedWords || [], nBytesReady);
  }

  /**
   * Process a single block of data.
   * Must be implemented by concrete subclasses.
   * 
   * @param dataWords - The data words array
   * @param offset - The offset in the data words array
   */
  protected abstract _doProcessBlock(dataWords: number[], offset: number): void;

  /**
   * Creates a copy of this object.
   * 
   * @returns The clone
   * @example
   * ```javascript
   * const clone = bufferedBlockAlgorithm.clone();
   * ```
   */
  clone(): this {
    const clone = super.clone();
    clone._data = this._data.clone();
    return clone;
  }
}

/**
 * Abstract hasher template.
 * Base class for all hash algorithm implementations.
 * 
 * @property blockSize - The number of 32-bit words this hasher operates on (default: 16 = 512 bits)
 */
export abstract class Hasher extends BufferedBlockAlgorithm {
  /** The number of 32-bit words this hasher operates on */
  blockSize: number = 512 / 32;
  
  /** Configuration options */
  cfg: HasherCfg;
  
  /** The hash result */
  protected _hash!: WordArray | X64WordArray;

  /**
   * Initializes a newly created hasher.
   * 
   * @param cfg - Configuration options
   */
  constructor(cfg?: HasherCfg) {
    super();
    this.cfg = Object.assign({}, cfg);
    this.reset();
  }

  /**
   * Creates a shortcut function to a hasher's object interface.
   * 
   * @param SubHasher - The hasher class to create a helper for
   * @returns The shortcut function
   * @static
   * @example
   * ```javascript
   * const SHA256 = Hasher._createHelper(SHA256Algo);
   * ```
   */
  static _createHelper<T extends Hasher>(SubHasher: new (cfg?: HasherCfg) => T): HashFn {
    return (message: WordArray | string, cfg?: HasherCfg): WordArray => {
      return new SubHasher(cfg).finalize(message);
    };
  }

  /**
   * Creates a shortcut function to the HMAC's object interface.
   * 
   * @param SubHasher - The hasher class to use in this HMAC helper
   * @returns The shortcut function
   * @static
   * @example
   * ```javascript
   * const HmacSHA256 = Hasher._createHmacHelper(SHA256Algo);
   * ```
   */
  static _createHmacHelper<T extends Hasher>(SubHasher: new (cfg?: HasherCfg) => T): HMACHashFn {
    return (message: WordArray | string, key: WordArray | string): WordArray => {
      return new HMAC(SubHasher, key).finalize(message);
    };
  }

  /**
   * Resets this hasher to its initial state.
   * 
   * @example
   * ```javascript
   * hasher.reset();
   * ```
   */
  reset(): void {
    super.reset();
    this._doReset();
  }

  /**
   * Updates this hasher with a message.
   * 
   * @param messageUpdate - The message to append
   * @returns This hasher instance for method chaining
   * @example
   * ```javascript
   * hasher.update('message');
   * hasher.update(wordArray);
   * ```
   */
  update(messageUpdate: WordArray | string): this {
    this._append(messageUpdate);
    this._process();
    return this;
  }

  /**
   * Finalizes the hash computation.
   * Note that the finalize operation is effectively a destructive, read-once operation.
   * 
   * @param messageUpdate - An optional final message update
   * @returns The computed hash
   * @example
   * ```javascript
   * const hash = hasher.finalize();
   * const hash = hasher.finalize('message');
   * const hash = hasher.finalize(wordArray);
   * ```
   */
  finalize(messageUpdate?: WordArray | string): WordArray {
    if (messageUpdate) {
      this._append(messageUpdate);
    }

    const hash = this._doFinalize();
    return hash;
  }

  /**
   * Resets the hasher to its initial state.
   * Must be implemented by concrete subclasses.
   */
  protected abstract _doReset(): void;

  /**
   * Finalizes the hash computation.
   * Must be implemented by concrete subclasses.
   */
  protected abstract _doFinalize(): WordArray;
}

/**
 * Base class for 32-bit hash algorithms.
 * Hash algorithms that operate on 32-bit words should extend this class.
 */
export abstract class Hasher32 extends Hasher {
  /** The hash result (always WordArray for 32-bit hashers) */
  declare protected _hash: WordArray;

  /**
   * Finalizes the hash computation.
   * Must be implemented by concrete subclasses.
   */
  protected abstract _doFinalize(): WordArray;
}

/**
 * Base class for 64-bit hash algorithms.
 * Hash algorithms that operate on 64-bit words should extend this class.
 */
export abstract class Hasher64 extends Hasher {
  /** The hash result (always X64WordArray for 64-bit hashers) */
  declare protected _hash: X64WordArray;

  /**
   * Finalizes the hash computation.
   * Must be implemented by concrete subclasses.
   * @returns The hash result as a 32-bit WordArray
   */
  protected abstract _doFinalize(): WordArray;
}

/**
 * HMAC (Hash-based Message Authentication Code) algorithm.
 * Provides message authentication using a cryptographic hash function and a secret key.
 */
export class HMAC extends Base {
  /** The inner hasher instance */
  private _hasher: Hasher;
  
  /** The outer key */
  private _oKey: WordArray;
  
  /** The inner key */
  private _iKey: WordArray;

  /**
   * Initializes a newly created HMAC.
   * 
   * @param SubHasher - The hash algorithm class to use
   * @param key - The secret key
   * @example
   * ```javascript
   * const hmac = new HMAC(SHA256Algo, 'secret key');
   * ```
   */
  constructor(SubHasher: new (cfg?: HasherCfg) => Hasher, key: WordArray | string) {
    super();

    const hasher = new SubHasher();
    this._hasher = hasher;

    // Convert string to WordArray, else assume WordArray already
    let _key: WordArray;
    if (typeof key === 'string') {
      _key = Utf8.parse(key);
    } else {
      _key = key;
    }

    // Shortcuts
    const hasherBlockSize = hasher.blockSize;
    const hasherBlockSizeBytes = hasherBlockSize * 4;

    // Allow arbitrary length keys
    if (_key.sigBytes > hasherBlockSizeBytes) {
      _key = hasher.finalize(_key);
    }

    // Clamp excess bits
    _key.clamp();

    // Clone key for inner and outer pads
    const oKey = _key.clone();
    this._oKey = oKey;
    const iKey = _key.clone();
    this._iKey = iKey;

    // Shortcuts
    const oKeyWords = oKey.words;
    const iKeyWords = iKey.words;

    // XOR keys with pad constants
    for (let i = 0; i < hasherBlockSize; i += 1) {
      oKeyWords[i] ^= 0x5c5c5c5c;
      iKeyWords[i] ^= 0x36363636;
    }
    oKey.sigBytes = hasherBlockSizeBytes;
    iKey.sigBytes = hasherBlockSizeBytes;

    // Set initial values
    this.reset();
  }

  /**
   * Factory method to create an HMAC instance.
   * 
   * @param SubHasher - The hash algorithm class to use
   * @param key - The secret key
   * @returns A new HMAC instance
   * @static
   * @example
   * ```javascript
   * const hmac = HMAC.create(SHA256Algo, key);
   * ```
   */
  static create(SubHasher: new (cfg?: HasherCfg) => Hasher, key: WordArray | string): HMAC;
  static create<T extends HMAC>(this: new (...args: any[]) => T, ...args: any[]): T;
  static create(...args: any[]): any {
    const [SubHasher, key] = args;
    return new HMAC(SubHasher, key);
  }

  /**
   * Resets this HMAC to its initial state.
   * 
   * @example
   * ```javascript
   * hmac.reset();
   * ```
   */
  reset(): void {
    const hasher = this._hasher;
    hasher.reset();
    hasher.update(this._iKey);
  }

  /**
   * Updates this HMAC with a message.
   * 
   * @param messageUpdate - The message to append
   * @returns This HMAC instance for method chaining
   * @example
   * ```javascript
   * hmac.update('message');
   * hmac.update(wordArray);
   * ```
   */
  update(messageUpdate: WordArray | string): this {
    this._hasher.update(messageUpdate);
    return this;
  }

  /**
   * Finalizes the HMAC computation.
   * Note that the finalize operation is effectively a destructive, read-once operation.
   * 
   * @param messageUpdate - An optional final message update
   * @returns The computed HMAC
   * @example
   * ```javascript
   * const hmacValue = hmac.finalize();
   * const hmacValue = hmac.finalize('message');
   * const hmacValue = hmac.finalize(wordArray);
   * ```
   */
  finalize(messageUpdate?: WordArray | string): WordArray {
    const hasher = this._hasher;

    // Compute HMAC
    const innerHash = hasher.finalize(messageUpdate);
    hasher.reset();
    const hmac = hasher.finalize(this._oKey.clone().concat(innerHash));

    return hmac;
  }
}

/**
 * Configuration options for key derivation functions
 */
export interface KDFCfg {
  /** Key size for EvpKDF */
  keySize?: number;
  /** Hasher function for EvpKDF */
  hasher?: new (cfg?: HasherCfg) => Hasher;
  /** Number of iterations */
  iterations?: number;
}

/**
 * Type definition for key derivation functions
 */
export type KDFFn = (password: WordArray | string, salt: WordArray | string, cfg?: KDFCfg) => WordArray;