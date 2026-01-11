import React from 'react'
import './DevicePage.css'

function DevicePage() {
  const drinkDevices = [
    {
      id: 'A-01',
      name: '智能饮水机 A-01',
      status: '在线',
      statusTone: 'online',
      desc: '14位患者已使用 滤芯剩余 45 天',
      action: '查看'
    },
    {
      id: 'A-02',
      name: '智能饮水机 A-02',
      status: '离线',
      statusTone: 'offline',
      desc: '1位患者已使用 滤芯需更换（3 天后过期）',
      action: '查看'
    }
  ]

  const drainDevices = [
    {
      id: 'B-01-1',
      name: '智能尿壶 B-01',
      status: '在线',
      statusTone: 'online',
      battery: '电池 87%',
      action: '配置'
    },
    {
      id: 'B-01-2',
      name: '智能尿壶 B-01',
      status: '在线',
      statusTone: 'online',
      battery: '电池 92%',
      action: '配置'
    },
    {
      id: 'B-01-3',
      name: '智能尿壶 B-01',
      status: '离线',
      statusTone: 'offline',
      battery: '电池 12%（需充电）',
      action: '配置'
    },
    {
      id: 'B-01-4',
      name: '智能尿壶 B-01',
      status: '离线',
      statusTone: 'offline',
      battery: '电池 0%（需充电）',
      action: '配置'
    },
    {
      id: 'B-01-5',
      name: '智能尿壶 B-01',
      status: '在线',
      statusTone: 'online',
      battery: '电池 87%',
      action: '配置'
    }
  ]

  return (
    <div className="device-page-content">
      <div className="dp-header">
        <div className="dp-header-content">
          <div className="dp-title-section">
            <h2 className="dp-title">设备监控</h2>
            <p className="dp-subtitle">14在线 2离线</p>
          </div>
          <div className="dp-menu-button">
            <img src="/icons/DotsThreeOutline.svg" alt="菜单" />
          </div>
        </div>
      </div>

      <div className="dp-body">
        <div className="dp-section">
          <div className="dp-section-title">饮水设备</div>
          <div className="dp-card-list">
            {drinkDevices.map((d) => (
              <div key={d.id} className="dp-device-card dp-device-card--drink">
                <div className="dp-device-card-inner">
                  <div className="dp-device-left">
                    <div className="dp-device-thumb" />
                    <div className="dp-device-text">
                      <div className="dp-device-name">{d.name}</div>
                      <div className="dp-device-meta">
                        <span className={`dp-status dp-status--${d.statusTone}`}>{d.status}</span>
                        <span className="dp-meta-text">{d.desc}</span>
                      </div>
                    </div>
                  </div>
                  <div className="dp-device-action dp-device-action--view">{d.action}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dp-section">
          <div className="dp-section-title">排液设备</div>
          <div className="dp-card-list">
            {drainDevices.map((d) => (
              <div key={d.id} className="dp-device-card dp-device-card--drain">
                <div className="dp-device-card-inner dp-device-card-inner--drain">
                  <div className="dp-device-text dp-device-text--drain">
                    <div className="dp-device-name">{d.name}</div>
                    <div className="dp-device-meta">
                      <span className={`dp-status dp-status--${d.statusTone}`}>{d.status}</span>
                      <span className="dp-meta-text">{d.battery}</span>
                    </div>
                  </div>
                  <div className="dp-device-action dp-device-action--config">{d.action}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DevicePage
