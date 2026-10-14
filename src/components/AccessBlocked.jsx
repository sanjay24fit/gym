import { formatDate } from '../lib/utils'

export default function AccessBlocked({ gym, onLogout }) {
  let title = 'Approval pending'
  let text = 'Aapka account ban gaya hai. Admin approval ke baad aap app use kar paayenge.'
  if (gym?.status === 'blocked') {
    title = 'Account blocked'
    text = 'Aapka account band kar diya gaya hai. Kripya admin se contact karein.'
  } else if (gym?.status === 'active') {
    title = 'Subscription expired'
    text = `Aapka plan ${formatDate(gym.valid_until)} ko khatam ho gaya. Renew karne ke liye admin se contact karein.`
  } else if (!gym) {
    title = 'Account not found'
    text = 'Is login se koi gym account linked nahi hai.'
  }
  return (
    <div className="center-page">
      <div className="card auth-card">
        <h2>{title}</h2>
        <p className="muted">{text}</p>
        {gym && (
          <p className="small">
            <b>{gym.gym_name}</b> · {gym.email}
          </p>
        )}
        <button className="btn full" onClick={onLogout}>Logout</button>
      </div>
    </div>
  )
}
