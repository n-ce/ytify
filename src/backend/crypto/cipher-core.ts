/* eslint-disable no-use-before-define */

import {
  Base,
  WordArray,
  BufferedBlockAlgorithm,
  Hasher,
  HasherCfg,
  Hex,
} from './core.js';
import { Base64 } from './enc-base64.js';
import { EvpKDFAlgo } from './evpkdf.js';

// Re-export WordArray for convenience
export { WordArray } from './core.js';

/**
 * Configuration options for ciphers
 */
export interface CipherCfg {
  /** Initialization vector */
  iv?: WordArray;
  /** Block cipher mode */
  mode?: typeof BlockCipherMode;
  /** Padding strategy */
  padding?: Padding;
  /** Formatter for serialization */
  format?: Format;
  /** Key derivation function */
  kdf?: Kdf;
  /** Salt for key derivation */
  salt?: WordArray | string;
  /** Hasher for key derivation */
  hasher?: new (cfg?: HasherCfg) => Hasher;
  /** Drop value for RC4Drop */
  drop?: number;
}

/**
 * Cipher parameters configuration
 */
export interface CipherParamsCfg {
  /** The raw ciphertext */
  ciphertext?: WordArray;
  /** The key to this ciphertext */
  key?: WordArray;
  /** The IV used in the ciphering operation */
  iv?: WordArray;
  /** The salt used with a key derivation function */
  salt?: WordArray;
  /** The cipher algorithm */
  algorithm?: typeof Cipher;
  /** The block mode used in the ciphering operation */
  mode?: typeof BlockCipherMode;
  /** The padding scheme used in the ciphering operation */
  padding?: Padding;
  /** The block size of the cipher */
  blockSize?: number;
  /** The default formatting strategy */
  formatter?: Format;
  /** Allow additional properties */
  [key: string]: unknown;
}

/**
 * Cipher object interface
 */
export interface CipherObj {
  /**
   * Encrypts a message
   * @param message - The message to encrypt
   * @param key - The key
   * @param cfg - Configuration options
   * @returns The encrypted cipher params
   */
  encrypt(message: WordArray | string, key: WordArray | string, cfg?: CipherCfg): CipherParams;
  
  /**
   * Decrypts ciphertext
   * @param ciphertext - The ciphertext to decrypt
   * @param key - The key
   * @param cfg - Configuration options
   * @returns The decrypted plaintext
   */
  decrypt(ciphertext: CipherParams | CipherParamsCfg | string, key: WordArray | string, cfg?: CipherCfg): WordArray;
}

/**
 * Padding strategy interface
 */
export interface Padding {
  /**
   * Pads data to a multiple of blockSize
   * @param data - The data to pad
   * @param blockSize - The block size in words
   */
  pad(data: WordArray, blockSize: number): void;
  
  /**
   * Unpads data
   * @param data - The data to unpad
   */
  unpad(data: WordArray): void;
}

/**
 * Format strategy interface
 */
export interface Format {
  /**
   * Converts cipher params to string
   * @param cipherParams - The cipher params
   * @returns The string representation
   */
  stringify(cipherParams: CipherParams): string;
  
  /**
   * Parses string to cipher params
   * @param str - The string to parse
   * @param cipher - The cipher class
   * @returns The cipher params
   */
  parse(str: string, cipher?: any): CipherParams;
}

/**
 * Key derivation function interface
 */
export interface Kdf {
  /**
   * Derives key and IV from password
   * @param password - The password
   * @param keySize - Key size in words
   * @param ivSize - IV size in words
   * @param salt - Optional salt
   * @param hasher - Optional hasher
   * @returns The derived cipher params
   */
  execute(
    password: string,
    keySize: number,
    ivSize: number,
    salt?: WordArray | string,
    hasher?: new (cfg?: HasherCfg) => Hasher
  ): CipherParams;
}

/**
 * Abstract base cipher template.
 * Provides the foundation for all encryption and decryption algorithms.
 * 
 * @property keySize - This cipher's key size in words (default: 4 = 128 bits)
 * @property ivSize - This cipher's IV size in words (default: 4 = 128 bits)
 * @property _ENC_XFORM_MODE - A constant representing encryption mode
 * @property _DEC_XFORM_MODE - A constant representing decryption mode
 */
