import React, { useMemo } from 'react'
import './FamilySettingsPage.css'

const imgAvatar = '/figma/family-settings-avatar.png'
const imgListBg = '/figma/settings-list-bg.svg'

function FamilySettingsPage({ appRole, onRoleChange, timeline = [] }) {
  // 从 timeline 动态计算入量和出量（与首页一致）
  const { inMl, outMl } = useMemo(() => {
    let totalIn = 0
    let totalOut = 0
    timeline.forEach(item => {
      if (item.kind === 'intake') {
        totalIn += item.valueMl || 0
      } else if (item.kind === 'output') {
        totalOut += item.valueMl || 0
      }
    })
    return { inMl: totalIn, outMl: totalOut }
  }, [timeline])

  const profile = useMemo(() => {
    const inMlMax = 1200
    const outMlMax = 1200
    const fallback = {
      name: '王某某',
      meta: 'GFR Ⅰ期 60kg 依从性良好',
      inMlMax,
      outMlMax
    }

    const raw = localStorage.getItem('patientData')
    if (!raw) return fallback

    try {
      const data = JSON.parse(raw)
      // 兼容新旧字段名：新格式 patient_name / is_ckd_patient / gfr_stage
      const name = (data?.patient_name || data?.patientName) && (data?.patient_name || data?.patientName) !== '未填写' 
        ? (data?.patient_name || data?.patientName) 
        : fallback.name

      const roman = { 1: 'Ⅰ', 2: 'Ⅱ', 3: 'Ⅲ', 4: 'Ⅳ', 5: 'Ⅴ' }
      const isCKD = data?.is_ckd_patient ?? data?.isCKDPatient
      const gfrStage = data?.gfr_stage ?? data?.gfrStage
      const gfr = isCKD && gfrStage ? `GFR ${roman[gfrStage] || gfrStage}期` : 'GFR'
      const weight = data?.weight && data.weight !== '未填写' ? `${data.weight}kg` : '60kg'

      return {
        name,
        meta: `${gfr} ${weight} 依从性良好`,
        inMlMax,
        outMlMax
      }
    } catch {
      return fallback
    }
  }, [])
  
  const inPercent = profile.inMlMax > 0 ? Math.round((inMl / profile.inMlMax) * 100) : 0
  const outPercent = profile.outMlMax > 0 ? Math.round((outMl / profile.outMlMax) * 100) : 0

  return (
    <div className="family-settings-page-content">
      <div className="fsp-title">我的主页</div>

      <div className="fsp-content">
        <div className="fsp-profile-block">
          <div className="fsp-profile-top">
            <div className="fsp-avatar-wrap">
              <img className="fsp-avatar" src={imgAvatar} alt="头像" />
            </div>

            <div className="fsp-profile-text">
              <div className="fsp-name">{profile.name}</div>
              <div className="fsp-meta">{profile.meta}</div>
            </div>
          </div>

          <div className="fsp-metrics-row">
            <div className="fsp-metric-card">
              <div className="fsp-metric-text">
                <div className="fsp-metric-label">喝了</div>
                <div className="fsp-metric-value">{inMl} ml</div>
                <div className="fsp-metric-sub">建议 {profile.inMlMax} ml</div>
              </div>
              <div className="fsp-metric-bar fsp-metric-bar--blue">
                <div className="fsp-metric-fill fsp-metric-fill--blue" style={{ width: `${inPercent}%` }} />
              </div>
            </div>

            <div className="fsp-metric-card fsp-metric-card--out">
              <div className="fsp-metric-text">
                <div className="fsp-metric-label">排出</div>
                <div className="fsp-metric-value">{outMl} ml</div>
                <div className="fsp-metric-sub">含活动估算</div>
              </div>
              <div className="fsp-metric-bar fsp-metric-bar--purple">
                <div className="fsp-metric-fill fsp-metric-fill--purple" style={{ width: `${outPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="fsp-panels">
          <div className="fsp-panel fsp-panel--identity">
            <div className="fsp-panel-row fsp-panel-row--identity">
              <div className="fsp-row-title">我的身份</div>
              <div className="fsp-role-switch" role="group" aria-label="我的身份">
                <button
                  type="button"
                  className={`fsp-role-pill fsp-role-pill--family ${appRole === 'family' ? 'fsp-role-pill--active' : ''}`}
                  onClick={() => onRoleChange?.('family')}
                >
                  家属
                </button>
                <button
                  type="button"
                  className={`fsp-role-pill fsp-role-pill--nurse ${appRole === 'caregiver' ? 'fsp-role-pill--active' : ''}`}
                  onClick={() => onRoleChange?.('caregiver')}
                >
                  护士
                </button>
              </div>
            </div>

            <div className="fsp-panel-row">
              <div className="fsp-row-title">患者绑定</div>
              <img className="fsp-caret" src="/icons/CaretRight.svg" alt="" />
            </div>

            <div className="fsp-panel-row fsp-panel-row--last">
              <div className="fsp-row-title">账号详情</div>
              <img className="fsp-caret" src="/icons/CaretRight.svg" alt="" />
            </div>
          </div>

          <div className="fsp-panel fsp-panel--menu">
            <div className="fsp-menu-bg">
              <img src={imgListBg} alt="" />
            </div>

            <div className="fsp-menu-content">
              <div className="fsp-panel-row">
                <div className="fsp-row-title">设备部署</div>
                <img className="fsp-caret" src="/icons/CaretRight.svg" alt="" />
              </div>

              <div className="fsp-panel-row">
                <div className="fsp-row-title">提醒设置</div>
                <img className="fsp-caret" src="/icons/CaretRight.svg" alt="" />
              </div>

              <div className="fsp-panel-row">
                <div className="fsp-row-title">系统设置</div>
                <img className="fsp-caret" src="/icons/CaretRight.svg" alt="" />
              </div>

              <div className="fsp-panel-row">
                <div className="fsp-row-title">关于我们</div>
                <img className="fsp-caret" src="/icons/CaretRight.svg" alt="" />
              </div>

              <div className="fsp-panel-row">
                <div className="fsp-row-title">贡献</div>
                <img className="fsp-caret" src="/icons/CaretRight.svg" alt="" />
              </div>

              <div className="fsp-panel-row fsp-panel-row--logout">
                <div className="fsp-row-title">退出登录</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FamilySettingsPage
