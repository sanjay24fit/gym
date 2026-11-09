import { useState } from 'react'
import { formatDate } from '../../lib/utils'

export default function MemberAttendanceTab({ attendance = {}, gym: _gym }) {
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0) // 0 = current month, -1 = last month

  const now = new Date()
  const displayDate = new Date(now.getFullYear(), now.getMonth() + selectedMonthOffset, 1)
  const year = displayDate.getFullYear()
  const month = displayDate.getMonth()

  const monthName = displayDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  // Days in month calculation
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0 = Sunday

  // Attendance history mapped by date string "YYYY-MM-DD"
  const historyMap = {}
  if (attendance?.history && Array.isArray(attendance.history)) {
    attendance.history.forEach((item) => {
      if (item.date) {
        historyMap[item.date] = item
      }
    })
  }

  const totalThisMonth = attendance?.total_this_month || 0
  const attendanceRate = attendance?.attendance_percentage || 0

  const todayIso = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* ==============================================================
          A. ATTENDANCE METRICS OVERVIEW
      ============================================================== */}
      <div className="card">
        <h2 style={{ margin: '0 0 14px', fontSize: '18px', fontWeight: 800 }}>
          Attendance Tracking
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div
            style={{
              padding: '14px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.03) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              textAlign: 'center',
            }}
          >
            <span className="muted small block" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Attended This Month
            </span>
            <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--success, #10b981)', margin: '4px 0 2px' }}>
              {totalThisMonth} <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--muted)' }}>Days</span>
            </div>
            <span className="xs muted">Official desk check-ins</span>
          </div>

          <div
            style={{
              padding: '14px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(79, 70, 229, 0.03) 100%)',
              border: '1px solid rgba(79, 70, 229, 0.25)',
              textAlign: 'center',
            }}
          >
            <span className="muted small block" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Consistency Rate
            </span>
            <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--accent, #4f46e5)', margin: '4px 0 2px' }}>
              {attendanceRate}%
            </div>
            <span className="xs muted">Monthly workout frequency</span>
          </div>
        </div>
      </div>

      {/* ==============================================================
          B. MONTHLY CALENDAR GRID
      ============================================================== */}
      <div className="card">
        {/* Month Selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <b style={{ fontSize: '16px' }}>{monthName}</b>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="btn sm"
              onClick={() => setSelectedMonthOffset((v) => v - 1)}
              disabled={selectedMonthOffset <= -3}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              ← Prev
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={() => setSelectedMonthOffset((v) => v + 1)}
              disabled={selectedMonthOffset >= 0}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Weekday Labels */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--muted)',
            marginBottom: '6px',
          }}
        >
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Calendar Day Cells */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px',
          }}
        >
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} style={{ height: '38px' }} />
          ))}

          {/* Days in Month */}
          {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
            const dayNum = idx + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
            const isToday = dateStr === todayIso
            const isFuture = new Date(year, month, dayNum) > now
            const checkIn = historyMap[dateStr]
            const isPresent = checkIn && checkIn.status === 'present'

            let bg = 'var(--bg-subtle, rgba(0,0,0,0.02))'
            let border = '1px solid var(--border)'
            let textColor = 'var(--text)'

            if (isPresent) {
              bg = 'rgba(16, 185, 129, 0.18)'
              border = '1.5px solid #10b981'
              textColor = '#059669'
            } else if (isToday) {
              border = '1.5px solid var(--accent, #4f46e5)'
            } else if (isFuture) {
              textColor = 'var(--muted-light, #9ca3af)'
              border = '1px dashed var(--border)'
            }

            return (
              <div
                key={dayNum}
                title={isPresent ? `Checked in: ${dateStr}` : dateStr}
                style={{
                  height: '38px',
                  borderRadius: '10px',
                  background: bg,
                  border: border,
                  color: textColor,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: isPresent || isToday ? 800 : 500,
                  position: 'relative',
                }}
              >
                <span>{dayNum}</span>
                {isPresent && (
                  <span style={{ fontSize: '8px', lineHeight: 1, marginTop: '1px' }}>✓</span>
                )}
                {isToday && !isPresent && (
                  <span style={{ fontSize: '6px', color: 'var(--accent)' }}>●</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            marginTop: '14px',
            fontSize: '11px',
            color: 'var(--muted)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981' }} />
            Present
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', border: '1.5px solid var(--accent)' }} />
            Today
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--bg-subtle)' }} />
            No Record
          </span>
        </div>
      </div>

      {/* ==============================================================
          C. RECENT CHECK-IN HISTORY
      ============================================================== */}
      <div className="card">
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>
          Recent Check-in Logs
        </h3>

        {!attendance?.history || attendance.history.length === 0 ? (
          <div className="empty" style={{ padding: '24px 12px', textAlign: 'center' }}>
            <p className="muted small" style={{ margin: 0 }}>
              No check-in history recorded yet. Show your Digital QR Pass at the gym desk for attendance!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {attendance.history.slice(0, 10).map((log, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: 'var(--bg-subtle, rgba(0,0,0,0.02))',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '13px',
                    }}
                  >
                    ✓
                  </span>
                  <div>
                    <b style={{ fontSize: '13px' }}>{formatDate(log.date)}</b>
                    <span className="muted xs block">
                      {log.time ? new Date(log.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Gym Desk Check-in'}
                    </span>
                  </div>
                </div>

                <span className="badge green" style={{ fontSize: '11px' }}>
                  Verified
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