export abstract class Cipher extends BufferedBlockAlgorithm {
  /** Encryption mode constant */
  static readonly _ENC_XFORM_MODE: number = 1;
  
  /** Decryption mode constant */
  static readonly _DEC_XFORM_MODE: number = 2;
  
  /** Default key size in words (128 bits) */
  static keySize: number = 128 / 32;
  
  /** Default IV size in words (128 bits) */
  static ivSize: number = 128 / 32;
  
  /** Configuration options */
  cfg: CipherCfg;
  
  /** Transform mode (encryption or decryption) */
  protected _xformMode: number;
  
  /** The key */
  protected _key: WordArray;
  
  /** Block size in words */
  blockSize: number = 128 / 32;

  /**
   * Initializes a newly created cipher.
   * 
   * @param xformMode - Either the encryption or decryption transformation mode constant
   * @param key - The key
   * @param cfg - Configuration options to use for this operation
   * @example
   * ```javascript
   * const cipher = new AESAlgo(
   *   Cipher._ENC_XFORM_MODE, keyWordArray, { iv: ivWordArray }
   * );
   * ```
   */
  constructor(xformMode: number, key: WordArray, cfg?: CipherCfg) {
    super();
    this.cfg = Object.assign({}, cfg);
    this._xformMode = xformMode;
    this._key = key;
    // Note: reset() is called by subclasses after initialization
  }

  /**
   * Creates this cipher in encryption mode.
   * 
   * @param key - The key
   * @param cfg - Configuration options to use for this operation
   * @returns A cipher instance
   * @static
   * @example
   * ```javascript
   * const cipher = AESAlgo.createEncryptor(keyWordArray, { iv: ivWordArray });
   * ```
   */
  static createEncryptor<T extends Cipher>(
    this: new (xformMode: number, key: WordArray, cfg?: CipherCfg) => T,
    key: WordArray,
    cfg?: CipherCfg
  ): T {
    return (this as any).create(Cipher._ENC_XFORM_MODE, key, cfg);
  }

  /**
   * Creates this cipher in decryption mode.
   * 
   * @param key - The key
   * @param cfg - Configuration options to use for this operation
   * @returns A cipher instance
   * @static
   * @example
   * ```javascript
   * const cipher = AESAlgo.createDecryptor(keyWordArray, { iv: ivWordArray });
   * ```
   */
  static createDecryptor<T extends Cipher>(
    this: new (xformMode: number, key: WordArray, cfg?: CipherCfg) => T,
    key: WordArray,
    cfg?: CipherCfg
  ): T {
    return (this as any).create(Cipher._DEC_XFORM_MODE, key, cfg);
  }

  /**
   * Factory method to create a cipher instance.
   * 
   * @param xformMode - Transform mode
   * @param key - The key
   * @param cfg - Configuration options
   * @returns A cipher instance
   * @static
   */
  static create<T extends Cipher>(
    this: new (xformMode: number, key: WordArray, cfg?: CipherCfg) => T,
    xformMode: number,
    key: WordArray,
    cfg?: CipherCfg
  ): T;
  static create<T extends Base>(this: new (...args: any[]) => T, ...args: any[]): T;
  static create(this: any, ...args: any[]): any {
    // Handle both Cipher and Base cases
    if (args.length >= 2 && typeof args[0] === 'number') {
      // Cipher case: xformMode, key, cfg
      const [xformMode, key, cfg] = args;
      const instance = new this(xformMode, key, cfg);
      // Call reset after construction to properly initialize
      instance.reset();
      return instance;
    } else {
      // Base case: pass all arguments
      return new this(...args);
    }
  }

