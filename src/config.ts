// App-wide settings in one place.

/**
 * How long the family member has to answer, in seconds.
 * DEMO VALUE: kept short so a timeout can be shown live. It is not a
 * recommended real-world waiting period.
 */
export const REQUEST_TIMEOUT_SECONDS = 60

/**
 * How often to ask the server again when live updates (Supabase Realtime)
 * are not connected. Fast enough that the elder sees an answer quickly,
 * slow enough not to waste data and battery.
 */
export const POLL_INTERVAL_MS = 4000
