import { useEffect, useState } from 'react'
import './App.css'

function App({ onComplete }) {
  const [selectedRole, setSelectedRole] = useState('caregiver') // 'family' or 'caregiver'
  const [selectedStage, setSelectedStage] = useState(1) // 1-5 for GFR stages, null for non-CKD
  const [isNonCKD, setIsNonCKD] = useState(false) // 是否选中非CKD患者
  const [patientName, setPatientName] = useState('')
  const [age, setAge] = useState('')
  const [weight, setWeight] = useState('')

  useEffect(() => {
    const raw = localStorage.getItem('patientData')
    if (!raw) return

    try {
      const data = JSON.parse(raw)

      // 兼容新旧数据格式
      if (data?.user_type) setSelectedRole(data.user_type)
      else if (data?.role === '我是家属') setSelectedRole('family')
      else if (data?.role === '我是护工') setSelectedRole('caregiver')

      if (data?.patient_name) setPatientName(data.patient_name)
      else if (data?.patientName && data.patientName !== '未填写') setPatientName(data.patientName)

      if (data?.age !== null && data?.age !== undefined) setAge(String(data.age))
      if (data?.weight !== null && data?.weight !== undefined) setWeight(String(data.weight))

      if (data?.is_ckd_patient === false || data?.isCKDPatient === false) {
        setIsNonCKD(true)
        setSelectedStage(null)
      } else {
        setIsNonCKD(false)
        if (typeof data?.gfr_stage === 'number') setSelectedStage(data.gfr_stage)
        else if (typeof data?.gfrStage === 'number') setSelectedStage(data.gfrStage)
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  // 处理 GFR 分期选择
  const handleStageSelect = (stage) => {
    setSelectedStage(stage)
    setIsNonCKD(false)
  }

  // 处理非CKD患者选择
  const handleNonCKDSelect = () => {
    setIsNonCKD(true)
    setSelectedStage(null)
  }

  // 获取 Stage 徽章的样式类名和文本
  const getStageBadgeInfo = () => {
    if (selectedStage === 1 || selectedStage === 2) {
      return { class: 'stage-badge-default', text: 'Stage 1' } // 绿色
    } else if (selectedStage === 3) {
      return { class: 'stage-badge-variant2', text: 'Stage 2' } // 橙色
    } else if (selectedStage === 4 || selectedStage === 5) {
      return { class: 'stage-badge-variant3', text: 'Stage 3' } // 红色
    }
    return { class: 'stage-badge-default', text: 'Stage 1' }
  }

  // 处理提交 - 记录所有数据
  const handleSubmit = () => {
    // 检查是否完整填写了所有必填信息
    const isComplete = patientName.trim() && age && weight && (isNonCKD || selectedStage)
    
    // 标准化的数据结构（适合后端对接）
    // 使用固定ID，每次建档都是覆盖同一个患者
    const formData = {
      // 元数据 - 使用固定ID
      id: 'current_patient',
      created_at: new Date().toISOString(),
      
      // 角色信息（使用枚举值）
      user_type: selectedRole, // 'family' | 'caregiver'
      
      // 基础体征（规范化类型）
      patient_name: patientName.trim() || null,
      age: age ? parseInt(age, 10) : null,
      weight: weight ? parseFloat(weight) : null,
      
      // CKD 信息
      is_ckd_patient: !isNonCKD,
      gfr_stage: isNonCKD ? null : selectedStage,
      
      // 标记是否完整填写（用于判断是否添加到患者列表）
      is_complete: isComplete,
      
      // 附加信息（用于前端显示）
      _display: {
        role_text: selectedRole === 'family' ? '我是家属' : '我是护工',
        stage_text: isNonCKD ? null : getStageBadgeInfo().text,
        timestamp_cn: new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      }
    }

    // 美化的控制台输出
    console.clear()
    console.log('%c==================== 患者建档数据 ====================', 'color: #0ea5e9; font-weight: bold; font-size: 14px;')
    console.log('')
    console.log('%c📋 基本信息', 'color: #10b981; font-weight: bold;')
    console.table({
      '患者ID': formData.id,
      '患者姓名': formData.patient_name || '(未填写)',
      '年龄': formData.age ? `${formData.age} 岁` : '(未填写)',
      '体重': formData.weight ? `${formData.weight} kg` : '(未填写)',
      '用户角色': formData._display.role_text,
    })
    
    console.log('%c🩺 CKD 信息', 'color: #f59e0b; font-weight: bold;')
    console.table({
      'CKD患者': formData.is_ckd_patient ? '是' : '否',
      'GFR分期': formData.gfr_stage ? `${formData.gfr_stage} 期` : '(无)',
      '风险等级': formData._display.stage_text || '(无)',
    })
    
    console.log('%c⏰ 时间信息', 'color: #8b5cf6; font-weight: bold;')
    console.table({
      '建档时间': formData._display.timestamp_cn,
      'ISO时间': formData.created_at,
    })
    
    console.log('')
    console.log('%c📦 完整 JSON 数据:', 'color: #64748b; font-weight: bold;')
    console.log(JSON.stringify(formData, null, 2))
    
    console.log('')
    console.log('%c💡 提示: 可在浏览器 DevTools → Application → Local Storage 中查看', 'color: #94a3b8; font-style: italic;')
    console.log('%c==================== 数据保存完成 ====================', 'color: #0ea5e9; font-weight: bold; font-size: 14px;')
    console.log('')

    // 保存到 localStorage（带格式化）
    localStorage.setItem('patientData', JSON.stringify(formData, null, 2))
    localStorage.setItem('appRole', selectedRole)
    
    // 如果完整填写了所有信息，保存为新患者数据（供护工端患者列表使用）
    if (isComplete) {
      localStorage.setItem('newPatientData', JSON.stringify(formData))
      console.log('%c✅ 信息完整，已记录到护工端患者列表', 'color: #10b981; font-weight: bold;')
    } else {
      console.log('%c⚠️ 信息不完整，不会添加到护工端患者列表', 'color: #f59e0b;')
    }

    // 全局调试工具（可在控制台直接调用）
    window.__debugPatientData = () => {
      const data = localStorage.getItem('patientData')
      if (data) {
        console.log('%c📋 当前患者建档数据:', 'color: #0ea5e9; font-weight: bold;')
        console.log(JSON.parse(data))
      } else {
        console.log('%c⚠️  暂无患者数据', 'color: #f59e0b;')
      }
    }
    
    console.log('%c🔧 调试提示: 输入 __debugPatientData() 可随时查看数据', 'color: #10b981;')

    if (typeof onComplete === 'function') onComplete(formData)
  }

  return (
    <div className={`app-container ${selectedRole === 'family' ? 'family-mode' : ''}`}>
      {/* 顶部标题 */}
      <div className="header">
        <h1 className="title">患者建档</h1>
      </div>

      {/* 角色选择 */}
      <div className="role-selector">
        <button 
          className={`role-btn family-btn ${selectedRole === 'family' ? 'selected' : ''}`}
          onClick={() => setSelectedRole('family')}
        >
          <img 
            src={selectedRole === 'family' ? '/icons/jiashu-fill.svg' : '/icons/jiashu.svg'}
            alt="家属图标"
            className="role-icon"
          />
          <span>我是家属</span>
        </button>
        <button 
          className={`role-btn caregiver-btn ${selectedRole === 'caregiver' ? 'selected' : ''}`}
          onClick={() => setSelectedRole('caregiver')}
        >
          <img 
            src={selectedRole === 'caregiver' ? '/icons/hugong-fill.svg' : '/icons/hugong.svg'}
            alt="护工图标"
            className="role-icon"
          />
          <span>我是护工</span>
        </button>
      </div>

      {/* 基础体征标题 */}
      <div className="section-title">基础体征</div>

      {/* 患者姓名输入框 */}
      <div className="input-field">
        <input 
          type="text" 
          placeholder="患者姓名"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
        />
      </div>

      {/* 年龄和体重输入框 */}
      <div className="input-row">
        <div className="input-field half">
          <input 
            type="number" 
            placeholder="年龄(岁)"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>
        <div className="input-field half">
          <input 
            type="number" 
            placeholder="体重(kg)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
      </div>

      {/* GFR分期选择 */}
      <div className="gfr-selector">
        <div className="gfr-header">
          <div className="gfr-label">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5.5" stroke="#5E6061" strokeWidth="1"/>
              <path d="M6 3V6L8 8" stroke="#5E6061" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            <span>GFR分期(肾病)</span>
          </div>
          {!isNonCKD && selectedStage && (
            <div className={`stage-badge ${getStageBadgeInfo().class}`}>
              {getStageBadgeInfo().text}
            </div>
          )}
        </div>
        
        <div className="stage-selector">
          <div className="stage-buttons">
            {[1, 2, 3, 4, 5].map((stage) => (
              <button
                key={stage}
                className={`stage-btn ${selectedStage === stage ? 'selected' : ''}`}
                onClick={() => handleStageSelect(stage)}
              >
                {stage}
              </button>
            ))}
          </div>
          <div className="stage-labels">
            <span className="stage-label-left">轻微</span>
            <span className="stage-label-right">透析期</span>
          </div>
        </div>
      </div>

      {/* 非CKD患者按钮 */}
      <button 
        className={`non-ckd-badge ${isNonCKD ? 'selected' : ''}`}
        onClick={handleNonCKDSelect}
      >
        非CKD患者
      </button>

      {/* 底部按钮 */}
      <button className="submit-btn" onClick={handleSubmit}>
        进入水分管理系统
      </button>
    </div>
  )
}

export default App
