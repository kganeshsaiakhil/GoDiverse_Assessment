
export type FilterType = 'all' | 'assignedToMe' | 'createdByMe' | 'overdue' | 'dueToday'

interface TaskFilterProps {
  readonly onFilterChange: (filter: FilterType) => void
  readonly currentFilter: FilterType
}

export default function TaskFilter({ onFilterChange, currentFilter }: TaskFilterProps) {
  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All Tasks' },
    { value: 'assignedToMe', label: 'Assigned to Me' },
    { value: 'createdByMe', label: 'Created by Me' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'dueToday', label: 'Due Today' },
  ]

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2 justify-start">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`px-3 py-1 rounded-full text-sm ${
              currentFilter === filter.value
                ? 'bg-black text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  )
}
