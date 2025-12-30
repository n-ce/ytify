import {
  BlockCipherMode,
} from './cipher-core.js';

/**
 * ECB Encryptor
 */
class ECBEncryptor extends BlockCipherMode {
  processBlock(words: number[], offset: number): void {
    this._cipher.encryptBlock!(words, offset);
  }
}

/**
 * ECB Decryptor
 */
class ECBDecryptor extends BlockCipherMode {
  processBlock(words: number[], offset: number): void {
    this._cipher.decryptBlock!(words, offset);
  }
}

/**
 * Electronic Codebook block mode.
 */
export class ECB extends BlockCipherMode {
  static readonly Encryptor = ECBEncryptor;
  static readonly Decryptor = ECBDecryptor;
}
