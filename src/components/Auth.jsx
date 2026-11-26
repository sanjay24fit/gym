import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import WhatsAppSupport from './WhatsAppSupport'
import GymLogo from './GymLogo'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import { GYM_IMAGES } from '../lib/assets'
import { lookupMemberPortal, normalizePhone } from '../lib/memberPortal'
import { validateEmailAddress } from '../lib/emailValidation'
import { sendMobileOtp } from '../lib/smsService'
import { getDeviceInfo } from '../lib/deviceDetect'
import { useLanguage } from '../lib/language'
import {
  sendMemberEmailOtp,
  verifyMemberEmailOtp,
  checkMemberEmailEligible,
  normalizeMemberEmail,
  isValidEmailFormat,
} from '../lib/memberAuth'

export default function Auth({ onDownloadApp, isInstalled, onMemberLogin, initialPhone = '' }) {
  const [deviceInfo] = useState(() => getDeviceInfo())

  // True standalone mode check: only hide install button when already running inside installed standalone PWA
  const isStandalone = typeof window !== 'undefined' && Boolean(
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )

  // App Language Support
  const langContext = useLanguage()
  const currentLanguage = langContext?.currentLanguage || 'en'
  const isHindi = currentLanguage === 'hi'
  const isHinglish = currentLanguage === 'hinglish'

  // Primary Role Selection: 'owner' vs 'member'
  const [role, setRole] = useState(() => (initialPhone ? 'member' : 'owner'))

  // Sub-modes for Owner
  const [ownerMode, setOwnerMode] = useState('login') // 'login' | 'signup' | 'forgot'

  // Owner Form State
  const [form, setForm] = useState({
    email: '',
    password: '',
    gym_name: '',
    owner_name: '',
    phone: '',
    city: 'Udaipur',
    state: 'Rajasthan',
    pincode: '',
    area: '',
  })

  // Member Email OTP Authentication State
  const [memberEmail, setMemberEmail] = useState('')
  const [memberOtpStep, setMemberOtpStep] = useState(false)
  const [memberOtpCode, setMemberOtpCode] = useState('')
  const [memberOtpTimer, setMemberOtpTimer] = useState(0)
  const [availableMemberships, setAvailableMemberships] = useState([])

  // Owner Email OTP Verification State (blocks fake & unverified emails)
  const [otpStep, setOtpStep] = useState(false)
  const [otpEmail, setOtpEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [resendingOtp, setResendingOtp] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Resend Countdown Timer for Owner Email OTP
  useEffect(() => {
    if (otpTimer <= 0) return
    const interval = setInterval(() => {
      setOtpTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [otpTimer])

  // Resend Countdown Timer for Member Mobile OTP
  useEffect(() => {
    if (memberOtpTimer <= 0) return
    const interval = setInterval(() => {
      setMemberOtpTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [memberOtpTimer])

  const set = (k) => (e) => {
    const val = e.target.value
    setForm({ ...form, [k]: val })
  }

  const friendly = (msg) => {
    if (!msg) return ''
    if (msg === 'Invalid login credentials') return 'Incorrect email or password'
    if (/email not confirmed/i.test(msg)) {
      if (isHindi) return 'आपका ईमेल अभी सत्यापित नहीं हुआ है। कृपया अपना जीमेल चेक करें।'
      if (isHinglish) return 'Aapka email abhi verify nahi hua hai. Kripya apna Gmail check karein aur verification link/code confirm karein.'
      return 'Your email address is not verified yet. Please check your Gmail to confirm the verification link.'
    }
    if (/rate limit/i.test(msg)) return 'Too many attempts. Please wait a while and try again.'
    if (/already registered/i.test(msg)) return 'An account with this email already exists. Please login.'
    if (/user not found/i.test(msg)) return 'No account found with this email address.'
    if (/token has expired or is invalid/i.test(msg)) return 'Invalid or expired verification code. Please check your Gmail.'
    return msg
  }

  // ==========================================================================
  // GYM MEMBER: SEND 6-DIGIT EMAIL OTP VIA SUPABASE AUTH
  // ==========================================================================
  const handleSendMemberEmailOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')
    setInfo('')

    const cleanEmail = normalizeMemberEmail(memberEmail)
    if (!isValidEmailFormat(cleanEmail)) {
      setError(
        isHindi
          ? 'कृपया एक वैध ईमेल पता दर्ज करें (उदा. member@gmail.com)।'
          : isHinglish
          ? 'Kripya ek valid email address enter karein (e.g. member@gmail.com).'
          : 'Please enter a valid email address (e.g. member@gmail.com).'
      )
      return
    }

    setLoading(true)
    try {
      // 1. Strict pre-flight check in database: must be registered in an active gym's member list!
      const elRes = await checkMemberEmailEligible(cleanEmail)
      if (!elRes.eligible) {
        setError(
          elRes.error || (
            isHindi
              ? `यह ईमेल (${cleanEmail}) किसी भी जिम में पंजीकृत नहीं है। कृपया अपने जिम ओनर से संपर्क करें।`
              : isHinglish
              ? `Yeh email (${cleanEmail}) kisi bhi Gym me registered nahi hai. Kripya apne gym owner se kahein ki wo aapko member list me add karein.`
              : `This email address (${cleanEmail}) is not registered with any Gym. Please contact your gym owner to add you as a member.`
          )
        )
        setLoading(false)
        return
      }

      // 2. Dispatch 6-digit OTP using Supabase Auth signInWithOtp
      const otpRes = await sendMemberEmailOtp(cleanEmail)
      if (otpRes.success) {
        setMemberOtpStep(true)
        setMemberOtpTimer(60)
        setMemberOtpCode('')
        setInfo(
          isHindi
            ? `✓ 6-अंकों का सत्यापन OTP ${cleanEmail} पर भेज दिया गया है। कृपया अपना इनबॉक्स चेक करें।`
            : isHinglish
            ? `✓ 6-Digit OTP verification code ${cleanEmail} par bhej diya gaya hai. Kripya apna Gmail / Inbox check karein.`
            : `✓ 6-Digit OTP verification code sent to ${cleanEmail}. Please check your email inbox.`
        )
      } else {
        setError(otpRes.error || 'Failed to dispatch email verification OTP.')
      }
    } catch (err) {
      setError(err.message || 'Email authentication service error.')
    } finally {
      setLoading(false)
    }
  }

  // ==========================================================================
  // GYM MEMBER: VERIFY EMAIL OTP AND OPEN MEMBER DASHBOARD
  // ==========================================================================
  const handleVerifyMemberEmailOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')
    setInfo('')

    if (!memberOtpCode || memberOtpCode.trim().length < 6) {
      setError(
        isHindi
          ? 'कृपया ईमेल पर प्राप्त 6-अंकों का OTP कोड दर्ज करें।'
          : 'Please enter the 6-digit verification code received on your email.'
      )
      return
    }

    setLoading(true)
    try {
      const cleanEmail = normalizeMemberEmail(memberEmail)
      const res = await verifyMemberEmailOtp(cleanEmail, memberOtpCode.trim())

      if (!res.success) {
        setError(res.error || 'Invalid or expired verification code.')
        setLoading(false)
        return
      }

      const memberships = res.memberships || []
      if (memberships.length === 1) {
        setInfo(
          isHindi
            ? `✓ सत्यापित! ${memberships[0].gym?.gym_name || 'Gym'} से कनेक्ट हो रहा है…`
            : `✓ OTP Verified! Connecting to ${memberships[0].gym?.gym_name || 'Gym'}…`
        )
        setTimeout(() => {
          onMemberLogin(memberships[0])
        }, 300)
      } else if (memberships.length > 1) {
        setAvailableMemberships(memberships)
        setInfo(
          isHindi
            ? 'इस ईमेल पर कई जिम सदस्यताएं मिली हैं। कृपया अपना जिम चुनें:'
            : isHinglish
            ? 'Is email par multiple gym memberships mili hain. Kripya apna gym select karein:'
            : 'Multiple gym memberships found for this email. Please select your gym:'
        )
      } else {
        setError('No active gym membership found for this email.')
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Resend Member Email OTP
  const handleResendMemberEmailOtp = async () => {
    if (memberOtpTimer > 0) return
    setError('')
    setInfo('')
    const cleanEmail = normalizeMemberEmail(memberEmail)
    const otpRes = await sendMemberEmailOtp(cleanEmail)
    if (otpRes.success) {
      setMemberOtpTimer(60)
      setMemberOtpCode('')
      setInfo(
        isHindi
          ? `✓ नया 6-अंकों का OTP ${cleanEmail} पर भेज दिया गया है।`
          : isHinglish
          ? `✓ Naya 6-digit OTP ${cleanEmail} par bhej diya gaya hai.`
          : `✓ A new 6-digit OTP code has been sent to ${cleanEmail}.`
      )
    } else {
      setError(otpRes.error || 'Failed to resend OTP.')
    }
  }

  // ==========================================================================
  // GYM OWNER: SUBMIT LOGIN / REGISTER / FORGOT
  // ==========================================================================
  async function handleOwnerSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    // CASE 1: Forgot Password
    if (ownerMode === 'forgot') {
      const emailToReset = form.email.trim()
      if (!emailToReset) {
        setError('Please enter your registered email address.')
        setLoading(false)
        return
      }

      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(emailToReset, {
        redirectTo: redirectUrl,
      })

      if (resetErr) {
        setError(friendly(resetErr.message))
      } else {
        setInfo('Password reset link sent! Please check your email inbox and click the link to set your new password.')
      }
      setLoading(false)
      return
    }

    // CASE 2: Gym Owner Login
    if (ownerMode === 'login') {
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      })
      if (loginErr) setError(friendly(loginErr.message))
      setLoading(false)
      return
    }

    // CASE 3: Gym Owner Registration
    if (ownerMode === 'signup') {
      const cleanCity = (form.city || 'Udaipur').trim()
      const cleanState = (form.state || 'Rajasthan').trim()
      const cleanPincode = (form.pincode || '').trim()

      if (!cleanCity) {
        setError('Please enter your Gym City.')
        setLoading(false)
        return
      }

      // Pre-flight strict email verification & domain MX existence check
      const emailCheck = await validateEmailAddress(form.email)
      if (!emailCheck.valid) {
        setError(emailCheck.error)
        setLoading(false)
        return
      }

      const { data, error: signupErr } = await supabase.auth.signUp({
        email: emailCheck.email,
        password: form.password,
        options: {
          data: {
            role: 'owner',
            gym_name: form.gym_name.trim(),
            owner_name: form.owner_name.trim(),
            phone: form.phone.trim(),
            city: cleanCity,
            state: cleanState,
            pincode: cleanPincode,
            area: form.area.trim(),
          },
        },
      })
      if (signupErr) {
        setError(friendly(signupErr.message))
      } else if (data.user?.identities?.length === 0) {
        setError(friendly('already registered'))
      } else if (!data.session) {
        // Email verification required by Supabase
        setOtpEmail(emailCheck.email)
        setOtpStep(true)
        setOtpTimer(60)
        setInfo(`Verification code sent to ${emailCheck.email}! Please enter the 6-digit code below.`)
      }
      setLoading(false)
      return
    }
  }

  // Verify Owner 6-digit Email Confirmation Code
  const handleVerifyEmailOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!otpCode || otpCode.trim().length < 6) {
      setError('Please enter the 6-digit verification code sent to your email.')
      return
    }
    setError('')
    setInfo('')
    setVerifyingOtp(true)
    try {
      const { data: vData, error: vErr } = await supabase.auth.verifyOtp({
        email: otpEmail.trim(),
        token: otpCode.trim(),
        type: 'signup',
      })

      if (vErr) {
        setError(friendly(vErr.message) || 'Invalid or expired verification code. Please check your Gmail.')
      } else if (vData.session) {
        setInfo('Email verified successfully! Logging you in…')
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.')
    } finally {
      setVerifyingOtp(false)
    }
  }

  // Resend Owner Email Verification Code
  const handleResendEmailOtp = async () => {
    if (otpTimer > 0) return
    setError('')
    setInfo('')
    setResendingOtp(true)
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: otpEmail.trim(),
      })
      if (resendErr) {
        setError(friendly(resendErr.message))
      } else {
        setInfo(`Verification code resent to ${otpEmail}! Please check your inbox and spam folder.`)
        setOtpTimer(60)
      }
    } finally {
      setResendingOtp(false)
    }
  }

  const isOwnerForgot = role === 'owner' && ownerMode === 'forgot'

  return (
    <div className="center-page">
      <div className="auth-theme-bar">
        <LanguageToggle size="sm" />
        <ThemeToggle size="sm" showLabel />
      </div>

      <div className="card auth-card" style={{ maxWidth: '440px', width: '100%', padding: '0 0 28px', overflow: 'hidden' }}>
        {/* Premium Gym Hero Visual Header */}
        <div style={{ position: 'relative', height: '120px', width: '100%', overflow: 'hidden', background: 'linear-gradient(135deg, #FF6200 0%, #E63900 100%)' }}>
          <img
            src={GYM_IMAGES.authGymInterior}
            alt="Gym Interior"
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }}
            loading="lazy"
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255, 98, 0, 0.35) 0%, var(--card) 100%)' }} />
          <div style={{ position: 'absolute', bottom: '6px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
            <GymLogo size={52} />
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '2px' }}>
            <h1 style={{ fontSize: '21px', margin: '0 0 4px', fontWeight: 800 }}>
              {role === 'owner'
                ? otpStep
                  ? 'Email Verification'
                  : isOwnerForgot
                  ? 'Reset Password'
                  : 'Gym Manager · Owner'
                : memberOtpStep
                ? 'Mobile OTP Verification'
                : 'Gym Manager · Member'}
            </h1>
            <p className="muted small" style={{ margin: 0 }}>
              {role === 'owner'
                ? otpStep
                  ? 'Confirm your genuine email address to activate your gym'
                  : isOwnerForgot
                  ? 'Enter your registered email to receive a password reset link'
                  : 'Smart management portal for gym owners'
                : memberOtpStep
                ? `Enter 6-digit code received on +91 ${normalizePhone(memberPhone)}`
                : 'Enter your registered mobile number to access your gym pass'}
            </p>
          </div>

          {/* Mobile App Install Button */}
          {!isStandalone && onDownloadApp && !isOwnerForgot && !otpStep && (
            <div style={{ textAlign: 'center', margin: '2px 0 6px' }}>
              <button
                type="button"
                className="btn-download-app"
                onClick={onDownloadApp}
                title="Install Gym Manager App"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>
                  {deviceInfo.isIOS
                    ? 'Install on iPhone'
                    : 'Install App'}
                </span>
              </button>
            </div>
          )}

          {/* Primary Role Selector (Gym Owner vs Gym Member) */}
          {!isOwnerForgot && !otpStep && (
            <div
              className="tabs"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                marginBottom: '4px',
                padding: '3px',
                background: 'var(--bg-subtle, rgba(0,0,0,0.04))',
                borderRadius: '12px',
              }}
            >
              <button
                type="button"
                className={role === 'owner' ? 'active' : ''}
                onClick={() => {
                  setError('')
                  setInfo('')
                  setRole('owner')
                }}
                style={{ fontWeight: 700, fontSize: '13px', padding: '9px 4px', borderRadius: '9px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
                </svg>
                <span>Gym Owner</span>
              </button>
              <button
                type="button"
                className={role === 'member' ? 'active' : ''}
                onClick={() => {
                  setError('')
                  setInfo('')
                  setRole('member')
                  setMemberOtpStep(false)
                }}
                style={{ fontWeight: 700, fontSize: '13px', padding: '9px 4px', borderRadius: '9px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Gym Member</span>
              </button>
            </div>
          )}

          {/* ==============================================================
              SECTION 1: GYM MEMBER (Registered Email + 6-Digit Email OTP)
          ============================================================== */}
          {role === 'member' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!memberOtpStep ? (
                /* STEP 1: Enter Registered Email Address */
                <form onSubmit={handleSendMemberEmailOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ marginTop: '2px' }}>
                    <span style={{ fontWeight: 600 }}>Registered Email Address *</span>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: '12px',
                          color: 'var(--primary, #FF6200)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                      </span>
                      <input
                        required
                        type="email"
                        autoFocus
                        placeholder="member@gmail.com"
                        value={memberEmail}
                        onChange={(e) => {
                          setMemberEmail(e.target.value)
                          setError('')
                          setInfo('')
                        }}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                        style={{
                          paddingLeft: '40px',
                          fontSize: '15px',
                          fontWeight: 600,
                        }}
                      />
                    </div>
                    <span className="muted small" style={{ display: 'block', marginTop: '5px', lineHeight: 1.4 }}>
                      {isHindi
                        ? 'अपने जिम में पंजीकृत ईमेल पता दर्ज करें। लॉगिन के लिए 6-अंकों का OTP भेजा जाएगा।'
                        : isHinglish
                        ? 'Apne gym me registered email address enter karein. Login ke liye 6-digit OTP code bhej diya jayega.'
                        : 'Enter the email address registered with your gym. A 6-digit verification OTP will be sent to log in.'}
                    </span>
                  </label>

                  {error && <div className="alert error">{error}</div>}
                  {info && <div className="alert info">{info}</div>}

                  {/* Send Email OTP Button */}
                  <button
                    type="submit"
                    className="btn primary full"
                    disabled={loading || !memberEmail || !memberEmail.includes('@')}
                    style={{ padding: '11px', marginTop: '4px', fontWeight: 700 }}
                  >
                    {loading
                      ? (isHindi ? 'OTP भेजा जा रहा है…' : 'Sending OTP…')
                      : (isHindi ? 'ईमेल OTP प्राप्त करें →' : isHinglish ? 'Send Email OTP →' : 'Send Verification OTP →')}
                  </button>
                </form>
              ) : (
                /* STEP 2: Enter 6-digit OTP received via Email */
                <form onSubmit={handleVerifyMemberEmailOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text)' }}>
                      OTP sent to <b className="font-mono">{normalizeMemberEmail(memberEmail)}</b>
                    </span>
                    <button
                      type="button"
                      className="link"
                      onClick={() => {
                        setMemberOtpStep(false)
                        setMemberOtpCode('')
                        setError('')
                        setInfo('')
                      }}
                      style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}
                    >
                      Change Email
                    </button>
                  </div>

                  {/* 6-Digit OTP Input */}
                  <label>
                    <span style={{ fontWeight: 600 }}>Enter 6-Digit Email OTP *</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoFocus
                      placeholder="• • • • • •"
                      value={memberOtpCode}
                      onChange={(e) => setMemberOtpCode(e.target.value.replace(/\D/g, ''))}
                      style={{
                        textAlign: 'center',
                        fontSize: '22px',
                        letterSpacing: '8px',
                        fontWeight: 800,
                        padding: '10px',
                        marginTop: '4px',
                        fontFamily: 'monospace, system-ui',
                      }}
                    />
                  </label>

                  {/* Resend Timer & Security Notice */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <button
                      type="button"
                      className="link"
                      onClick={handleResendMemberEmailOtp}
                      disabled={memberOtpTimer > 0 || loading}
                      style={{
                        color: memberOtpTimer > 0 ? 'var(--text-secondary)' : 'var(--primary)',
                        fontWeight: 700,
                      }}
                    >
                      {memberOtpTimer > 0 ? `Resend OTP (${memberOtpTimer}s)` : 'Resend Email OTP'}
                    </button>

                    <span className="muted small" style={{ fontSize: '11px' }}>
                      Valid for 5 mins
                    </span>
                  </div>

                  {error && <div className="alert error">{error}</div>}
                  {info && <div className="alert info">{info}</div>}

                  <button
                    type="submit"
                    className="btn primary full"
                    disabled={loading || memberOtpCode.length < 6}
                    style={{ padding: '11px', marginTop: '4px', fontWeight: 700 }}
                  >
                    {loading ? 'Verifying OTP…' : 'Verify OTP & Open Dashboard →'}
                  </button>
                </form>
              )}

              {/* Multiple Gym Memberships Picker (if member is enrolled in multiple gyms under this email) */}
              {availableMemberships.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>
                    Select your Gym ({availableMemberships.length} memberships):
                  </span>
                  {availableMemberships.map((item) => (
                    <button
                      key={item.member?.id || item.gym?.id}
                      type="button"
                      className="btn full"
                      onClick={() => onMemberLogin(item)}
                      style={{
                        textAlign: 'left',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: 'var(--card-subtle)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <b style={{ display: 'block', fontSize: '14px' }}>{item.gym?.gym_name || 'Gym'}</b>
                        <span className="muted small">
                          {item.gym?.area ? `${item.gym.area}, ` : ''}{item.gym?.city || ''} · {item.member?.plan} ({item.member?.facility})
                        </span>
                      </div>
                      <span style={{ fontSize: '18px', color: 'var(--primary)' }}>→</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==============================================================
              SECTION 2: GYM OWNER (Owner Login / Register Gym / Forgot)
          ============================================================== */}
          {role === 'owner' && (
            <>
              {/* Owner Email OTP Verification Screen */}
              {otpStep ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '6px 0' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '52px',
                        height: '52px',
                        borderRadius: '16px',
                        background: 'rgba(255, 98, 0, 0.12)',
                        color: 'var(--primary, #FF6200)',
                        margin: '0 auto 8px',
                      }}
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </div>
                    <h2 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>
                      Verify Owner Email Address
                    </h2>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      We sent a 6-digit verification code to <b style={{ color: 'var(--text)' }}>{otpEmail}</b>. Please check your Gmail inbox and enter the code below.
                    </p>
                  </div>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>6-Digit Verification Code *</span>
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      placeholder="• • • • • •"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      style={{
                        textAlign: 'center',
                        fontSize: '22px',
                        letterSpacing: '8px',
                        fontWeight: 800,
                        padding: '10px',
                      }}
                    />
                  </label>

                  {error && <div className="alert error">{error}</div>}
                  {info && <div className="alert info">{info}</div>}

                  <button
                    type="button"
                    className="btn primary full"
                    onClick={handleVerifyEmailOtp}
                    disabled={verifyingOtp || otpCode.length < 6}
                    style={{ padding: '11px' }}
                  >
                    {verifyingOtp ? 'Verifying Code…' : 'Verify & Activate Gym'}
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="link"
                      onClick={() => {
                        setOtpStep(false)
                        setError('')
                        setInfo('')
                      }}
                      style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}
                    >
                      ← Back to Registration
                    </button>

                    <button
                      type="button"
                      className="link"
                      onClick={handleResendEmailOtp}
                      disabled={otpTimer > 0 || resendingOtp}
                      style={{
                        color: otpTimer > 0 ? 'var(--text-secondary)' : 'var(--primary)',
                        fontWeight: 700,
                        fontSize: '12.5px',
                      }}
                    >
                      {resendingOtp ? 'Resending…' : otpTimer > 0 ? `Resend Code (${otpTimer}s)` : 'Resend Code'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Owner Standard Login / Signup Forms */
                <form onSubmit={handleOwnerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {!isOwnerForgot && (
                    <div className="tabs" style={{ margin: '2px 0 6px', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                      <button
                        type="button"
                        className={ownerMode === 'login' ? 'active' : ''}
                        onClick={() => {
                          setError('')
                          setInfo('')
                          setOwnerMode('login')
                        }}
                        style={{ fontSize: '12px', padding: '7px 4px' }}
                      >
                        Owner Login
                      </button>
                      <button
                        type="button"
                        className={ownerMode === 'signup' ? 'active' : ''}
                        onClick={() => {
                          setError('')
                          setInfo('')
                          setOwnerMode('signup')
                        }}
                        style={{ fontSize: '12px', padding: '7px 4px' }}
                      >
                        Register Gym
                      </button>
                    </div>
                  )}

                  {/* Owner Signup Fields */}
                  {ownerMode === 'signup' && (
                    <>
                      <label>Gym Name *<input required value={form.gym_name} placeholder="e.g. Iron Fitness Club" onChange={set('gym_name')} /></label>
                      <label>Owner Name *<input required value={form.owner_name} placeholder="e.g. Rahul Sharma" onChange={set('owner_name')} /></label>
                      <label>Mobile Number *<input required type="tel" value={form.phone} placeholder="10-digit mobile number" onChange={set('phone')} /></label>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <label style={{ margin: 0 }}>
                          City *
                          <input required value={form.city} placeholder="e.g. Udaipur" onChange={set('city')} />
                        </label>
                        <label style={{ margin: 0 }}>
                          State *
                          <input required value={form.state} placeholder="e.g. Rajasthan" onChange={set('state')} />
                        </label>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <label style={{ margin: 0 }}>
                          PIN Code *
                          <input required type="text" maxLength={6} value={form.pincode} placeholder="e.g. 313001" onChange={set('pincode')} />
                        </label>
                        <label style={{ margin: 0 }}>
                          Area / Locality
                          <input value={form.area} placeholder="e.g. Hiran Magri" onChange={set('area')} />
                        </label>
                      </div>
                    </>
                  )}

                  {/* Email & Password */}
                  <label>
                    Email Address *
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      placeholder="owner@gym.com"
                      value={form.email}
                      onChange={set('email')}
                    />
                  </label>

                  {!isOwnerForgot && (
                    <label>
                      Password *
                      <div style={{ position: 'relative' }}>
                        <input
                          required
                          type={showPassword ? 'text' : 'password'}
                          minLength={6}
                          placeholder="••••••••"
                          value={form.password}
                          onChange={set('password')}
                          style={{ paddingRight: '38px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {showPassword ? (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </label>
                  )}

                  {/* Forgot Password Link */}
                  {!isOwnerForgot && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px', marginBottom: '4px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setError('')
                          setInfo('')
                          setOwnerMode('forgot')
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '2px 0',
                          color: 'var(--accent, #2563eb)',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {error && <div className="alert error">{error}</div>}
                  {info && <div className="alert info">{info}</div>}

                  <button className="btn primary full" style={{ marginTop: '4px', padding: '11px' }} disabled={loading}>
                    {loading
                      ? 'Processing…'
                      : isOwnerForgot
                      ? 'Send Password Reset Link'
                      : ownerMode === 'login'
                      ? 'Sign In as Owner'
                      : 'Register Gym (21-Day Free Trial)'}
                  </button>

                  {isOwnerForgot && (
                    <button
                      type="button"
                      className="btn full"
                      style={{ marginTop: '6px', padding: '10px' }}
                      disabled={loading}
                      onClick={() => {
                        setError('')
                        setInfo('')
                        setOwnerMode('login')
                      }}
                    >
                      ← Back to Owner Login
                    </button>
                  )}

                  {ownerMode === 'signup' && (
                    <p className="muted small" style={{ textAlign: 'center', margin: '4px 0 0' }}>
                      Activates automatically with a 21-day free trial. Gym Connection Code is generated immediately.
                    </p>
                  )}
                </form>
              )}
            </>
          )}

          <div className="auth-support" style={{ marginTop: '10px', textAlign: 'center' }}>
            <WhatsAppSupport variant="link" label="Need assistance? WhatsApp Support" />
          </div>
        </div>
      </div>
    </div>
  )
}
