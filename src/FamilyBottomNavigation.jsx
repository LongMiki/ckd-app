import React from 'react'
import './FamilyBottomNavigation.css'

const imgSubtract = '/figma/family-bottom-subtract.svg'

function FamilyBottomNavigation({ activeTab, setActiveTab }) {
  return (
    <div className="family-bottom-nav">
      <div className="family-nav-background">
        <img src={imgSubtract} alt="导航栏背景" />
      </div>

      <div className="family-nav-buttons">
        <button
          className={`family-nav-btn ${activeTab === 'home' ? 'family-nav-active' : ''}`}
          onClick={() => setActiveTab('home')}
          type="button"
        >
          <div className="family-nav-icon">
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
          className={`family-nav-btn ${activeTab === 'analysis' ? 'family-nav-active' : ''}`}
          onClick={() => setActiveTab('analysis')}
          type="button"
        >
          <div className="family-nav-icon">
            <img
              src={`/icons/ChartPieSlice${activeTab === 'analysis' ? '-fill' : ''}.svg`}
              alt="分析"
              width="28"
              height="28"
            />
          </div>
          <span>分析</span>
        </button>

        <button
          className={`family-nav-btn ${activeTab === 'knowledge' ? 'family-nav-active' : ''}`}
          onClick={() => setActiveTab('knowledge')}
          type="button"
        >
          <div className="family-nav-icon">
            <img
              src={`/icons/ChatTeardropText${activeTab === 'knowledge' ? '-fill' : ''}.svg`}
              alt="知识"
              width="28"
              height="28"
            />
          </div>
          <span>知识</span>
        </button>

        <button
          className={`family-nav-btn ${activeTab === 'settings' ? 'family-nav-active' : ''}`}
          onClick={() => setActiveTab('settings')}
          type="button"
        >
          <div className="family-nav-icon">
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

export default FamilyBottomNavigation
