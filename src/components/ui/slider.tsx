export interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
}

export function Slider({ value, onValueChange, min = 0, max = 100, step = 1, disabled, className }: SliderProps) {
  const current = value[0] ?? min
  const percent = ((current - min) / (max - min)) * 100

  return (
    <div className={`relative flex items-center ${disabled ? 'opacity-50' : ''} ${className ?? ''}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        disabled={disabled}
        onChange={(e) => onValueChange([parseFloat(e.target.value)])}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
        style={{ background: `linear-gradient(to right, var(--primary, #3b82f6) 0%, var(--primary, #3b82f6) ${percent}%, #e5e7eb ${percent}%, #e5e7eb 100%)` }}
      />
    </div>
  )
}
