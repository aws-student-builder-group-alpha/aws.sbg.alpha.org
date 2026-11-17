/** Keep a single accessible heading label while animating its visual letters. */
export default function KineticType({ text }: { text: string }) {
  return <span className="alpha-type-word" aria-hidden="true">{Array.from(text).map((letter, index) => <span className="alpha-type-letter" key={index}>{letter === " " ? "\u00a0" : letter}</span>)}</span>
}
