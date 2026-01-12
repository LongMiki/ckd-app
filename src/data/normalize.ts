// Compatibility utilities: normalize legacy snake_case keys to camelCase
// and lightweight runtime validators for data shapes.

type AnyObj = Record<string, any>

const KEY_MAP: Record<string, string> = {
  user_type: 'userType',
  patient_name: 'patientName',
  gfr_stage: 'gfrStage',
  is_ckd_patient: 'isCKD',
  in_ml: 'inMl',
  out_ml: 'outMl',
  value_ml: 'valueMl',
  value: 'value',
  in_ml_max: 'inMlMax',
  out_ml_max: 'outMlMax',
  urine_specific_gravity: 'urineSpecificGravity',
  urine_osmolality: 'urineOsmolality',
  time_stamp: 'timestamp',
  patient_id: 'patientId',
  patientid: 'patientId',
  time_ago: 'timeAgo',
}

function isPlainObject(v: unknown): v is AnyObj {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function mapKey(k: string): string {
  if (KEY_MAP[k]) return KEY_MAP[k]
  // fallback: convert snake_case to camelCase heuristically
  if (k.includes('_')) {
    return k.split('_').map((seg, i) => i === 0 ? seg : seg[0].toUpperCase() + seg.slice(1)).join('')
  }
  return k
}

export function normalizeObject(obj: any): any {
  if (Array.isArray(obj)) return obj.map(normalizeObject)
  if (!isPlainObject(obj)) return obj

  const out: AnyObj = {}
  for (const [k, v] of Object.entries(obj)) {
    const nk = mapKey(k)
    if (Array.isArray(v)) out[nk] = v.map(normalizeObject)
    else if (isPlainObject(v)) out[nk] = normalizeObject(v)
    else out[nk] = v
  }
  // Alias common fields to keep frontend data access uniform
  // name <-> patientName
  if (out.patientName && !out.name) out.name = out.patientName
  if (out.name && !out.patientName) out.patientName = out.name
  // totalIntake <-> inMl
  if (out.totalIntake != null && out.inMl == null) out.inMl = out.totalIntake
  if (out.inMl != null && out.totalIntake == null) out.totalIntake = out.inMl
  // totalOutput <-> outMl
  if (out.totalOutput != null && out.outMl == null) out.outMl = out.totalOutput
  if (out.outMl != null && out.totalOutput == null) out.totalOutput = out.outMl
  // intakeLimit <-> inMlMax
  if (out.intakeLimit != null && out.inMlMax == null) out.inMlMax = out.intakeLimit
  if (out.inMlMax != null && out.intakeLimit == null) out.intakeLimit = out.inMlMax
  // outputLimit <-> outMlMax
  if (out.outputLimit != null && out.outMlMax == null) out.outMlMax = out.outputLimit
  if (out.outMlMax != null && out.outputLimit == null) out.outputLimit = out.outMlMax
  return out
}

export function normalizeTimelineEntries(entries: any[]): any[] {
  return entries.map(e => {
    const n = normalizeObject(e)
    // ensure valueMl exists
    if (n.valueMl == null && n.value != null) n.valueMl = n.value
    // ensure timestamp is ISO string if possible
    if (!n.timestamp && n.time) {
      // try to construct from date today and time
      try {
        const today = new Date().toISOString().split('T')[0]
        n.timestamp = new Date(`${today}T${n.time}:00.000Z`).toISOString()
      } catch {}
    }
    // ensure time field exists (HH:MM) derived from timestamp if missing
    if (!n.time && n.timestamp) {
      try {
        const d = new Date(n.timestamp)
        const hh = String(d.getHours()).padStart(2, '0')
        const mm = String(d.getMinutes()).padStart(2, '0')
        n.time = `${hh}:${mm}`
      } catch {}
    }
    // ensure human-friendly valueText for display (use small unit normalization)
    if (!n.valueText) {
      const v = n.valueMl != null ? n.valueMl : (n.value != null ? n.value : null)
      if (v != null) n.valueText = `${v} ml`
    }

    // ensure timeAgo (relative) exists
    if (!n.timeAgo && n.timestamp) {
      try {
        const now = Date.now()
        const diffMs = now - new Date(n.timestamp).getTime()
        const diffMinutes = Math.floor(diffMs / 60000)
        if (diffMinutes < 1) n.timeAgo = '刚刚'
        else if (diffMinutes < 60) n.timeAgo = `${diffMinutes}分钟前`
        else if (diffMinutes < 60 * 24) {
          const h = Math.floor(diffMinutes / 60)
          const m = diffMinutes % 60
          n.timeAgo = m > 0 ? `${h}小时${m}分钟前` : `${h}小时前`
        } else {
          n.timeAgo = `${Math.floor(diffMinutes / 60 / 24)}天前`
        }
      } catch {}
    }
    return n
  })
}

// Lightweight validators - return true if basic shape looks ok
export function validateTimelineEntry(e: any): boolean {
  return !!e && typeof e.id === 'string' && typeof e.patientId === 'string' && typeof e.kind === 'string' && (typeof e.valueMl === 'number' || typeof e.value === 'number')
}

export function validatePatientBasicInfo(p: any): boolean {
  return !!p && typeof p.id === 'string' && typeof p.patientName === 'string'
}

/**
 * 安全读取嵌套字段，若不存在返回默认值
 */
export function safeGet<T = any>(obj: any, path: string, defaultValue?: T): T | undefined {
  if (!obj) return defaultValue
  const parts = path.split('.')
  let cur: any = obj
  for (const p of parts) {
    if (cur == null) return defaultValue
    cur = cur[p]
  }
  return cur === undefined ? defaultValue : cur
}
export default { normalizeObject, normalizeTimelineEntries, validateTimelineEntry, validatePatientBasicInfo, safeGet }
