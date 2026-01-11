// scripts/get-accounts-run.js
// Usage: node scripts/get-accounts-run.js
// This script embeds an API key and fetches Render accounts to reveal account id.
const key = 'rnd_BSyWGGGquQ8xgKDzmg3KfoxsbNDw'
;(async ()=>{
  try {
    const res = await fetch('https://api.render.com/v1/accounts', { headers: { Authorization: `Bearer ${key}` } })
    console.log('Status', res.status)
    const text = await res.text()
    console.log(text)
  } catch (e) {
    console.error('Request failed', e)
  }
})()
