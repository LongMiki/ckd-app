// Development-only logging helpers. They no-op in production builds.
export function devLog(...args) {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
      console.log(...args)
    }
  } catch (e) {
    // ignore
  }
}

export function devClear() {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
      console.clear()
    }
  } catch (e) {}
}

export function devTable(obj) {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
      console.table(obj)
    }
  } catch (e) {}
}

export function devWarn(...args) {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
      console.warn(...args)
    }
  } catch (e) {}
}

export default devLog
