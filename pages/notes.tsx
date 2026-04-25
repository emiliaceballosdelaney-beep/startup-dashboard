import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import StartupTabs from '../components/StartupTabs'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'
import type { Startup } from '../lib/supabase'

interface Note { id: string; startup_id: string; title: string; content: string; tags: string[]; created_at: string }

const TAG_COLORS: Record<string, string> = {
  strategy: '#cce5ff', ops: '#d4edda', finance: '#fff3cd', marketing: '#f8d7da', product: '#e2d9f3', general: '#e2e3e5'
}

export default function Notes() {
  const [startups, setStartups] = useState<Startup[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [viewNote, setViewNote] = useState<Note | null>(null)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ title: '', content: '', tags: [] as string[] })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    (async () => {
            const { data: st } = await supabase.from('startups').select('*').order('name')
      if (st?.length) {
        setStartups(st)
        setSelectedId(st[0].id)
        const { data: n } = await supabase.from('startup_notes').select('*').eq('startup_id', st[0].id).order('created_at', { ascending: false })
        setNotes(n || [])
      }
      setLoading(false)
    })()
  }, [])

  const loadNotes = async (sid: string) => {
        const { data } = await supabase.from('startup_notes').select('*').eq('startup_id', sid).order('created_at', { ascending: false })
    setNotes(data || [])
  }

  const handleTabChange = (id: string) => { setSelectedId(id); loadNotes(id) }

  const addNote = async () => {
    if (!form.title.trim()) return
        await supabase.from('startup_notes').insert({ ...form, startup_id: selectedId })
    setForm({ title: '', content: '', tags: [] })
    setShowAdd(false)
    await loadNotes(selectedId)
    showToast('Note saved')
  }

  const deleteNote = async (id: string) => {
        await supabase.from('startup_notes').delete().eq('id', id)
    await loadNotes(selectedId)
    showToast('Note deleted')
  }

  const toggleTag = (tag: string) => {
    setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }))
  }

  const allTags = Object.keys(TAG_COLORS)
  const filtered = filter === 'all' ? notes : notes.filter(n => n.tags?.includes(filter))

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main, #f5f0eb)' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '2.5rem 3rem' }}>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', marginBottom: '0.25rem' }}>Notes</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{notes.length} notes</p>

        <StartupTabs startups={startups} selected={selectedId} onChange={handleTabChange} />

        <div style={{ display: 'flex', gap: '0.5rem', margin: '1.5rem 0', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="action-btn action-btn-primary" onClick={() => setShowAdd(true)}>+ New Note</button>
          <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.25rem' }} />
          {['all', ...allTags].map(tag => (
            <button key={tag} onClick={() => setFilter(tag)}
              style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', border: '1px solid var(--border)', fontSize: '0.8rem', cursor: 'pointer',
                background: filter === tag ? 'var(--terracotta)' : (TAG_COLORS[tag] || 'var(--bg-card)'),
                color: filter === tag ? '#fff' : 'var(--text-primary)', fontWeight: filter === tag ? 600 : 400 }}>
              {tag}
            </button>
          ))}
        </div>

        {loading ? <p>Loading...</p> : filtered.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No notes yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {filtered.map(note => (
              <div key={note.id} onClick={() => setViewNote(note)} style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--border-light)', cursor: 'pointer' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{note.title}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{note.content?.substring(0, 120)}{note.content?.length > 120 ? '...' : ''}</div>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {note.tags?.map(tag => (
                    <span key={tag} style={{ background: TAG_COLORS[tag] || '#eee', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem' }}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="New Note">
          <div className="form-group"><label>Title *</label><input className="form-input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Note title" /></div>
          <div className="form-group"><label>Content</label><textarea className="form-textarea" value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))} placeholder="Write your note..." rows={6} /></div>
          <div className="form-group">
            <label>Tags</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
              {allTags.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)} style={{ padding: '0.25rem 0.7rem', borderRadius: '20px', border: '1px solid var(--border)', fontSize: '0.8rem', cursor: 'pointer', background: form.tags.includes(tag) ? 'var(--terracotta)' : TAG_COLORS[tag], color: form.tags.includes(tag) ? '#fff' : 'var(--text-primary)' }}>{tag}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="action-btn" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="action-btn action-btn-primary" onClick={addNote}>Save Note</button>
          </div>
        </Modal>

        <Modal isOpen={!!viewNote} onClose={() => setViewNote(null)} title={viewNote?.title || ''}>
          <div style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>{viewNote?.content}</div>
          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem' }}>
            {viewNote?.tags?.map(tag => <span key={tag} style={{ background: TAG_COLORS[tag] || '#eee', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem' }}>{tag}</span>)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="action-btn" style={{ color: '#dc3545' }} onClick={() => { deleteNote(viewNote!.id); setViewNote(null) }}>Delete</button>
            <button className="action-btn action-btn-primary" onClick={() => setViewNote(null)}>Close</button>
          </div>
        </Modal>

        {toast && <div className="toast">{toast}</div>}
      </main>
    </div>
  )
}
