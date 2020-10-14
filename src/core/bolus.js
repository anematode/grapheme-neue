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
 * Thus, we use ES6 generators. Note that these can be transpiled, with some performance limitations, to ES5 generators
 * via Regenerator. A function like this is called a "bolus". Why? Because I like that word. Also, it makes it feel
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


export function coatBolus (bolus, stepIndex, stepCount) {

}

class BolusTimeoutError extends Error {
  constructor (message) {
    super(message)
    this.name = "BolusTimeoutError"
  }
}

/**
 * Digest a bolus directly, which is ideal for
 * @param bolus {Function} The bolus to evaluate, which may be a normal function or a generator.
 * @param params {Object} Extra parameters
 * @param params.args {Array} Array of arguments (enzymes) to supply the bolus
 * @param params.timeout {number} How many milliseconds to permit the function evaluation before raising a BolusTimeoutError
 */
export function syncDigest (bolus, { args = [], timeout = -1 } = {}) {
  const ingestedBolus = bolus(...args)

  if (timeout > 0 || timeout < 1e7) { // Do the timeout

  }

  for (const progress of ingestedBolus) {

  }
}
