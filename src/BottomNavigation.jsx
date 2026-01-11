import React from 'react'
import './BottomNavigation.css'

const imgSubtract = '/figma/family-bottom-subtract.svg'

function BottomNavigation({ activeTab, setActiveTab }) {
  return (
    <div className="bottom-nav">
      <div className="nav-background">
        <img src={imgSubtract} alt="导航栏背景" />
      </div>
      <div className="nav-buttons">
        <button 
          className={`nav-btn ${activeTab === 'home' ? 'nav-active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <div className="nav-icon">
            <img 
              src={`/icons/HouseSimple${activeTab === 'home' ? '-fill' : ''}.svg`}
              alt="首页"
              width="24"
              height="24"
            />
          </div>
          <span>首页</span>
        </button>
        
        <button 
          className={`nav-btn ${activeTab === 'patient' ? 'nav-active' : ''}`}
          onClick={() => setActiveTab('patient')}
        >
          <div className="nav-icon">
            <img 
              src={`/icons/Users${activeTab === 'patient' ? '-fill' : ''}.svg`}
              alt="患者"
              width="28"
              height="28"
            />
          </div>
          <span>患者</span>
        </button>
        
        <button 
          className={`nav-btn ${activeTab === 'device' ? 'nav-active' : ''}`}
          onClick={() => setActiveTab('device')}
        >
          <div className="nav-icon">
            <img 
              src={`/icons/CirclesFour${activeTab === 'device' ? '-fill' : ''}.svg`}
              alt="设备"
              width="28"
              height="28"
            />
          </div>
          <span>设备</span>
        </button>
        
        <button 
          className={`nav-btn ${activeTab === 'settings' ? 'nav-active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <div className="nav-icon">
            <img 
              src={`/icons/GearSix${activeTab === 'settings' ? '-fill' : ''}.svg`}
              alt="设置"
              width="24"
              height="24"
            />
          </div>
          <span>设置</span>
        </button>
      </div>
    </div>
  )
}

export default BottomNavigation
