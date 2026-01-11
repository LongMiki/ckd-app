import React, { useMemo } from 'react'
import './SettingsPage.css'

const imgAvatar = '/figma/caregiver-avatar.png'
const imgListBg = '/figma/settings-list-bg.svg'

function SettingsPage({ appRole, onRoleChange, totalInL, totalOutL, totalInLMax, totalOutLMax, totalInPercent, totalOutPercent }) {
  const profile = useMemo(
    () => ({
      name: '王护士',
      shift: 'A班（6：00-14：00）   剩余4h10min'
    }),
    []
  )

  return (
    <div className="settings-page-content">
      <div className="sp-title">我的主页</div>

      <div className="sp-content">
        <div className="sp-profile-block">
          <div className="sp-profile-top">
            <div className="sp-avatar-wrap">
              <img className="sp-avatar" src={imgAvatar} alt="头像" />
            </div>

            <div className="sp-profile-text">
              <div className="sp-name">{profile.name}</div>
              <div className="sp-shift">{profile.shift}</div>
            </div>
          </div>

          <div className="sp-metrics-row">
            <div className="sp-metric-card">
              <div className="sp-metric-text">
                <div className="sp-metric-label">总入量</div>
                <div className="sp-metric-value">{totalInL} L</div>
                <div className="sp-metric-sub">目标：{totalInLMax} L</div>
              </div>
              <div className="sp-metric-bar sp-metric-bar--blue">
                <div className="sp-metric-fill sp-metric-fill--blue" style={{ width: `${totalInPercent}%` }} />
              </div>
            </div>

            <div className="sp-metric-card sp-metric-card--out">
              <div className="sp-metric-text">
                <div className="sp-metric-label">总出量</div>
                <div className="sp-metric-value">{totalOutL} L</div>
                <div className="sp-metric-sub">含估算 {totalOutLMax} L</div>
              </div>
              <div className="sp-metric-bar sp-metric-bar--purple">
                <div className="sp-metric-fill sp-metric-fill--purple" style={{ width: `${totalOutPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="sp-panels">
          <div className="sp-panel sp-panel--identity">
            <div className="sp-panel-row sp-panel-row--identity">
              <div className="sp-row-title">我的身份</div>
              <div className="sp-role-switch" role="group" aria-label="我的身份">
                <button
                  type="button"
                  className={`sp-role-pill ${appRole === 'family' ? 'sp-role-pill--active sp-role-pill--family' : 'sp-role-pill--family'}`}
                  onClick={() => onRoleChange?.('family')}
                >
                  家属
                </button>
                <button
                  type="button"
                  className={`sp-role-pill ${appRole === 'caregiver' ? 'sp-role-pill--active sp-role-pill--nurse' : 'sp-role-pill--nurse'}`}
                  onClick={() => onRoleChange?.('caregiver')}
                >
                  护士
                </button>
              </div>
            </div>

            <div className="sp-panel-row">
              <div className="sp-row-title">病区绑定</div>
              <img className="sp-caret" src="/icons/CaretRight.svg" alt="" />
            </div>

            <div className="sp-panel-row sp-panel-row--last">
              <div className="sp-row-title">账号详情</div>
              <img className="sp-caret" src="/icons/CaretRight.svg" alt="" />
            </div>
          </div>

          <div className="sp-panel sp-panel--menu">
            <div className="sp-menu-bg">
              <img src={imgListBg} alt="" />
            </div>

            <div className="sp-menu-content">
              <div className="sp-panel-row">
                <div className="sp-row-title">设备部署</div>
                <img className="sp-caret" src="/icons/CaretRight.svg" alt="" />
              </div>

              <div className="sp-panel-row">
                <div className="sp-row-title">提醒设置</div>
                <img className="sp-caret" src="/icons/CaretRight.svg" alt="" />
              </div>

              <div className="sp-panel-row">
                <div className="sp-row-title">系统设置</div>
                <img className="sp-caret" src="/icons/CaretRight.svg" alt="" />
              </div>

              <div className="sp-panel-row">
                <div className="sp-row-title">关于我们</div>
                <img className="sp-caret" src="/icons/CaretRight.svg" alt="" />
              </div>

              <div className="sp-panel-row">
                <div className="sp-row-title">贡献</div>
                <img className="sp-caret" src="/icons/CaretRight.svg" alt="" />
              </div>

              <div className="sp-panel-row sp-panel-row--logout">
                <div className="sp-row-title">退出登录</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
