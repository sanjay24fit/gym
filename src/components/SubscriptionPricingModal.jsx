import { useState, useEffect } from 'react'
import { initiateSubscriptionPayment, getRazorpayMeUrl } from '../lib/razorpay'
import { formatDate } from '../lib/utils'

const SUBSCRIPTION_PLANS = [
  {
    id: 'monthly',
    name: 'Monthly Plan',
    tagline: 'Standard Monthly Billing',
    badge: 'Standard Plan',
    price: 1,
    originalPrice: null,
    savingsText: null,
    durationDays: 30,
    durationText: '1 Month (30 Days)',
    monthlyEquivalent: '₹1 / month',
    features: [
      'Unlimited Gym Members & Directory',
      'AI Paper Register Notebook Scanner',
      'Automated Expiry & Fee Dues Tracking',
      'WhatsApp Payment Reminder Alerts',
      'Digital Member Passes with QR Code',
    ],
  },
  {
    id: 'half_yearly',
    name: 'Half-Yearly Plan',
    tagline: 'Most Chosen by Gym Owners',
    badge: '⭐ MOST POPULAR',
    savingsBadge: 'Save ₹495 (16% OFF)',
    isPopular: true,
    price: 2499,
    originalPrice: 2994,
    savingsText: 'Save ₹495 compared to monthly',
    durationDays: 180,
    durationText: '6 Months (180 Days)',
    monthlyEquivalent: '₹416 / month',
    features: [
      'All Monthly Plan Features Included',
      '180 Days Continuous Uninterrupted Access',
      'Save ₹495 over 6 Months',
      'Priority WhatsApp Support & Onboarding',
      'City Gym Directory Ranking Boost',
    ],
  },
  {
    id: 'yearly',
    name: 'Yearly Plan',
    tagline: 'Maximum Savings & Full Year Peace of Mind',
    badge: '👑 BEST VALUE',
    savingsBadge: 'Save ₹1,489 (25% OFF)',
    isBestValue: true,
    price: 4499,
    originalPrice: 5988,
    savingsText: 'Save ₹1,489 compared to monthly',
    durationDays: 365,
    durationText: '12 Months (365 Days)',
    monthlyEquivalent: '₹375 / month',
    features: [
      'All 6-Month Features Included',
      'Full 1-Year Price Lock & Protection',
      'Save ₹1,489 (Best Possible Discount)',
      'Custom Gym Logo & Theme Assistance',
      'Dedicated VIP Support from Gym Manager',
    ],
  },
]

