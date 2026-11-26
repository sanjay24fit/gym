import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Local development middleware for /api/payments/* endpoints.
 * During 'npm run dev', allows local testing of order creation and payment verification
 * without requiring a separate serverless runner.
 */
function localPaymentsApiPlugin() {
  return {
    name: 'local-payments-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : ''

        if (url === '/api/payments/create-order' && req.method === 'POST') {
          let bodyStr = ''
          req.on('data', (chunk) => { bodyStr += chunk })
          req.on('end', async () => {
            try {
              req.body = bodyStr ? JSON.parse(bodyStr) : {}
              res.status = (code) => {
                res.statusCode = code
                return res
              }
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
                return res
              }
              const { default: handler } = await import('./api/payments/create-order.js')
              await handler(req, res)
            } catch (err) {
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 500
              res.end(JSON.stringify({
                error: err.message || 'Internal server error in local create-order handler',
                fallbackUrl: 'https://razorpay.me/@gymmanagerapk',
              }))
            }
          })
          return
        }

        if (url === '/api/payments/verify-payment' && req.method === 'POST') {
          let bodyStr = ''
          req.on('data', (chunk) => { bodyStr += chunk })
          req.on('end', async () => {
            try {
              req.body = bodyStr ? JSON.parse(bodyStr) : {}
              res.status = (code) => {
                res.statusCode = code
                return res
              }
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
                return res
              }
              const { default: handler } = await import('./api/payments/verify-payment.js')
              await handler(req, res)
            } catch (err) {
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 500
              res.end(JSON.stringify({
                error: err.message || 'Internal server error in local verify-payment handler',
              }))
            }
          })
          return
        }

        next()
      })
    },
  }
}

// /supabase proxy is only for local development against `supabase start`
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [react(), localPaymentsApiPlugin()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'vendor-react'
            }
            if (id.includes('node_modules/@supabase/')) {
              return 'vendor-supabase'
            }
            if (id.includes('node_modules/lucide-react/')) {
              return 'vendor-lucide'
            }
          },
        },
      },
      chunkSizeWarningLimit: 700,
    },
    server: {
      host: true,
      allowedHosts: true,
      proxy: {
        '/supabase': {
          target: 'http://127.0.0.1:54321',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/supabase/, ''),
        },
      },
    },
  }
})