  /**
   * Creates shortcut functions to a cipher's object interface.
   * 
   * @param SubCipher - The cipher to create a helper for
   * @returns An object with encrypt and decrypt shortcut functions
   * @static
   * @example
   * ```javascript
   * const AES = Cipher._createHelper(AESAlgo);
   * ```
   */
  static _createHelper(SubCipher: typeof Cipher): CipherObj {
    const selectCipherStrategy = (key: WordArray | string): typeof SerializableCipher => {
      if (typeof key === 'string') {
        return PasswordBasedCipher;
      }
      return SerializableCipher;
    };

    return {
      encrypt(message: WordArray | string, key: WordArray | string, cfg?: CipherCfg): CipherParams {
        return selectCipherStrategy(key).encrypt(SubCipher, message, key, cfg);
      },

      decrypt(
        ciphertext: CipherParams | CipherParamsCfg | string,
        key: WordArray | string,
        cfg?: CipherCfg
      ): WordArray {
        return selectCipherStrategy(key).decrypt(SubCipher, ciphertext, key, cfg);
      },
    };
  }

  /**
   * Resets this cipher to its initial state.
   * 
   * @example
   * ```javascript
   * cipher.reset();
   * ```
   */
  reset(): void {
    super.reset();
    this._doReset();
  }

  /**
   * Adds data to be encrypted or decrypted.
   * 
   * @param dataUpdate - The data to encrypt or decrypt
   * @returns The data after processing
   * @example
   * ```javascript
   * const encrypted = cipher.process('data');
   * const encrypted = cipher.process(wordArray);
   * ```
   */
  process(dataUpdate: WordArray | string): WordArray {
    this._append(dataUpdate);
    return this._process();
  }

  /**
   * Finalizes the encryption or decryption process.
   * Note that the finalize operation is effectively a destructive, read-once operation.
   * 
   * @param dataUpdate - The final data to encrypt or decrypt
   * @returns The data after final processing
   * @example
   * ```javascript
   * const encrypted = cipher.finalize();
   * const encrypted = cipher.finalize('data');
   * const encrypted = cipher.finalize(wordArray);
   * ```
   */
  finalize(dataUpdate?: WordArray | string): WordArray {
    if (dataUpdate) {
      this._append(dataUpdate);
    }
    const finalProcessedData = this._doFinalize();
    return finalProcessedData;
  }

  /**
   * Reset implementation for concrete cipher
   * Must be implemented by subclasses
   */
  protected abstract _doReset(): void;

  /**
   * Finalize implementation for concrete cipher
   * Must be implemented by subclasses
   */
  protected abstract _doFinalize(): WordArray;

  /**
   * Encrypt a block of data
   * Must be implemented by block ciphers
   */
  encryptBlock?(words: number[], offset: number): void;

  /**
   * Decrypt a block of data
   * Must be implemented by block ciphers
   */
  decryptBlock?(words: number[], offset: number): void;
}

/**
 * Abstract base stream cipher template.
 * Stream ciphers process data one unit at a time rather than in blocks.
 * 
 * @property blockSize - The number of 32-bit words this cipher operates on (default: 1 = 32 bits)
 */
export abstract class StreamCipher extends Cipher {
  blockSize: number = 1;

  constructor(xformMode: number, key: WordArray, cfg?: CipherCfg) {
    super(xformMode, key, cfg);
    this.blockSize = 1;
    // Don't call reset() here - let it be called after construction
    // to avoid field initialization issues
  }

  protected _doFinalize(): WordArray {
    // Process partial blocks
    const finalProcessedBlocks = this._process(true);
    return finalProcessedBlocks;
  }
}

/**
 * Abstract base block cipher mode template.
 * Defines how multiple blocks are processed together.
 */
export class BlockCipherMode extends Base {
  /** The cipher instance */
  _cipher: Cipher;
  
  /** The initialization vector */
  _iv?: number[];
  
  /** The previous block (for chaining modes) */
  _prevBlock?: number[];

  /**
   * Initializes a newly created mode.
   * 
   * @param cipher - A block cipher instance
   * @param iv - The IV words
   * @example
   * ```javascript
   * const mode = new CBCMode(cipher, iv.words);
   * ```
   */
  constructor(cipher: Cipher, iv?: number[]) {
    super();
    this._cipher = cipher;
    this._iv = iv;
  }

  /**
   * Creates this mode for encryption.
   * 
   * @param cipher - A block cipher instance
   * @param iv - The IV words
   * @returns The mode instance
   * @static
   * @example
   * ```javascript
   * const mode = CBC.createEncryptor(cipher, iv.words);
   * ```
   */
  static createEncryptor(cipher: Cipher, iv?: number[]): BlockCipherMode {
    return (this as any).Encryptor.create(cipher, iv);
  }

