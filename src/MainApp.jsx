import React, { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import './MainApp.css'
import WaterManagement from './WaterManagement'
import PatientPage from './PatientPage'
import PatientDetailPage from './PatientDetailPage'
import DevicePage from './DevicePage'
import SettingsPage from './SettingsPage'
import BottomNavigation from './BottomNavigation'
import FamilyBottomNavigation from './FamilyBottomNavigation'
import FamilySettingsPage from './FamilySettingsPage'
import FamilyPlaceholderPage from './FamilyPlaceholderPage'
import FamilyKnowledgePage from './FamilyKnowledgePage'
import FamilyAnalysisPage from './FamilyAnalysisPage'
import FamilyHomePage from './FamilyHomePage'

// 患者头像资源（使用本地资源）
const patientAvatars = [
  '/figma/Rectangle 283.png',
  '/figma/Rectangle 283.png',
  '/figma/Rectangle 283.png',
]
const getRandomAvatar = () => patientAvatars[Math.floor(Math.random() * patientAvatars.length)]

// 根据GFR分期生成meta信息
const getGfrMeta = (gfrStage, weight, isCKD) => {
  if (!isCKD) return `非CKD ${weight}kg`
  const roman = { 1: 'Ⅰ', 2: 'Ⅱ', 3: 'Ⅲ', 4: 'Ⅳ', 5: 'Ⅴ' }
  return `GFR ${roman[gfrStage] || gfrStage}期 ${weight}kg`
}

// 根据GFR分期判断初始状态
const getInitialStatus = (gfrStage) => {
  if (gfrStage >= 4) return 'emergency'
  if (gfrStage === 3) return 'risk'
  return 'normal'
}

function MainApp() {
  const [appRole, setAppRole] = useState(() => {
    const raw = localStorage.getItem('appRole')
    return raw === 'family' ? 'family' : 'caregiver'
  })
  const [activeTab, setActiveTab] = useState('home')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showPatientDetail, setShowPatientDetail] = useState(false)
  
  // 统一的患者数据源
  // urineOsmolality: 尿渗透压 (mOsm/kg H₂O)，正常范围 200-1000
  // urineSpecificGravity: 尿比重，正常范围 1.005-1.030
  // urinationCount: 排尿次数
  // timeline: 患者的入量/出量日志记录
  
  // 生成默认 timeline 的函数（每次调用返回新数组，避免共享引用）
  const createDefaultTimeline = () => [
    { id: 'drink-1', kind: 'intake', source: 'intake', time: '19:45', sourceLabel: '饮水机', title: '喝了一杯白水', ago: '25分钟前', valueText: '+ 200ml', valueMl: 200 },
    { id: 'lunch-1', kind: 'intake', source: 'camera', time: '13:25', sourceLabel: '午餐·拍照上传', title: '一碗粥 + 小菜', ago: '6小时35分钟前', valueText: '+ 180ml', valueMl: 180 },
    { id: 'pee-1', kind: 'output', source: 'output', time: '11:05', sourceLabel: '智能尿壶', title: '排尿 · 颜色淡黄', ago: '8小时55分钟前', valueText: '- 210ml', valueMl: 210 },
    { id: 'soup-1', kind: 'intake', source: 'camera', time: '9:00', sourceLabel: '拍照上传', title: '一碗汤', ago: '11小时前', valueText: '+ 150ml', valueMl: 150 },
    { id: 'pee-2', kind: 'output', source: 'output', time: '8:05', sourceLabel: '智能尿壶', title: '排尿 · 颜色正常', ago: '11小时55分钟前', valueText: '- 160ml', valueMl: 160 },
  ]

  // 家属端专用的timeline数据
  const [familyTimeline, setFamilyTimeline] = useState(() => createDefaultTimeline())
  
  // 本地头像资源
  const avatarA = '/figma/Rectangle 283.png'
  
  const [patients, setPatients] = useState([
    { id: 1, name: '王叔叔', shortName: '王叔叔', fullName: '王叔叔-病床三', meta: 'GFR Ⅰ期 60kg', metaFull: 'GFR Ⅰ期 60kg 依从性良好', gfrStage: 1, inPercent: 65, outPercent: 35, inMl: 810, outMl: 810, inMlMax: 1200, outMlMax: 1200, avatar: avatarA, status: 'normal', urineOsmolality: 650, urineSpecificGravity: 1.015, urinationCount: 5, timeline: createDefaultTimeline() },
    { id: 2, name: '李阿姨', shortName: '李阿姨', fullName: '李阿姨-病床五', meta: 'GFR Ⅱ期 52kg', metaFull: 'GFR Ⅱ期 52kg 依从性一般', gfrStage: 2, inPercent: 58, outPercent: 42, inMl: 720, outMl: 690, inMlMax: 1100, outMlMax: 1100, avatar: avatarA, status: 'risk', urineOsmolality: 820, urineSpecificGravity: 1.022, urinationCount: 4, timeline: createDefaultTimeline() },
    { id: 3, name: '张叔叔', shortName: '张叔叔', fullName: '张叔叔-病床二', meta: 'GFR Ⅰ期 68kg', metaFull: 'GFR Ⅰ期 68kg 依从性良好', gfrStage: 1, inPercent: 71, outPercent: 29, inMl: 860, outMl: 740, inMlMax: 1300, outMlMax: 1300, avatar: avatarA, status: 'normal', urineOsmolality: 520, urineSpecificGravity: 1.012, urinationCount: 6, timeline: createDefaultTimeline() },
    { id: 4, name: '陈阿姨', shortName: '陈阿姨', fullName: '陈阿姨-病床七', meta: 'GFR Ⅲ期 49kg', metaFull: 'GFR Ⅲ期 49kg 需重点关注', gfrStage: 3, inPercent: 46, outPercent: 54, inMl: 540, outMl: 630, inMlMax: 1000, outMlMax: 1000, avatar: avatarA, status: 'emergency', urineOsmolality: 1050, urineSpecificGravity: 1.032, urinationCount: 3, timeline: createDefaultTimeline() },
    { id: 5, name: '赵叔叔', shortName: '赵叔叔', fullName: '赵叔叔-病床一', meta: 'GFR Ⅱ期 75kg', metaFull: 'GFR Ⅱ期 75kg 依从性良好', gfrStage: 2, inPercent: 62, outPercent: 38, inMl: 780, outMl: 710, inMlMax: 1400, outMlMax: 1400, avatar: avatarA, status: 'normal', urineOsmolality: 580, urineSpecificGravity: 1.018, urinationCount: 5, timeline: createDefaultTimeline() },
    { id: 6, name: '周阿姨', shortName: '周阿姨', fullName: '周阿姨-病床四', meta: 'GFR Ⅰ期 55kg', metaFull: 'GFR Ⅰ期 55kg 依从性良好', gfrStage: 1, inPercent: 67, outPercent: 33, inMl: 800, outMl: 760, inMlMax: 1150, outMlMax: 1150, avatar: avatarA, status: 'normal', urineOsmolality: 480, urineSpecificGravity: 1.010, urinationCount: 7, timeline: createDefaultTimeline() },
    { id: 7, name: '孙叔叔', shortName: '孙叔叔', fullName: '孙叔叔-病床六', meta: 'GFR Ⅱ期 63kg', metaFull: 'GFR Ⅱ期 63kg 依从性一般', gfrStage: 2, inPercent: 59, outPercent: 41, inMl: 700, outMl: 680, inMlMax: 1200, outMlMax: 1200, avatar: avatarA, status: 'normal', urineOsmolality: 720, urineSpecificGravity: 1.020, urinationCount: 4, timeline: createDefaultTimeline() },
    { id: 8, name: '钱奶奶', shortName: '钱奶奶', fullName: '钱奶奶-病床八', meta: 'GFR Ⅳ期 48kg', metaFull: 'GFR Ⅳ期 48kg 需要密切观察', gfrStage: 4, inPercent: 44, outPercent: 56, inMl: 520, outMl: 650, inMlMax: 950, outMlMax: 950, avatar: avatarA, status: 'emergency', urineOsmolality: 180, urineSpecificGravity: 1.003, urinationCount: 8, timeline: createDefaultTimeline() },
    { id: 9, name: '刘大爷', shortName: '刘大爷', fullName: '刘大爷-病床九', meta: 'GFR Ⅰ期 72kg', metaFull: 'GFR Ⅰ期 72kg 依从性良好', gfrStage: 1, inPercent: 69, outPercent: 31, inMl: 830, outMl: 750, inMlMax: 1350, outMlMax: 1350, avatar: avatarA, status: 'normal', urineOsmolality: 600, urineSpecificGravity: 1.016, urinationCount: 5, timeline: createDefaultTimeline() },
    { id: 10, name: '马阿姨', shortName: '马阿姨', fullName: '马阿姨-病床十', meta: 'GFR Ⅱ期 58kg', metaFull: 'GFR Ⅱ期 58kg 依从性一般', gfrStage: 2, inPercent: 55, outPercent: 45, inMl: 680, outMl: 700, inMlMax: 1150, outMlMax: 1150, avatar: avatarA, status: 'normal', urineOsmolality: 750, urineSpecificGravity: 1.019, urinationCount: 4, timeline: createDefaultTimeline() },
    { id: 11, name: '杨叔叔', shortName: '杨叔叔', fullName: '杨叔叔-病床十一', meta: 'GFR Ⅲ期 51kg', metaFull: 'GFR Ⅲ期 51kg 需要关注', gfrStage: 3, inPercent: 48, outPercent: 52, inMl: 560, outMl: 620, inMlMax: 1000, outMlMax: 1000, avatar: avatarA, status: 'risk', urineOsmolality: 920, urineSpecificGravity: 1.026, urinationCount: 3, timeline: createDefaultTimeline() },
    { id: 12, name: '徐奶奶', shortName: '徐奶奶', fullName: '徐奶奶-病床十二', meta: 'GFR Ⅰ期 66kg', metaFull: 'GFR Ⅰ期 66kg 依从性良好', gfrStage: 1, inPercent: 64, outPercent: 36, inMl: 790, outMl: 780, inMlMax: 1250, outMlMax: 1250, avatar: avatarA, status: 'normal', urineOsmolality: 550, urineSpecificGravity: 1.014, urinationCount: 6, timeline: createDefaultTimeline() },
  ])

  const pageContentRef = useRef(null)
  const scrollPositionsRef = useRef(new Map())
  const prevKeyRef = useRef(null)
  const detailScrollBackupRef = useRef(0)
  
  // 检查是否有新建档的患者需要添加或更新到列表
  useEffect(() => {
    const newPatientRaw = localStorage.getItem('newPatientData')
    if (!newPatientRaw) return
    
    try {
      const newPatientData = JSON.parse(newPatientRaw)
      const patientId = newPatientData.id // 固定ID: 'current_patient'
      
      // 创建/更新患者数据
      const weight = newPatientData.weight || 60
      const gfrStage = newPatientData.gfr_stage || null
      const isCKD = newPatientData.is_ckd_patient
      const name = newPatientData.patient_name || '新患者'
      const meta = getGfrMeta(gfrStage, weight, isCKD)
      
      // 检查是否已经存在该患者
      const existingIndex = patients.findIndex(p => p.id === patientId)
      
      if (existingIndex >= 0) {
        // 已存在，更新患者信息（保留原有的摄入/排出数据和日志）
        setPatients(prev => prev.map((p, idx) => {
          if (idx === existingIndex) {
            return {
              ...p,
              name: name,
              shortName: name,
              fullName: `${name}-建档患者`,
              meta: meta,
              metaFull: `${meta} 已建档`,
              gfrStage: gfrStage,
              age: newPatientData.age,
              status: isCKD && gfrStage ? getInitialStatus(gfrStage) : 'normal',
            }
          }
          return p
        }))
        console.log('%c✅ 患者信息已更新:', 'color: #10b981; font-weight: bold;', name)
      } else {
        // 不存在，添加新患者
        const newPatient = {
          id: patientId,
          name: name,
          shortName: name,
          fullName: `${name}-建档患者`,
          meta: meta,
          metaFull: `${meta} 新建档`,
          gfrStage: gfrStage,
          age: newPatientData.age,
          // 新患者无摄入/排出数据
          inPercent: 50,
          outPercent: 50,
          inMl: 0,
          outMl: 0,
          inMlMax: 1000,
          outMlMax: 1000,
          avatar: getRandomAvatar(),
          status: isCKD && gfrStage ? getInitialStatus(gfrStage) : 'normal',
          // 新患者无尿检数据
          urineOsmolality: null,
          urineSpecificGravity: null,
          urinationCount: 0,
          // 新患者无日志
          timeline: []
        }
        
        setPatients(prev => [...prev, newPatient])
        console.log('%c✅ 新患者已添加到列表:', 'color: #10b981; font-weight: bold;', name)
      }
      
      // 清除已处理的新患者数据
      localStorage.removeItem('newPatientData')
    } catch (e) {
      console.error('解析新患者数据失败:', e)
      localStorage.removeItem('newPatientData')
    }
  }, []) // 只在组件挂载时执行一次
  
  // ---------- 实时数据 (socket) 集成
  // 说明：后端应推送形如 { event: 'device:update', payload: { patientId, kind, data, time } }
  // 其中 patientId 可为数字（病床）或 'current_patient'（家属端单患者档案）
  useEffect(() => {
    // SOCKET_URL 优先来自环境变量（Render/生产部署时可设置），回退到页面所在 origin，再回退到本地开发地址
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : null) || 'http://localhost:4000'
    let socket

    try {
      socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] })
    } catch (e) {
      console.warn('socket.io client init failed', e)
      return
    }

    socket.on('connect', () => {
      console.log('%c📡 socket connected', 'color: #49bdd8; font-weight: bold;', socket.id)
    })

    // 通用设备数据更新事件
    socket.on('device:update', (msg) => {
      try {
        const { patientId, kind, data, time } = msg || {}

        // 护理端：更新 patients 列表中对应患者的状态和 timeline
        if (appRole === 'caregiver') {
          if (!patientId) return
          setPatients(prev => prev.map(p => {
            if (String(p.id) === String(patientId)) {
              const next = { ...p }
              // 支持多种 data 更新（inMl/outMl/urine 等）
              if (data?.inMl) next.inMl = (next.inMl || 0) + Number(data.inMl)
              if (data?.outMl) next.outMl = (next.outMl || 0) + Number(data.outMl)
              if (data?.urineOsmolality != null) next.urineOsmolality = data.urineOsmolality
              if (data?.urineSpecificGravity != null) next.urineSpecificGravity = data.urineSpecificGravity
              if (data?.urinationCount != null) next.urinationCount = data.urinationCount

              // 更新 timeline（简单追加）
              if (kind === 'intake' || kind === 'output') {
                const entry = {
                  id: `evt-${Date.now()}`,
                  kind: kind === 'intake' ? 'intake' : 'output',
                  source: data?.source || 'device',
                  time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  sourceLabel: data?.sourceLabel || '设备',
                  title: data?.title || (kind === 'intake' ? '设备上报 · 饮水' : '设备上报 · 出量'),
                  valueMl: Number(data?.valueMl || data?.inMl || data?.outMl || 0),
                }
                next.timeline = [entry, ...(next.timeline || [])]
              }

              return next
            }
            return p
          }))
        }

        // 家属端：如果是当前患者的事件，追加到 familyTimeline
        if (appRole === 'family') {
          // 当后端使用 'current_patient' 标识家属档时，或 patientId === 'current_patient'
          if (!patientId || String(patientId) === 'current_patient') {
            if (kind === 'intake' || kind === 'output') {
              const entry = {
                id: `evt-${Date.now()}`,
                kind: kind === 'intake' ? 'intake' : 'output',
                source: data?.source || 'device',
                time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                sourceLabel: data?.sourceLabel || '设备',
                title: data?.title || (kind === 'intake' ? '设备上报 · 饮水' : '设备上报 · 出量'),
                valueMl: Number(data?.valueMl || data?.inMl || data?.outMl || 0),
              }
              setFamilyTimeline(prev => [entry, ...prev])
            }
            // 也可更新本地患者档案（如果存在 current_patient）
            setPatients(prev => prev.map(p => {
              if (String(p.id) === 'current_patient') {
                const next = { ...p }
                if (data?.urineOsmolality != null) next.urineOsmolality = data.urineOsmolality
                if (data?.urineSpecificGravity != null) next.urineSpecificGravity = data.urineSpecificGravity
                if (data?.inMl) next.inMl = (next.inMl || 0) + Number(data.inMl)
                if (data?.outMl) next.outMl = (next.outMl || 0) + Number(data.outMl)
                return next
              }
              return p
            }))
          }
        }
      } catch (e) {
        console.error('处理 device:update 事件失败', e)
      }
    })

    socket.on('disconnect', (reason) => {
      console.log('%c📴 socket disconnected', 'color: #f59e0b; font-weight: bold;', reason)
    })

    return () => {
      if (socket && socket.disconnect) socket.disconnect()
    }
  }, [appRole, setPatients, setFamilyTimeline])

  // 计算总入量和总出量（护工端）
  const totalInMl = patients.reduce((sum, p) => sum + p.inMl, 0)
  const totalOutMl = patients.reduce((sum, p) => sum + p.outMl, 0)
  const totalInMlMax = patients.reduce((sum, p) => sum + p.inMlMax, 0)
  const totalOutMlMax = patients.reduce((sum, p) => sum + p.outMlMax, 0)
  const totalInL = (totalInMl / 1000).toFixed(1)
  const totalOutL = (totalOutMl / 1000).toFixed(1)
  const totalInLMax = (totalInMlMax / 1000).toFixed(1)
  const totalOutLMax = (totalOutMlMax / 1000).toFixed(1)
  const totalInPercent = totalInMlMax > 0 ? Math.round((totalInMl / totalInMlMax) * 100) : 0
  const totalOutPercent = totalOutMlMax > 0 ? Math.round((totalOutMl / totalOutMlMax) * 100) : 0
  
  // 计算入量与出量之间的比例（用于圆环图匱示）
  const totalSum = totalInMl + totalOutMl
  const intakeRatio = totalSum > 0 ? Math.round((totalInMl / totalSum) * 100) : 50
  const outputRatio = totalSum > 0 ? Math.round((totalOutMl / totalSum) * 100) : 50

  useEffect(() => {
    localStorage.setItem('appRole', appRole)
  }, [appRole])

  const handleRoleChange = (nextRole) => {
    setAppRole(nextRole)
    setActiveTab('settings')
  }

  const handleOpenPatientDetail = (patientData) => {
    const el = pageContentRef.current
    if (el) {
      detailScrollBackupRef.current = el.scrollTop || 0
      el.scrollTop = 0
    }
    setSelectedPatient(patientData)
    setShowPatientDetail(true)
  }

  const handleClosePatientDetail = () => {
    setShowPatientDetail(false)
    setSelectedPatient(null)
    const el = pageContentRef.current
    if (el) {
      el.scrollTop = detailScrollBackupRef.current || 0
    }
  }

  // 当activeTab改变时，自动关闭患者详情页
  useEffect(() => {
    if (showPatientDetail) {
      setShowPatientDetail(false)
      setSelectedPatient(null)
    }
  }, [activeTab])

  const isNoScroll =
    appRole === 'caregiver'
      ? activeTab === 'patient' || activeTab === 'device' || activeTab === 'settings'
      : true

  useEffect(() => {
    const el = pageContentRef.current
    if (!el) return

    const nextKey = `${appRole}:${activeTab}`

    if (prevKeyRef.current) {
      scrollPositionsRef.current.set(prevKeyRef.current, el.scrollTop)
    }

    prevKeyRef.current = nextKey

    if (isNoScroll) {
      el.scrollTop = 0
      return
    }

    el.scrollTop = scrollPositionsRef.current.get(nextKey) ?? 0
  }, [appRole, activeTab, isNoScroll])

  return (
    <div className="main-app-container">
      {/* 页面内容区域 */}
      <div
        ref={pageContentRef}
        className={`page-content ${isNoScroll ? 'page-content--no-scroll' : ''}`}
      >
        {appRole === 'caregiver' ? (
          <>
            {showPatientDetail ? (
              <PatientDetailPage patientData={selectedPatient} onBack={handleClosePatientDetail} patients={patients} setPatients={setPatients} />
            ) : (
              <>
                {activeTab === 'home' && <WaterManagement activeTab={activeTab} setActiveTab={setActiveTab} onOpenPatientDetail={handleOpenPatientDetail} patients={patients} setPatients={setPatients} totalInL={totalInL} totalOutL={totalOutL} totalInLMax={totalInLMax} totalOutLMax={totalOutLMax} totalInPercent={totalInPercent} totalOutPercent={totalOutPercent} intakeRatio={intakeRatio} outputRatio={outputRatio} />}
                {activeTab === 'patient' && <PatientPage activeTab={activeTab} setActiveTab={setActiveTab} onOpenPatientDetail={handleOpenPatientDetail} patients={patients} setPatients={setPatients} />}
                {/* 其他页面可以在这里添加 */}
                {activeTab === 'device' && <DevicePage />}
                {activeTab === 'settings' && <SettingsPage appRole={appRole} onRoleChange={handleRoleChange} totalInL={totalInL} totalOutL={totalOutL} totalInLMax={totalInLMax} totalOutLMax={totalOutLMax} totalInPercent={totalInPercent} totalOutPercent={totalOutPercent} />}
              </>
            )}
          </>
        ) : (
          <>
            {activeTab === 'home' && <FamilyHomePage setActiveTab={setActiveTab} timeline={familyTimeline} setTimeline={setFamilyTimeline} />}
            {activeTab === 'analysis' && <FamilyAnalysisPage setActiveTab={setActiveTab} timeline={familyTimeline} setTimeline={setFamilyTimeline} />}
            {activeTab === 'knowledge' && <FamilyKnowledgePage setActiveTab={setActiveTab} />}
            {activeTab === 'settings' && <FamilySettingsPage appRole={appRole} onRoleChange={handleRoleChange} timeline={familyTimeline} />}
          </>
        )}
      </div>

      {/* 统一的底部导航栏 */}
      {appRole === 'caregiver' ? (
        <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      ) : (
        <FamilyBottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
    </div>
  )
}

export default MainApp
