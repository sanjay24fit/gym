import { formatDate } from '../lib/utils'
import WhatsAppSupport from './WhatsAppSupport'
import GymLogo from './GymLogo'

export default function AccessBlocked({ gym, onLogout, onRefresh }) {
  let title = 'Approval pending'
  let text = 'Your account has been created. You can use the app once the admin approves it.'
  if (gym?.status === 'blocked') {
    title = 'Account blocked'
    text = 'Your account has been blocked. Please contact the admin.'
  } else if (gym?.status === 'active') {
    title = 'Subscription expired'
    text = `Your plan expired on ${formatDate(gym.valid_until)}. Please contact the admin to renew.`
  } else if (!gym) {
    title = 'Account not found'
    text = 'No gym account is linked to this login.'
  }
  return (
    <div className="center-page">
      <div className="card auth-card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <GymLogo size={56} />
        </div>
        <h2 style={{ margin: '4px 0 2px' }}>{title}</h2>
        <p className="muted">{text}</p>
        {gym && (
          <p className="small">
            <b>{gym.gym_name}</b> · {gym.email}
          </p>
        )}
        <button className="btn primary full" onClick={onRefresh}>Check again</button>
        <WhatsAppSupport label="WhatsApp Support" className="full" />
        <button className="btn full" onClick={onLogout}>Logout</button>
      </div>
    </div>
  )
}
