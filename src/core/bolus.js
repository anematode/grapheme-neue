/**
 * The concept here is to allow the execution of expensive functions both synchronously and asynchronously, without the
 * need for a web worker or other heavyweight techniques. There are benefits to both synchronous and asynchronous
 * execution; some functions are so oft-executed and take such a short time that there is no point to using setTimeout
 * and making it asynchronous. I fear that the proliferation of asynchronous APIs all over the Internet discourages
 * simple, effective code. Also, the current asynchronous APIs aren't the most versatile. For example, how could we
 * track the progress of a render, or cancel the render, via Promises alone?
 *
 * Web workers, while useful (I plan to eventually implement them), are difficult. They can't really do rendering work,
 * and if the function in question takes an absurdly long amount of time to execute, it cannot be terminated gracefully;
 * the entire worker needs to be terminated and then restarted.
 *
 * We use a generator-like object called a "bolus". Why? Because I like that word. Also, it makes it feel
 * like the evaluation of these expensive functions is like digestion. We consume a bolus and digest it asynchronously;
 * it's not like while we're digesting, we can't do anything else. We do get periodic interruptions—stomach cramps,
 * defecation—but it does not control our life. If digestion is taking too long, we can go to the doctor and get a
 * laxative. Using a Web Worker is like giving the bolus to a chemical digester (or another person), and then eating the
 * digested remains; not appetizing, and the process of transferring a disgusting bolus soup is not pleasant. If we find
 * out the bolus is poisonous (aka, we don't want to fully digest it), we can vomit up the bolus, but this is not
 * guaranteed. If this bolus is extremely poisonous, we may die; similarly, if a Grapheme bolus is poorly made, it may
 * still crash the webpage. (Okay, henceforth every "bolus" is a Grapheme bolus.)
 *
 * The bolus may accept any number of arguments. If it is detected to be a normal function (that is, one whose return
 * value does not have a "next" function), its result is given if it's synchronously evaluated, or given as a Promise if
 * asynchronously evaluated. If it is a generator, then during its execution it may periodically yield. If synchronously
 * evaluated, the wrapper will simply keep calling .next() (digestion) until it returns, and then return this value.
 * If asynchronously evaluated, the wrapper will keep calling .next() until some amount of time has elapsed (default is
 * 8 ms, since a frame is 1/60 s) since the function call, or the function returns; in the former case, a timeout will
 * be called to unblock, and in the latter case, the result of the function resolves the Promise.
 *
 * There are additional things that may be given to the wrapper functions for convenience. For example, both sync and
 * asyncEvaluate can be told to throw an error (and thus in the latter case, reject the Promise) if too much time has
 * elapsed. Note that this won't prevent an errant function which enters an infinite loop and NEVER yields from crashing
 * the browser, but in the case of syncEvaluate, it can prevent crashes. Furthermore, asyncEvaluate may be given an
 * additional "onProgress" callback function along with the bolus, which is called based on the estimated time for a
 * bolus to finish, and the Promise it returns is equipped with a special function .cancel() which may be called to
 * terminate the function (and call reject()) before it actually ends. This is useful for things like cancelling
 * expensive updates.
 */

// Find the sum of integers from 1 to n in bolus form
export function testBolus (n) {
  let i = 0
  let sum = 0
  let finished = false

  return {
    next() {
      if (finished) return { value: undefined, done: true }

      for (let j = 0; j <= 1e5; ++i, ++j) { // Sum at most 10000 values
        sum += i

        if (i === n) {
          finished = true
          return { value: sum, done: true }
        }
      }

      return { value: i / n, done: false }
    }
  }
}


export function coatBolus (bolus, stepIndex, stepCount) {

}

class BolusTimeoutError extends Error {
  constructor (message) {
    super(message)
    this.name = "BolusTimeoutError"
  }
}

/**
 * A Bolus is any object with a next() function and potentially a cleanup() function. The cleanup() function is called
 * only if the bolus is terminated early. If the bolus is cancelled after completing digestion, cleanup() is not called.
 * next() returns { value: ..., done: false/true }. cleanup() is optional, and will not be called if the generator has
 * finished. value is a number between 0 and 1.
 * @typedef Bolus {Object}
 * @property {function} next
 * @property {function} cleanup
 */

/**
 * Digest a bolus directly, which is ideal for
 * @param bolus {Bolus} The bolus to evaluate, which may be a normal function or a generator.
 * @param timeout {number} How many milliseconds to permit the function evaluation before raising a BolusTimeoutError
 */
export function syncDigest (bolus, timeout = -1) {
  if (timeout > 0 || timeout < 1e7) { // Do the timeout
    // We could use performance.now(), but that function is about 10x slower. The issue now is 
    const startTime = Date.now()


  }

  for (const progress of ingestedBolus) {

  }
}