  /**
   * Creates this mode for decryption.
   * 
   * @param cipher - A block cipher instance
   * @param iv - The IV words
   * @returns The mode instance
   * @static
   * @example
   * ```javascript
   * const mode = CBC.createDecryptor(cipher, iv.words);
   * ```
   */
  static createDecryptor(cipher: Cipher, iv?: number[]): BlockCipherMode {
    return (this as any).Decryptor.create(cipher, iv);
  }

  /**
   * Process a block of data
   * Must be implemented by concrete modes
   */
  processBlock(_words: number[], _offset: number): void {
    // Abstract method
  }
}

/**
 * XOR blocks for cipher block chaining
 * @private
 */
function xorBlock(this: BlockCipherMode, words: number[], offset: number, blockSize: number): void {
  const _words = words;
  let block: number[] | undefined;

  // Shortcut
  const iv = this._iv;

  // Choose mixing block
  if (iv) {
    block = iv;
    // Remove IV for subsequent blocks
    this._iv = undefined;
  } else {
    block = this._prevBlock;
  }

  // XOR blocks
  if (block) {
    for (let i = 0; i < blockSize; i += 1) {
      _words[offset + i] ^= block[i];
    }
  }
}

/**
 * CBC Encryptor
 */
class CBCEncryptor extends BlockCipherMode {
  /**
   * Processes the data block at offset.
   * 
   * @param words - The data words to operate on
   * @param offset - The offset where the block starts
   * @example
   * ```javascript
   * mode.processBlock(data.words, offset);
   * ```
   */
  processBlock(words: number[], offset: number): void {
    const cipher = this._cipher;
    const blockSize = cipher.blockSize;

    // XOR and encrypt
    xorBlock.call(this, words, offset, blockSize);
    cipher.encryptBlock!(words, offset);

    // Remember this block to use with next block
    this._prevBlock = words.slice(offset, offset + blockSize);
  }
}

/**
 * CBC Decryptor
 */
class CBCDecryptor extends BlockCipherMode {
  /**
   * Processes the data block at offset.
   * 
   * @param words - The data words to operate on
   * @param offset - The offset where the block starts
   * @example
   * ```javascript
   * mode.processBlock(data.words, offset);
   * ```
   */
  processBlock(words: number[], offset: number): void {
    const cipher = this._cipher;
    const blockSize = cipher.blockSize;

    // Remember this block to use with next block
    const thisBlock = words.slice(offset, offset + blockSize);

    // Decrypt and XOR
    cipher.decryptBlock!(words, offset);
    xorBlock.call(this, words, offset, blockSize);

    // This block becomes the previous block
    this._prevBlock = thisBlock;
  }
}

/**
 * Cipher Block Chaining mode.
 * Each block is XORed with the previous ciphertext block before encryption.
 */
export class CBC extends BlockCipherMode {
  /** CBC Encryptor */
  static Encryptor = CBCEncryptor;

  /** CBC Decryptor */
  static Decryptor = CBCDecryptor;
}

/**
 * PKCS #5/7 padding strategy.
 * Pads data with bytes all of the same value as the count of padding bytes.
 */
export const Pkcs7: Padding = {
  /**
   * Pads data using the algorithm defined in PKCS #5/7.
   * 
   * @param data - The data to pad
   * @param blockSize - The multiple that the data should be padded to
   * @example
   * ```javascript
   * Pkcs7.pad(wordArray, 4);
   * ```
   */
  pad(data: WordArray, blockSize: number): void {
    // Shortcut
    const blockSizeBytes = blockSize * 4;

    // Count padding bytes
    const nPaddingBytes = blockSizeBytes - (data.sigBytes % blockSizeBytes);

    // Create padding word
    const paddingWord = (nPaddingBytes << 24)
      | (nPaddingBytes << 16)
      | (nPaddingBytes << 8)
      | nPaddingBytes;

    // Create padding
    const paddingWords: number[] = [];
    for (let i = 0; i < nPaddingBytes; i += 4) {
      paddingWords.push(paddingWord);
    }
    const padding = WordArray.create(paddingWords, nPaddingBytes);

    // Add padding
    data.concat(padding);
  },

  /**
   * Unpads data that had been padded using the algorithm defined in PKCS #5/7.
   * 
   * @param data - The data to unpad
   * @example
   * ```javascript
   * Pkcs7.unpad(wordArray);
   * ```
   */
  unpad(data: WordArray): void {
    // Get number of padding bytes from last byte
    const nPaddingBytes = data.words[(data.sigBytes - 1) >>> 2] & 0xff;

    // Remove padding
    data.sigBytes -= nPaddingBytes;
  }
};

