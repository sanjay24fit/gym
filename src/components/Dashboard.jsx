import { useState, useMemo } from 'react'
import {
  dueAmount,
  formatDate,
  formatMoney,
  membershipStatus,
  daysLeft,
  hasPersonalTrainer,
  isMemberBlocked,
  isBirthdayToday,
  getAdmissionFee,
  today,
} from '../lib/utils'
import {
  getTodayCheckins,
  getMonthAttendanceStats,
  markMemberAttendance,
  removeAttendanceLog,
} from '../lib/attendance'

export default function Dashboard({ members = [], onOpen, onAction, gymName, gymId = 'default' }) {
  const [subTab, setSubTab] = useState('membership') // 'membership' | 'payments' | 'attendance'
  const [timeFilter, setTimeFilter] = useState('this-month') // 'this-month' | 'last-month' | 'last-3' | 'custom'
  const [attendanceSearch, setAttendanceSearch] = useState('')
  const [attendanceNotice, setAttendanceNotice] = useState('')

  // Date formatting helpers
  const now = new Date()
  const todayFormattedDate = now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) // e.g. "26 Oct 2026"
  const currentMonthYear = now.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  }) // e.g. "October 2026"
  const shortMonthYear = now.toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  }) // e.g. "Oct 2026"
  const currentYear = now.getFullYear()
  const financialSummaryRange = `${currentYear}-01 to ${today().slice(0, 7)}`

  // Attendance stats
  const todayCheckins = useMemo(() => getTodayCheckins(gymId), [gymId, subTab])
  const monthAttendance = useMemo(() => getMonthAttendanceStats(gymId), [gymId, subTab])

  // Categorize members
  const stats = useMemo(() => {
    let todayExpiryCount = 0
    let ptTodayExpiryCount = 0
    let birthdayTodayCount = 0

    let exp1to3 = 0
    let exp4to7 = 0
    let exp8to15 = 0

    let expAgo1to3 = 0
    let expAgo4to7 = 0

    let ptExp1to3 = 0
    let ptExp4to7 = 0
    let ptExp8to15 = 0

    let activeCount = 0
    let expiredCount = 0
    let blockedCount = 0

    let activePtCount = 0
    let expiredPtCount = 0
    let totalPtCount = 0

    let totalCollected = 0
    let totalDue = 0
    let ptDue = 0
    let totalAdmission = 0

    members.forEach((m) => {
      const left = daysLeft(m.end_date)
      const isPT = hasPersonalTrainer(m)
      const isBlocked = isMemberBlocked(m)
      const due = dueAmount(m)
      const paid = Number(m.paid_amount || 0)
      const admission = getAdmissionFee(m)

      totalCollected += paid
      totalDue += due
      totalAdmission += admission
      if (isPT) {
        totalPtCount++
        ptDue += due
      }

      if (isBlocked) {
        blockedCount++
      }

      if (left >= 0) {
        activeCount++
        if (isPT) activePtCount++
      } else {
        expiredCount++
        if (isPT) expiredPtCount++
      }

      if (isBirthdayToday(m)) {
        birthdayTodayCount++
      }

      // Today expiry
      if (left === 0) {
        todayExpiryCount++
        if (isPT) ptTodayExpiryCount++
      }

      // Membership expiry ahead
      if (left >= 1 && left <= 3) exp1to3++
      if (left >= 4 && left <= 7) exp4to7++
      if (left >= 8 && left <= 15) exp8to15++

      // PT expiry ahead
      if (isPT) {
        if (left >= 1 && left <= 3) ptExp1to3++
        if (left >= 4 && left <= 7) ptExp4to7++
        if (left >= 8 && left <= 15) ptExp8to15++
      }

      // Recently expired
      if (left < 0) {
        const daysAgo = Math.abs(left)
        if (daysAgo >= 1 && daysAgo <= 3) expAgo1to3++
        if (daysAgo >= 4 && daysAgo <= 7) expAgo4to7++
      }
    })

    return {
      todayAttendance: todayCheckins.length,
      birthdayTodayCount,
      todayExpiryCount,
      ptTodayExpiryCount,
      monthlyCheckins: monthAttendance.totalCheckins,
      uniqueMonthlyAttended: monthAttendance.uniqueMembers,
      exp1to3,
      exp4to7,
      exp8to15,
      expAgo1to3,
      expAgo4to7,
      ptExp1to3,
      ptExp4to7,
      ptExp8to15,
      activeCount,
      expiredCount,
      totalCount: members.length,
      blockedCount,
      activePtCount,
      expiredPtCount,
      totalPtCount,
      totalCollected,
      totalDue,
      ptDue,
      totalAdmission,
    }
  }, [members, todayCheckins, monthAttendance])

  // Handle Quick Attendance
  function handleMarkAttendance(member) {
    const res = markMemberAttendance(gymId, member)
    if (res.alreadyMarked) {
      setAttendanceNotice(`${member.name} is already checked in today!`)
    } else {
      setAttendanceNotice(`✓ Attendance marked for ${member.name}`)
    }
    setTimeout(() => setAttendanceNotice(''), 3000)
  }

  // Filter members for attendance marking
  const attendanceFilteredMembers = useMemo(() => {
    if (!attendanceSearch.trim()) return members.slice(0, 8)
    const q = attendanceSearch.toLowerCase()
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q))
    ).slice(0, 10)
  }, [members, attendanceSearch])

  return (
    <div className="gymbook-dash-wrap">
      {/* 1. Header with Teal Background */}
      <header className="gymbook-header">
        <div className="gymbook-header-left">
          <button
            type="button"
            className="gymbook-icon-btn"
            title="Menu"
            aria-label="Menu"
            onClick={() => onAction && onAction('menu')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 className="gymbook-header-title">Dashboard</h1>
        </div>
      </header>

      {/* 2. Subtabs Bar: Membership | Payments | Attendance */}
      <div className="gymbook-subtabs-bar">
        <button
          type="button"
          className={`gymbook-subtab-btn ${subTab === 'membership' ? 'active' : ''}`}
          onClick={() => setSubTab('membership')}
        >
          Membership
        </button>
        <button
          type="button"
          className={`gymbook-subtab-btn ${subTab === 'payments' ? 'active' : ''}`}
          onClick={() => setSubTab('payments')}
        >
          Payments
        </button>
        <button
          type="button"
          className={`gymbook-subtab-btn ${subTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setSubTab('attendance')}
        >
          Attendance
        </button>
      </div>

      <div className="gymbook-subtext">Tap the card for additional information.</div>

      {/* ======================================================== */}
      {/* SUBTAB 1: MEMBERSHIP (Sequence matches screenshots 2, 3, 4) */}
      {/* ======================================================== */}
      {subTab === 'membership' && (
        <div className="gymbook-sections-flow">
          {/* Section 1: Today – {Date} */}
          <section className="gb-sec">
            <h2 className="gb-sec-title">Today – {todayFormattedDate}</h2>
            <div className="gb-grid-2">
              {/* Card 1: Attendance */}
              <div
                className="gb-card pointer"
                onClick={() => setSubTab('attendance')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{stats.todayAttendance}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Attendance</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* Card 2: Janamdin */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('birthday')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{stats.birthdayTodayCount}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
                      <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
                      <path d="M2 21h20" />
                      <line x1="12" y1="11" x2="12" y2="7" />
                      <path d="M12 4a1.5 1.5 0 0 1 0 3 1.5 1.5 0 0 1 0-3z" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Janamdin</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* Card 3: Aaj Khatam */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('expiring-today')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val red">{stats.todayExpiryCount}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="12" y1="10" x2="12" y2="14" />
                      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Aaj Khatam</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* Card 4: PT Plan Expiring Today */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('pt-expiring-today')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val red">{stats.ptTodayExpiryCount}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="12" y1="10" x2="12" y2="14" />
                      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">PT Plan Expiring Today</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Attendance – {Month Year} */}
          <section className="gb-sec">
            <h2 className="gb-sec-title">Attendance – {currentMonthYear}</h2>
            <div className="gb-grid-2">
              {/* Monthly Check-ins */}
              <div
                className="gb-card pointer"
                onClick={() => setSubTab('attendance')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{stats.monthlyCheckins}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Monthly Check-ins</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* Unique Members Attended */}
              <div
                className="gb-card pointer"
                onClick={() => setSubTab('attendance')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{stats.uniqueMonthlyAttended}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Unique Members Attended</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Membership Expiry */}
          <section className="gb-sec">
            <h2 className="gb-sec-title">Membership Expiry</h2>
            <div className="gb-grid-2">
              {/* 1-3 Din Mein Khatam */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('expiring-1-3')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{stats.exp1to3}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">1-3 Din Mein Khatam</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* 4-7 Din Mein Khatam */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('expiring-4-7')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{stats.exp4to7}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">4-7 Din Mein Khatam</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* 8-15 Din Mein Khatam */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('expiring-8-15')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{stats.exp8to15}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">8-15 Din Mein Khatam</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Membership Recently Expired */}
          <section className="gb-sec">
            <h2 className="gb-sec-title">Membership Recently Expired</h2>
            <div className="gb-grid-2">
              {/* 1-3 Din Pehle Khatam */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('expired-1-3')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val red">{stats.expAgo1to3}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="18" y1="8" x2="23" y2="13" />
                      <line x1="23" y1="8" x2="18" y2="13" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">1-3 Din Pehle Khatam</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* 4-7 Din Pehle Khatam */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('expired-4-7')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val red">{stats.expAgo4to7}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="18" y1="8" x2="23" y2="13" />
                      <line x1="23" y1="8" x2="18" y2="13" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">4-7 Din Pehle Khatam</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: PT Plan Expiry */}
          <section className="gb-sec">
            <h2 className="gb-sec-title">PT Plan Expiry</h2>
            <div className="gb-grid-2">
              {/* Expiring (1-3d) */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('pt-expiring-1-3')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{stats.ptExp1to3}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Expiring (1–3d)</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* Expiring (4-7d) */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('pt-expiring-4-7')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{stats.ptExp4to7}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Expiring (4–7d)</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* Expiring (8-15d) */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('pt-expiring-8-15')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{stats.ptExp8to15}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Expiring (8–15d)</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: Membership Overview */}
          <section className="gb-sec">
            <h2 className="gb-sec-title">Membership Overview</h2>
            <div className="gb-grid-2">
              {/* Active Members */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('active')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{stats.activeCount}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <polyline points="17 11 19 13 23 9" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Active Members</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* Expired Members */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('expired')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val red">{stats.expiredCount}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="18" y1="8" x2="23" y2="13" />
                      <line x1="23" y1="8" x2="18" y2="13" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Expired Members</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* Total Members */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('all')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{stats.totalCount}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Total Members</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* Block Members */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('blocked')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val red">{stats.blockedCount}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Block Members</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 7: PT Plan Overview */}
          <section className="gb-sec">
            <h2 className="gb-sec-title">PT Plan Overview</h2>
            <div className="gb-grid-2">
              {/* Active PT Plans */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('pt-active')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{stats.activePtCount}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <polyline points="17 11 19 13 23 9" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Active PT Plans</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* Expired PT Plans */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('pt-expired')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val red">{stats.expiredPtCount}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="18" y1="8" x2="23" y2="13" />
                      <line x1="23" y1="8" x2="18" y2="13" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Expired PT Plans</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* Total PT Plans */}
              <div
                className="gb-card pointer"
                onClick={() => onOpen('pt')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{stats.totalPtCount}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Total PT Plans</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 2: PAYMENTS (Sequence matches screenshot 5) */}
      {/* ======================================================== */}
      {subTab === 'payments' && (
        <div className="gymbook-sections-flow">
          {/* Section 1: Today's Collection – {Date} */}
          <section className="gb-sec">
            <h2 className="gb-sec-title">Today's Collection – {todayFormattedDate}</h2>
            <div
              className="gb-card-banner pointer"
              onClick={() => onAction && onAction('payments')}
            >
              <div className="gb-banner-top">
                <span className="gb-card-val teal large">{formatMoney(0)}</span>
                <span className="gb-card-icon teal">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <circle cx="12" cy="12" r="2" />
                    <path d="M6 12h.01M18 12h.01" />
                  </svg>
                </span>
              </div>
              <div className="gb-banner-bottom">
                <span className="gb-banner-lbl">Aaj ka Membership Collected</span>
                <span className="gb-card-chevron">›</span>
              </div>
            </div>
          </section>

          {/* Section 2: {Month Year} with filters */}
          <section className="gb-sec">
            <h2 className="gb-sec-title">{shortMonthYear}</h2>
            <div className="gb-filter-pills-row">
              <button
                type="button"
                className={`gb-filter-pill ${timeFilter === 'this-month' ? 'active' : ''}`}
                onClick={() => setTimeFilter('this-month')}
              >
                This Month
              </button>
              <button
                type="button"
                className={`gb-filter-pill ${timeFilter === 'last-month' ? 'active' : ''}`}
                onClick={() => setTimeFilter('last-month')}
              >
                Last Month
              </button>
              <button
                type="button"
                className={`gb-filter-pill ${timeFilter === 'last-3' ? 'active' : ''}`}
                onClick={() => setTimeFilter('last-3')}
              >
                Last 3 Mont...
              </button>
              <button
                type="button"
                className={`gb-filter-pill ${timeFilter === 'custom' ? 'active' : ''}`}
                onClick={() => setTimeFilter('custom')}
              >
                Custom
              </button>
            </div>

            <div className="gb-grid-2">
              {/* 1. Admission Fees */}
              <div className="gb-card pointer" onClick={() => onAction && onAction('payments')}>
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{formatMoney(stats.totalAdmission)}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="2" y="6" width="20" height="12" rx="2" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Admission Fees</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* 2. Membership Collected */}
              <div className="gb-card pointer" onClick={() => onAction && onAction('payments')}>
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{formatMoney(stats.totalCollected)}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="2" y="6" width="20" height="12" rx="2" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Membership Collected</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* 3. Membership Due */}
              <div
                className={`gb-card pointer ${stats.totalDue > 0 ? 'highlight-due' : ''}`}
                onClick={() => onOpen('due')}
              >
                <div className="gb-card-top">
                  <span className="gb-card-val red bold">{formatMoney(stats.totalDue)}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <line x1="16" y1="12" x2="16.01" y2="12" strokeWidth="3" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Membership Due</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* 4. PT Due */}
              <div className="gb-card pointer" onClick={() => onOpen('due')}>
                <div className="gb-card-top">
                  <span className="gb-card-val red">{formatMoney(stats.ptDue)}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <line x1="16" y1="12" x2="16.01" y2="12" strokeWidth="3" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">PT Due</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* 5. Service Paid */}
              <div className="gb-card pointer" onClick={() => onAction && onAction('payments')}>
                <div className="gb-card-top">
                  <span className="gb-card-val teal">{formatMoney(0)}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="2" y="6" width="20" height="12" rx="2" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Service Paid</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* 6. Service Due */}
              <div className="gb-card pointer" onClick={() => onOpen('due')}>
                <div className="gb-card-top">
                  <span className="gb-card-val red">{formatMoney(0)}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Service Due</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>

              {/* 7. Expense */}
              <div className="gb-card pointer" onClick={() => onAction && onAction('payments')}>
                <div className="gb-card-top">
                  <span className="gb-card-val red">{formatMoney(0)}</span>
                  <span className="gb-card-icon teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="2" y="6" width="20" height="12" rx="2" />
                      <path d="M12 9v6" />
                    </svg>
                  </span>
                </div>
                <div className="gb-card-bottom">
                  <span className="gb-card-lbl">Expense</span>
                  <span className="gb-card-chevron">›</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Financial Summary */}
          <section className="gb-sec">
            <h2 className="gb-sec-title">Financial Summary – {financialSummaryRange}</h2>
            <div className="gb-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span className="muted small">Total Fee Revenue:</span>
                <b>{formatMoney(stats.totalCollected + stats.totalDue)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span className="muted small">Net Collected:</span>
                <b style={{ color: 'var(--success)' }}>{formatMoney(stats.totalCollected)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted small">Pending Collection:</span>
                <b style={{ color: 'var(--danger)' }}>{formatMoney(stats.totalDue)}</b>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 3: ATTENDANCE */}
      {/* ======================================================== */}
      {subTab === 'attendance' && (
        <div className="gymbook-sections-flow">
          <section className="gb-sec">
            <h2 className="gb-sec-title">Mark Member Attendance</h2>
            {attendanceNotice && (
              <div style={{ background: '#e6fffa', color: '#00796b', padding: '10px 14px', borderRadius: '10px', marginBottom: '12px', fontSize: '13px', fontWeight: 600 }}>
                {attendanceNotice}
              </div>
            )}
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Search member name or phone to mark check-in…"
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1px solid var(--border)' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {attendanceFilteredMembers.map((m) => {
                const isCheckedIn = todayCheckins.some((c) => c.memberId === m.id)
                return (
                  <div
                    key={m.id}
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <b style={{ fontSize: '14px', display: 'block' }}>{m.name}</b>
                      <span className="muted xs">{m.phone || 'No phone'} · {m.plan || 'Standard'}</span>
                    </div>
                    {isCheckedIn ? (
                      <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✓ Checked In
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn sm primary"
                        style={{ background: '#0b665c', borderRadius: '8px', padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleMarkAttendance(m)}
                      >
                        Check In
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Today's Checkin Logs */}
          <section className="gb-sec">
            <h2 className="gb-sec-title">Today's Check-ins ({todayCheckins.length})</h2>
            {todayCheckins.length === 0 ? (
              <div className="card empty" style={{ textAlign: 'center', padding: '24px 12px' }}>
                No members checked in yet today. Tap "Check In" above or use "Record Attendance".
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {todayCheckins.map((log) => (
                  <div
                    key={log.id}
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
                      <b style={{ fontSize: '14px' }}>{log.memberName}</b>
                      <span className="muted xs block">{log.time} · {log.plan}</span>
                    </div>
                    <button
                      type="button"
                      className="link"
                      style={{ color: 'var(--danger)', fontSize: '12px' }}
                      onClick={() => removeAttendanceLog(gymId, log.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Floating Action Button: Record Attendance */}
      <button
        type="button"
        className="gb-fab-btn"
        onClick={() => setSubTab('attendance')}
        title="Record Member Attendance"
      >
        <span style={{ fontSize: '15px' }}>📋</span>
        <span>Record Attendance</span>
      </button>
    </div>
  )
}
