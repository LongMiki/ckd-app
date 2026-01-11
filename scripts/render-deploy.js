// scripts/render-deploy.js
// Usage: set RENDER_API_KEY env var, then: node scripts/render-deploy.js
const API = 'https://api.render.com/v1/services'
const key = process.env.RENDER_API_KEY
if (!key) {
  console.error('Missing RENDER_API_KEY env')
  process.exit(2)
}

const payload = {
  service: {
    name: 'patient-archive',
    repo: 'https://github.com/LongMiki/miki',
    branch: 'main',
    type: 'web',
    env: 'node',
    plan: 'free',
    buildCommand: 'npm run build',
    startCommand: 'npm run start',
    healthCheckPath: '/',
  }
}

;(async () => {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    console.log('Status:', res.status)
    console.log(text)
  } catch (e) {
    console.error('Request failed', e)
  }
})()
