import { useState, useMemo } from 'react'
import {
  dueAmount,
  formatDate,
  formatMoney,
  membershipStatus,
  hasPersonalTrainer,
  daysLeft,
  isMemberBlocked,
  today,
} from '../lib/utils'
import { getAttendanceLogs, getMonthAttendanceStats } from '../lib/attendance'

export default function Reports({ members = [], gymName = 'Gym Manager', gymId = 'default' }) {
  const [reportType, setReportType] = useState('overview') // 'overview' | 'financial' | 'attendance' | 'expirations'

  const now = new Date()
  const todayFormattedDate = now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const currentMonthYear = now.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  const attendanceLogs = useMemo(() => getAttendanceLogs(gymId), [gymId])
  const monthAttendance = useMemo(() => getMonthAttendanceStats(gymId), [gymId])

  // Overview metrics
  const summary = useMemo(() => {
    let totalCollected = 0
    let totalDue = 0
    let active = 0
    let expired = 0
    let expiringSoon = 0
    let ptCount = 0
    let blockedCount = 0

    members.forEach((m) => {
      const left = daysLeft(m.end_date)
      const due = dueAmount(m)
      const paid = Number(m.paid_amount || 0)
      totalCollected += paid
      totalDue += due

      if (hasPersonalTrainer(m)) ptCount++
      if (isMemberBlocked(m)) blockedCount++

      if (left >= 0) active++
      else expired++

      if (left >= 0 && left <= 7) expiringSoon++
    })

    return {
      totalMembers: members.length,
      active,
      expired,
      expiringSoon,
      ptCount,
      blockedCount,
      totalCollected,
      totalDue,
      totalRevenue: totalCollected + totalDue,
      monthlyCheckins: monthAttendance.totalCheckins,
      uniqueAttended: monthAttendance.uniqueMembers,
    }
  }, [members, monthAttendance])

  // Export to CSV function
  function exportCSV() {
    const headers = ['Name', 'Phone', 'Plan', 'Start Date', 'End Date', 'Total Fee', 'Paid Amount', 'Due Amount', 'Personal Trainer']
    const rows = members.map((m) => [
      `"${m.name || ''}"`,
      `"${m.phone || ''}"`,
      `"${m.plan || 'Standard'}"`,
      `"${m.start_date || ''}"`,
      `"${m.end_date || ''}"`,
      m.total_fee || 0,
      m.paid_amount || 0,
      dueAmount(m),
      hasPersonalTrainer(m) ? 'Yes' : 'No',
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `gym_members_report_${today()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="gymbook-dash-wrap">
      {/* Header */}
      <header className="gymbook-header">
        <div className="gymbook-header-left">
          <h1 className="gymbook-header-title">Reports & Analytics</h1>
        </div>
        <div className="gymbook-header-right">
          <button
            type="button"
            className="btn sm"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px' }}
            onClick={exportCSV}
          >
            Export CSV
          </button>
        </div>
      </header>

      {/* Subtabs Bar */}
      <div className="gymbook-subtabs-bar">
        <button
          type="button"
          className={`gymbook-subtab-btn ${reportType === 'overview' ? 'active' : ''}`}
          onClick={() => setReportType('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          className={`gymbook-subtab-btn ${reportType === 'financial' ? 'active' : ''}`}
          onClick={() => setReportType('financial')}
        >
          Collections
        </button>
        <button
          type="button"
          className={`gymbook-subtab-btn ${reportType === 'attendance' ? 'active' : ''}`}
          onClick={() => setReportType('attendance')}
        >
          Attendance
        </button>
      </div>

      <div className="gymbook-subtext">Generated on {todayFormattedDate} for {gymName}</div>

      <div className="gymbook-sections-flow">
        {/* Overview Report */}
        {reportType === 'overview' && (
          <>
            <section className="gb-sec">
              <h2 className="gb-sec-title">Key Performance Indicators</h2>
              <div className="gb-grid-2">
                <div className="gb-card">
                  <div className="gb-card-top">
                    <span className="gb-card-val teal">{summary.active}</span>
                    <span className="gb-card-icon teal">👥</span>
                  </div>
                  <div className="gb-card-bottom">
                    <span className="gb-card-lbl">Active Members</span>
                  </div>
                </div>

                <div className="gb-card">
                  <div className="gb-card-top">
                    <span className="gb-card-val red">{summary.expiringSoon}</span>
                    <span className="gb-card-icon teal">⏳</span>
                  </div>
                  <div className="gb-card-bottom">
                    <span className="gb-card-lbl">Expiring in 7 Days</span>
                  </div>
                </div>

                <div className="gb-card">
                  <div className="gb-card-top">
                    <span className="gb-card-val teal">{formatMoney(summary.totalCollected)}</span>
                    <span className="gb-card-icon teal">💵</span>
                  </div>
                  <div className="gb-card-bottom">
                    <span className="gb-card-lbl">Total Received</span>
                  </div>
                </div>

                <div className="gb-card">
                  <div className="gb-card-top">
                    <span className="gb-card-val red">{formatMoney(summary.totalDue)}</span>
                    <span className="gb-card-icon teal">💳</span>
                  </div>
                  <div className="gb-card-bottom">
                    <span className="gb-card-lbl">Total Outstanding</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="gb-sec">
              <h2 className="gb-sec-title">Quick Actions</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn primary full"
                  style={{ background: '#0b665c', borderRadius: '10px' }}
                  onClick={exportCSV}
                >
                  📥 Download All Members CSV
                </button>
                <button
                  type="button"
                  className="btn full"
                  style={{ borderRadius: '10px' }}
                  onClick={() => window.print()}
                >
                  🖨️ Print Summary
                </button>
              </div>
            </section>
          </>
        )}

        {/* Financial Collections */}
        {reportType === 'financial' && (
          <section className="gb-sec">
            <h2 className="gb-sec-title">Revenue & Dues Breakdown</h2>
            <div className="gb-card" style={{ padding: '16px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span className="muted small">Total Memberships:</span>
                <b>{summary.totalMembers}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span className="muted small">Gross Billings:</span>
                <b>{formatMoney(summary.totalRevenue)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span className="muted small">Amount Collected:</span>
                <b style={{ color: 'var(--success)' }}>{formatMoney(summary.totalCollected)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted small">Pending Dues:</span>
                <b style={{ color: 'var(--danger)' }}>{formatMoney(summary.totalDue)}</b>
              </div>
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '14px 0 8px' }}>
              Members with Pending Dues ({members.filter((m) => dueAmount(m) > 0).length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {members
                .filter((m) => dueAmount(m) > 0)
                .slice(0, 15)
                .map((m) => (
                  <div
                    key={m.id}
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <b style={{ fontSize: '14px' }}>{m.name}</b>
                      <span className="muted xs block">{m.phone || 'No phone'} · {m.plan || 'Standard'}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge red font-mono">{formatMoney(dueAmount(m))} due</span>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Attendance Reports */}
        {reportType === 'attendance' && (
          <section className="gb-sec">
            <h2 className="gb-sec-title">Attendance Activity ({currentMonthYear})</h2>
            <div className="gb-grid-2" style={{ marginBottom: '14px' }}>
              <div className="gb-card">
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{summary.monthlyCheckins}</span>
                  <span className="gb-card-icon teal">📅</span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Monthly Check-ins</span>
                </div>
              </div>
              <div className="gb-card">
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{summary.uniqueAttended}</span>
                  <span className="gb-card-icon teal">👤</span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Unique Members</span>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '14px 0 8px' }}>
              Recent Check-in Log
            </h3>
            {attendanceLogs.length === 0 ? (
              <div className="card empty" style={{ textAlign: 'center', padding: '24px 12px' }}>
                No attendance logs found yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {attendanceLogs.slice(0, 20).map((l) => (
                  <div
                    key={l.id}
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <b style={{ fontSize: '14px' }}>{l.memberName}</b>
                      <span className="muted xs block">{l.plan} · {l.memberPhone}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="font-mono" style={{ fontSize: '12px', fontWeight: 600 }}>{l.date}</span>
                      <span className="muted xs block">{l.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
