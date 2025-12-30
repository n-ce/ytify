import {
  Base,
  WordArray,
} from './core.js';

/**
 * A 64-bit word representation.
 * Stores a 64-bit value as two 32-bit words due to JavaScript's number limitations.
 * 
 * @property high - The high 32 bits
 * @property low - The low 32 bits
 */
export class X64Word extends Base {
  /** The high 32 bits of the 64-bit word */
  high: number;
  
  /** The low 32 bits of the 64-bit word */
  low: number;

  /**
   * Initializes a newly created 64-bit word.
   * 
   * @param high - The high 32 bits (default: 0)
   * @param low - The low 32 bits (default: 0)
   * @example
   * ```javascript
   * const x64Word = new X64Word(0x00010203, 0x04050607);
   * const x64Word = X64Word.create(0x00010203, 0x04050607);
   * ```
   */
  constructor(high: number = 0, low: number = 0) {
    super();
    this.high = high;
    this.low = low;
  }

  /**
   * Creates a copy of this word.
   * 
   * @returns The cloned 64-bit word
   * @example
   * ```javascript
   * const clone = x64Word.clone();
   * ```
   */
  clone(): this {
    const clone = super.clone();
    clone.high = this.high;
    clone.low = this.low;
    return clone;
  }
}

/**
 * An array of 64-bit words.
 * This is used for algorithms that operate on 64-bit words, such as SHA-512.
 * 
 * @property words - The array of X64Word objects
 * @property sigBytes - The number of significant bytes in this word array
 */
export class X64WordArray extends Base {
  /** The array of X64Word objects */
  words: X64Word[];
  
  /** The number of significant bytes in this word array */
  sigBytes: number;

  /**
   * Initializes a newly created 64-bit word array.
   * 
   * @param words - An array of X64Word objects
   * @param sigBytes - The number of significant bytes in the words (defaults to words.length * 8)
   * @example
   * ```javascript
   * const wordArray = new X64WordArray();
   * 
   * const wordArray = new X64WordArray([
   *   new X64Word(0x00010203, 0x04050607),
   *   new X64Word(0x18191a1b, 0x1c1d1e1f)
   * ]);
   * 
   * const wordArray = new X64WordArray([
   *   new X64Word(0x00010203, 0x04050607),
   *   new X64Word(0x18191a1b, 0x1c1d1e1f)
   * ], 10);
   * ```
   */
  constructor(words: X64Word[] = [], sigBytes: number = words.length * 8) {
    super();
    this.words = words;
    this.sigBytes = sigBytes;
  }

  /**
   * Factory method to create a 64-bit word array.
   * 
   * @param words - An array of X64Word objects
   * @param sigBytes - The number of significant bytes
   * @returns A new X64WordArray instance
   * @static
   * @example
   * ```javascript
   * const wordArray = X64WordArray.create([
   *   X64Word.create(0x00010203, 0x04050607)
   * ]);
   * ```
   */
  static create(words?: X64Word[], sigBytes?: number): X64WordArray;
  static create<T extends X64WordArray>(this: new (...args: any[]) => T, ...args: any[]): T;
  static create(...args: any[]): any {
    const [words, sigBytes] = args;
    return new X64WordArray(words, sigBytes);
  }

  /**
   * Converts this 64-bit word array to a 32-bit word array.
   * Each 64-bit word is split into two 32-bit words (high and low).
   * 
   * @returns This word array's data as a 32-bit word array
   * @example
   * ```javascript
   * const x32WordArray = x64WordArray.toX32();
   * ```
   */
  toX32(): WordArray {
    const x64Words = this.words;
    const x64WordsLength = x64Words.length;

    // Convert each 64-bit word to two 32-bit words
    const x32Words: number[] = [];
    for (let i = 0; i < x64WordsLength; i += 1) {
      const x64Word = x64Words[i];
      x32Words.push(x64Word.high);
      x32Words.push(x64Word.low);
    }

    return WordArray.create(x32Words, this.sigBytes);
  }

  /**
   * Creates a deep copy of this word array.
   * Clones both the array and each X64Word object within it.
   * 
   * @returns The cloned X64WordArray
   * @example
   * ```javascript
   * const clone = x64WordArray.clone();
   * ```
   */
  clone(): this {
    const clone = super.clone();

    // Clone the words array
    clone.words = this.words.slice(0);
    const { words } = clone;

    // Clone each X64Word object
    const wordsLength = words.length;
    for (let i = 0; i < wordsLength; i += 1) {
      words[i] = words[i].clone();
    }

    return clone;
  }
}
