import WhatsAppSupport from './WhatsAppSupport'

export default function SetupNotice() {
  return (
    <div className="center-page">
      <div className="card auth-card" style={{ maxWidth: 480 }}>
        <div className="brand">
          <span className="logo">GM</span>
          <div>
            <h1>Gym Manager</h1>
            <p className="muted">Gym Manager isn't configured for this deployment.</p>
          </div>
        </div>

        <div className="alert info">
          <strong>Configuration Needed</strong>
          <p style={{ margin: '6px 0 0', lineHeight: 1.4 }}>
            A <code>.env</code> file has been created in your project root, but it requires your Supabase Project URL and Anon Key.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
          <div>
            <b>Option 1: Supabase Cloud (Recommended)</b>
            <ol style={{ margin: '6px 0 0', paddingLeft: 20, lineHeight: 1.5 }}>
              <li>Create a project at <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>supabase.com</a>.</li>
              <li>Go to <b>Project Settings &rarr; API</b>.</li>
              <li>Copy <b>Project URL</b> &amp; <b>anon public key</b>.</li>
              <li>Open <code>.env</code> in your project root and paste them:</li>
            </ol>
            <pre style={{ background: '#1f2330', color: '#f3f4f6', padding: '10px 12px', borderRadius: 8, fontSize: 12, overflowX: 'auto', margin: '8px 0 0' }}>
              {`VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}
            </pre>
          </div>

          <div>
            <b>Option 2: Local Development</b>
            <p style={{ margin: '4px 0 0', lineHeight: 1.4 }}>
              If you are running Supabase locally via Docker:
            </p>
            <pre style={{ background: '#1f2330', color: '#f3f4f6', padding: '10px 12px', borderRadius: 8, fontSize: 12, overflowX: 'auto', margin: '8px 0 0' }}>
              {`npx supabase start\n# In .env:\nVITE_SUPABASE_URL=/supabase\nVITE_SUPABASE_ANON_KEY=<anon key from supabase start>`}
            </pre>
          </div>
        </div>

        <p className="muted small" style={{ margin: 0 }}>
          After updating <code>.env</code>, Vite will automatically reload this page.
        </p>

        <div className="auth-support">
          <WhatsAppSupport variant="link" label="Need help? Customer Support" />
        </div>
      </div>
    </div>
  )
}
