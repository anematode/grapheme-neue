
// Define general types of rounding modes for various mathematical operations over the reals

export const ROUNDING_MODE = {
  NEAREST: 0,     // nearest neighbor, ties to even
  UP: 1,          // always round positively
  DOWN: 2,
  TOWARD_INF: 3,  // towards the extremes
  TOWARD_ZERO: 4, // towards zero
  TIES_AWAY: 5,   // tie away from zero
  TIES_EVEN: 0    // equivalent to NEAREST
}
