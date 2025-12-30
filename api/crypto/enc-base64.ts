import {
  WordArray,
  Encoder,
} from './core';

/**
 * Parses a Base64 string to a WordArray.
 * Helper function for Base64 decoding.
 * 
 * @param base64Str - The Base64 string to parse
 * @param base64StrLength - The length of the Base64 string
 * @param reverseMap - The reverse character map for decoding
 * @returns The decoded WordArray
 */
export const parseLoop = (
  base64Str: string,
  base64StrLength: number,
  reverseMap: number[]
): WordArray => {
  const words: number[] = [];
  let nBytes = 0;
  
  for (let i = 0; i < base64StrLength; i += 1) {
    if (i % 4) {
      const bits1 = reverseMap[base64Str.charCodeAt(i - 1)] << ((i % 4) * 2);
      const bits2 = reverseMap[base64Str.charCodeAt(i)] >>> (6 - (i % 4) * 2);
      const bitsCombined = bits1 | bits2;
      words[nBytes >>> 2] |= bitsCombined << (24 - (nBytes % 4) * 8);
      nBytes += 1;
    }
  }
  
  return WordArray.create(words, nBytes);
};

/**
 * Base64 encoding strategy implementation.
 * @private
 */
class Base64Impl implements Encoder {
  /** The Base64 character map */
  private _map: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  
  /** The reverse character map for decoding */
  private _reverseMap?: number[];

  /**
   * Converts a word array to a Base64 string.
   * 
   * @param wordArray - The word array to convert
   * @returns The Base64 string representation
   * @example
   * ```javascript
   * const base64String = Base64.stringify(wordArray);
   * ```
   */
  stringify(wordArray: WordArray): string {
    // Shortcuts
    const { words, sigBytes } = wordArray;
    const map = this._map;

    // Clamp excess bits
    wordArray.clamp();

    // Convert
    const base64Chars: string[] = [];
    for (let i = 0; i < sigBytes; i += 3) {
      const byte1 = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      const byte2 = (words[(i + 1) >>> 2] >>> (24 - ((i + 1) % 4) * 8)) & 0xff;
      const byte3 = (words[(i + 2) >>> 2] >>> (24 - ((i + 2) % 4) * 8)) & 0xff;

      const triplet = (byte1 << 16) | (byte2 << 8) | byte3;

      for (let j = 0; (j < 4) && (i + j * 0.75 < sigBytes); j += 1) {
        base64Chars.push(map.charAt((triplet >>> (6 * (3 - j))) & 0x3f));
      }
    }

    // Add padding
    const paddingChar = map.charAt(64);
    if (paddingChar) {
      while (base64Chars.length % 4) {
        base64Chars.push(paddingChar);
      }
    }

    return base64Chars.join('');
  }

  /**
   * Converts a Base64 string to a word array.
   * 
   * @param base64Str - The Base64 string to parse
   * @returns The word array representation
   * @example
   * ```javascript
   * const wordArray = Base64.parse(base64String);
   * ```
   */
  parse(base64Str: string): WordArray {
    // Shortcuts
    let base64StrLength = base64Str.length;
    const map = this._map;
    let reverseMap = this._reverseMap;

    if (!reverseMap) {
      this._reverseMap = [];
      reverseMap = this._reverseMap;
      for (let j = 0; j < map.length; j += 1) {
        reverseMap[map.charCodeAt(j)] = j;
      }
    }

    // Ignore padding
    const paddingChar = map.charAt(64);
    if (paddingChar) {
      const paddingIndex = base64Str.indexOf(paddingChar);
      if (paddingIndex !== -1) {
        base64StrLength = paddingIndex;
      }
    }

    // Convert
    return parseLoop(base64Str, base64StrLength, reverseMap);
  }
}

/**
 * Base64 encoding strategy.
 * Converts between WordArrays and Base64 strings.
 * 
 * @example
 * ```javascript
 * // Encoding
 * const base64String = Base64.stringify(wordArray);
 * 
 * // Decoding
 * const wordArray = Base64.parse(base64String);
 * ```
 */
export const Base64: Encoder = new Base64Impl();