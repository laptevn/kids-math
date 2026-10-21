export function Decorations() {
  return (
    <div className="decorations" aria-hidden="true">
      <span className="sparkle sparkle-one">✦</span>
      <span className="sparkle sparkle-two">✧</span>
      <span className="sparkle sparkle-three">✦</span>
      <div className="rainbow rainbow-left" />
      <div className="rainbow rainbow-right" />
    </div>
  )
}

export function UnicornBadge({ small = false }: { small?: boolean }) {
  return (
    <div className={small ? 'unicorn-badge small' : 'unicorn-badge'} aria-hidden="true">
      <span className="ear left" />
      <span className="horn" />
      <span className="ear right" />
      <span className="mane">●</span>
      <span className="eye left">⌒</span>
      <span className="eye right">⌒</span>
      <span className="cheek left" />
      <span className="cheek right" />
    </div>
  )
}
