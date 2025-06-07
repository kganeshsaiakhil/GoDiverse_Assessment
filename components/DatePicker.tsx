import { useEffect, useState } from 'react'

interface DatePickerProps {
  onSelect: (date: string | null) => void
  selectedDate?: string | null
}

export default function DatePicker({ onSelect, selectedDate }: DatePickerProps) {
  const [date, setDate] = useState<string>(selectedDate || '')

  useEffect(() => {
    if (selectedDate) {
      setDate(formatDateForInput(new Date(selectedDate)))
    }
  }, [selectedDate])

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    setDate(newDate)
    onSelect(newDate ? new Date(newDate).toISOString() : null)
  }

  return (
    <div className="flex items-center mb-2">
      <label htmlFor="due-date" className="block mr-2 text-sm font-medium">
        Due Date:
      </label>
      <input
        type="date"
        id="due-date"
        className="rounded p-2 border border-gray-300 flex-grow"
        value={date}
        onChange={handleDateChange}
      />
      {date && (
        <button
          onClick={() => {
            setDate('')
            onSelect(null)
          }}
          className="ml-2 text-sm text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      )}
    </div>
  )
}
