// src/admin/AdLeads.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listAllAdLeads, updateAdLeadStatus, closeAdLeadWon, markAdCommissionPaid } from '../services/newsService'

const STATUS_LABEL = { new: 'New', in_discussion: 'In discussion', closed_won: 'Deal closed', closed_lost: 'Not pursued' }

export default function AdLeads() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [leads, setLeads] = useState(null)
  const [dealAmounts, setDealAmounts] = useState({})
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (isAdmin) listAllAdLeads().then(setLeads)
  }, [isAdmin])

  if (!isAdmin) {
    return <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center' }}><p>Admins only</p></div>
  }

  async function setStatus(lead, status) {
    setBusyId(lead.id)
    await updateAdLeadStatus(lead.id, { status })
    setLeads((list) => list.map((l) => (l.id === lead.id ? { ...l, status } : l)))
    setBusyId(null)
  }

  async function handleCloseWon(lead) {
    const amount = Number(dealAmounts[lead.id])
    if (!amount || amount <= 0) return
    setBusyId(lead.id)
    await closeAdLeadWon(lead, amount)
    setLeads((list) => list.map((l) => (l.id === lead.id ? { ...l, status: 'closed_won', dealAmount: amount, commissionAmount: Math.round(amount * 0.1) } : l)))
    setBusyId(null)
  }

  async function handleMarkPaid(lead) {
    setBusyId(lead.id)
    await markAdCommissionPaid(lead.id)
    setLeads((list) => list.map((l) => (l.id === lead.id ? { ...l, commissionPaid: true } : l)))
    setBusyId(null)
  }

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--nf-paper)' }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
        <h2 style={{ fontSize: 17 }}>Local Ad Leads</h2>
      </div>

      <div className="nf-scroll-body nf-container" style={{ paddingTop: 16 }}>
        {leads === null && <p style={{ color: 'var(--nf-ink-soft)' }}>Loading…</p>}
        {leads?.length === 0 && (
          <div className="nf-empty">
            <p style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>No ad leads yet</p>
          </div>
        )}
        {leads?.map((lead) => (
          <div key={lead.id} className="nf-card" style={{ padding: 14, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontWeight: 700, fontSize: 15 }}>{lead.businessName}</p>
              <span className={`nf-badge ${lead.status === 'closed_won' ? 'nf-badge-approved' : lead.status === 'closed_lost' ? 'nf-badge-rejected' : 'nf-badge-pending'}`}>
                {STATUS_LABEL[lead.status] || lead.status}
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--nf-ink-faint)', marginTop: 6 }}>
              {lead.adType} • {lead.district} • from {lead.submittedByName}
            </p>
            {lead.contactName && <p style={{ fontSize: 13, marginTop: 6 }}>Contact: {lead.contactName}</p>}
            <p style={{ fontSize: 13, marginTop: 2 }}>📞 {lead.contactPhone}</p>
            {lead.details && <p style={{ fontSize: 13, color: 'var(--nf-ink-soft)', marginTop: 6, lineHeight: 1.5 }}>{lead.details}</p>}

            {lead.status === 'closed_won' ? (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--nf-line)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--nf-success)' }}>
                  Deal: ₹{lead.dealAmount?.toLocaleString()} · Commission: ₹{lead.commissionAmount?.toLocaleString()}
                </p>
                {!lead.commissionPaid ? (
                  <button className="nf-btn nf-btn-ghost" style={{ marginTop: 8 }} disabled={busyId === lead.id} onClick={() => handleMarkPaid(lead)}>
                    Mark commission as paid out
                  </button>
                ) : (
                  <span className="nf-badge nf-badge-approved" style={{ marginTop: 8, display: 'inline-block' }}>Commission paid</span>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {lead.status === 'new' && (
                  <button className="nf-chip" disabled={busyId === lead.id} onClick={() => setStatus(lead, 'in_discussion')}>Mark in discussion</button>
                )}
                <input
                  type="number"
                  placeholder="Deal amount ₹"
                  value={dealAmounts[lead.id] || ''}
                  onChange={(e) => setDealAmounts((d) => ({ ...d, [lead.id]: e.target.value }))}
                  className="nf-input"
                  style={{ width: 130, padding: '8px 10px' }}
                />
                <button className="nf-btn nf-btn-primary" style={{ padding: '8px 14px' }} disabled={busyId === lead.id} onClick={() => handleCloseWon(lead)}>
                  ✓ Close deal
                </button>
                <button className="nf-btn nf-btn-ghost" style={{ padding: '8px 14px', color: 'var(--nf-danger)' }} disabled={busyId === lead.id} onClick={() => setStatus(lead, 'closed_lost')}>
                  Not pursuing
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
