import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import StartupTabs from '../components/StartupTabs'
import Modal from '../components/Modal'
import { supabase, Startup, Task } from '../lib/supabase'

const COLUMNS = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
]

const priorityColors: Record<string, string> = {
  high: 'var(--terracotta)',
  medium: 'var(--gold)',
  low: 'var(--sage)',
  critical: '#9b2c2c',
}

function fmt(d?: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysUntil(d?: string | null) {
  if (!d) return null
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (diff < 0) return { label: String(Math.abs(diff)) + 'd overdue', overdue: true }
  if (diff === 0) return { label: 'Today', overdue: false }
  return { label: diff + 'd', overdue: false }
}

export default function Tasks() {
  const [startups, setStartups] = useState<Startup[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selected, setSelected] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showDetail, setShowDetail] = useState<Task | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', due_date: '', status: 'todo' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: s }, { data: t }] = await Promise.all([
      supabase.from('startups').select('*').eq('status', 'active').order('created_at'),
      supabase.from('startup_tasks').select('*').order('created_at', { ascending: false }),
    ])
    const sl = s ?? []
    setStartups(sl)
    setTasks(t ?? [])
    if (sl.length > 0) setSelected(sl[0].id)
    setLoading(false)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function addTask() {
    if (!form.title.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('startup_tasks').insert({
      startup_id: selected, title: form.title, description: form.description || null,
      priority: form.priority, due_date: form.due_date || null, status: form.status,
    }).select().single()
    if (!error && data) {
      setTasks(prev => [data, ...prev])
      setForm({ title: '', description: '', priority: 'medium', due_date: '', status: 'todo' })
      setShowAdd(false)
      showToast('Task added')
    }
    setSaving(false)
  }

  async function moveTask(taskId: string, newStatus: string) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    await supabase.from('startup_tasks').update({ status: newStatus }).eq('id', taskId)
    showToast('Moved to ' + newStatus.replace('_', ' '))
  }

  async function deleteTask(taskId: string) {
    await supabase.from('startup_tasks').delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setShowDetail(null)
    showToast('Task deleted')
  }

  const filtered = selected ? tasks.filter(t => t.startup_id === selected) : tasks

  if (loading) return <div className="layout"><Sidebar /><main className="main"><div className="loading">Loading</div></main></div>

  return (
    <div className="layout">
      <Sidebar />
      <main className="main animate-in">
        <div className="page-header">
          <div className="page-header-eyebrow">Tasks</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <h1 className="page-title">Kanban Board</h1>
            <button className="action-btn action-btn-primary" onClick={() => setShowAdd(true)}>+ Add Task</button>
          </div>
        </div>
        <StartupTabs startups={startups} selected={selected} onChange={setSelected} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {COLUMNS.map(col => {
            const colTasks = filtered.filter(t => t.status === col.key)
            const isOver = dragOver === col.key
            return (
              <div key={col.key}
                onDragOver={e => { e.preventDefault(); setDragOver(col.key) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => { e.preventDefault(); if (dragging) moveTask(dragging, col.key); setDragging(null); setDragOver(null) }}
                style={{ background: isOver ? 'var(--gold-dim)' : 'var(--bg-card-alt)', borderRadius: 12, padding: 16, minHeight: 480, border: '1px solid ' + (isOver ? 'var(--gold)' : 'var(--border)'), transition: 'all 0.15s' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{col.label}</span>
                  <span style={{ background: 'white', color: 'var(--text-muted)', borderRadius: 20, padding: '1px 8px', fontSize: 11, border: '1px solid var(--border)' }}>{colTasks.length}</span>
                </div>
                {colTasks.map(task => {
                  const due = daysUntil(task.due_date)
                  return (
                    <div key={task.id} draggable
                      onDragStart={e => { setDragging(task.id); e.dataTransfer.effectAllowed = 'move' }}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => setShowDetail(task)}
                      style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', boxShadow: 'var(--shadow)', borderLeft: task.priority ? '3px solid ' + (priorityColors[task.priority] || 'var(--border)') : undefined, opacity: dragging === task.id ? 0.4 : 1, transition: 'all 0.15s' }}
                    >
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.4 }}>{task.title}</div>
                      {task.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{task.description.slice(0, 80)}</div>}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {task.priority && <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 4, background: priorityColors[task.priority] + '20', color: priorityColors[task.priority] }}>{task.priority}</span>}
                        {task.due_date && <span style={{ fontSize: 11, color: due?.overdue ? 'var(--terracotta)' : 'var(--text-light)' }}>{fmt(task.due_date)}{due ? ' · ' + due.label : ''}</span>}
                      </div>
                    </div>
                  )
                })}
                {colTasks.length === 0 && <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-light)', fontSize: 12, border: '1px dashed var(--border)', borderRadius: 8, marginTop: 4 }}>Drop tasks here</div>}
              </div>
            )
          })}
        </div>
        <Modal open={showAdd} title="New Task" onClose={() => setShowAdd(false)}>
          <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What needs to get done?" autoFocus /></div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-input form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional details" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group"><label className="form-label">Priority</label><select className="form-input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
            <div className="form-group"><label className="form-label">Status</label><select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option></select></div>
          </div>
          <div className="form-group"><label className="form-label">Due Date</label><input className="form-input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="action-btn" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="action-btn action-btn-primary" onClick={addTask} disabled={saving}>{saving ? 'Saving...' : 'Add Task'}</button>
          </div>
        </Modal>
        {showDetail && (
          <Modal open={!!showDetail} title={showDetail.title} onClose={() => setShowDetail(null)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20, padding: '14px', background: 'var(--bg-card-alt)', borderRadius: 8 }}>
              {showDetail.priority && <div><div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Priority</div><div style={{ fontSize: 13, fontWeight: 600, color: priorityColors[showDetail.priority] }}>{showDetail.priority}</div></div>}
              {showDetail.due_date && <div><div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Due</div><div style={{ fontSize: 13 }}>{fmt(showDetail.due_date)}</div></div>}
              <div><div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Status</div><div style={{ fontSize: 13 }}>{showDetail.status.replace('_', ' ')}</div></div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Move to column</div>
              <div style={{ display: 'flex', gap: 8 }}>{COLUMNS.filter(c => c.key !== showDetail.status).map(col => (<button key={col.key} className="action-btn" onClick={() => { moveTask(showDetail.id, col.key); setShowDetail(null) }}>{col.label}</button>))}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button onClick={() => deleteTask(showDetail.id)} style={{ fontSize: 12, color: 'var(--terracotta)', background: 'none', border: '1px solid var(--terracotta)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontFamily: 'Jost, sans-serif' }}>Delete Task</button></div>
          </Modal>
        )}
        {toast && <div className="toast">{toast}</div>}
      </main>
    </div>
  )
}
