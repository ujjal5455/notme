export function AboutSafety() {
  return (
    <section aria-labelledby="about-title">
      <h1 id="about-title">How Notme keeps you safe</h1>
      <p>
        Scammers can copy a family member&apos;s voice and ask you for money urgently. Notme does
        not try to detect fake voices. Instead, it lets you check the exact request with your
        family member through a separate app they already set up with you.
      </p>

      <h2>What the answers mean</h2>
      <ul className="plain-list">
        <li>
          <strong>Confirmed:</strong> your family member agreed with these exact details. It does
          not prove the person you are paying is safe.
        </li>
        <li>
          <strong>Rejected:</strong> your family member did not make this request. Do not pay.
        </li>
        <li>
          <strong>No reply:</strong> the request is unconfirmed. That does not prove it is a scam,
          but do not pay until you reach your family member on a number you already trust.
        </li>
      </ul>

      <h2>What Notme does not do</h2>
      <ul className="plain-list">
        <li>It never sends real money.</li>
        <li>It does not listen to or block phone calls.</li>
        <li>It is a hackathon prototype, not an emergency service.</li>
      </ul>
    </section>
  )
}
