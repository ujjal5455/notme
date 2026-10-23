// A pretend Supabase client for tests: same method names as the real one,
// but everything lives in memory and answers instantly with { data, error }.
// It imitates the rules and messages of 0002_rls.sql and 0003_functions.sql
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

const NETWORK_ERROR: Result = { data: null, error: { message: 'TypeError: Failed to fetch' } }

function createFake() {
  let users: FakeUser[] = []
  let tables: Record<string, Row[]> = {}
  let currentUser: FakeUser | null = null
  let listeners: Listener[] = []
  let codeQueue: string[] = []
  let nextId = 1
  const state = { networkDown: false }

  function reset() {
    users = []
    tables = { profiles: [], family_links: [], pairing_codes: [] }
    currentUser = null
    listeners = []
    codeQueue = ['P38SP4XS', 'K7QM3XPR', 'H2WZ9TNB']
    nextId = 1
    state.networkDown = false
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
      default:
        return []
    }
  }

  /** A tiny query builder: from(t).select().eq()/.in() then await, or .maybeSingle(). */
  function from(table: string) {
    const filters: ((row: Row) => boolean)[] = []
    const run = (): Result => {
      if (state.networkDown) return NETWORK_ERROR
      return ok(visibleRows(table).filter((row) => filters.every((f) => f(row))))
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
  }

  return { supabase, state, reset }
}

export const fake = createFake()
