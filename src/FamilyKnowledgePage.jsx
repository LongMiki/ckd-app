import React, { useMemo } from 'react'
import './FamilyKnowledgePage.css'

const imgAvatar = '/figma/family-avatar.png'

function FamilyKnowledgePage({ setActiveTab }) {
  const profile = useMemo(() => {
    const fallback = {
      name: '王某某',
      subtitle: 'GFR Ⅰ期 60kg 依从性良好',
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
        subtitle: `${gfr} ${weight} 依从性良好`,
      }
    } catch {
      return fallback
    }
  }, [])

  return (
    <div className="family-knowledge-page">
      <div className="fkp-header">
        <div className="fkp-header-content">
          <div className="fkp-title-group">
            <div className="fkp-title">{profile.name}</div>
            <div className="fkp-subtitle">{profile.subtitle}</div>
          </div>
          <div className="fkp-avatar" onClick={() => setActiveTab('settings')} style={{ cursor: 'pointer' }}>
            <img src={imgAvatar} alt="头像" />
          </div>
        </div>
      </div>

      <div className="fkp-scroll">
        <div className="fkp-card fkp-card--intro">
          <div className="fkp-card-inner">
            <div className="fkp-card-title">医学解释&你可以做什么</div>

            <div className="fkp-block">
              <div className="fkp-q">为什么要控制喝水</div>
              <div className="fkp-a">
                CKD患者的肾脏不能像正常人一样排水。多余的水积累在体内，会让心脏负担加重。所以透析时需要把多余的水清除出来。
              </div>
            </div>

            <div className="fkp-block">
              <div className="fkp-q">你可以做什么？</div>
              <ul className="fkp-list">
                <li>探视时多陪妈妈走走路，促进水分排出。</li>
                <li>如果患者口渴，可以含冰块或吃水果，而不是喝一杯水。</li>
                <li>帮助患者多吃低盐饭菜，盐多会让患者更渴。</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="fkp-card fkp-card--lesson">
          <div className="fkp-card-inner">
            <div className="fkp-card-title">学堂 CKD液体管理</div>

            <div className="fkp-block">
              <div className="fkp-q">CKD是什么？</div>
              <div className="fkp-a">
                慢性肾脏病 (Chronic Kidney Disease)。简单说，CKD患者的肾脏不能像正常人一样过滤血液和排尿。这会导致有害物质和多余的水分积累在体内。
              </div>
            </div>

            <div className="fkp-block">
              <div className="fkp-q">为什么不能喝太多水？</div>
              <div className="fkp-a">
                患者的肾脏已经不能有效排水。喝得越多，积累在体内的水就越多。多余的水会：
                <br />① 让心脏更累（心脏要用力泵血）
                <br />② 导致肺部积水（呼吸困难）
                <br />③ 引起全身浮肿（脚肿、脸肿）
              </div>
            </div>

            <div className="fkp-block">
              <div className="fkp-q">什么算"液体"？</div>
              <div className="fkp-a">
                不只是喝的水！这些都算：
                <br />✓ 白水、茶、咖啡
                <br />✓ 汤、粥、奶制品
                <br />✓ 水果（含水量多的）
                <br />✓ 冰淇淋、果冻
                <br />✓ 植入食物里的水分
              </div>
            </div>

            <div className="fkp-block">
              <div className="fkp-q">怎样知道控制得好不好？</div>
              <div className="fkp-a">
                看几个信号：
                <br />① 净入量：理想是 0 到 +100 mL
                <br />② 排尿频率：规律（不突然减少）
                <br />③ 尿液颜色：淡黄（不深黄，不无色）
                <br />④ 身体感受：没有呼吸困难、浮肿、乏力
              </div>
            </div>
          </div>
        </div>

        <div className="fkp-card">
          <div className="fkp-card-inner">
            <div className="fkp-card-title">活动与水分的关系</div>

            <div className="fkp-pill fkp-pill--good">
              <span className="fkp-mark fkp-mark--good">✓</span>
              <span>促进水分排出：散步、家务、做操</span>
            </div>
            <div className="fkp-pill fkp-pill--good">
              <span className="fkp-mark fkp-mark--good">✓</span>
              <span>适度活动：饭后散步 10-15 分钟最佳</span>
            </div>
            <div className="fkp-pill fkp-pill--good">
              <span className="fkp-mark fkp-mark--good">✓</span>
              <span>坚持规律：每天同样时间活动，帮助排尿规律</span>
            </div>
            <div className="fkp-pill fkp-pill--bad">
              <span className="fkp-mark fkp-mark--bad">✗</span>
              <span>避免长期卧床：会减少排尿，导致水分积累</span>
            </div>
            <div className="fkp-pill fkp-pill--bad">
              <span className="fkp-mark fkp-mark--bad">✗</span>
              <span>避免大量出汗运动：反而会增加水的需求</span>
            </div>
          </div>
        </div>

        <div className="fkp-card">
          <div className="fkp-card-inner">
            <div className="fkp-card-title">什么时候要立即就医？</div>

            <div className="fkp-pill fkp-pill--alert">
              <span className="fkp-mark fkp-mark--bad">!</span>
              <span>呼吸困难或喘不上气——可能是肺部积水</span>
            </div>
            <div className="fkp-pill fkp-pill--alert">
              <span className="fkp-mark fkp-mark--bad">!</span>
              <span>突然体重快速增加（1-2 天增加超过 1 kg）——可能是水分积累</span>
            </div>
            <div className="fkp-pill fkp-pill--alert">
              <span className="fkp-mark fkp-mark--bad">!</span>
              <span>脸、脚严重肿胀——可能是全身浮肿</span>
            </div>
            <div className="fkp-pill fkp-pill--alert">
              <span className="fkp-mark fkp-mark--bad">!</span>
              <span>突然不排尿（超过 8 小时）——肾脏可能出问题</span>
            </div>
            <div className="fkp-pill fkp-pill--alert">
              <span className="fkp-mark fkp-mark--bad">!</span>
              <span>尿血或尿变黑——需要立即检查</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FamilyKnowledgePage
