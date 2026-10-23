// A pretend Supabase client for tests: same method names as the real one,
// but everything lives in memory and answers instantly with { data, error }.
// It imitates the rules and messages of 0002_rls.sql and 0003_functions.sql,
// and Realtime's "only send a change to people who may read the row",
// closely enough to test the React screens. It does NOT prove the real
// database is safe: supabase/checks/rls_checks.sql does that.
//
// Usage in a test file:
//   vi.mock('../lib/supabaseClient', async () => ({
//     supabase: (await import('../test/fakeSupabase')).fake.supabase,
//   }))
//   import { fake } from '../test/fakeSupabase'
//   beforeEach(() => fake.reset())

interface FakeUser {
  id: string
  email: string
  password: string
}
interface Row {
  [column: string]: unknown
}
type Result = { data: unknown; error: { message: string } | null }
type Listener = (event: string, session: { user: { id: string; email: string } } | null) => void
type ChannelStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'
interface FakeChannel {
  /** Who was signed in when the channel was made: Realtime checks THEIR read rights. */
  ownerId: string | null
  onChange?: (payload: { eventType: string; new: Row }) => void
  onStatus?: (status: ChannelStatus) => void
  removed: boolean
}

const NETWORK_ERROR: Result = { data: null, error: { message: 'TypeError: Failed to fetch' } }

