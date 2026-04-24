import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

interface Startup {
  id: string
  name: string
  description: string
  stage: string
  website?: string
  created_at: string
}

interface Task {
  id: string
  startup_id: string
  title: string
  description?: string
  status: string
  priority?: string
  due_date?: string
}

interface Milestone {
  id: string
  startup_id: string
  name: string
  description?: string
  status: string
  target_date?: string
}

interface Client {
  id: string
  startup_id: string
  name: string
  status: string
  notes?: string
}

interface Meeting {
  id: string
  startup_id: string
  title: string
  meeting_date: string
  attendees?: string
  recap?: string
}

const stageLabel: Record<string, string> = {
  idea: 'Idea',
  pre_revenue: 'Pre-Revenue',
  early_revenue: 'Early Revenue',
  growth: 'Growth',
  scaling: 'Scaling',
}

const stageBadge: Record<string, string> = {
  idea: 'badge-muted',
  pre_revenue: 'badge-blue',
  early_revenue: 'badge-amber',
  growth: 'badge-green',
  scaling: 'badge-green',
}

const statusDot: Record<string, string> = {
  in_progress: 'item-dot-amber',
  todo: 'item-dot-muted',
  done: 'item-dot-green',
  blocked: 'item-dot-muted',
}

const priorityChip: Record<string, string> = {
  high: 'priority-high',
  medium: 'priority-medium',
  low: 'priority-low',
  critical: 'priority-critical',
}

const milestoneStatusColor: Record<string, string> = {
  completed: '#6b8c6e',
  in_progress: '#b08a3e',
  upcoming: '#9e8e7c',
  missed: '#b86040',
}

