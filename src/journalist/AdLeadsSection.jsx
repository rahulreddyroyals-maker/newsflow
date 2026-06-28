// src/journalist/AdLeadsSection.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createAdLead, listenToMyAdLeads } from '../services/newsService'

const AD_TYPES = [
  'New business opening', 'Shopping mall / showroom', 'Restaurant / hotel',
  'School / college / coaching institute', 'Clinic / hospital',
  "Politician's birthday/festival wishes", 'Festival wishes (general)',
  'Obituary ad', 'User enquiry (forwarded)', 'Other'
]

const STATUS_LABEL = {
  new: 'New', in_discussion: 'In discussion', closed_won: 'Deal closed', closed_lost: 'Not pursued'
}

export default function AdLeadsSection() {
  const { user, profile } = useAuth()
  const [leads, setLeads] = useState(null)
  const [form, setForm] = useState({ businessName: '', contactName: '', contactPhone: '', adType: '', details: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!user) return
    const unsub = listenToMyAdLeads(user.uid, setLeads)
    return unsub
  }, [user])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.businessName.trim() || !form.contactPhone.trim() || !form.adType) {
      return setError('Business/contact name, phone, and ad type are required.')
    }
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      await createAdLead({
        ...form,
        district: profile?.district || '',
        submittedBy: user.uid,
        submittedByName: profile?.name || 'NewsFlow Reporter'
      })
      setForm({ businessName: '', contactName: '', contactPhone: '', adType: '', details: '' })
      setSuccess('Lead submitted — the NewsFlow marketing team will follow up directly with the contact.')
    } catch (err) {
      setError('Could not submit: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="nf-scroll-body nf-container" style={{ paddingTop: 6 }}>
      <div className="nf-card" style={{ padding: 14, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--nf-navy)', marginBottom: 6 }}>How this works</p>
        <p style={{ fontSize: 12.5, color: 'var(--nf-ink-soft)', lineHeight: 1.7 }}>
          Come across a business that might want to advertise — a new shop opening, a
          restaurant, a politician's birthday wishes, an obituary notice, anything —
          submit their details here. The NewsFlow marketing team will reach out and
          handle the deal. If it closes, <strong>you get 10% commission</strong>,
          tracked in your wallet. If a reader contacts <em>you</em> asking about
          advertising, just forward their details the same way.
        </p>
      </div>

      <div className="nf-input-group">
        <label className="nf-label">Business / contact name *</label>
        <input className="nf-input" value={form.businessName} onChange={(e) => update('businessName', e.target.value)} placeholder="e.g. Sri Lakshmi Sweets" />
      </div>
      <div className="nf-input-group">
        <label className="nf-label">Their name (if different)</label>
        <input className="nf-input" value={form.contactName} onChange={(e) => update('contactName', e.target.value)} placeholder="Owner / contact person" />
      </div>
      <div className="nf-input-group">
        <label className="nf-label">Phone number *</label>
        <input className="nf-input" type="tel" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} placeholder="10-digit mobile number" />
      </div>
      <div className="nf-input-group">
        <label className="nf-label">Type of ad *</label>
        <select className="nf-select" value={form.adType} onChange={(e) => update('adType', e.target.value)}>
          <option value="">Select type</option>
          {AD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="nf-input-group">
        <label className="nf-label">Details (optional)</label>
        <textarea className="nf-textarea" rows={3} value={form.details} onChange={(e) => update('details', e.target.value)} placeholder="Anything useful — what they want, timing, budget hints, etc." />
      </div>

      {error && (
        <div style={{ background: '#FBE7E5', borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <p style={{ color: 'var(--nf-danger)', fontSize: 13, fontWeight: 700 }}>{error}</p>
        </div>
      )}
      {success && (
        <div style={{ background: '#E3F6EA', borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <p style={{ color: 'var(--nf-success)', fontSize: 13, fontWeight: 700 }}>{success}</p>
        </div>
      )}

      <button className="nf-btn nf-btn-flow nf-btn-block" disabled={busy} onClick={handleSubmit} style={{ marginBottom: 40 }}>
        {busy ? 'Submitting…' : 'Submit Lead'}
      </button>

      {leads?.length > 0 && (
        <div style={{ marginBottom: 30 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--nf-navy)', marginBottom: 10 }}>Your submitted leads</p>
          {leads.map((lead) => (
            <div key={lead.id} className="nf-card" style={{ padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 13.5, fontWeight: 700 }}>{lead.businessName}</p>
                <span className={`nf-badge ${lead.status === 'closed_won' ? 'nf-badge-approved' : lead.status === 'closed_lost' ? 'nf-badge-rejected' : 'nf-badge-pending'}`}>
                  {STATUS_LABEL[lead.status] || lead.status}
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--nf-ink-faint)', marginTop: 4 }}>{lead.adType}</p>
              {lead.status === 'closed_won' && (
                <p style={{ fontSize: 12, color: 'var(--nf-success)', marginTop: 6, fontWeight: 700 }}>
                  Deal: ₹{lead.dealAmount?.toLocaleString()} · Your commission: ₹{lead.commissionAmount?.toLocaleString()} {lead.commissionPaid ? '(paid)' : '(pending payout)'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
