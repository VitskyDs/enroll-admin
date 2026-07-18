import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Input } from '@vitskyds/enroll-ui'
import { cn } from '@/lib/utils'

// Free-text input with a dropdown of existing values to pick from, so owners
// reuse categories (e.g. "Drinks") instead of creating near-duplicates. Typing
// a value not in the list is still allowed and saved as-is — the underlying
// field stays a plain string, this is purely a suggestion UI.
const LISTBOX_ID = 'category-combobox-listbox'

export function CategoryCombobox({
  value,
  onChange,
  options,
  placeholder,
  dir,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  dir?: 'rtl' | 'ltr'
}) {
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const filtered = options.filter(o => o.toLowerCase().includes(value.trim().toLowerCase()))

  function selectOption(option: string) {
    onChange(option)
    setOpen(false)
    setHighlightedIndex(-1)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      if (!filtered.length) return
      e.preventDefault()
      setOpen(true)
      setHighlightedIndex(i => (i + 1 >= filtered.length ? 0 : i + 1))
    } else if (e.key === 'ArrowUp') {
      if (!filtered.length) return
      e.preventDefault()
      setOpen(true)
      setHighlightedIndex(i => (i - 1 < 0 ? filtered.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      if (open && highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        e.preventDefault()
        selectOption(filtered[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        setOpen(false)
        setHighlightedIndex(-1)
      }
    }
  }

  const activeOptionId =
    highlightedIndex >= 0 && highlightedIndex < filtered.length
      ? `${LISTBOX_ID}-option-${highlightedIndex}`
      : undefined

  return (
    <div ref={rootRef} className="relative">
      <Input
        dir={dir}
        value={value}
        onChange={e => {
          onChange(e.target.value)
          setHighlightedIndex(-1)
        }}
        onFocus={() => {
          setOpen(true)
          setHighlightedIndex(-1)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && filtered.length > 0}
        aria-controls={LISTBOX_ID}
        aria-activedescendant={activeOptionId}
      />
      {open && filtered.length > 0 && (
        <ul id={LISTBOX_ID} role="listbox" className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover py-1 shadow-md">
          {filtered.map((option, index) => (
            <li
              key={option}
              id={`${LISTBOX_ID}-option-${index}`}
              role="option"
              aria-selected={option === value}
            >
              <button
                type="button"
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => selectOption(option)}
                className={cn(
                  'block w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground',
                  dir === 'rtl' && 'text-right',
                  option === value && 'bg-accent/60',
                  index === highlightedIndex && 'bg-accent text-accent-foreground',
                )}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
