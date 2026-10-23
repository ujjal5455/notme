// Pure helpers for keeping a list of requests up to date when copies arrive
// from several places (a full reload, a poll, a live update, our own answer).
import type { MoneyRequest } from '../types/domain'

/**
 * Which copy of the same request to keep.
 * The database never lets an answered request go back to "pending", so if we
 * already know it was answered, an older "pending" copy (e.g. from a slow poll
 * that started before the answer) must not overwrite it.
 */
export function newerOf(current: MoneyRequest | undefined, incoming: MoneyRequest): MoneyRequest {
  if (current && current.status !== 'pending' && incoming.status === 'pending') return current
  return incoming
}

function newestFirst(a: MoneyRequest, b: MoneyRequest): number {
  // ISO 8601 text sorts in time order, so comparing the text compares the times.
  return b.createdAt.localeCompare(a.createdAt)
}

/** Put one new or changed request into the list, newest first. Returns a NEW array. */
export function upsertRequest(list: MoneyRequest[], incoming: MoneyRequest): MoneyRequest[] {
  const current = list.find((r) => r.id === incoming.id)
  const keep = newerOf(current, incoming)
  return [keep, ...list.filter((r) => r.id !== incoming.id)].sort(newestFirst)
}

/** Replace the list with a freshly loaded one, without going backwards on any request. */
export function mergeLoaded(previous: MoneyRequest[], loaded: MoneyRequest[]): MoneyRequest[] {
  return loaded
    .map((incoming) => newerOf(previous.find((r) => r.id === incoming.id), incoming))
    .sort(newestFirst)
}
