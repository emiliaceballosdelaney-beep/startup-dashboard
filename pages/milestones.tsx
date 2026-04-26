import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import StartupTabs from '../components/StartupTabs'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'
import type { Startup } from '../lib/supabase'

interface MilestoneRow { id: string; startup_id: string; title: string; description?: string; target_date?: string; completed: boolean; created_at: string }

export default function Milestones() {
  const [startups, setStartups] = useState<Startup[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [milestones, setMilestones] = useState<MilestoneRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ title: '', description: '', target_date: '' })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    (async () => {
            const { data: st } = await supabase.from('startups').select('*').order('name')
      if (st?.length) {
        setStartups(st)
        const prosper = st.find((s: any) => s.name.toLowerCase().includes('prosper')); const defaultId = prosper ? prosper.id : st[0].id; setSelectedId(defaultId)
        const { data: m } = await supabase.from('startup_milestones').select('*').eq('startup_id', defaultId).order('target_date')
        setMilestones(m || [])
      }
      setLoading(false)
    })()
  }, [])

  const loadMilestones = async (sid: string) => {
        const { data } = await supabase.from('startup_milestones').select('*').eq('startup_id', sid).order('target_date')
    setMilestones(data || [])
  }

  const handleTabChange = (id: string) => { setSelectedId(id); loadMilestones(id) }

  const addMilestone = async () => {
    if (!form.title.trim()) return
        await supabase.from('startup_milestones').insert({ ...form, startup_id: selectedId, completed: false })
    setForm({ title: '', description: '', target_date: '' })
    setShowAdd(false)
    await loadMilestones(selectedId)
    showToast('Milestone added')
  }

  const toggleComplete = async (m: MilestoneRow) => {
        await supabase.from('startup_milestones').update({ completed: !m.completed }).eq('id', m.id)
    await loadMilestones(selectedId)
    showToast(m.completed ? 'Marked incomplete' : 'Milestone completed!')
  }

  const deleteMilestone = async (id: string) => {
        await supabase.from('startup_milestones').delete().eq('id', id)
    await loadMilestones(selectedId)
    showToast('Milestone deleted')
  }

  const completed = milestones.filter(m => m.completed)
  const upcoming = milestones.filter(m => !m.completed)
  const pct = milestones.length ? Math.round((completed.length / milestones.length) * 100) : 0

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main, #f5f0eb)' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '2.5rem 3rem', marginLeft: '224px' }}>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', marginBottom: '0.25rem' }}>Milestones</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{completed.length} of {milestones.length} complete</p>

        <StartupTabs startups={startups} selected={selectedId} onChange={handleTabChange} />

        {milestones.length > 0 && (
          <div style={{ margin: '1.5rem 0', background: 'var(--bg-card)', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <span>Progress</span><span>{pct}%</span>
            </div>
            <div style={{ background: 'var(--border-light)', borderRadius: '99px', height: 8 }}>
              <div style={{ background: 'var(--terracotta)', width: pct + '%', height: '100%', borderRadius: '99px' }} />
            </div>
          </div>
        )}

        <button className="action-btn action-btn-primary" onClick={() => setShowAdd(true)} style={{ marginBottom: '2rem' }}>+ Add Milestone</button>

        {loading ? <p>Loading...</p> : (
          <>
            {upcoming.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', marginBottom: '0.75rem' }}>Upcoming</h2>
                <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                  <div style={{ position: 'absolute', left: '7px', top: 0, bottom: 0, width: '2px', background: 'var(--border)' }} />
                  {upcoming.map(m => (
                    <div key={m.id} style={{ position: 'relative', marginBottom: '1rem', background: 'var(--bg-card)', borderRadius: '10px', padding: '1rem 1.25rem', border: '1px solid var(--border-light)' }}>
                      <div style={{ position: 'absolute', left: '-1.75rem', top: '1.25rem', width: 14, height: 14, borderRadius: '50%', background: 'var(--terracotta)', border: '2px solid white' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{m.title}</div>
                          {m.description && <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{m.description}</div>}
                          {m.target_date && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.4rem' }}>Target: {m.target_date}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, marginLeft: '1rem' }}>
                          <button className="action-btn action-btn-sage" onClick={() => toggleComplete(m)}>Done</button>
                          <button className="action-btn" style={{ color: '#dc3545' }} onClick={() => deleteMilestone(m.id)}>x</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {completed.length > 0 && (
              <div>
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Completed</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {completed.map(m => (
                    <div key={m.id} style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '0.875rem 1.25rem', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ color: '#28a745' }}>checkmark</span>
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-secondary)' }}>{m.title}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="action-btn" style={{ fontSize: '0.75rem' }} onClick={() => toggleComplete(m)}>Undo</button>
                        <button className="action-btn" style={{ color: '#dc3545' }} onClick={() => deleteMilestone(m.id)}>x</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {milestones.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No milestones yet.</p>}
          </>
        )}

        <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Milestone">
          <div className="form-group"><label>Title *</label><input className="form-input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="What is the milestone?" /></div>
          <div className="form-group"><label>Description</label><textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Optional details..." rows={3} /></div>
          <div className="form-group"><label>Target Date</label><input className="form-input" type="date" value={form.target_date} onChange={e => setForm(f => ({...f, target_date: e.target.value}))} /></div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="action-btn" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="action-btn action-btn-primary" onClick={addMilestone}>Add</button>
          </div>
        </Modal>

        {toast && <div className="toast">{toast}</div>}
      </main>
    </div>
  )
}