/**
 * Abstract base block cipher template.
 * Block ciphers process data in fixed-size blocks.
 * 
 * @property blockSize - The number of 32-bit words this cipher operates on (default: 4 = 128 bits)
 */
export abstract class BlockCipher extends Cipher {
  /** Block mode instance */
  protected _mode?: BlockCipherMode & { __creator?: Function };

  /**
   * Initializes a newly created block cipher.
   * 
   * @param xformMode - Transform mode
   * @param key - The key
   * @param cfg - Configuration options
   */
  constructor(xformMode: number, key: WordArray, cfg?: CipherCfg) {
    super(xformMode, key, Object.assign(
      {
        mode: CBC,
        padding: Pkcs7,
      },
      cfg
    ));
    this.blockSize = 128 / 32;
    // Don't call reset() here - let it be called after construction
    // to avoid field initialization issues
  }

  reset(): void {
    // Reset cipher
    super.reset();

    // Shortcuts
    const { cfg } = this;
    const { iv, mode } = cfg;

    // Reset block mode
    let modeCreator: ((cipher: Cipher, iv?: number[]) => BlockCipherMode) | undefined;
    
    if (this._xformMode === (this.constructor as typeof Cipher)._ENC_XFORM_MODE) {
      modeCreator = mode?.createEncryptor;
    } else {
      modeCreator = mode?.createDecryptor;
      // Keep at least one block in the buffer for unpadding
      this._minBufferSize = 1;
    }

    if (modeCreator && mode) {
      this._mode = modeCreator.call(mode, this, iv?.words) as BlockCipherMode & { __creator?: Function };
      this._mode.__creator = modeCreator;
    }
  }

  protected _doProcessBlock(words: number[], offset: number): void {
    this._mode?.processBlock(words, offset);
  }

  /**
   * Encrypt a block of data
   * Must be implemented by block ciphers
   */
  abstract encryptBlock(words: number[], offset: number): void;

  /**
   * Decrypt a block of data
   * Must be implemented by block ciphers
   */
  abstract decryptBlock(words: number[], offset: number): void;

  protected _doFinalize(): WordArray {
    let finalProcessedBlocks: WordArray;

    // Shortcut
    const { padding } = this.cfg;

    // Finalize
    if (this._xformMode === (this.constructor as typeof Cipher)._ENC_XFORM_MODE) {
      // Pad data
      if (padding) {
        padding.pad(this._data, this.blockSize);
      }

      // Process final blocks
      finalProcessedBlocks = this._process(true);
    } else {
      // Process final blocks
      finalProcessedBlocks = this._process(true);

      // Unpad data
      if (padding) {
        padding.unpad(finalProcessedBlocks);
      }
    }

    return finalProcessedBlocks;
  }
}

/**
 * A collection of cipher parameters.
 * Encapsulates all the parameters used in a cipher operation.
 * 
 * @property ciphertext - The raw ciphertext
 * @property key - The key to this ciphertext
 * @property iv - The IV used in the ciphering operation
 * @property salt - The salt used with a key derivation function
 * @property algorithm - The cipher algorithm
 * @property mode - The block mode used in the ciphering operation
 * @property padding - The padding scheme used in the ciphering operation
 * @property blockSize - The block size of the cipher
 * @property formatter - The default formatting strategy
 */
export class CipherParams extends Base implements CipherParamsCfg {
  ciphertext?: WordArray;
  key?: WordArray;
  iv?: WordArray;
  salt?: WordArray;
  algorithm?: typeof Cipher;
  mode?: typeof BlockCipherMode;
  padding?: Padding;
  blockSize?: number;
  formatter?: Format;
  [key: string]: unknown;