function createFake() {
  let users: FakeUser[] = []
  let tables: Record<string, Row[]> = {}
  let currentUser: FakeUser | null = null
  let listeners: Listener[] = []
  let codeQueue: string[] = []
  let nextId = 1
  let channels: FakeChannel[] = []
  // realtime: whether new channels connect ('live') or fail ('fail').
  const state = { networkDown: false, realtime: 'live' as 'live' | 'fail' }

  function reset() {
    users = []
    tables = { profiles: [], family_links: [], pairing_codes: [], money_requests: [] }
    currentUser = null
    listeners = []
    codeQueue = ['P38SP4XS', 'K7QM3XPR', 'H2WZ9TNB']
    nextId = 1
    channels = []
    state.networkDown = false
    state.realtime = 'live'
  }

  /** Realtime delivery: tell every open channel whose owner may read this request. */
  function broadcast(eventType: 'INSERT' | 'UPDATE', row: Row) {
    for (const ch of channels) {
      if (ch.removed) continue
      if (ch.ownerId === row.elder_id || ch.ownerId === row.family_id) {
        ch.onChange?.({ eventType, new: { ...row } })
      }
    }
  }
  reset()

  const uid = () => currentUser?.id ?? null
  const sessionFor = (u: FakeUser | null) => (u ? { user: { id: u.id, email: u.email } } : null)
  const ok = (data: unknown): Result => ({ data, error: null })
  const fail = (message: string): Result => ({ data: null, error: { message } })

  function setUser(u: FakeUser | null, event: string) {
    currentUser = u
    for (const listener of listeners) listener(event, sessionFor(u))
  }

  /** Simplified Row Level Security: which rows of a table the caller may read. */
  function visibleRows(table: string): Row[] {
    const me = uid()
    if (!me) return [] // anon gets nothing
    const links = tables.family_links
    switch (table) {
      case 'profiles':
        return tables.profiles.filter(
          (p) =>
            p.id === me ||
            links.some(
              (l) => (l.elder_id === me && l.family_id === p.id) || (l.family_id === me && l.elder_id === p.id),
            ),
        )
      case 'family_links':
        return links.filter((l) => l.elder_id === me || l.family_id === me)
      case 'pairing_codes':
        return tables.pairing_codes.filter((c) => c.elder_id === me)
      case 'money_requests':
        return tables.money_requests.filter((r) => r.elder_id === me || r.family_id === me)
      default:
        return []
    }
  }

  /** A tiny query builder: from(t).select().eq()/.in()/.order() then await, or .maybeSingle(). */
  function from(table: string) {
    const filters: ((row: Row) => boolean)[] = []
    let sortBy: { column: string; ascending: boolean } | null = null
    const run = (): Result => {
      if (state.networkDown) return NETWORK_ERROR
      const rows = visibleRows(table).filter((row) => filters.every((f) => f(row)))
      if (sortBy) {
        const { column, ascending } = sortBy
        rows.sort((a, b) => String(a[column]).localeCompare(String(b[column])) * (ascending ? 1 : -1))
      }
      // Copies, like rows arriving over the network.
      return ok(rows.map((row) => ({ ...row })))
    }
    const builder = {
      select: () => builder,
      eq(column: string, value: unknown) {
        filters.push((row) => row[column] === value)
        return builder
      },
      in(column: string, values: unknown[]) {
        filters.push((row) => values.includes(row[column]))
        return builder
      },
      order(column: string, options: { ascending?: boolean } = {}) {
        sortBy = { column, ascending: options.ascending ?? true }
        return builder
      },
      async maybeSingle(): Promise<Result> {
        const result = run()
        if (result.error) return result
        const rows = result.data as Row[]
        return ok(rows[0] ?? null)
      },
      then(resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve(run()).then(resolve, reject)
      },
    }
    return builder
  }

  function roleOf(id: string | null) {
    return tables.profiles.find((p) => p.id === id)?.role
  }

  /** The SQL functions from 0003_functions.sql, with the same messages. */
  const functions: Record<string, (args: Record<string, unknown>) => Result> = {
    create_my_profile({ p_role, p_display_name }) {
      const me = uid()
      if (!me) return fail('You need to sign in first.')
      const name = String(p_display_name ?? '').trim()
      if (p_role !== 'elder' && p_role !== 'family') {
        return fail('Choose either the elder or the family member role.')
      }
      if (name.length < 1 || name.length > 40) return fail('Display name must be 1 to 40 characters.')
      if (tables.profiles.some((p) => p.id === me)) {
        return fail('This account already has a profile. Its role cannot be changed.')
      }
      const row = { id: me, role: p_role, display_name: name }
      tables.profiles.push(row)
      return ok(row)
    },
    create_pairing_code() {
      const me = uid()
      if (!me) return fail('You need to sign in first.')
      if (roleOf(me) !== 'elder') return fail('Only an elder account can create a pairing code.')
      if (tables.family_links.some((l) => l.elder_id === me)) {
        return fail('You are already linked to a family member.')
      }
      tables.pairing_codes = tables.pairing_codes.filter((c) => !(c.elder_id === me && !c.used_at))
      const code = codeQueue.shift() ?? `CODE${nextId++}XX`.slice(0, 8)
      const row = {
        code,
        elder_id: me,
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
        used_at: null,
        used_by: null,
      }
      tables.pairing_codes.push(row)
      return ok(row)
    },
    redeem_pairing_code({ p_code }) {
      const me = uid()
      if (!me) return fail('You need to sign in first.')
      if (roleOf(me) !== 'family') return fail('Only a family member account can enter a pairing code.')
      const code = String(p_code ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
      const pc = tables.pairing_codes.find((c) => c.code === code)
      if (!pc) return fail('That code is not valid. Check it and try again.')
      if (pc.used_at) return fail('That code has already been used. Ask for a new one.')
      if (Date.parse(String(pc.expires_at)) <= Date.now()) return fail('That code has expired. Ask for a new one.')
      if (tables.family_links.some((l) => l.elder_id === pc.elder_id)) {
        return fail('This elder is already linked to a family member.')
      }
      const link = { id: `link-${nextId++}`, elder_id: pc.elder_id, family_id: me }
      tables.family_links.push(link)
      pc.used_at = new Date().toISOString()
      pc.used_by = me
      return ok(link)
    },
    create_money_request({ p_amount_inr, p_recipient, p_note, p_timeout_seconds }) {
      const me = uid()
      if (!me) return fail('You need to sign in first.')
      if (roleOf(me) !== 'elder') return fail('Only an elder account can create a request.')
      const link = tables.family_links.find((l) => l.elder_id === me)
      if (!link) return fail('Link a family member before sending a request.')
      const amount = p_amount_inr as number
      if (!Number.isInteger(amount) || amount < 1 || amount > 100000) {
        return fail('Amount must be a whole number of rupees from 1 to 100000.')
      }
      const recipient = String(p_recipient ?? '').trim()
      if (recipient.length < 3 || recipient.length > 100) return fail('Recipient must be 3 to 100 characters.')
      const note = String(p_note ?? '').trim() || null
      if (note && note.length > 200) return fail('Note must be at most 200 characters.')
      const timeout = Math.max(15, Math.min(600, Number(p_timeout_seconds ?? 60)))
      const now = Date.now()
      const row = {
        id: `req-${nextId++}`,
        elder_id: me,
        family_id: link.family_id, // chosen by the "server" from the link, never by the browser
        amount_inr: amount,
        recipient,
        note,
        status: 'pending',
        created_at: new Date(now).toISOString(),
        expires_at: new Date(now + timeout * 1000).toISOString(),
        responded_at: null,
      }
      tables.money_requests.push(row)
      broadcast('INSERT', row)
      return ok({ ...row })
    },
    respond_to_request({ p_request_id, p_decision }) {
      const me = uid()
      if (!me) return fail('You need to sign in first.')
      if (p_decision !== 'approved' && p_decision !== 'rejected') {
        return fail('Decision must be approved or rejected.')
      }
      const row = tables.money_requests.find((r) => r.id === p_request_id)
      // Same single conditional check as the SQL: mine AND pending AND not expired.
      if (row && row.family_id === me && row.status === 'pending' && Date.parse(String(row.expires_at)) > Date.now()) {
        row.status = p_decision
        row.responded_at = new Date().toISOString()
        broadcast('UPDATE', row)
        return ok({ ...row })
      }
      if (!row || row.family_id !== me) return fail('Request not found.')
      if (row.status !== 'pending') return fail('This request has already been answered.')
      return fail('This request has expired, so it can no longer be answered.')
    },
  }

  const supabase = {
    auth: {
      async getSession() {
        return { data: { session: sessionFor(currentUser) }, error: null }
      },
      onAuthStateChange(listener: Listener) {
        listeners.push(listener)
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                listeners = listeners.filter((l) => l !== listener)
              },
            },
          },
        }
      },
      async signUp({ email, password }: { email: string; password: string }) {
        if (state.networkDown) return { data: { user: null, session: null }, error: { message: 'Failed to fetch' } }
        if (password.length < 6) {
          return { data: { user: null, session: null }, error: { message: 'Password should be at least 6 characters.' } }
        }
        if (users.some((u) => u.email === email)) {
          return { data: { user: null, session: null }, error: { message: 'User already registered' } }
        }
        const user = { id: `user-${nextId++}`, email, password }
        users.push(user)
        setUser(user, 'SIGNED_IN')
        return { data: { user: { id: user.id }, session: sessionFor(user) }, error: null }
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        if (state.networkDown) return { data: { user: null, session: null }, error: { message: 'Failed to fetch' } }
        const user = users.find((u) => u.email === email && u.password === password)
        if (!user) return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } }
        setUser(user, 'SIGNED_IN')
        return { data: { user: { id: user.id }, session: sessionFor(user) }, error: null }
      },
      async signOut() {
        setUser(null, 'SIGNED_OUT')
        return { error: null }
      },
    },
    from,
    async rpc(name: string, args: Record<string, unknown> = {}): Promise<Result> {
      if (state.networkDown) return NETWORK_ERROR
      const fn = functions[name]
      return fn ? fn(args) : fail(`Could not find the function public.${name}`)
    },
    channel(_name: string) {
      const ch: FakeChannel = { ownerId: uid(), removed: false }
      const handle = {
        ch,
        on(_type: string, _filter: unknown, callback: FakeChannel['onChange']) {
          ch.onChange = callback
          return handle
        },
        subscribe(callback: FakeChannel['onStatus']) {
          ch.onStatus = callback
          channels.push(ch)
          // Like the real one, the status arrives a moment later, not instantly.
          const status: ChannelStatus = state.realtime === 'live' ? 'SUBSCRIBED' : 'CHANNEL_ERROR'
          queueMicrotask(() => {
            if (!ch.removed) ch.onStatus?.(status)
          })
          return handle
        },
      }
      return handle
    },
    async removeChannel(handle: { ch: FakeChannel }) {
      handle.ch.removed = true
      return 'ok'
    },
  }

  /** Test helper: make every open channel report a status (e.g. the connection drops). */
  function setChannelStatus(status: ChannelStatus) {
    for (const ch of channels) if (!ch.removed) ch.onStatus?.(status)
  }

  /** Test helper: how many channels are still open. */
  function openChannelCount() {
    return channels.filter((ch) => !ch.removed).length
  }

  /** Test helper: put a row straight into a table, as if it had been saved earlier. */
  function insertRow(table: string, row: Row) {
    tables[table].push(row)
  }

  /** Test helper: sign up, choose a role and (for family) redeem a code, in one go. */
  async function createPairedAccounts() {
    await supabase.auth.signUp({ email: 'elder1@example.com', password: 'demo-pass-1' })
    await supabase.rpc('create_my_profile', { p_role: 'elder', p_display_name: 'Asha (demo)' })
    const { data: code } = await supabase.rpc('create_pairing_code')
    await supabase.auth.signUp({ email: 'family1@example.com', password: 'demo-pass-1' })
    await supabase.rpc('create_my_profile', { p_role: 'family', p_display_name: 'Ravi (demo)' })
    await supabase.rpc('redeem_pairing_code', { p_code: (code as Row).code })
    await supabase.auth.signOut()
    const [elder, family] = tables.profiles
    return {
      elder: { id: String(elder.id), role: 'elder' as const, displayName: String(elder.display_name) },
      family: { id: String(family.id), role: 'family' as const, displayName: String(family.display_name) },
    }
  }

  async function signInAs(email: string) {
    await supabase.auth.signInWithPassword({ email, password: 'demo-pass-1' })
  }

  return {
    supabase,
    state,
    reset,
    insertRow,
    createPairedAccounts,
    signInAs,
    setChannelStatus,
    openChannelCount,
  }
}

export const fake = createFake()
