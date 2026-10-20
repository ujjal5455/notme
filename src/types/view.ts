// Which screen is showing. App.tsx keeps one of these in state.
// Each option has a `name`; requestDetail also carries which request to show.
// TypeScript calls this pattern a "discriminated union".
export type View =
  | { name: 'elderHome' }
  | { name: 'createRequest' }
  | { name: 'familyInbox' }
  | { name: 'requestDetail'; requestId: string }
  | { name: 'about' }

export type ViewName = View['name']
