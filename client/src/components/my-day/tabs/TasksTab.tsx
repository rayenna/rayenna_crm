import type { Task, PinOption } from '../types'
import TaskItem from '../components/TaskItem'
import AddTaskInput from '../components/AddTaskInput'

interface Props {
  tasks: Task[]
  loading: boolean
  error: string | null
  onToggle: (id: string) => void
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
  onAdd: (content: string, projectId?: string | null, projectLabel?: string | null) => void
  pinOptions: PinOption[]
}

export default function TasksTab({ tasks, loading, error, onToggle, onEdit, onDelete, onAdd, pinOptions }: Props) {
  const today = new Date().toISOString().slice(0, 10)

  const todayTasks = tasks.filter((t) => !t.isReminder && (t.dueDate === today || t.dueDate === null))
  const carryovers = tasks.filter(
    (t) => !t.isReminder && t.dueDate !== null && t.dueDate < today && !t.isDone,
  )

  const todayPending = todayTasks.filter((t) => !t.isDone)
  const todayDone    = todayTasks.filter((t) => t.isDone)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        {loading && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Loading…
          </div>
        )}

        {error && (
          <div style={{ padding: '12px', borderRadius: 8, background: 'var(--accent-red-muted)', color: 'var(--accent-red)', fontSize: 13, marginTop: 12 }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Carryovers */}
            {carryovers.length > 0 && (
              <>
                <span className="myday-section-label">Carry-overs</span>
                {carryovers.map((t) => (
                  <TaskItem key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </>
            )}

            {/* Today */}
            <span className="myday-section-label">Today</span>

            {todayPending.length === 0 && todayDone.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>
                Nothing planned yet. Add your first task below.
              </p>
            )}

            {todayPending.map((t) => (
              <TaskItem key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
            ))}

            {todayDone.length > 0 && (
              <>
                <span className="myday-section-label" style={{ marginTop: 8 }}>Done</span>
                {todayDone.map((t) => (
                  <TaskItem key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Sticky add input */}
      <AddTaskInput pinOptions={pinOptions} onAdd={onAdd} />
    </div>
  )
}