function formatDate(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysUntil(d?: string) {
  if (!d) return null
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Today'
  return `${diff}d`
}

export default function Overview() {
  const router = useRouter()
  const [startups, setStartups] = useState<Startup[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [s, t, m, c, mt] = await Promise.all([
        supabase.from('startups').select('*').order('created_at'),
        supabase.from('startup_tasks').select('*').order('due_date'),
        supabase.from('startup_milestones').select('*').order('target_date'),
        supabase.from('clients').select('*'),
        supabase.from('startup_meetings').select('*').order('meeting_date', { ascending: false }),
      ])
      setStartups(s.data || [])
      setTasks(t.data || [])
      setMilestones(m.data || [])
      setClients(c.data || [])
      setMeetings(mt.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const openTasks = tasks.filter(t => t.status !== 'done')
  const upcomingMilestones = milestones.filter(m => m.status !== 'completed' && m.status !== 'missed')

  function getStartupTasks(id: string) { return tasks.filter(t => t.startup_id === id && t.status !== 'done') }
  function getStartupMilestones(id: string) { return milestones.filter(m => m.startup_id === id) }
  function getStartupClients(id: string) { return clients.filter(c => c.startup_id === id) }
  function getStartupMeetings(id: string) { return meetings.filter(m => m.startup_id === id) }

  const selectedStartup = startups.find(s => s.id === selected)

  if (loading) return (
    <div className="layout">
      <Sidebar active="overview" />
      <main className="main"><div className="loading">Loading your dashboard…</div></main>
    </div>
  )

  return (
    <div className="layout">
      <Sidebar active="overview" />
      <main className="main animate-in">

        {/* Page header */}
        <div className="page-header">
          <div className="page-header-eyebrow">Dashboard</div>
          <h1 className="page-title">Overview</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid-3" style={{ marginBottom: 36 }}>
          <div className="stat-box">
            <div className="stat-value">{startups.length}</div>
            <div className="stat-label">Active Businesses</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{openTasks.length}</div>
            <div className="stat-label">Open Tasks</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{upcomingMilestones.length}</div>
            <div className="stat-label">Upcoming Milestones</div>
          </div>
        </div>

        {/* Business cards */}
        <div className="section-header">
          <h2 className="section-title">Your Businesses</h2>
          <span className="section-count">{startups.length} active</span>
        </div>

        <div className="grid-2" style={{ marginBottom: 12 }}>
          {startups.map(s => {
            const sTasks = getStartupTasks(s.id)
            const sMilestones = getStartupMilestones(s.id).filter(m => m.status !== 'completed')
            const isSelected = selected === s.id
            return (
              <div
                key={s.id}
                className="business-card"
                style={isSelected ? { borderColor: 'var(--gold)', boxShadow: 'var(--shadow-hover)' } : {}}
                onClick={() => setSelected(isSelected ? null : s.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div className="business-card-name">{s.name}</div>
                  <span className={`badge ${stageBadge[s.stage] || 'badge-muted'}`}>
                    {stageLabel[s.stage] || s.stage}
                  </span>
                </div>
                <p className="business-card-desc">{s.description}</p>
                {s.website && (
                  <a href={s.website} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: 'var(--gold)', display: 'block', marginBottom: 14 }}
                    onClick={e => e.stopPropagation()}>
                    ↗ {s.website.replace('https://', '')}
                  </a>
                )}
                <div className="business-card-meta">
                  <div><span>{sTasks.length}</span> open tasks</div>
                  <div><span>{sMilestones.length}</span> milestones ahead</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Drill-down panel */}
        {selected && selectedStartup && (
          <div className="detail-panel animate-in" style={{ marginBottom: 36 }}>
            <div className="detail-panel-header">
              <h3 className="detail-panel-title">{selectedStartup.name} — Detail</h3>
              <button className="close-btn" onClick={() => setSelected(null)}>✕ Close</button>
            </div>

            <div className="grid-2" style={{ gap: 24 }}>

              {/* Tasks */}
              <div>
                <div className="section-header" style={{ marginBottom: 12 }}>
                  <h4 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17 }}>Open Tasks</h4>
                  <button style={{ fontSize: 12, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Jost, sans-serif' }}
                    onClick={() => router.push('/tasks')}>View all →</button>
                </div>
                {getStartupTasks(selected).length === 0
                  ? <div className="empty">No open tasks</div>
                  : getStartupTasks(selected).slice(0, 6).map(t => (
                    <div key={t.id} className="item-row">
                      <div className={`item-dot ${statusDot[t.status] || 'item-dot-muted'}`} />
                      <div style={{ flex: 1 }}>
                        <div className="item-title">{t.title}</div>
                        <div className="item-meta" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                          {t.priority && <span className={`priority-chip ${priorityChip[t.priority] || ''}`}>{t.priority}</span>}
                          {t.due_date && <span style={{ color: 'var(--text-light)' }}>Due {formatDate(t.due_date)} · {daysUntil(t.due_date)}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>

              {/* Milestones */}
              <div>
                <div className="section-header" style={{ marginBottom: 12 }}>
                  <h4 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17 }}>Milestones</h4>
                  <button style={{ fontSize: 12, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Jost, sans-serif' }}
                    onClick={() => router.push('/milestones')}>View all →</button>
                </div>
                {getStartupMilestones(selected).length === 0
                  ? <div className="empty">No milestones yet</div>
                  : getStartupMilestones(selected).slice(0, 6).map(m => (
                    <div key={m.id} className="item-row">
                      <div className={`item-dot`} style={{ background: milestoneStatusColor[m.status] || 'var(--border-strong)' }} />
                      <div style={{ flex: 1 }}>
                        <div className="item-title">{m.name}</div>
                        <div className="item-meta" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                          <span style={{ color: milestoneStatusColor[m.status], fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {m.status.replace('_', ' ')}
                          </span>
                          {m.target_date && <span style={{ color: 'var(--text-light)' }}>{formatDate(m.target_date)}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>

              {/* Clients */}
              <div>
                <div className="section-header" style={{ marginBottom: 12 }}>
                  <h4 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17 }}>Clients</h4>
                  <button style={{ fontSize: 12, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Jost, sans-serif' }}
                    onClick={() => router.push('/clients')}>View all →</button>
                </div>
                {getStartupClients(selected).length === 0
                  ? <div className="empty">No clients yet</div>
                  : getStartupClients(selected).map(c => (
                    <div key={c.id} className="item-row">
                      <div className="item-dot item-dot-green" />
                      <div style={{ flex: 1 }}>
                        <div className="item-title">{c.name}</div>
                        <div className="item-meta">{c.notes?.slice(0, 60)}{c.notes && c.notes.length > 60 ? '…' : ''}</div>
                      </div>
                      <span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-muted'}`}>{c.status}</span>
                    </div>
                  ))
                }
              </div>

              {/* Meetings */}
              <div>
                <div className="section-header" style={{ marginBottom: 12 }}>
                  <h4 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17 }}>Recent Meetings</h4>
                  <button style={{ fontSize: 12, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Jost, sans-serif' }}
                    onClick={() => router.push('/meetings')}>View all →</button>
                </div>
                {getStartupMeetings(selected).length === 0
                  ? <div className="empty">No meetings logged</div>
                  : getStartupMeetings(selected).slice(0, 4).map(m => (
                    <div key={m.id} className="item-row">
                      <div className="item-dot item-dot-muted" />
                      <div style={{ flex: 1 }}>
                        <div className="item-title">{m.title}</div>
                        <div className="item-meta">{formatDate(m.meeting_date)}{m.attendees ? ` · ${m.attendees}` : ''}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        <hr className="divider" />

        {/* All open tasks */}
        <div className="section-header">
          <h2 className="section-title">Open Tasks</h2>
          <span className="section-count">{openTasks.length} total</span>
        </div>

        <div className="card">
          {openTasks.length === 0
            ? <div className="empty">No open tasks — you're clear!</div>
            : openTasks.map(t => {
              const startup = startups.find(s => s.id === t.startup_id)
              return (
                <div key={t.id} className="item-row">
                  <div className={`item-dot ${statusDot[t.status] || 'item-dot-muted'}`} />
                  <div style={{ flex: 1 }}>
                    <div className="item-title">{t.title}</div>
                    <div className="item-meta" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                      {startup && <span>{startup.name}</span>}
                      {t.due_date && <span>· Due {formatDate(t.due_date)}</span>}
                      <span>· {t.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {t.priority && <span className={`priority-chip ${priorityChip[t.priority] || ''}`}>{t.priority}</span>}
                    {t.due_date && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 60, textAlign: 'right' }}>
                        {daysUntil(t.due_date)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          }
        </div>

      </main>
    </div>
  )
}
