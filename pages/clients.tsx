import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import StartupTabs from '../components/StartupTabs'
import Modal from '../components/Modal'

interface Startup { id: string; name: string }
interface Client {
  id: string
  startup_id: string
  name: string
  email?: string
  phone?: string
  status: string
  notes?: string
  created_at: string
}

const statusColors: Record<string, { bg: string; color: string; dot: string }> = {
  active:   { bg: '#d4edda', color: '#155724', dot: '#28a745' },
  lead:     { bg: '#fff3cd', color: '#856404', dot: '#ffc107' },
  prospect: { bg: '#cce5ff', color: '#004085', dot: '#007bff' },
  inactive: { bg: '#f8d7da', color: '#721c24', dot: '#dc3545' },
}

export default function Clients() {
  const [startups, setStartups] = useState<Startup[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showInteraction, setShowInteraction] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', status: 'prospect', notes: '' })
  const [interactionForm, setInteractionForm] = useState({ type: 'call', notes: '' })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    (async () => {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: st } = await sb.from('startups').select('id, name').order('name')
      if (st?.length) {
        setStartups(st)
        setSelectedId(st[0].id)
        const { data: cl } = await sb.from('clients').select('*').eq('startup_id', st[0].id).order('name')
        setClients(cl || [])
      }
      setLoading(false)
    })()
  }, [])

  const loadClients = async (sid: string) => {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data } = await sb.from('clients').select('*').eq('startup_id', sid).order('name')
    setClients(data || [])
  }

  const handleTabChange = (id: string) => { setSelectedId(id); loadClients(id) }

  const addClient = async () => {
    if (!form.name.trim()) return
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await sb.from('clients').insert({ ...form, startup_id: selectedId })
    setForm({ name: '', email: '', phone: '', status: 'prospect', notes: '' })
    setShowAdd(false)
    await loadClients(selectedId)
    showToast('Client added')
  }

  const updateStatus = async (client: Client, status: string) => {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await sb.from('clients').update({ status }).eq('id', client.id)
    await loadClients(selectedId)
    showToast('Status updated')
  }

  const removeClient = async (id: string) => {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await sb.from('clients').delete().eq('id', id)
    await loadClients(selectedId)
    showToast('Client removed')
  }

  const logInteraction = async () => {
    if (!selectedClient) return
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await sb.from('client_interactions').insert({
      client_id: selectedClient.id,
      type: interactionForm.type,
      notes: interactionForm.notes,
      date: new Date().toISOString().split('T')[0]
    })
    setInteractionForm({ type: 'call', notes: '' })
    setShowInteraction(false)
    showToast('Interaction logged')
  }

  const grouped = {
    active:   clients.filter(c => c.status === 'active'),
    lead:     clients.filter(c => c.status === 'lead'),
    prospect: clients.filter(c => c.status === 'prospect'),
    inactive: clients.filter(c => c.status === 'inactive'),
  }

  const total = clients.length
  const activeCount = grouped.active.length
  const otherCount = total - activeCount

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main, #f5f0eb)' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '2.5rem 3rem' }}>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', marginBottom: '0.25rem' }}>Clients</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{total} clients tracked</p>

        <StartupTabs startups={startups} selectedId={selectedId} onChange={handleTabChange} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', margin: '1.5rem 0' }}>
          {[['Total', total], ['Active', activeCount], ['Other', otherCount]].map(([label, val]) => (
            <div key={label} style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '2.5rem', fontFamily: 'Cormorant Garamond, serif' }}>{val}</div>
              <div style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>

        <button className="action-btn action-btn-primary" onClick={() => setShowAdd(true)} style={{ marginBottom: '2rem' }}>+ Add Client</button>

        {loading ? <p>Loading...</p> : (
          <>
            {(['active', 'lead', 'prospect', 'inactive'] as const).map(status => {
              const group = grouped[status]
              if (!group.length) return null
              const label = status.charAt(0).toUpperCase() + status.slice(1)
              return (
                <div key={status} style={{ marginBottom: '2rem' }}>
                  <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', marginBottom: '0.75rem' }}>{label}</h2>
                  <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
                    {group.map((c, i) => {
                      const sc = statusColors[c.status] || { bg: '#eee', color: '#333', dot: '#999' }
                      return (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', borderTop: i > 0 ? '1px solid var(--border-light)' : 'none', gap: '0.75rem' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
                          <span style={{ flex: 1, fontWeight: 500 }}>{c.name}</span>
                          {c.email && <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{c.email}</span>}
                          <span style={{ background: sc.bg, color: sc.color, padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{c.status}</span>
                          <select
                            value={c.status}
                            onChange={e => updateStatus(c, e.target.value)}
                            style={{ fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.2rem 0.4rem', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }}
                          >
                            <option value="prospect">Prospect</option>
                            <option value="lead">Lead</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                          <button className="action-btn action-btn-sage" onClick={() => { setSelectedClient(c); setShowInteraction(true) }}>Log</button>
                          <button className="action-btn" onClick={() => removeClient(c.id)} style={{ color: 'var(--text-muted)' }}>✕</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </>
        )}

        <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Client">
          <div className="form-group">
            <label>Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Full name" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="form-input" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="email@example.com" />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input className="form-input" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="Phone number" />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select className="form-input" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
              <option value="prospect">Prospect</option>
              <option value="lead">Lead</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Any notes..." rows={3} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="action-btn" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="action-btn action-btn-primary" onClick={addClient}>Add Client</button>
          </div>
        </Modal>

        <Modal isOpen={showInteraction} onClose={() => setShowInteraction(false)} title={`Log Interaction — ${selectedClient?.name}`}>
          <div className="form-group">
            <label>Type</label>
            <select className="form-input" value={interactionForm.type} onChange={e => setInteractionForm(f => ({...f, type: e.target.value}))}>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="dm">DM</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea className="form-textarea" value={interactionForm.notes} onChange={e => setInteractionForm(f => ({...f, notes: e.target.value}))} placeholder="What happened?" rows={4} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="action-btn" onClick={() => setShowInteraction(false)}>Cancel</button>
            <button className="action-btn action-btn-primary" onClick={logInteraction}>Log It</button>
          </div>
        </Modal>

        {toast && <div className="toast">{toast}</div>}
      </main>
    </div>
  )
}
