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

export default { normalizeObject, normalizeTimelineEntries, validateTimelineEntry, validatePatientBasicInfo }
