import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import StartupTabs from '../components/StartupTabs'
import Modal from '../components/Modal'

interface Startup { id: string; name: string }
interface Meeting { id: string; startup_id: string; title: string; date: string; attendees?: string; notes?: string; created_at: string }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function Meetings() {
  const [startups, setStartups] = useState<Startup[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [viewMeeting, setViewMeeting] = useState<Meeting | null>(null)
  const [toast, setToast] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [form, setForm] = useState({ title: '', date: '', attendees: '', notes: '' })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    (async () => {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      const { data: st } = await sb.from('startups').select('id, name').order('name')
      if (st?.length) {
        setStartups(st)
        setSelectedId(st[0].id)
        const { data: m } = await sb.from('startup_meetings').select('*').eq('startup_id', st[0].id).order('date', { ascending: false })
        setMeetings(m || [])
      }
      setLoading(false)
    })()
  }, [])

  const loadMeetings = async (sid: string) => {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data } = await sb.from('startup_meetings').select('*').eq('startup_id', sid).order('date', { ascending: false })
    setMeetings(data || [])
  }

  const handleTabChange = (id: string) => { setSelectedId(id); loadMeetings(id) }

  const addMeeting = async () => {
    if (!form.title.trim() || !form.date) return
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await sb.from('startup_meetings').insert({ ...form, startup_id: selectedId })
    setForm({ title: '', date: '', attendees: '', notes: '' })
    setShowAdd(false)
    await loadMeetings(selectedId)
    showToast('Meeting logged')
  }

  const deleteMeeting = async (id: string) => {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await sb.from('startup_meetings').delete().eq('id', id)
    await loadMeetings(selectedId)
    showToast('Meeting deleted')
  }

  // Calendar helpers
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const meetingDates = new Set(meetings.map(m => m.date?.split('T')[0]))

  const calCells = []
  for (let i = 0; i < firstDay; i++) calCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d)

  const dateStr = (d: number) => `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main, #f5f0eb)' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '2.5rem 3rem' }}>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', marginBottom: '0.25rem' }}>Meetings</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{meetings.length} meetings logged</p>

        <StartupTabs startups={startups} selectedId={selectedId} onChange={handleTabChange} />

        <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem' }}>
          {/* Calendar */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-light)', padding: '1.5rem', width: 320, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>‹</button>
              <strong>{MONTHS[month]} {year}</strong>
              <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
              {DAYS.map(d => <div key={d} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>)}
              {calCells.map((day, i) => {
                if (!day) return <div key={'empty-' + i} />
                const ds = dateStr(day)
                const hasMeeting = meetingDates.has(ds)
                return (
                  <div key={day} style={{ padding: '6px', borderRadius: '6px', fontSize: '0.85rem', position: 'relative',
                    background: hasMeeting ? 'var(--terracotta)' : 'transparent', color: hasMeeting ? '#fff' : 'var(--text-primary)', cursor: hasMeeting ? 'pointer' : 'default' }}
                    onClick={() => hasMeeting && setViewMeeting(meetings.find(m => m.date?.startsWith(ds)) || null)}>
                    {day}
                  </div>
                )
              })}
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1 }}>
            <button className="action-btn action-btn-primary" onClick={() => setShowAdd(true)} style={{ marginBottom: '1rem' }}>+ Log Meeting</button>
            {loading ? <p>Loading...</p> : meetings.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No meetings yet.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {meetings.map(m => (
                  <div key={m.id} style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '1rem 1.25rem', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{m.title}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{m.date?.split('T')[0]}{m.attendees ? ' · ' + m.attendees : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="action-btn action-btn-sage" onClick={() => setViewMeeting(m)}>View</button>
                      <button className="action-btn" style={{ color: '#dc3545' }} onClick={() => deleteMeeting(m.id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Log Meeting">
          <div className="form-group"><label>Title *</label><input className="form-input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Meeting title" /></div>
          <div className="form-group"><label>Date *</label><input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} /></div>
          <div className="form-group"><label>Attendees</label><input className="form-input" value={form.attendees} onChange={e => setForm(f => ({...f, attendees: e.target.value}))} placeholder="Who was there?" /></div>
          <div className="form-group"><label>Notes</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="What was discussed?" rows={4} /></div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="action-btn" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="action-btn action-btn-primary" onClick={addMeeting}>Save</button>
          </div>
        </Modal>

        <Modal isOpen={!!viewMeeting} onClose={() => setViewMeeting(null)} title={viewMeeting?.title || ''}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{viewMeeting?.date?.split('T')[0]}{viewMeeting?.attendees ? ' · ' + viewMeeting.attendees : ''}</p>
          {viewMeeting?.notes && <p style={{ whiteSpace: 'pre-wrap', marginTop: '1rem' }}>{viewMeeting.notes}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button className="action-btn action-btn-primary" onClick={() => setViewMeeting(null)}>Close</button>
          </div>
        </Modal>

        {toast && <div className="toast">{toast}</div>}
      </main>
    </div>
  )
}
