import { useState, useRef, useEffect } from 'react'
import Modal from './Modal'
import { createWorker } from 'tesseract.js'
import { preprocessImage } from '../lib/imagePreprocessor'
import { parseNotebookText } from '../lib/ocrParser'
import { PLANS, planEndDate, today, formatMoney, formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'

export default function NotebookScanner({ existingMembers = [], onImportSuccess, onClose }) {
  // Steps: 'select' | 'preview' | 'ocr' | 'review' | 'imported'
  const [step, setStep] = useState('select')

  // Image source & adjustments
  const [rawImageSrc, setRawImageSrc] = useState(null)
  const [adjustedImageSrc, setAdjustedImageSrc] = useState(null)
  const [rotation, setRotation] = useState(0)
  const [grayscale, setGrayscale] = useState(true)
  const [contrast, setContrast] = useState(1.2)
  const [cropBox, setCropBox] = useState({ top: 0, bottom: 0, left: 0, right: 0 })

  // Live Camera state
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef(null)
  const mediaStreamRef = useRef(null)

  // OCR state
  const [ocrStatus, setOcrStatus] = useState('')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [rawOcrText, setRawOcrText] = useState('')
  const workerRef = useRef(null)

  // Records state
  const [records, setRecords] = useState([])
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState(null)
  const [generalError, setGeneralError] = useState('')

  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
      if (workerRef.current) {
        workerRef.current.terminate().catch(() => {})
      }
      if (rawImageSrc && rawImageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(rawImageSrc)
      }
    }
  }, [rawImageSrc])

  // Stop WebRTC live camera
  function stopCamera() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }
    setCameraActive(false)
  }

  // Start live WebRTC camera
  async function startLiveCamera() {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
        audio: false,
      })
      mediaStreamRef.current = stream
      setCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.warn('Camera stream error:', err)
      setCameraError('Camera access was denied or is not supported. Please choose "Upload Image" or use your device camera file picker.')
    }
  }

  // Capture snapshot from live WebRTC camera
  function captureLivePhoto() {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    stopCamera()
    loadSelectedImage(dataUrl)
  }

  // Load an image file from input
  function handleFileSelected(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    loadSelectedImage(url)
  }

  function loadSelectedImage(src) {
    setRawImageSrc(src)
    setRotation(0)
    setCropBox({ top: 0, bottom: 0, left: 0, right: 0 })
    setGeneralError('')
    setStep('preview')
  }

  // Re-run image adjustments whenever rotation, grayscale, or contrast changes
  useEffect(() => {
    if (!rawImageSrc || step !== 'preview') return

    let cancelled = false
    const cropPercent = {
      xPercent: cropBox.left,
      yPercent: cropBox.top,
      widthPercent: Math.max(10, 100 - cropBox.left - cropBox.right),
      heightPercent: Math.max(10, 100 - cropBox.top - cropBox.bottom),
    }

    preprocessImage(rawImageSrc, {
      rotation,
      grayscale,
      contrast,
      crop: cropPercent,
      maxDimension: 1920,
    })
      .then((processed) => {
        if (!cancelled) setAdjustedImageSrc(processed)
      })
      .catch((err) => {
        console.error('Preprocessing error:', err)
      })

    return () => {
      cancelled = true
    }
  }, [rawImageSrc, rotation, grayscale, contrast, cropBox, step])

  // Run On-Device Tesseract OCR
  async function runOCR() {
    setStep('ocr')
    setOcrProgress(0)
    setOcrStatus('Initializing local OCR engine…')
    setGeneralError('')

    const imageToScan = adjustedImageSrc || rawImageSrc

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrStatus(`Recognizing text… (${Math.round((m.progress || 0) * 100)}%)`)
            setOcrProgress(Math.round((m.progress || 0) * 100))
          } else if (m.status) {
            setOcrStatus(`${m.status}…`)
          }
        },
      })
      workerRef.current = worker

      const { data } = await worker.recognize(imageToScan)
      const text = data?.text || ''
      setRawOcrText(text)

      await worker.terminate()
      workerRef.current = null

      if (!text.trim()) {
        setOcrStatus('No text recognized')
        setRecords([])
      } else {
        const parsed = parseNotebookText(text)
        setRecords(
          parsed.map((r, idx) => ({
            ...r,
            tempId: Date.now() + '_' + idx,
            selected: true,
          }))
        )
      }
      setStep('review')
    } catch (err) {
      console.error('OCR Error:', err)
      setGeneralError('OCR processing encountered an issue: ' + (err.message || 'Unknown error'))
      setStep('preview')
    }
  }

  // Handle re-parsing if user edits raw OCR text
  function handleReparseRawText() {
    if (!rawOcrText.trim()) return
    const parsed = parseNotebookText(rawOcrText)
    setRecords(
      parsed.map((r, idx) => ({
        ...r,
        tempId: Date.now() + '_' + idx,
        selected: true,
      }))
    )
  }

  // Record modification handlers
  function updateRecord(tempId, key, value) {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.tempId !== tempId) return r
        const updated = { ...r, [key]: value }

        // Recalculate end_date if plan or start_date changes and it's a standard plan
        if (key === 'plan' || key === 'start_date') {
          const planObj = PLANS.find((p) => p.label === (key === 'plan' ? value : r.plan))
          if (planObj && updated.start_date) {
            updated.end_date = planEndDate(updated.start_date, planObj.months)
          }
        }
        return updated
      })
    )
  }

  function toggleSelectRecord(tempId) {
    setRecords((prev) => prev.map((r) => (r.tempId === tempId ? { ...r, selected: !r.selected } : r)))
  }

  function removeRecord(tempId) {
    setRecords((prev) => prev.filter((r) => r.tempId !== tempId))
  }

  function addEmptyRecord() {
    const start = today()
    setRecords((prev) => [
      ...prev,
      {
        tempId: Date.now() + '_' + Math.random(),
        name: '',
        phone: '',
        plan: '1 Month',
        start_date: start,
        end_date: planEndDate(start, 1),
        total_fee: '',
        paid_amount: '',
        notes: '',
        selected: true,
        detectedFields: {},
      },
    ])
  }

  // Record validation
  function validateRecord(r) {
    const errors = []
    if (!r.name || !r.name.trim()) {
      errors.push('Name is required')
    }
    if (r.phone && !/^\d{10}$/.test(r.phone.replace(/[\s-]/g, ''))) {
      errors.push('Mobile must be 10 digits')
    }
    if (r.start_date && r.end_date && r.end_date < r.start_date) {
      errors.push('Expiry date cannot be earlier than start date')
    }
    if ((Number(r.paid_amount) || 0) > (Number(r.total_fee) || 0)) {
      errors.push('Paid amount cannot exceed total fee')
    }
    if (Number(r.total_fee) < 0 || Number(r.paid_amount) < 0) {
      errors.push('Amounts cannot be negative')
    }
    return errors
  }

  // Find duplicate in existing members
  function findExistingDuplicate(phone) {
    if (!phone) return null
    const cleanPhone = phone.replace(/[\s-]/g, '')
    return existingMembers.find((m) => m.phone && m.phone.replace(/[\s-]/g, '') === cleanPhone)
  }

  // Save selected records to Supabase
  async function handleImportConfirmed() {
    const selectedRecords = records.filter((r) => r.selected)
    if (selectedRecords.length === 0) {
      setGeneralError('Please select at least one record to import.')
      return
    }

    // Check validation on selected
    for (const r of selectedRecords) {
      const errs = validateRecord(r)
      if (errs.length > 0) {
        setGeneralError(`Please resolve errors for ${r.name || 'unnamed record'}: ${errs.join(', ')}`)
        return
      }
    }

    setImporting(true)
    setGeneralError('')

    let successCount = 0
    const failedRecords = []

    for (const r of selectedRecords) {
      const payload = {
        name: r.name.trim(),
        phone: r.phone ? r.phone.replace(/[\s-]/g, '') : '',
        plan: r.plan,
        facility: r.facility || 'Gym & Fitness',
        personal_trainer: Boolean(r.personal_trainer),
        trainer_name: r.trainer_name || '',
        start_date: r.start_date,
        end_date: r.end_date,
        total_fee: Number(r.total_fee) || 0,
        paid_amount: Number(r.paid_amount) || 0,
        notes: r.notes ? r.notes.trim() : 'Scanned from notebook',
      }

      let { error } = await supabase.from('members').insert(payload)
      if (
        error &&
        (error.message?.includes('schema cache') ||
          error.message?.includes('facility') ||
          error.message?.includes('personal_trainer') ||
          error.code === 'PGRST204')
      ) {
        const fallbackPayload = {
          name: payload.name,
          phone: payload.phone,
          plan: payload.plan,
          start_date: payload.start_date,
          end_date: payload.end_date,
          total_fee: payload.total_fee,
          paid_amount: payload.paid_amount,
          notes: payload.notes,
        }
        const fallbackRes = await supabase.from('members').insert(fallbackPayload)
        error = fallbackRes.error
      }

      if (error) {
        failedRecords.push({ ...r, error: error.message })
      } else {
        successCount++
      }
    }

    setImporting(false)
    setImportSummary({
      successCount,
      failedCount: failedRecords.length,
      failedRecords,
    })

    if (failedRecords.length === 0) {
      setStep('imported')
    } else {
      // Keep only failed records in list so user can fix and retry
      setRecords(failedRecords)
      setStep('review')
      setGeneralError(`${successCount} member(s) imported. ${failedRecords.length} record(s) failed. Please check errors below.`)
    }
  }

  return (
    <Modal title="Scan Notebook Register" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {generalError && <div className="alert error">{generalError}</div>}

        {/* STEP 1: SELECT IMAGE / CAMERA */}
        {step === 'select' && (
          <div>
            <p className="muted" style={{ marginTop: 0 }}>
              Scan an existing paper notebook or attendance register to import members directly onto your gym dashboard without manual typing.
            </p>

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFileSelected}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileSelected}
            />

            {/* Live Camera Viewfinder if active */}
            {cameraActive ? (
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{ width: '100%', maxHeight: '360px', borderRadius: '10px', background: '#000', objectFit: 'cover' }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
                  <button className="btn primary" onClick={captureLivePhoto}>
                    📸 Take Snapshot
                  </button>
                  <button className="btn" onClick={stopCamera}>
                    Cancel Camera
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', margin: '20px 0' }}>
                <button
                  type="button"
                  className="btn primary"
                  style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                  onClick={() => {
                    // Mobile devices support capture="environment" file picker seamlessly
                    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                      cameraInputRef.current?.click()
                    } else {
                      // Desktop can use live webcam stream or file picker
                      startLiveCamera()
                    }
                  }}
                >
                  <span style={{ fontSize: '28px' }}>📷</span>
                  <b>Take Photo with Camera</b>
                  <span className="small muted" style={{ color: '#e0e7ff' }}>Open mobile camera</span>
                </button>

                <button
                  type="button"
                  className="btn"
                  style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span style={{ fontSize: '28px' }}>🖼️</span>
                  <b>Upload Register Photo</b>
                  <span className="small muted">From gallery or files</span>
                </button>
              </div>
            )}

            {cameraError && (
              <div className="alert error" style={{ marginBottom: '12px' }}>
                {cameraError}
              </div>
            )}

            <div className="alert info small" style={{ lineHeight: 1.5 }}>
              🔒 <b>100% Local & Private:</b> OCR runs entirely on your device browser. No photos or member details are ever uploaded to third-party AI or cloud services.
            </div>

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & ADJUST IMAGE */}
        {step === 'preview' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="small muted">Prepare photo for best text clarity</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn sm"
                  title="Rotate Left"
                  onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                >
                  ↺ Rotate
                </button>
                <button
                  type="button"
                  className="btn sm"
                  title="Rotate Right"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                >
                  ↻ Rotate
                </button>
              </div>
            </div>

            {/* Image Preview Box */}
            <div
              style={{
                position: 'relative',
                background: '#111827',
                borderRadius: '8px',
                overflow: 'hidden',
                textAlign: 'center',
                minHeight: '260px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={adjustedImageSrc || rawImageSrc}
                alt="Notebook Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '340px',
                  objectFit: 'contain',
                  display: 'block',
                  margin: '0 auto',
                }}
              />
            </div>

            {/* Adjustments: Grayscale & Contrast Toggle */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={grayscale}
                  onChange={(e) => setGrayscale(e.target.checked)}
                  style={{ width: 'auto', margin: 0 }}
                />
                <span>Grayscale (Improves B&W text)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={contrast > 1.0}
                  onChange={(e) => setContrast(e.target.checked ? 1.3 : 1.0)}
                  style={{ width: 'auto', margin: 0 }}
                />
                <span>Boost Contrast (Sharpen ink)</span>
              </label>
            </div>

            {/* Crop adjustment sliders */}
            <details style={{ marginTop: '10px' }}>
              <summary className="link" style={{ fontSize: '13px', cursor: 'pointer' }}>
                Trim / Crop borders (optional)
              </summary>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                <label className="small">
                  Crop Top: {cropBox.top}%
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={cropBox.top}
                    onChange={(e) => setCropBox((c) => ({ ...c, top: Number(e.target.value) }))}
                  />
                </label>
                <label className="small">
                  Crop Bottom: {cropBox.bottom}%
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={cropBox.bottom}
                    onChange={(e) => setCropBox((c) => ({ ...c, bottom: Number(e.target.value) }))}
                  />
                </label>
              </div>
            </details>

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setRawImageSrc(null)
                  setAdjustedImageSrc(null)
                  setStep('select')
                }}
              >
                Retake Photo
              </button>
              <button type="button" className="btn primary" onClick={runOCR}>
                ⚡ Extract Text
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: OCR RUNNING */}
        {step === 'ocr' && (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📖</div>
            <h3 style={{ marginBottom: '8px' }}>Scanning Notebook…</h3>
            <p className="muted small" style={{ marginBottom: '16px' }}>{ocrStatus}</p>

            <div style={{ background: '#e5e7eb', height: '10px', borderRadius: '5px', overflow: 'hidden', maxWidth: '320px', margin: '0 auto 20px' }}>
              <div
                style={{
                  background: 'var(--primary)',
                  height: '100%',
                  width: `${ocrProgress}%`,
                  transition: 'width 0.2s ease',
                }}
              />
            </div>

            <button
              type="button"
              className="btn sm"
              onClick={() => {
                if (workerRef.current) {
                  workerRef.current.terminate().catch(() => {})
                  workerRef.current = null
                }
                setStep('preview')
              }}
            >
              Cancel OCR
            </button>
          </div>
        )}

        {/* STEP 4: REVIEW DETECTED RECORDS */}
        {step === 'review' && (
          <div>
            {records.length === 0 ? (
              <div className="card empty" style={{ margin: '12px 0' }}>
                <p><b>We could not read this image.</b></p>
                <p className="small muted">
                  Try taking a clearer photo with good lighting or enter the member details manually.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '14px' }}>
                  <button className="btn" onClick={() => setStep('preview')}>
                    Retake / Adjust Photo
                  </button>
                  <button className="btn primary" onClick={addEmptyRecord}>
                    + Add Member Record Manually
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="small">
                    Detected <b>{records.length}</b> candidate record(s)
                  </span>
                  <button type="button" className="btn sm" onClick={addEmptyRecord}>
                    + Add Record
                  </button>
                </div>

                {/* Collapsible raw OCR text for manual inspection / edits */}
                <details style={{ marginBottom: '14px' }}>
                  <summary className="link" style={{ fontSize: '13px', cursor: 'pointer' }}>
                    View / Edit Raw OCR Text
                  </summary>
                  <div style={{ marginTop: '8px' }}>
                    <textarea
                      rows={5}
                      value={rawOcrText}
                      onChange={(e) => setRawOcrText(e.target.value)}
                      placeholder="Recognized OCR raw text…"
                      style={{ fontSize: '12px', fontFamily: 'monospace' }}
                    />
                    <button
                      type="button"
                      className="btn sm"
                      style={{ marginTop: '6px' }}
                      onClick={handleReparseRawText}
                    >
                      Re-parse Text
                    </button>
                  </div>
                </details>

                {/* Records list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
                  {records.map((r, index) => {
                    const validationErrors = validateRecord(r)
                    const duplicate = findExistingDuplicate(r.phone)
                    const due = Math.max(0, (Number(r.total_fee) || 0) - (Number(r.paid_amount) || 0))

                    return (
                      <div
                        key={r.tempId}
                        className="card"
                        style={{
                          border: duplicate ? '1px solid #f59e0b' : '1px solid var(--border)',
                          background: r.selected ? 'var(--card)' : 'var(--card-subtle)',
                          opacity: r.selected ? 1 : 0.65,
                          padding: '14px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 600, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={r.selected}
                              onChange={() => toggleSelectRecord(r.tempId)}
                              style={{ width: 'auto', margin: 0 }}
                            />
                            <span>Member #{index + 1} {r.name ? `– ${r.name}` : ''}</span>
                          </label>

                          <button
                            type="button"
                            className="link"
                            style={{ color: 'var(--red)', fontSize: '12px' }}
                            onClick={() => removeRecord(r.tempId)}
                          >
                            Remove
                          </button>
                        </div>

                        {/* Duplicate Alert */}
                        {duplicate && (
                          <div className="alert error small" style={{ marginBottom: '10px', background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
                            ⚠️ <b>Existing member match:</b> "{duplicate.name}" ({duplicate.phone}) already exists in your gym (Plan: {duplicate.plan || 'Custom'}, valid till {formatDate(duplicate.end_date)}).
                          </div>
                        )}

                        {/* Record fields */}
                        <div className="row">
                          <label>
                            Name *
                            <input
                              required
                              value={r.name}
                              placeholder="e.g. Rahul Sharma"
                              onChange={(e) => updateRecord(r.tempId, 'name', e.target.value)}
                            />
                          </label>

                          <label>
                            Mobile number
                            <input
                              type="tel"
                              value={r.phone}
                              placeholder="10-digit mobile"
                              onChange={(e) => updateRecord(r.tempId, 'phone', e.target.value)}
                            />
                          </label>
                        </div>

                        <div className="row" style={{ marginTop: '8px' }}>
                          <label>
                            Plan
                            <select
                              value={r.plan}
                              onChange={(e) => updateRecord(r.tempId, 'plan', e.target.value)}
                            >
                              {PLANS.map((p) => (
                                <option key={p.label} value={p.label}>
                                  {p.label}
                                </option>
                              ))}
                              <option value="Custom">Custom</option>
                            </select>
                          </label>

                          <label>
                            Joining date
                            <input
                              type="date"
                              required
                              value={r.start_date}
                              onChange={(e) => updateRecord(r.tempId, 'start_date', e.target.value)}
                            />
                          </label>
                        </div>

                        <div className="row" style={{ marginTop: '8px' }}>
                          <label>
                            Expiry date
                            <input
                              type="date"
                              required
                              value={r.end_date}
                              onChange={(e) => updateRecord(r.tempId, 'end_date', e.target.value)}
                            />
                          </label>

                          <label>
                            Total Fee (₹)
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={r.total_fee}
                              placeholder="0"
                              onChange={(e) => updateRecord(r.tempId, 'total_fee', e.target.value)}
                            />
                          </label>
                        </div>

                        <div className="row" style={{ marginTop: '8px' }}>
                          <label>
                            Paid (₹)
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={r.paid_amount}
                              placeholder="0"
                              onChange={(e) => updateRecord(r.tempId, 'paid_amount', e.target.value)}
                            />
                          </label>

                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <span className="small muted">Payment status:</span>
                            <div style={{ marginTop: '4px' }}>
                              {due > 0 ? (
                                <span className="badge red">{formatMoney(due)} due</span>
                              ) : (
                                <span className="badge green">Paid</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Validation errors */}
                        {validationErrors.length > 0 && r.selected && (
                          <div className="alert error small" style={{ marginTop: '8px' }}>
                            {validationErrors.join(' · ')}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="modal-actions" style={{ marginTop: '16px' }}>
                  <button type="button" className="btn" onClick={() => setStep('preview')} disabled={importing}>
                    Back to Photo
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={importing || records.filter((r) => r.selected).length === 0}
                    onClick={handleImportConfirmed}
                  >
                    {importing
                      ? 'Importing…'
                      : `Confirm & Import (${records.filter((r) => r.selected).length})`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: IMPORTED SUMMARY */}
        {step === 'imported' && importSummary && (
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🎉</div>
            <h3>Import Complete!</h3>
            <p className="muted" style={{ margin: '8px 0 20px' }}>
              <b>{importSummary.successCount}</b> member(s) successfully imported into your gym database.
            </p>

            <button
              type="button"
              className="btn primary"
              onClick={async () => {
                if (onImportSuccess) await onImportSuccess()
                onClose()
              }}
            >
              Done & View Members
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
