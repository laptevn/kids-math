interface KeypadProps {
  value: string
  disabled: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export function Keypad({ value, disabled, onChange, onSubmit }: KeypadProps) {
  const addDigit = (digit: string) => {
    if (disabled || value.length >= 3) return
    onChange(value === '0' ? digit : `${value}${digit}`)
  }

  return (
    <div className="keypad" aria-label="Цифровая клавиатура">
      {KEYS.map((key) => (
        <button className="number-key" type="button" key={key} onClick={() => addDigit(key)} disabled={disabled}>
          {key}
        </button>
      ))}
      <button
        className="number-key utility-key"
        type="button"
        aria-label="Стереть последнюю цифру"
        onClick={() => onChange(value.slice(0, -1))}
        disabled={disabled || !value}
      >
        ⌫
      </button>
      <button className="number-key" type="button" onClick={() => addDigit('0')} disabled={disabled}>
        0
      </button>
      <button className="number-key submit-key" type="button" onClick={onSubmit} disabled={disabled || !value}>
        ✓
      </button>
    </div>
  )
}
