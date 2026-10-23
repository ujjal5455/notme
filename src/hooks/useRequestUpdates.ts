import { useCallback, useEffect, useRef, useState } from 'react'
import { POLL_INTERVAL_MS } from '../config'
import { type MoneyRequestRow, toMoneyRequest } from '../lib/api/requests'
import { supabase } from '../lib/supabaseClient'
import type { MoneyRequest } from '../types/domain'

/**
 * How fresh the screen is:
 * - connecting: starting up
 * - live:       Realtime is connected; changes arrive within a moment
 * - polling:    Realtime isn't working; asking the server every few seconds instead
 * - offline:    the last attempt to reach the server failed, so the screen may be out of date
 */
export type LiveStatus = 'connecting' | 'live' | 'polling' | 'offline'

// supabase-js reuses an existing channel with the same name, which breaks when
// React (in development) starts, stops and restarts an effect. A number makes
// every subscription's name unique.
let channelCount = 0

/**
 * Keeps a list of requests up to date: Supabase Realtime first, polling as the fallback.
 * `onChange` receives each changed request; `onPoll` loads the whole list and must
 * reject if the server can't be reached. Pass stable functions (useCallback),
 * otherwise this would disconnect and reconnect on every redraw.
 * Returns the status and `checkNow`, which asks the server straight away.
 */
export function useRequestUpdates(
  userId: string,
  onChange: (request: MoneyRequest) => void,
  onPoll: () => Promise<void>,
): { status: LiveStatus; checkNow: () => void } {
  const [status, setStatus] = useState<LiveStatus>('connecting')
  // The current subscription's poll function, so a "Try again" button can call it.
  const pollNow = useRef<() => void>(() => {})

  useEffect(() => {
    // Set to false on clean-up: anything arriving after the screen closed is ignored.
    let active = true
    let channelLive = false
    let pollId: ReturnType<typeof setInterval> | undefined

    // Never run two timers, and never start one after the screen closed.
    const keepPolling = () => {
      if (active && pollId === undefined) pollId = setInterval(poll, POLL_INTERVAL_MS)
    }
    const stopPolling = () => {
      if (pollId !== undefined) clearInterval(pollId)
      pollId = undefined
    }

    function poll() {
      onPoll()
        .then(() => {
          if (!active) return
          if (channelLive) {
            stopPolling() // live updates work again, so polling is no longer needed
            setStatus('live')
          } else {
            setStatus('polling')
          }
        })
        .catch(() => {
          if (!active) return
          setStatus('offline')
          keepPolling() // keep trying, so the screen recovers by itself
        })
    }
    pollNow.current = poll

    channelCount += 1
    const channel = supabase
      .channel(`money-requests-${userId}-${channelCount}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'money_requests' },
        (payload) => {
          // Realtime only sends rows this user may SELECT (Row Level Security).
          if (active && payload.new && 'id' in payload.new) {
            onChange(toMoneyRequest(payload.new as MoneyRequestRow))
          }
        },
      )
      .subscribe((state) => {
        if (!active) return
        if (state === 'SUBSCRIBED') {
          channelLive = true
          stopPolling()
          setStatus('live')
          poll() // catch up on anything that changed before we were listening
        } else {
          // CHANNEL_ERROR, TIMED_OUT or CLOSED: fall back to asking.
          channelLive = false
          setStatus((s) => (s === 'offline' ? 'offline' : 'polling'))
          keepPolling()
        }
      })

    return () => {
      active = false
      stopPolling()
      void supabase.removeChannel(channel)
    }
  }, [userId, onChange, onPoll])

  const checkNow = useCallback(() => pollNow.current(), [])
  return { status, checkNow }
}
