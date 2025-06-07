import { Database } from '@/lib/schema'
import { Session, useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { useEffect, useState } from 'react'
import DatePicker from './DatePicker'
import UserSelector from './UserSelector'
import TaskFilter, { FilterType } from './TaskFilter'
import Notification from './Notification'
import { createTaskAssignmentNotification } from '@/lib/notificationUtils'

type Todos = Database['public']['Tables']['todos']['Row']

export default function TodoList({ session }: { session: Session }) {
  const supabase = useSupabaseClient<Database>()
  const user = useUser()
  const [todos, setTodos] = useState<Todos[]>([])
  const [filteredTodos, setFilteredTodos] = useState<Todos[]>([])
  const [newTaskText, setNewTaskText] = useState('')
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState<string | null>(null)
  const [newTaskDueDate, setNewTaskDueDate] = useState<string | null>(null)
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all')
  const [errorText, setErrorText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchTodos = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('todos')
          .select('*')
          .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
          .order('inserted_at', { ascending: false })

        if (error) {
          throw error
        }

        if (data) {
          setTodos(data)
        }
      } catch (error: any) {
        console.error('Error fetching todos:', error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTodos()

    // Set up real-time subscription for todos
    const subscription = supabase
      .channel('public:todos')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'todos',
          filter: `user_id=eq.${user.id}` 
        }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTodos(prev => [payload.new as Todos, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setTodos(prev => 
              prev.map(todo => todo.id === payload.new.id ? payload.new as Todos : todo)
            )
          } else if (payload.eventType === 'DELETE') {
            setTodos(prev => prev.filter(todo => todo.id !== payload.old.id))
          }
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'todos',
          filter: `assigned_to=eq.${user.id}` 
        }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTodos(prev => [payload.new as Todos, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setTodos(prev => 
              prev.map(todo => todo.id === payload.new.id ? payload.new as Todos : todo)
            )
          } else if (payload.eventType === 'DELETE') {
            setTodos(prev => prev.filter(todo => todo.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, user])

  // Filter todos based on the current filter
  useEffect(() => {
    if (!todos.length) {
      setFilteredTodos([])
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    switch (currentFilter) {
      case 'assignedToMe':
        setFilteredTodos(todos.filter(todo => todo.assigned_to === user?.id))
        break
      case 'createdByMe':
        setFilteredTodos(todos.filter(todo => todo.user_id === user?.id))
        break
      case 'overdue':
        setFilteredTodos(todos.filter(todo => {
          if (!todo.due_date) return false
          const dueDate = new Date(todo.due_date)
          dueDate.setHours(0, 0, 0, 0)
          return dueDate < today && !todo.is_complete
        }))
        break
      case 'dueToday':
        setFilteredTodos(todos.filter(todo => {
          if (!todo.due_date) return false
          const dueDate = new Date(todo.due_date)
          dueDate.setHours(0, 0, 0, 0)
          return dueDate.getTime() === today.getTime() && !todo.is_complete
        }))
        break
      case 'all':
      default:
        setFilteredTodos(todos)
        break
    }
  }, [todos, currentFilter, user])
  const addTodo = async (taskText: string) => {
    let task = taskText.trim()
    if (task.length) {
      try {
        // Create the new todo object
        const newTodo = {
          task,
          user_id: user!.id,
          assigned_to: newTaskAssignedTo,
          due_date: newTaskDueDate,
          created_by: user!.id  // Explicitly set created_by to avoid foreign key issues
        }

        // First attempt to insert with assigned_to
        let todoResult;
        if (newTaskAssignedTo) {
          const { data, error } = await supabase
            .from('todos')
            .insert(newTodo)
            .select()
            .single();
            
          if (error && error.message.includes('violates foreign key constraint')) {
            // If foreign key error, try again without the assigned_to field
            console.warn('User ID not found in database, removing assignment', newTaskAssignedTo);
            const fallbackTodo = {
              ...newTodo,
              assigned_to: null
            };
            
            const fallbackResult = await supabase
              .from('todos')
              .insert(fallbackTodo)
              .select()
              .single();
              
            if (fallbackResult.error) {
              throw fallbackResult.error;
            }
            
            todoResult = fallbackResult.data;
            setErrorText('Could not assign task: user not found in database');
          } else if (error) {
            throw error;
          } else {
            todoResult = data;
          }
        } else {
          // If no assignment, just insert normally
          const { data, error } = await supabase
            .from('todos')
            .insert(newTodo)
            .select()
            .single();
            
          if (error) {
            throw error;
          }
          
          todoResult = data;
        }

        // Create a notification if the task was successfully assigned to someone
        if (todoResult && todoResult.assigned_to && todoResult.assigned_to !== user!.id) {
          await createTaskAssignmentNotification(
            supabase,
            todoResult.id,
            todoResult.assigned_to,
            todoResult.task || 'Untitled task',
            user!.email || 'A user'
          )
        }

        // Reset form
        setNewTaskText('')
        setNewTaskAssignedTo(null)
        setNewTaskDueDate(null)
      } catch (error: any) {
        setErrorText(error.message)
      }
    }
  }

  const deleteTodo = async (id: number) => {
    try {
      await supabase.from('todos').delete().eq('id', id).throwOnError()
      setTodos(todos.filter((x) => x.id != id))
    } catch (error) {
      console.log('error', error)
    }
  }
  const updateTodoAssignment = async (todo: Todos, assignedTo: string | null) => {
    try {
      const updates = {
        assigned_to: assignedTo
      }

      const { data, error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', todo.id)
        .select()
        .single()

      if (error) {
        if (error.message.includes('violates foreign key constraint')) {
          setErrorText('Could not assign task: user not found in database');
          return;
        }
        throw error;
      }

      // Create a notification if the task is assigned to someone new
      if (data && data.assigned_to && data.assigned_to !== user!.id) {
        await createTaskAssignmentNotification(
          supabase,
          data.id,
          data.assigned_to,
          data.task || 'Untitled task',
          user!.email || 'A user'
        )
      }

      // Update local state
      setTodos(todos.map(t => t.id === todo.id ? { ...t, assigned_to: assignedTo } : t))
    } catch (error: any) {
      console.error('Error updating todo assignment:', error)
      setErrorText(error.message)
    }
  }

  const updateTodoDueDate = async (todo: Todos, dueDate: string | null) => {
    try {
      const updates = {
        due_date: dueDate
      }

      const { error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', todo.id)
        .throwOnError()

      if (error) {
        throw error
      }

      // Update local state
      setTodos(todos.map(t => t.id === todo.id ? { ...t, due_date: dueDate } : t))
    } catch (error) {
      console.error('Error updating todo due date:', error)
    }
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Task Manager</h1>
        {user && <Notification userId={user.id} />}
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addTodo(newTaskText)
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="task" className="block text-sm font-medium mb-1">
              Task Description:
            </label>
            <input
              id="task"
              className="rounded w-full p-2 border border-gray-300"
              type="text"
              placeholder="Enter task description"
              value={newTaskText}
              onChange={(e) => {
                setErrorText('')
                setNewTaskText(e.target.value)
              }}
            />
          </div>

          {user && (
            <UserSelector
              onSelect={setNewTaskAssignedTo}
              selectedUserId={newTaskAssignedTo}
              currentUserId={user.id}
            />
          )}

          <DatePicker
            onSelect={setNewTaskDueDate}
            selectedDate={newTaskDueDate}
          />

          <button className="btn-black w-full" type="submit">
            Add Task
          </button>
        </form>
        {!!errorText && <Alert text={errorText} />}
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Tasks</h2>
        <TaskFilter onFilterChange={setCurrentFilter} currentFilter={currentFilter} />
        
        {loading ? (
          <div className="text-center py-4">Loading tasks...</div>
        ) : filteredTodos.length === 0 ? (
          <div className="bg-white shadow rounded-md p-6 text-center text-gray-500">
            No tasks found. {currentFilter !== 'all' ? 'Try changing the filter or ' : ''}Add a new task to get started.
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredTodos.map((todo) => (
                <Todo 
                  key={todo.id} 
                  todo={todo} 
                  currentUserId={user?.id || ''} 
                  onDelete={() => deleteTodo(todo.id)} 
                  onAssigneeChange={(assignedTo) => updateTodoAssignment(todo, assignedTo)}
                  onDueDateChange={(dueDate) => updateTodoDueDate(todo, dueDate)}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

const Todo = ({ 
  todo, 
  currentUserId,
  onDelete,
  onAssigneeChange,
  onDueDateChange
}: { 
  todo: Todos; 
  currentUserId: string;
  onDelete: () => void;
  onAssigneeChange: (assignedTo: string | null) => void;
  onDueDateChange: (dueDate: string | null) => void;
}) => {
  const supabase = useSupabaseClient<Database>()
  const [isCompleted, setIsCompleted] = useState(todo.is_complete)
  const [expanded, setExpanded] = useState(false)
  const [assignee, setAssignee] = useState<{ id: string; email: string } | null>(null)
  const [creator, setCreator] = useState<{ id: string; email: string } | null>(null)
  // Fetch user details for the creator and assignee
  useEffect(() => {
    const fetchUserDetailsFromAPI = async () => {
      try {
        const response = await fetch('/api/users')
        
        if (!response.ok) {
          throw new Error('Failed to fetch users')
        }

        const data = await response.json()
        const users = data.users

        // Find creator and assignee
        if (todo.user_id) {
          const creator = users.find((u: any) => u.id === todo.user_id)
          if (creator) {
            setCreator({
              id: creator.id,
              email: creator.email
            })
          }
        }

        if (todo.assigned_to) {
          const assignee = users.find((u: any) => u.id === todo.assigned_to)
          if (assignee) {
            setAssignee({
              id: assignee.id,
              email: assignee.email
            })
          }
        }
      } catch (error) {
        console.error('Error fetching user details from API:', error)
      }
    }

    fetchUserDetailsFromAPI()
  }, [todo.user_id, todo.assigned_to])

  const toggle = async () => {
    try {
      const { data } = await supabase
        .from('todos')
        .update({ is_complete: !isCompleted })
        .eq('id', todo.id)
        .throwOnError()
        .select()
        .single()

      if (data) setIsCompleted(data.is_complete)
    } catch (error) {
      console.log('error', error)
    }
  }

  // Check if the task is overdue
  const isOverdue = () => {
    if (!todo.due_date || isCompleted) return false
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const dueDate = new Date(todo.due_date)
    dueDate.setHours(0, 0, 0, 0)
    
    return dueDate < today
  }

  // Check if the task is due today
  const isDueToday = () => {
    if (!todo.due_date || isCompleted) return false
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const dueDate = new Date(todo.due_date)
    dueDate.setHours(0, 0, 0, 0)
    
    return dueDate.getTime() === today.getTime()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  return (
    <li className={`block hover:bg-gray-50 focus:outline-none transition duration-150 ease-in-out ${
      isOverdue() ? 'border-l-4 border-red-500' : 
      isDueToday() ? 'border-l-4 border-yellow-500' : ''
    }`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 flex items-center">
            <input
              className="h-4 w-4 mr-3 cursor-pointer"
              onChange={toggle}
              type="checkbox"
              checked={isCompleted ? true : false}
            />
            <div>
              <div className={`text-lg font-medium ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                {todo.task}
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {creator && creator.id !== currentUserId && (
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                    Created by: {creator.email}
                  </span>
                )}
                {assignee && (
                  <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                    Assigned to: {assignee.email}
                  </span>
                )}
                {todo.due_date && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    isOverdue() ? 'bg-red-100 text-red-700' : 
                    isDueToday() ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200'
                  }`}>
                    Due: {formatDate(todo.due_date)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                {expanded ? (
                  <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                )}
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDelete()
              }}
              className="text-red-500 hover:text-red-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <UserSelector
                  onSelect={onAssigneeChange}
                  selectedUserId={todo.assigned_to}
                  currentUserId={currentUserId}
                />
              </div>
              <div>
                <DatePicker
                  onSelect={onDueDateChange}
                  selectedDate={todo.due_date}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </li>
  )
}

const Alert = ({ text }: { text: string }) => (
  <div className="rounded-md bg-red-100 p-4 my-3">
    <div className="text-sm leading-5 text-red-700">{text}</div>
  </div>
)
