
// Define general types of rounding modes for various mathematical operations over the reals

export const ROUNDING_MODE = {
  NEAREST: 0,     // nearest neighbor, doesn't care about ties
  UP: 1,          // always round positively
  DOWN: 2,
  TOWARD_INF: 3,  // towards the extremes
  TOWARD_ZERO: 4 // towards zero
}