  /**
   * Initializes a newly created cipher params object.
   * 
   * @param cipherParams - An object with any of the possible cipher parameters
   * @example
   * ```javascript
   * const cipherParams = new CipherParams({
   *   ciphertext: ciphertextWordArray,
   *   key: keyWordArray,
   *   iv: ivWordArray,
   *   salt: saltWordArray,
   *   algorithm: AESAlgo,
   *   mode: CBC,
   *   padding: Pkcs7,
   *   blockSize: 4,
   *   formatter: OpenSSLFormatter
   * });
   * ```
   */
  constructor(cipherParams?: CipherParamsCfg) {
    super();
    if (cipherParams) {
      this.mixIn(cipherParams);
    }
    // Set default formatter if not provided
    if (!this.formatter) {
      this.formatter = OpenSSLFormatter;
    }
  }

  /**
   * Factory method to create cipher params
   * 
   * @param cipherParams - The cipher parameters
   * @returns A new CipherParams instance
   * @static
   */
  static create(cipherParams?: CipherParamsCfg): CipherParams;
  static create<T extends CipherParams>(this: new (...args: any[]) => T, ...args: any[]): T;
  static create(...args: any[]): any {
    const [cipherParams] = args;
    return new CipherParams(cipherParams);
  }

  /**
   * Converts this cipher params object to a string.
   * 
   * @param formatter - The formatting strategy to use
   * @returns The stringified cipher params
   * @throws Error if neither the formatter nor the default formatter is set
   * @example
   * ```javascript
   * const string = cipherParams.toString();
   * const string = cipherParams.toString(OpenSSLFormatter);
   * ```
   */
  toString(formatter?: Format): string {
    const fmt = formatter || this.formatter;
    if (!fmt) {
      throw new Error('cipher params formatter required');
    }
    return fmt.stringify(this);
  }
}

/**
 * OpenSSL formatting strategy.
 * Formats cipher params in OpenSSL-compatible format.
 */
export const OpenSSLFormatter: Format = {
  /**
   * Converts a cipher params object to an OpenSSL-compatible string.
   * 
   * @param cipherParams - The cipher params object
   * @returns The OpenSSL-compatible string
   * @example
   * ```javascript
   * const openSSLString = OpenSSLFormatter.stringify(cipherParams);
   * ```
   */
  stringify(cipherParams: CipherParams): string {
    let wordArray: WordArray;

    // Shortcuts
    const { ciphertext, salt } = cipherParams;

    // Format
    if (salt && ciphertext) {
      wordArray = WordArray.create([0x53616c74, 0x65645f5f]).concat(salt).concat(ciphertext);
    } else if (ciphertext) {
      wordArray = ciphertext;
    } else {
      // No ciphertext, return empty
      wordArray = new WordArray();
    }

    return wordArray.toString(Base64);
  },

  /**
   * Converts an OpenSSL-compatible string to a cipher params object.
   * 
   * @param openSSLStr - The OpenSSL-compatible string
   * @returns The cipher params object
   * @example
   * ```javascript
   * const cipherParams = OpenSSLFormatter.parse(openSSLString);
   * ```
   */
  parse(openSSLStr: string): CipherParams {
    let salt: WordArray | undefined;

    // Parse base64
    const ciphertext = Base64.parse(openSSLStr);

    // Shortcut
    const ciphertextWords = ciphertext.words;

    // Test for salt
    if (ciphertextWords[0] === 0x53616c74 && ciphertextWords[1] === 0x65645f5f) {
      // Extract salt
      salt = WordArray.create(ciphertextWords.slice(2, 4));

      // Remove salt from ciphertext
      ciphertextWords.splice(0, 4);
      ciphertext.sigBytes -= 16;
    }

    return CipherParams.create({ ciphertext, salt });
  }
};

/**
 * A cipher wrapper that returns ciphertext as a serializable cipher params object.
 * Handles the serialization and deserialization of cipher operations.
 */
