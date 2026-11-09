import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import Modal from './Modal'

export default function MemberQRCode({ value, label = 'Scan for Gym Pass Check-in', size = 130 }) {
  const [dataUrl, setDataUrl] = useState('')
  const [showEnlarged, setShowEnlarged] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!value) return

    QRCode.toDataURL(value, {
      margin: 1,
      width: size * 2,
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch((err) => {
        console.warn('QR code generation error:', err)
      })

    return () => {
      cancelled = true
    }
  }, [value, size])

  if (!dataUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
        }}
      >
        Loading QR…
      </div>
    )
  }

  return (
    <>
      <div
        className="member-qr-wrapper"
        onClick={() => setShowEnlarged(true)}
        title="Tap to enlarge QR code for check-in"
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: '#FFFFFF',
          padding: '8px',
          borderRadius: '14px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          cursor: 'pointer',
          transition: 'transform 0.15s ease',
        }}
      >
        <img
          src={dataUrl}
          alt="Gym Membership QR Pass"
          width={size}
          height={size}
          style={{ display: 'block', borderRadius: '6px' }}
        />
        <span
          style={{
            fontSize: '10px',
            color: '#4B5563',
            marginTop: '4px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Tap to Enlarge
        </span>
      </div>

      {showEnlarged && (
        <Modal title="Digital Gym Entry Pass" onClose={() => setShowEnlarged(false)}>
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div
              style={{
                display: 'inline-block',
                background: '#FFFFFF',
                padding: '16px',
                borderRadius: '18px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                marginBottom: '14px',
              }}
            >
              <img
                src={dataUrl}
                alt="Enlarged Gym QR Code"
                width={240}
                height={240}
                style={{ display: 'block' }}
              />
            </div>
            <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: '15px' }}>{label}</p>
            <p className="muted small" style={{ margin: 0 }}>
              Show this QR code at the gym reception desk for digital attendance & entry pass verification.
            </p>
          </div>
        </Modal>
      )}
    </>
  )
}

