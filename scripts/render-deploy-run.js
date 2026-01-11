// scripts/render-deploy-run.js
// Temporary runner with API key embedded. Will POST to Render API to create service.
const API = 'https://api.render.com/v1/services'
const key = 'rnd_tEL8PQ8j50asExLYnI6KYWuaNviG' // embedded temporarily

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