export class SerializableCipher extends Base {
  /** Configuration options */
  static cfg: { format: Format } = { format: OpenSSLFormatter };

  /**
   * Encrypts a message.
   * 
   * @param cipher - The cipher algorithm to use
   * @param message - The message to encrypt
   * @param key - The key
   * @param cfg - Configuration options to use for this operation
   * @returns A cipher params object
   * @static
   * @example
   * ```javascript
   * const ciphertextParams = SerializableCipher.encrypt(AESAlgo, message, key);
   * const ciphertextParams = SerializableCipher.encrypt(AESAlgo, message, key, { iv: iv });
   * ```
   */
  static encrypt(
    cipher: typeof Cipher,
    message: WordArray | string,
    key: WordArray | string,
    cfg?: CipherCfg
  ): CipherParams {
    // Apply config defaults
    const _cfg = Object.assign({}, this.cfg, cfg);

    // Encrypt
    const encryptor = (cipher as any).createEncryptor(key as WordArray, _cfg);
    const ciphertext = encryptor.finalize(message);

    // Shortcut
    const cipherCfg = encryptor.cfg;

    // Create and return serializable cipher params
    return CipherParams.create({
      ciphertext,
      key: key as WordArray,
      iv: cipherCfg.iv,
      algorithm: cipher,
      mode: cipherCfg.mode,
      padding: cipherCfg.padding,
      blockSize: encryptor.blockSize,
      formatter: _cfg.format || OpenSSLFormatter,
    });
  }

  /**
   * Decrypts serialized ciphertext.
   * 
   * @param cipher - The cipher algorithm to use
   * @param ciphertext - The ciphertext to decrypt
   * @param key - The key
   * @param cfg - Configuration options to use for this operation
   * @returns The plaintext
   * @static
   * @example
   * ```javascript
   * const plaintext = SerializableCipher.decrypt(AESAlgo, formattedCiphertext, key, { iv: iv });
   * const plaintext = SerializableCipher.decrypt(AESAlgo, ciphertextParams, key, { iv: iv });
   * ```
   */
  static decrypt(
    cipher: typeof Cipher,
    ciphertext: CipherParams | CipherParamsCfg | string,
    key: WordArray | string,
    cfg?: CipherCfg
  ): WordArray {
    // Apply config defaults
    const _cfg = Object.assign({}, this.cfg, cfg);

    // Convert string to CipherParams
    const _ciphertext = this._parse(ciphertext, _cfg.format);

    // Decrypt
    const plaintext = (cipher as any).createDecryptor(key as WordArray, _cfg).finalize(_ciphertext.ciphertext!);

    return plaintext;
  }

  /**
   * Converts serialized ciphertext to CipherParams.
   * 
   * @param ciphertext - The ciphertext
   * @param format - The formatting strategy to use to parse serialized ciphertext
   * @returns The unserialized ciphertext
   * @static
   * @private
   */
  protected static _parse(
    ciphertext: CipherParams | CipherParamsCfg | string,
    format?: Format
  ): CipherParams {
    if (typeof ciphertext === 'string') {
      if (!format) {
        throw new Error('Format required to parse string');
      }
      return format.parse(ciphertext, this);
    }
    if (ciphertext instanceof CipherParams) {
      return ciphertext;
    }
    return new CipherParams(ciphertext);
  }
}

/**
 * OpenSSL key derivation function.
 * Derives a key and IV from a password using the OpenSSL method.
 */
