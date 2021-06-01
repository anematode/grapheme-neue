import WASM from "../../wasm/grapheme_wasm.js"
import { BigInt } from "./bigint.js"

/**
 * Load a bigint into memory
 * @param bigint {BigInt}
 * @returns BigInt pointer
 */
export function loadBigInt (bigint) {
  let ptr = WASM.asm._grapheme_bigint_external_init(bigint.sign, bigint.wordCount, bigint.wordCount)
  if (!ptr) throw new Error("Unable to initialize WASM big integer")

  // Put in the words, the space for which has already been allocated
  let wordsPtr = WASM.asm._grapheme_bigint_get_words(ptr) >> 2
  WASM.HEAP32.set(bigint.words.subarray(0, bigint.wordCount), wordsPtr)

  return ptr;
}

export function readBigInt (ptr) {
  let wordsPtr = WASM.asm._grapheme_bigint_get_words(ptr) >> 2
  let wordCount = WASM.asm._grapheme_bigint_get_word_count(ptr)
  let sign = WASM.asm._grapheme_bigint_get_sign(ptr)

  return new BigInt().initFromWords(WASM.HEAP32.subarray(wordsPtr, wordsPtr + wordCount), sign)
}

export function freeBigInt (ptr) {
  WASM.asm._grapheme_free_bigint(ptr)
}