export default function SubscriptionPricingModal({
  gym,
  userEmail,
  initialPlanId = 'half_yearly',
  startAtCheckout = false,
  onClose,
  onSuccess,
}) {
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId)
  const [step, setStep] = useState(startAtCheckout ? 'checkout' : 'select_plan') // 'select_plan' | 'checkout' | 'success'
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('razorpay') // 'razorpay' | 'upi'
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [isOnlineUnavailable, setIsOnlineUnavailable] = useState(false)
  const [paySuccessData, setPaySuccessData] = useState(null)
  const [copiedUpi, setCopiedUpi] = useState(false)

  const selectedPlan =
    SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId) || SUBSCRIPTION_PLANS[1]

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !paying) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, paying])

  // Handle Online Razorpay Payment
  const handleRazorpayPay = async () => {
    setPayError('')
    setPaying(true)

    await initiateSubscriptionPayment({
      gym,
      userEmail,
      amount: selectedPlan.price,
      planDays: selectedPlan.durationDays,
      planId: selectedPlan.id,
      planTitle: selectedPlan.name,
      onSuccess: (data) => {
        setPaying(false)
        setPaySuccessData(data)
        setStep('success')
        if (onSuccess) onSuccess(data)
      },
      onError: (errMsg, meta) => {
        setPaying(false)
        const isUnavailable =
          Boolean(meta?.isConfigIssue) ||
          errMsg?.toLowerCase().includes('unavailable') ||
          errMsg?.toLowerCase().includes('temporarily')

        if (isUnavailable) {
          setIsOnlineUnavailable(true)
          setSelectedPaymentMethod('upi')
          setPayError('Online payment is temporarily unavailable. Please use the Direct UPI / QR option below.')
        } else {
          setPayError(errMsg || 'Payment initiation failed. Please try again or use Direct UPI.')
        }
      },
    })
  }

  const handleCopyUpi = () => {
    try {
      navigator.clipboard.writeText('gymmanagerapk@razorpay')
      setCopiedUpi(true)
      setTimeout(() => setCopiedUpi(false), 2500)
    } catch {
      // Fallback
    }
  }

  const whatsappMessage = encodeURIComponent(
    `Hello Gym Manager Support, I have made a direct UPI payment of ₹${selectedPlan.price.toLocaleString(
      'en-IN'
    )} for the ${selectedPlan.name} (${selectedPlan.durationText}) for my gym: ${
      gym?.gym_name || 'My Gym'
    } (Phone: ${gym?.phone || ''}). Please verify and activate.`
  )

  return (
    <div
      className="modal-backdrop pricing-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !paying) onClose()
      }}
    >
      <div
        className="modal pricing-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Subscription Renewal Plans"
      >
        {/* Header */}
        <div className="pricing-modal-head">
          <div className="pricing-modal-title-group">
            <div className="pricing-crown-icon" aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
              </svg>
            </div>
            <div>
              <h3 className="pricing-modal-title">
                {step === 'checkout'
                  ? 'Complete Your Payment'
                  : 'Upgrade Your Gym Manager Plan'}
              </h3>
              <p className="pricing-modal-sub">
                {step === 'checkout'
                  ? 'Your selected subscription plan is ready for payment.'
                  : 'Select a plan that fits your gym. Unlock unlimited members, automated WhatsApp dues reminders, and register scanning.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn pricing-close-btn"
            onClick={onClose}
            disabled={paying}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* STEP 1: SUCCESS SCREEN */}
        {step === 'success' && paySuccessData && (
          <div className="pricing-success-screen">
            <div className="pricing-success-badge" aria-hidden="true">
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={{ margin: '8px 0 4px', fontSize: '20px', fontWeight: 800 }}>
              Subscription Activated! 🎉
            </h3>
            <p className="muted small" style={{ maxWidth: '420px', margin: '0 auto 16px' }}>
              {paySuccessData.message ||
                'Payment confirmed! Your Gym Manager subscription has been extended successfully.'}
            </p>

            <div className="pricing-success-card">
              <div className="pricing-success-row">
                <span>Gym Name</span>
                <b>{gym?.gym_name || 'Your Gym'}</b>
              </div>
              <div className="pricing-success-row">
                <span>Plan Activated</span>
                <b>
                  {selectedPlan.name} ({selectedPlan.durationText})
                </b>
              </div>
              {paySuccessData.valid_until && (
                <div className="pricing-success-row highlight">
                  <span>New Valid Until</span>
                  <b>{formatDate(paySuccessData.valid_until)}</b>
                </div>
              )}
              {paySuccessData.payment_id && (
                <div className="pricing-success-row">
                  <span>Payment Ref</span>
                  <span className="mono">{paySuccessData.payment_id}</span>
                </div>
              )}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn primary"
                onClick={onClose}
                style={{ minWidth: '160px', padding: '10px 24px', fontWeight: 700 }}
              >
                Done / Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CHECKOUT SCREEN ("Complete Your Payment") */}
        {step === 'checkout' && (
          <div className="checkout-step-container">
            {/* Top Navigation */}
            <div className="checkout-top-nav">
              <button
                type="button"
                className="checkout-back-btn"
                onClick={() => {
                  setPayError('')
                  setStep('select_plan')
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Change Plan</span>
              </button>

              <div className="checkout-security-pill">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Secure Checkout</span>
              </div>
            </div>

            {/* Selected Plan Hero Card */}
            <div className="checkout-selected-plan-card">
              <div className="checkout-plan-info">
                <span className="checkout-plan-tag">Selected Plan</span>
                <h4 className="checkout-plan-name">
                  {selectedPlan.name} ({selectedPlan.durationText})
                </h4>
                <div className="checkout-plan-meta">
                  <span>{selectedPlan.monthlyEquivalent}</span>
                  {selectedPlan.savingsBadge && (
                    <span className="checkout-plan-savings">
                      · {selectedPlan.savingsBadge}
                    </span>
                  )}
                </div>
              </div>

              <div className="checkout-plan-price-box">
                <span className="checkout-price-amount">
                  ₹{selectedPlan.price.toLocaleString('en-IN')}
                </span>
                <span className="checkout-price-tax">Total Payable</span>
              </div>
            </div>

            {/* Error / Unavailable Notification */}
            {(isOnlineUnavailable || payError) && (
              <div
                className="checkout-unavailable-alert"
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>
                    {payError ||
                      'Online payment is temporarily unavailable. Please use the Direct UPI / QR option.'}
                  </span>
                </div>
                {selectedPaymentMethod !== 'upi' && (
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => {
                      setPayError('')
                      setSelectedPaymentMethod('upi')
                    }}
                    style={{
                      whiteSpace: 'nowrap',
                      fontSize: '12px',
                      padding: '5px 12px',
                      fontWeight: 700,
                    }}
                  >
                    Use Direct UPI →
                  </button>
                )}
              </div>
            )}

            {/* Payment Methods Section */}
            <div className="checkout-methods-section">
              <span className="checkout-methods-title">Choose Payment Method</span>

              {/* Option 1: Razorpay Payment */}
              <div
                className={`checkout-method-card ${
                  selectedPaymentMethod === 'razorpay' ? 'active' : ''
                }`}
                onClick={() => {
                  setPayError('')
                  setSelectedPaymentMethod('razorpay')
                }}
                role="radio"
                aria-checked={selectedPaymentMethod === 'razorpay'}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    setPayError('')
                    setSelectedPaymentMethod('razorpay')
                  }
                }}
              >
                <div className="checkout-method-head">
                  <div className="checkout-method-left">
                    <div className="checkout-radio-circle">
                      <div className="checkout-radio-dot" />
                    </div>
                    <div className="checkout-method-icon-wrap">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </div>
                    <div className="checkout-method-text">
                      <div className="checkout-method-title-row">
                        <span className="checkout-method-title">
                          Pay Online with Razorpay
                        </span>
                        {isOnlineUnavailable ? (
                          <span
                            className="checkout-rec-pill"
                            style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' }}
                          >
                            Offline
                          </span>
                        ) : (
                          <span className="checkout-rec-pill">Recommended</span>
                        )}
                      </div>
                      <span className="checkout-method-sub">
                        {isOnlineUnavailable
                          ? 'Gateway currently offline. Please use the Direct UPI / QR option below.'
                          : 'Secure online payment (Cards, UPI, Netbanking, Wallets)'}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedPaymentMethod === 'razorpay' && (
                  <div className="checkout-method-panel">
                    {isOnlineUnavailable ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span className="small muted" style={{ fontSize: '12.5px' }}>
                          ⚠️ Online gateway credentials are not yet linked. You can pay directly via UPI / QR:
                        </span>
                        <button
                          type="button"
                          className="btn primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPayError('')
                            setSelectedPaymentMethod('upi')
                          }}
                          style={{
                            padding: '11px 18px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>Switch to Direct UPI / QR Payment (₹{selectedPlan.price.toLocaleString('en-IN')}) →</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRazorpayPay()
                        }}
                        disabled={paying}
                        style={{
                          padding: '12px 20px',
                          fontWeight: 700,
                          fontSize: '14.5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          width: '100%',
                        }}
                      >
                        {paying ? (
                          <>
                            <div
                              className="spinner"
                              style={{
                                width: '16px',
                                height: '16px',
                                border: '2px solid rgba(255,255,255,0.3)',
                                borderTopColor: '#fff',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                              }}
                            />
                            <span>Connecting to Secure Razorpay…</span>
                          </>
                        ) : (
                          <>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <span>
                              Pay ₹{selectedPlan.price.toLocaleString('en-IN')} Securely with
                              Razorpay
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Option 2: Direct UPI / QR Payment */}
              <div
                className={`checkout-method-card ${
                  selectedPaymentMethod === 'upi' ? 'active' : ''
                }`}
                onClick={() => {
                  setSelectedPaymentMethod('upi')
                }}
                role="radio"
                aria-checked={selectedPaymentMethod === 'upi'}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    setSelectedPaymentMethod('upi')
                  }
                }}
              >
                <div className="checkout-method-head">
                  <div className="checkout-method-left">
                    <div className="checkout-radio-circle">
                      <div className="checkout-radio-dot" />
                    </div>
                    <div className="checkout-method-icon-wrap">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                    </div>
                    <div className="checkout-method-text">
                      <div className="checkout-method-title-row">
                        <span className="checkout-method-title">
                          Direct UPI / QR Payment
                        </span>
                      </div>
                      <span className="checkout-method-sub">
                        Pay directly using UPI or QR code (Google Pay, PhonePe, Paytm, BHIM)
                      </span>
                    </div>
                  </div>
                </div>

                {selectedPaymentMethod === 'upi' && (
                  <div className="checkout-method-panel">
                    <div className="checkout-upi-box">
                      <div className="checkout-upi-id-row">
                        <div className="checkout-upi-badge">
                          <span className="small muted">Verified UPI ID:</span>
                          <code>gymmanagerapk@razorpay</code>
                        </div>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyUpi()
                          }}
                          style={{ minWidth: '95px' }}
                        >
                          {copiedUpi ? 'Copied! ✓' : 'Copy UPI'}
                        </button>
                      </div>

                      <div className="checkout-upi-actions-row">
                        <a
                          href={getRazorpayMeUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="checkout-upi-page-btn"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Open Razorpay UPI Page</span>
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                          >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>

                        <a
                          href={`https://wa.me/919509525838?text=${whatsappMessage}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="checkout-whatsapp-btn"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>💬 Confirm via WhatsApp</span>
                        </a>
                      </div>

                      <p className="checkout-upi-tip">
                        💡 <b>Instructions:</b> Enter{' '}
                        <b>₹{selectedPlan.price.toLocaleString('en-IN')}</b> on the payment
                        screen. Your subscription will be activated automatically once the
                        payment is verified.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pricing-trust-footer">
              <span>🔒 256-bit Encrypted SSL · Verified Gateway · Instant Account Renewal</span>
            </div>
          </div>
        )}

        {/* STEP 3: PLAN SELECTION GRID */}
        {step === 'select_plan' && (
          <>
            {/* 3 Pricing Cards Grid */}
            <div className="pricing-cards-grid">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isSelected = plan.id === selectedPlanId
                return (
                  <div
                    key={plan.id}
                    className={`pricing-card ${plan.isPopular ? 'popular' : ''} ${
                      plan.isBestValue ? 'best-value' : ''
                    } ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedPlanId(plan.id)}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') setSelectedPlanId(plan.id)
                    }}
                  >
                    {/* Top Floating Badge */}
                    <div className="pricing-card-top-pill">
                      {plan.isPopular ? (
                        <span className="pricing-pill popular">{plan.badge}</span>
                      ) : plan.isBestValue ? (
                        <span className="pricing-pill best-value">{plan.badge}</span>
                      ) : (
                        <span className="pricing-pill standard">{plan.badge}</span>
                      )}
                    </div>

                    <div className="pricing-card-header">
                      <div className="pricing-card-radio" aria-hidden="true">
                        <div className={`radio-dot ${isSelected ? 'active' : ''}`} />
                      </div>
                      <div>
                        <h4 className="pricing-plan-name">{plan.name}</h4>
                        <span className="pricing-plan-tagline">{plan.durationText}</span>
                      </div>
                    </div>

                    {/* Price Section */}
                    <div className="pricing-price-box">
                      {plan.originalPrice && (
                        <div className="pricing-original-row">
                          <span className="pricing-original-price">
                            ₹{plan.originalPrice.toLocaleString('en-IN')}
                          </span>
                          {plan.savingsBadge && (
                            <span className="pricing-savings-pill">
                              {plan.savingsBadge}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="pricing-amount-row">
                        <span className="pricing-currency">₹</span>
                        <span className="pricing-amount">
                          {plan.price.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="pricing-monthly-rate">
                        <span>
                          Equivalent to <b>{plan.monthlyEquivalent}</b>
                        </span>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="pricing-features-wrap">
                      <span className="pricing-features-title">What's included:</span>
                      <ul className="pricing-features-list">
                        {plan.features.map((feat, i) => (
                          <li key={i}>
                            <svg
                              className="feat-check-icon"
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Selection Indicator button */}
                    <div className="pricing-select-btn-wrap">
                      <button
                        type="button"
                        className={`pricing-select-btn ${isSelected ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedPlanId(plan.id)
                        }}
                      >
                        {isSelected ? '✓ Selected Plan' : 'Select Plan'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bottom Checkout Action Bar */}
            <div className="pricing-checkout-bar">
              <div className="pricing-checkout-summary">
                <span className="pricing-checkout-label">Selected Plan:</span>
                <b className="pricing-checkout-plan">
                  {selectedPlan.name} ({selectedPlan.durationText})
                </b>
                <span className="pricing-checkout-total">
                  Total Payable: <b>₹{selectedPlan.price.toLocaleString('en-IN')}</b>
                  {selectedPlan.savingsText && (
                    <span className="pricing-checkout-savings">
                      {' '}
                      · {selectedPlan.savingsText}
                    </span>
                  )}
                </span>
              </div>

              <div className="pricing-checkout-actions">
                <button
                  type="button"
                  className="btn primary pricing-pay-btn"
                  onClick={() => {
                    setPayError('')
                    setStep('checkout')
                  }}
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  <span>
                    Proceed to Payment (₹{selectedPlan.price.toLocaleString('en-IN')})
                  </span>
                </button>
              </div>
            </div>

            {/* Direct UPI accordion preview */}
            <div className="pricing-direct-upi-box">
              <button
                type="button"
                className="pricing-upi-toggle-btn"
                onClick={() => {
                  setSelectedPaymentMethod('upi')
                  setStep('checkout')
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <span style={{ fontWeight: 600 }}>Prefer Direct UPI / QR Code Payment?</span>
                </div>
                <span className="small muted" style={{ fontSize: '12px' }}>
                  Choose UPI Payment Option →
                </span>
              </button>
            </div>

            <div className="pricing-trust-footer">
              <span>🔒 256-bit Encrypted SSL · Verified Razorpay Gateway · Instant Activation</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
