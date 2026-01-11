// scripts/get-accounts.js
const key = 'rnd_tEL8PQ8j50asExLYnI6KYWuaNviG'
;(async ()=>{
  try {
    const res = await fetch('https://api.render.com/v1/accounts', { headers: { Authorization: `Bearer ${key}` } })
    console.log('Status', res.status)
    const j = await res.json()
    console.log(JSON.stringify(j, null, 2))
  } catch (e) {
    console.error(e)
  }
})()