export const OpenSSLKdf: Kdf = {
  /**
   * Derives a key and IV from a password.
   * 
   * @param password - The password to derive from
   * @param keySize - The size in words of the key to generate
   * @param ivSize - The size in words of the IV to generate
   * @param salt - A 64-bit salt to use (if omitted, a salt will be generated randomly)
   * @param hasher - The hasher to use
   * @returns A cipher params object with the key, IV, and salt
   * @example
   * ```javascript
   * const derivedParams = OpenSSLKdf.execute('Password', 256/32, 128/32);
   * const derivedParams = OpenSSLKdf.execute('Password', 256/32, 128/32, 'saltsalt');
   * ```
   */
  execute(
    password: string,
    keySize: number,
    ivSize: number,
    salt?: WordArray | string,
    hasher?: new (cfg?: HasherCfg) => Hasher
  ): CipherParams {
    let _salt: WordArray;

    // Generate random salt
    if (!salt) {
      _salt = WordArray.random(64 / 8);
    } else if (typeof salt === 'string') {
      // Parse string salt as hex or utf8
      _salt = Hex.parse(salt);
    } else {
      _salt = salt;
    }

    // Derive key and IV
    let key: WordArray;
    if (!hasher) {
      key = EvpKDFAlgo.create({ keySize: keySize + ivSize }).compute(password, _salt);
    } else {
      key = EvpKDFAlgo.create({ keySize: keySize + ivSize, hasher }).compute(password, _salt);
    }

    // Separate key and IV
    const iv = WordArray.create(key.words.slice(keySize), ivSize * 4);
    key.sigBytes = keySize * 4;

    // Return params
    return CipherParams.create({ key, iv, salt: _salt });
  }
};

/**
 * A serializable cipher wrapper that derives the key from a password.
 * Returns ciphertext as a serializable cipher params object.
 */
export class PasswordBasedCipher extends SerializableCipher {
  /** Configuration options */
  static cfg = Object.assign({}, SerializableCipher.cfg, { kdf: OpenSSLKdf });

  /**
   * Encrypts a message using a password.
   * 
   * @param cipher - The cipher algorithm to use
   * @param message - The message to encrypt
   * @param password - The password
   * @param cfg - Configuration options to use for this operation
   * @returns A cipher params object
   * @static
   * @example
   * ```javascript
   * const ciphertextParams = PasswordBasedCipher.encrypt(AESAlgo, message, 'password');
   * ```
   */
  static encrypt(
    cipher: typeof Cipher,
    message: WordArray | string,
    password: string,
    cfg?: CipherCfg
  ): CipherParams {
    // Apply config defaults
    const _cfg = Object.assign({}, this.cfg, cfg);

    // Derive key and other params
    if (!_cfg.kdf) {
      throw new Error('KDF required for password-based encryption');
    }
    
    const derivedParams = _cfg.kdf.execute(
      password,
      (cipher as any).keySize || cipher.keySize,
      (cipher as any).ivSize || cipher.ivSize,
      _cfg.salt,
      _cfg.hasher
    );

    // Add IV to config
    _cfg.iv = derivedParams.iv;

    // Encrypt
    const ciphertext = SerializableCipher.encrypt.call(
      this,
      cipher,
      message,
      derivedParams.key!,
      _cfg
    );

    // Mix in derived params (only salt, not the whole object to avoid overwriting ciphertext)
    ciphertext.salt = derivedParams.salt;

    return ciphertext;
  }

  /**
   * Decrypts serialized ciphertext using a password.
   * 
   * @param cipher - The cipher algorithm to use
   * @param ciphertext - The ciphertext to decrypt
   * @param password - The password
   * @param cfg - Configuration options to use for this operation
   * @returns The plaintext
   * @static
   * @example
   * ```javascript
   * const plaintext = PasswordBasedCipher.decrypt(AESAlgo, formattedCiphertext, 'password');
   * ```
   */
  static decrypt(
    cipher: typeof Cipher,
    ciphertext: CipherParams | CipherParamsCfg | string,
    password: string,
    cfg?: CipherCfg
  ): WordArray {
    // Apply config defaults
    const _cfg = Object.assign({}, this.cfg, cfg);

    // Convert string to CipherParams
    const _ciphertext = this._parse(ciphertext, _cfg.format);

    // Derive key and other params
    if (!_cfg.kdf) {
      throw new Error('KDF required for password-based decryption');
    }
    
    const derivedParams = _cfg.kdf.execute(
      password,
      (cipher as any).keySize || cipher.keySize,
      (cipher as any).ivSize || cipher.ivSize,
      _ciphertext.salt,
      _cfg.hasher
    );

    // Add IV to config
    _cfg.iv = derivedParams.iv;

    // Decrypt
    const plaintext = SerializableCipher.decrypt.call(
      this,
      cipher,
      _ciphertext,
      derivedParams.key!,
      _cfg
    );

    return plaintext;
  }
}
