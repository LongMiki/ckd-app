"""
尿液分析后端服务器 - 优化版 v1.3.0
支持Arduino数据接收 + AI智能分析 + Web界面显示
优化：移除压力显示，改为尿量、时间、频率、总尿量统计
文件名: urine_server_v1.3.0.py
作者: AI助手
版本: 1.3.0
"""

# ===========================================
# 1. 导入必要的库
# ===========================================
from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import json
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
import requests
import re
import threading
import os
from openai import OpenAI
import colorsys
import statistics
from collections import deque

# ===========================================
# 2. 配置设置
# ===========================================

# Flask服务器配置
FLASK_CONFIG = {
    "host": "0.0.0.0",      # 监听所有网络接口
    "port": 5000,           # 端口号
    "debug": True,          # 调试模式（生产环境设为False）
    "secret_key": "urine-analysis-secret-2024"
}

# AI大模型配置 - 使用OpenAI SDK格式
AI_CONFIG = {
    "enabled": True,        # 是否启用AI分析
    "base_url": "https://api.vectorengine.ai/v1",  # API基础地址
    "api_key": "sk-qwCvOU3TDrnzRPDshIVrQAWL9XaPLBC58ZeA2vOjDbYSctKn",  # API密钥
    "model": "gpt-4o",      # 模型名称
    "timeout": 120,         # API超时时间
    "max_tokens": 2000      # 最大回复长度
}

# 数据存储配置
STORAGE_CONFIG = {
    "max_records": 1000,    # 最大存储记录数
    "save_to_file": True,   # 是否保存到文件
    "data_file": "urine_data.json",  # 数据文件
    "html_template_file": "dashboard.html"  # 模板文件
}

# 尿量分析配置
URINE_VOLUME_CONFIG = {
    "urination_event_window": 5,  # 小便事件窗口时间（秒）
    "min_urination_volume": 50,   # 最小尿量阈值（ml）
    "max_urination_volume": 800,  # 最大尿量阈值（ml）
    "urination_frequency_window": 24,  # 频率统计窗口（小时）
    "daily_volume_goal": 1500,    # 每日尿量目标（ml）
    "normal_urination_range": (200, 500),  # 正常单次尿量范围（ml）
    "normal_daily_range": (800, 2000)  # 正常每日尿量范围（ml）
}

# ===========================================
# 3. 初始化
# ===========================================

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('urine_server.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# 创建Flask应用
app = Flask(__name__)
app.config['SECRET_KEY'] = FLASK_CONFIG['secret_key']
CORS(app)  # 允许跨域请求

# 数据存储 - 增加尿量相关统计
data_store = {
    "total_received": 0,
    "last_received": None,
    "arduino_data": [],
    "analysis_results": [],
    "latest_data": None,
    "latest_ai_analysis": None,
    "device_status": {},
    "urination_events": [],  # 存储小便事件
    "daily_stats": {         # 每日统计
        "today": datetime.now().strftime("%Y-%m-%d"),
        "total_volume": 0,   # 今日总尿量
        "event_count": 0,    # 今日小便次数
        "average_volume": 0, # 平均单次尿量
        "frequency_hours": 0 # 平均间隔小时数
    },
    "volume_trends": {       # 尿量趋势
        "last_24h": {"volume": 0, "events": 0},
        "last_week": {"volume": 0, "events": 0}
    },
    "system_stats": {
        "total_ai_requests": 0,
        "successful_ai_requests": 0,
        "avg_response_time": 0
    }
}

# ===========================================
# 4. 核心功能类
# ===========================================

class UrineVolumeAnalyzer:
    """尿量分析器"""
    
    def __init__(self, config=URINE_VOLUME_CONFIG):
        self.config = config
        self.current_urination_event = None
        self.event_start_time = None
        
    def detect_urination_event(self, data: Dict) -> Dict:
        """检测小便事件"""
        try:
            timestamp = datetime.now()
            
            # 检查是否有尿量数据
            if "urine_volume" not in data and "flow_rate" not in data:
                return {"event_detected": False, "message": "无尿量数据"}
            
            # 获取尿量（单位：ml）
            urine_volume = 0
            if "urine_volume" in data:
                urine_volume = float(data["urine_volume"])
            elif "flow_rate" in data:
                # 如果有流量数据，可以估算尿量
                flow_rate = float(data["flow_rate"])
                # 假设采样间隔为1秒，这里需要根据实际情况调整
                urine_volume = flow_rate * 1  # 简化计算
                
            # 检查是否达到最小尿量阈值
            if urine_volume < self.config["min_urination_volume"]:
                return {"event_detected": False, "volume": urine_volume}
            
            # 检查是否是新事件
            if self.current_urination_event is None:
                # 开始新事件
                self.current_urination_event = {
                    "event_id": f"event_{int(time.time())}",
                    "start_time": timestamp.isoformat(),
                    "end_time": None,
                    "total_volume": urine_volume,
                    "peak_flow_rate": 0,
                    "average_flow_rate": 0,
                    "duration": 0,
                    "flow_data": [{"time": timestamp.isoformat(), "volume": urine_volume}]
                }
                self.event_start_time = timestamp
                return {"event_detected": True, "event_started": True, "volume": urine_volume}
            else:
                # 继续当前事件
                time_diff = (timestamp - self.event_start_time).total_seconds()
                if time_diff <= self.config["urination_event_window"]:
                    # 在事件窗口内，累计尿量
                    self.current_urination_event["total_volume"] += urine_volume
                    self.current_urination_event["flow_data"].append({
                        "time": timestamp.isoformat(),
                        "volume": urine_volume
                    })
                    return {"event_detected": True, "event_continuing": True, "volume": urine_volume}
                else:
                    # 事件结束
                    self.current_urination_event["end_time"] = timestamp.isoformat()
                    duration = time_diff
                    self.current_urination_event["duration"] = duration
                    
                    # 计算平均流量
                    if duration > 0:
                        self.current_urination_event["average_flow_rate"] = (
                            self.current_urination_event["total_volume"] / duration
                        )
                    
                    # 完成事件
                    completed_event = self.current_urination_event.copy()
                    
                    # 重置当前事件
                    self.current_urination_event = None
                    self.event_start_time = None
                    
                    return {
                        "event_detected": True,
                        "event_completed": True,
                        "event": completed_event,
                        "volume": urine_volume
                    }
                    
        except Exception as e:
            logger.error(f"检测小便事件失败: {e}")
            return {"event_detected": False, "error": str(e)}

    def calculate_daily_stats(self, events: List[Dict]) -> Dict:
        """计算每日统计"""
        today = datetime.now().strftime("%Y-%m-%d")
        today_events = [
            event for event in events 
            if event.get("start_time", "").startswith(today)
        ]
        
        if not today_events:
            return {
                "date": today,
                "total_volume": 0,
                "event_count": 0,
                "average_volume": 0,
                "frequency_hours": 0,
                "max_volume": 0,
                "min_volume": 0,
                "volume_percentage": 0
            }
        
        volumes = [event.get("total_volume", 0) for event in today_events]
        total_volume = sum(volumes)
        event_count = len(today_events)
        average_volume = total_volume / event_count if event_count > 0 else 0
        
        # 计算时间间隔
        time_intervals = []
        sorted_events = sorted(today_events, key=lambda x: x.get("start_time", ""))
        
        for i in range(1, len(sorted_events)):
            start1 = datetime.fromisoformat(sorted_events[i-1].get("start_time"))
            start2 = datetime.fromisoformat(sorted_events[i].get("start_time"))
            interval_hours = (start2 - start1).total_seconds() / 3600
            time_intervals.append(interval_hours)
        
        frequency_hours = statistics.mean(time_intervals) if time_intervals else 0
        
        # 计算目标完成百分比
        volume_percentage = min(100, (total_volume / self.config["daily_volume_goal"]) * 100)
        
        return {
            "date": today,
            "total_volume": round(total_volume, 1),
            "event_count": event_count,
            "average_volume": round(average_volume, 1),
            "frequency_hours": round(frequency_hours, 1),
            "max_volume": round(max(volumes), 1) if volumes else 0,
            "min_volume": round(min(volumes), 1) if volumes else 0,
            "volume_percentage": round(volume_percentage, 1),
            "goal_ml": self.config["daily_volume_goal"]
        }

    def analyze_volume_patterns(self, events: List[Dict]) -> Dict:
        """分析尿量模式"""
        if len(events) < 3:
            return {"insufficient_data": True, "message": "需要更多数据进行分析"}
        
        # 获取最近24小时的事件
        cutoff_24h = datetime.now() - timedelta(hours=24)
        recent_events = [
            event for event in events 
            if datetime.fromisoformat(event.get("start_time", "")) > cutoff_24h
        ]
        
        # 获取最近一周的事件
        cutoff_week = datetime.now() - timedelta(days=7)
        week_events = [
            event for event in events 
            if datetime.fromisoformat(event.get("start_time", "")) > cutoff_week
        ]
        
        # 按小时统计频率
        hourly_pattern = {}
        for event in recent_events:
            event_time = datetime.fromisoformat(event.get("start_time", ""))
            hour = event_time.hour
            hourly_pattern[hour] = hourly_pattern.get(hour, 0) + 1
        
        # 分析趋势
        volumes_24h = [event.get("total_volume", 0) for event in recent_events]
        volumes_week = [event.get("total_volume", 0) for event in week_events]
        
        avg_24h = statistics.mean(volumes_24h) if volumes_24h else 0
        avg_week = statistics.mean(volumes_week) if volumes_week else 0
        
        # 检测异常模式
        anomalies = []
        normal_min, normal_max = self.config["normal_urination_range"]
        
        for event in recent_events:
            volume = event.get("total_volume", 0)
            if volume < normal_min:
                anomalies.append({
                    "time": event.get("start_time"),
                    "type": "low_volume",
                    "volume": volume,
                    "normal_range": f"{normal_min}-{normal_max} ml"
                })
            elif volume > normal_max:
                anomalies.append({
                    "time": event.get("start_time"),
                    "type": "high_volume",
                    "volume": volume,
                    "normal_range": f"{normal_min}-{normal_max} ml"
                })
        
        return {
            "recent_24h": {
                "event_count": len(recent_events),
                "total_volume": round(sum(volumes_24h), 1),
                "average_volume": round(avg_24h, 1),
                "hourly_pattern": hourly_pattern
            },
            "recent_week": {
                "event_count": len(week_events),
                "total_volume": round(sum(volumes_week), 1),
                "average_volume": round(avg_week, 1)
            },
            "anomalies": anomalies,
            "normal_single_range": f"{normal_min}-{normal_max} ml",
            "normal_daily_range": f"{self.config['normal_daily_range'][0]}-{self.config['normal_daily_range'][1]} ml"
        }

class UrineColorAnalyzer:
    """尿液颜色分析器"""
    
    # 尿液颜色分类标准（基于临床医学）
    URINE_COLORS = {
        "透明无色": {
            "description": "水分摄入过多，尿液极度稀释",
            "clinical_meaning": "可能表示饮水过多或尿崩症",
            "rgb_range": [(200, 200, 200), (255, 255, 255)],
            "hsv_range": [(0, 0, 0.8), (360, 0.1, 1.0)],
            "health_status": "一般正常，但可能过度饮水"
        },
        "淡黄色": {
            "description": "正常健康尿液，水分充足",
            "clinical_meaning": "理想的尿液颜色，表明水分平衡良好",
            "rgb_range": [(220, 220, 150), (255, 255, 200)],
            "hsv_range": [(50, 20, 86), (60, 30, 100)],
            "health_status": "健康"
        },
        "黄色": {
            "description": "正常尿液，轻微脱水",
            "clinical_meaning": "轻微脱水或正常生理变化",
            "rgb_range": [(200, 200, 100), (240, 240, 140)],
            "hsv_range": [(55, 40, 78), (60, 60, 94)],
            "health_status": "基本健康，建议适当饮水"
        },
        "深黄色": {
            "description": "明显脱水，需补充水分",
            "clinical_meaning": "脱水状态，可能因出汗、饮水不足引起",
            "rgb_range": [(180, 160, 80), (220, 200, 120)],
            "hsv_range": [(50, 50, 70), (55, 65, 86)],
            "health_status": "轻度脱水"
        },
        "琥珀色": {
            "description": "严重脱水，立即补充水分",
            "clinical_meaning": "严重脱水，需要立即补充液体",
            "rgb_range": [(160, 120, 60), (200, 160, 100)],
            "hsv_range": [(40, 50, 62), (45, 70, 78)],
            "health_status": "中度脱水"
        },
        "橙色": {
            "description": "可能脱水或药物影响",
            "clinical_meaning": "可能由药物（如利福平）、脱水或肝脏问题引起",
            "rgb_range": [(200, 120, 60), (240, 160, 100)],
            "hsv_range": [(25, 50, 78), (35, 75, 94)],
            "health_status": "需关注，可能异常"
        },
        "棕色": {
            "description": "可能肝脏问题或严重脱水",
            "clinical_meaning": "可能表示肝脏疾病、溶血或横纹肌溶解症",
            "rgb_range": [(120, 80, 40), (160, 120, 80)],
            "hsv_range": [(30, 50, 47), (40, 75, 62)],
            "health_status": "异常，建议就医检查"
        },
        "红色": {
            "description": "可能血尿",
            "clinical_meaning": "可能表示尿路感染、结石、肿瘤或肾脏疾病",
            "rgb_range": [(150, 40, 40), (255, 100, 100)],
            "hsv_range": [(0, 50, 58), (10, 85, 100)],
            "health_status": "紧急，需要立即就医"
        },
        "粉红色": {
            "description": "微量血尿或食物色素",
            "clinical_meaning": "可能为微量血尿或食用甜菜、蓝莓等食物",
            "rgb_range": [(200, 120, 140), (255, 180, 200)],
            "hsv_range": [(340, 20, 78), (350, 50, 100)],
            "health_status": "需进一步检查"
        },
        "绿色/蓝色": {
            "description": "罕见，可能细菌感染或药物",
            "clinical_meaning": "可能由绿脓杆菌感染、特定药物或食物色素引起",
            "rgb_range": [(80, 150, 150), (150, 200, 200)],
            "hsv_range": [(170, 30, 58), (190, 50, 78)],
            "health_status": "异常，建议就医"
        },
        "浑浊白色": {
            "description": "可能脓尿或磷酸盐沉淀",
            "clinical_meaning": "可能表示尿路感染、乳糜尿或磷酸盐尿",
            "rgb_range": [(180, 180, 180), (220, 220, 220)],
            "hsv_range": [(0, 0, 70), (360, 0.1, 86)],
            "health_status": "异常，需要检查"
        }
    }
    
    @staticmethod
    def rgb_to_hsv(r: int, g: int, b: int) -> tuple:
        """将RGB转换为HSV颜色空间"""
        r_norm = r / 255.0
        g_norm = g / 255.0
        b_norm = b / 255.0
        
        h, s, v = colorsys.rgb_to_hsv(r_norm, g_norm, b_norm)
        h_deg = h * 360  # 色相转换为度数
        s_percent = s * 100  # 饱和度转换为百分比
        v_percent = v * 100  # 明度转换为百分比
        
        return (h_deg, s_percent, v_percent)
    
    @staticmethod
    def analyze_color_from_rgb(rgb_str: str) -> Dict:
        """从RGB字符串分析尿液颜色"""
        try:
            # 解析RGB字符串
            if not rgb_str or rgb_str == "0,0,0":
                return {
                    "success": False,
                    "error": "无效的RGB值",
                    "color_name": "未知",
                    "description": "无法分析颜色"
                }
            
            rgb_parts = rgb_str.split(',')
            if len(rgb_parts) != 3:
                return {
                    "success": False,
                    "error": "RGB格式错误",
                    "color_name": "未知",
                    "description": "RGB格式应为'R,G,B'"
                }
            
            r = int(rgb_parts[0].strip())
            g = int(rgb_parts[1].strip())
            b = int(rgb_parts[2].strip())
            
            # 转换为HSV
            h, s, v = UrineColorAnalyzer.rgb_to_hsv(r, g, b)
            
            # 分析颜色分类
            color_result = UrineColorAnalyzer._classify_color(r, g, b, h, s, v)
            
            # 添加详细分析
            detailed_analysis = UrineColorAnalyzer._get_detailed_analysis(
                color_result["color_name"], r, g, b, h, s, v
            )
            
            result = {
                "success": True,
                "rgb": f"{r},{g},{b}",
                "rgb_values": {"r": r, "g": g, "b": b},
                "hsv_values": {"h": round(h, 1), "s": round(s, 1), "v": round(v, 1)},
                "color_name": color_result["color_name"],
                "confidence": color_result["confidence"],
                "description": color_result["description"],
                "clinical_meaning": color_result["clinical_meaning"],
                "health_status": color_result["health_status"],
                "detailed_analysis": detailed_analysis,
                "recommendations": UrineColorAnalyzer._get_recommendations(color_result["color_name"])
            }
            
            return result
            
        except Exception as e:
            logger.error(f"颜色分析失败: {e}")
            return {
                "success": False,
                "error": str(e),
                "color_name": "分析错误",
                "description": "颜色分析过程中发生错误"
            }
    
    @staticmethod
    def _classify_color(r: int, g: int, b: int, h: float, s: float, v: float) -> Dict:
        """根据颜色特征分类尿液颜色"""
        
        # 计算颜色差异
        max_val = max(r, g, b)
        min_val = min(r, g, b)
        
        # 1. 检查是否为无色/透明
        if v > 80 and s < 10:
            return {
                "color_name": "透明无色",
                "confidence": 0.9,
                "description": UrineColorAnalyzer.URINE_COLORS["透明无色"]["description"],
                "clinical_meaning": UrineColorAnalyzer.URINE_COLORS["透明无色"]["clinical_meaning"],
                "health_status": UrineColorAnalyzer.URINE_COLORS["透明无色"]["health_status"]
            }
        
        # 2. 检查是否为红色/粉红色
        if (h < 15 or h > 340) and s > 30:
            if r > g * 1.5 and r > b * 1.5:
                if s > 50 and r > 150:
                    return {
                        "color_name": "红色",
                        "confidence": 0.8,
                        "description": UrineColorAnalyzer.URINE_COLORS["红色"]["description"],
                        "clinical_meaning": UrineColorAnalyzer.URINE_COLORS["红色"]["clinical_meaning"],
                        "health_status": UrineColorAnalyzer.URINE_COLORS["红色"]["health_status"]
                    }
                else:
                    return {
                        "color_name": "粉红色",
                        "confidence": 0.7,
                        "description": UrineColorAnalyzer.URINE_COLORS["粉红色"]["description"],
                        "clinical_meaning": UrineColorAnalyzer.URINE_COLORS["粉红色"]["clinical_meaning"],
                        "health_status": UrineColorAnalyzer.URINE_COLORS["粉红色"]["health_status"]
                    }
        
        # 3. 检查是否为绿色/蓝色
        if 100 < h < 200 and s > 20:
            return {
                "color_name": "绿色/蓝色",
                "confidence": 0.7,
                "description": UrineColorAnalyzer.URINE_COLORS["绿色/蓝色"]["description"],
                "clinical_meaning": UrineColorAnalyzer.URINE_COLORS["绿色/蓝色"]["clinical_meaning"],
                "health_status": UrineColorAnalyzer.URINE_COLORS["绿色/蓝色"]["health_status"]
            }
        
        # 4. 检查是否为橙色
        if 15 < h < 45 and s > 40:
            return {
                "color_name": "橙色",
                "confidence": 0.7,
                "description": UrineColorAnalyzer.URINE_COLORS["橙色"]["description"],
                "clinical_meaning": UrineColorAnalyzer.URINE_COLORS["橙色"]["clinical_meaning"],
                "health_status": UrineColorAnalyzer.URINE_COLORS["橙色"]["health_status"]
            }
        
        # 5. 检查是否为棕色
        if 20 < h < 50 and s > 30 and v < 70:
            return {
                "color_name": "棕色",
                "confidence": 0.7,
                "description": UrineColorAnalyzer.URINE_COLORS["棕色"]["description"],
                "clinical_meaning": UrineColorAnalyzer.URINE_COLORS["棕色"]["clinical_meaning"],
                "health_status": UrineColorAnalyzer.URINE_COLORS["棕色"]["health_status"]
            }
        
        # 6. 检查是否为浑浊白色
        if s < 10 and 50 < v < 85:
            return {
                "color_name": "浑浊白色",
                "confidence": 0.6,
                "description": UrineColorAnalyzer.URINE_COLORS["浑浊白色"]["description"],
                "clinical_meaning": UrineColorAnalyzer.URINE_COLORS["浑浊白色"]["clinical_meaning"],
                "health_status": UrineColorAnalyzer.URINE_COLORS["浑浊白色"]["health_status"]
            }
        
        # 7. 根据黄色程度分类（正常的尿液颜色范围）
        # 计算黄色指数（基于红色和绿色的比例）
        yellow_index = (r + g) / (2 * 255) * 100
        
        if yellow_index > 80:
            if v > 80:
                return {
                    "color_name": "淡黄色",
                    "confidence": 0.8,
                    "description": UrineColorAnalyzer.URINE_COLORS["淡黄色"]["description"],
                    "clinical_meaning": UrineColorAnalyzer.URINE_COLORS["淡黄色"]["clinical_meaning"],
                    "health_status": UrineColorAnalyzer.URINE_COLORS["淡黄色"]["health_status"]
                }
            else:
                return {
                    "color_name": "黄色",
                    "confidence": 0.8,
                    "description": UrineColorAnalyzer.URINE_COLORS["黄色"]["description"],
                    "clinical_meaning": UrineColorAnalyzer.URINE_COLORS["黄色"]["clinical_meaning"],
                    "health_status": UrineColorAnalyzer.URINE_COLORS["黄色"]["health_status"]
                }
        elif yellow_index > 60:
            return {
                "color_name": "深黄色",
                "confidence": 0.75,
                "description": UrineColorAnalyzer.URINE_COLORS["深黄色"]["description"],
                "clinical_meaning": UrineColorAnalyzer.URINE_COLORS["深黄色"]["clinical_meaning"],
                "health_status": UrineColorAnalyzer.URINE_COLORS["深黄色"]["health_status"]
            }
        elif yellow_index > 40:
            return {
                "color_name": "琥珀色",
                "confidence": 0.7,
                "description": UrineColorAnalyzer.URINE_COLORS["琥珀色"]["description"],
                "clinical_meaning": UrineColorAnalyzer.URINE_COLORS["琥珀色"]["clinical_meaning"],
                "health_status": UrineColorAnalyzer.URINE_COLORS["琥珀色"]["health_status"]
            }
        
        # 默认返回未知
        return {
            "color_name": "未知",
            "confidence": 0.5,
            "description": "无法准确分类的颜色",
            "clinical_meaning": "可能需要进一步检查",
            "health_status": "待确定"
        }
    
    @staticmethod
    def _get_detailed_analysis(color_name: str, r: int, g: int, b: int, h: float, s: float, v: float) -> Dict:
        """获取详细的颜色分析"""
        
        analysis = {
            "hydration_level": "正常",
            "possible_causes": [],
            "medical_conditions": [],
            "urgency_level": "低"
        }
        
        # 根据颜色名称设置分析结果
        if color_name == "透明无色":
            analysis["hydration_level"] = "过度水合"
            analysis["possible_causes"] = ["饮水过多", "尿崩症", "糖尿病"]
            analysis["urgency_level"] = "低"
        elif color_name == "淡黄色":
            analysis["hydration_level"] = "良好"
            analysis["possible_causes"] = ["正常水分摄入", "健康状态"]
            analysis["urgency_level"] = "无"
        elif color_name == "黄色":
            analysis["hydration_level"] = "轻度脱水"
            analysis["possible_causes"] = ["饮水不足", "轻微出汗"]
            analysis["urgency_level"] = "低"
        elif color_name == "深黄色":
            analysis["hydration_level"] = "中度脱水"
            analysis["possible_causes"] = ["明显饮水不足", "大量出汗", "发热"]
            analysis["medical_conditions"] = ["脱水"]
            analysis["urgency_level"] = "中"
        elif color_name == "琥珀色":
            analysis["hydration_level"] = "重度脱水"
            analysis["possible_causes"] = ["严重饮水不足", "腹泻", "呕吐"]
            analysis["medical_conditions"] = ["严重脱水"]
            analysis["urgency_level"] = "高"
        elif color_name == "橙色":
            analysis["hydration_level"] = "脱水或异常"
            analysis["possible_causes"] = ["脱水", "药物影响（如利福平）", "肝脏问题"]
            analysis["medical_conditions"] = ["肝脏疾病", "胆道梗阻"]
            analysis["urgency_level"] = "中"
        elif color_name == "棕色":
            analysis["hydration_level"] = "异常"
            analysis["possible_causes"] = ["严重脱水", "肝脏疾病", "溶血", "横纹肌溶解"]
            analysis["medical_conditions"] = ["肝病", "溶血性贫血", "肌肉损伤"]
            analysis["urgency_level"] = "高"
        elif color_name == "红色":
            analysis["hydration_level"] = "紧急"
            analysis["possible_causes"] = ["血尿", "尿路感染", "肾结石", "肿瘤"]
            analysis["medical_conditions"] = ["血尿", "泌尿系统疾病", "肾脏疾病"]
            analysis["urgency_level"] = "紧急"
        elif color_name == "粉红色":
            analysis["hydration_level"] = "需关注"
            analysis["possible_causes"] = ["微量血尿", "食物色素（甜菜、蓝莓）", "药物"]
            analysis["medical_conditions"] = ["尿路感染", "肾小球肾炎"]
            analysis["urgency_level"] = "中"
        elif color_name == "绿色/蓝色":
            analysis["hydration_level"] = "异常"
            analysis["possible_causes"] = ["细菌感染", "特定药物", "食物色素"]
            analysis["medical_conditions"] = ["绿脓杆菌感染", "胆汁淤积"]
            analysis["urgency_level"] = "高"
        elif color_name == "浑浊白色":
            analysis["hydration_level"] = "异常"
            analysis["possible_causes"] = ["尿路感染", "磷酸盐沉淀", "乳糜尿"]
            analysis["medical_conditions"] = ["脓尿", "泌尿系统感染"]
            analysis["urgency_level"] = "中"
        
        # 添加基于HSV的额外分析
        analysis["color_characteristics"] = {
            "hue_category": "暖色" if h < 60 or h > 300 else "冷色",
            "saturation_level": "低饱和度" if s < 30 else "高饱和度",
            "brightness_level": "明亮" if v > 70 else "暗淡"
        }
        
        return analysis
    
    @staticmethod
    def _get_recommendations(color_name: str) -> List[str]:
        """根据颜色获取建议"""
        recommendations = []
        
        if color_name in ["透明无色", "淡黄色"]:
            recommendations = [
                "继续保持当前水分摄入量",
                "定期监测尿液颜色",
                "保持健康饮食"
            ]
        elif color_name in ["黄色", "深黄色"]:
            recommendations = [
                "增加水分摄入，每天至少喝2升水",
                "减少咖啡因和酒精摄入",
                "观察尿液颜色变化"
            ]
        elif color_name in ["琥珀色", "橙色"]:
            recommendations = [
                "立即补充水分，小口频饮",
                "如果持续存在，咨询医生",
                "避免剧烈运动导致进一步脱水"
            ]
        elif color_name in ["棕色", "红色", "粉红色"]:
            recommendations = [
                "立即就医检查",
                "记录症状发生时间",
                "避免自行用药"
            ]
        elif color_name in ["绿色/蓝色", "浑浊白色"]:
            recommendations = [
                "咨询医生进行尿常规检查",
                "注意是否有发热、尿痛等症状",
                "收集尿液样本供医生检查"
            ]
        else:
            recommendations = [
                "建议进行尿液常规检查",
                "咨询专业医生",
                "记录其他相关症状"
            ]
        
        return recommendations
    
    @staticmethod
    def get_color_chart() -> List[Dict]:
        """获取尿液颜色对照表"""
        color_chart = []
        for color_name, info in UrineColorAnalyzer.URINE_COLORS.items():
            color_info = {
                "name": color_name,
                "description": info["description"],
                "clinical_meaning": info["clinical_meaning"],
                "health_status": info["health_status"],
                "typical_rgb": info["rgb_range"][0]  # 取典型值
            }
            color_chart.append(color_info)
        return color_chart

class ArduinoDataParser:
    """Arduino数据解析器"""
    
    def __init__(self):
        self.color_analyzer = UrineColorAnalyzer()
        self.volume_analyzer = UrineVolumeAnalyzer()
    
    def parse_json_data(self, data: Dict) -> Dict:
        """解析Arduino发送的JSON数据"""
        try:
            result = {
                "success": True,
                "timestamp": data.get("timestamp", datetime.now().isoformat()),
                "device_id": data.get("device_id", "unknown"),
                "raw_data": data,
                "parsed": {},
                "warnings": [],
                "volume_data": {}
            }
            
            # 解析颜色数据
            if "color_rgb" in data:
                rgb_str = data["color_rgb"]
                result["parsed"]["color_rgb"] = rgb_str
                
                # 进行尿液颜色分析
                color_analysis = self.color_analyzer.analyze_color_from_rgb(rgb_str)
                result["parsed"]["color_analysis"] = color_analysis
                
                if color_analysis["success"]:
                    # 添加颜色警告
                    if color_analysis["color_name"] in ["红色", "棕色", "绿色/蓝色"]:
                        result["warnings"].append(f"尿液颜色异常: {color_analysis['color_name']}")
                    elif color_analysis["color_name"] in ["琥珀色", "橙色"]:
                        result["warnings"].append(f"尿液颜色提示脱水: {color_analysis['color_name']}")
                else:
                    result["warnings"].append("颜色分析失败")
            
            # 解析尿量相关数据
            volume_ml = 0
            if "urine_volume" in data:
                volume_ml = float(data["urine_volume"])
                result["parsed"]["urine_volume"] = f"{volume_ml:.1f} ml"
                result["volume_data"]["current_volume"] = volume_ml
            elif "flow_rate" in data:
                flow_rate = float(data["flow_rate"])
                result["parsed"]["flow_rate"] = f"{flow_rate:.1f} ml/s"
                result["volume_data"]["flow_rate"] = flow_rate
                
                # 如果采样间隔已知，可以估算尿量
                if "sample_interval" in data:
                    interval = float(data["sample_interval"])
                    volume_ml = flow_rate * interval
                    result["parsed"]["estimated_volume"] = f"{volume_ml:.1f} ml"
                    result["volume_data"]["current_volume"] = volume_ml
            
            # 检测小便事件
            if volume_ml > 0:
                event_result = self.volume_analyzer.detect_urination_event(data)
                result["volume_data"]["event"] = event_result
                
                if event_result.get("event_detected"):
                    if event_result.get("event_completed"):
                        result["warnings"].append(f"小便事件完成: {event_result['event']['total_volume']:.1f} ml")
                    elif event_result.get("event_started"):
                        result["warnings"].append("小便事件开始检测")
            
            # 解析电导率
            if "ec_value" in data:
                ec_value = float(data["ec_value"])
                result["parsed"]["conductivity"] = f"{ec_value:.3f} mS/cm"
                
                # 电导率警告
                if ec_value == 0:
                    result["warnings"].append("电导率: 0，可能传感器故障")
                elif ec_value < 0.1:
                    result["warnings"].append("电导率极低，样本可能极度稀释")
            
            # 解析浓度
            if "concentration" in data:
                result["parsed"]["concentration"] = data["concentration"]
            
            # 解析估算值
            if "estimated_sg" in data:
                sg = float(data["estimated_sg"])
                sg_category = data.get("sg_category", "未知")
                result["parsed"]["specific_gravity"] = f"{sg:.4f} ({sg_category})"
            
            if "estimated_na" in data:
                na = float(data["estimated_na"])
                na_category = data.get("na_category", "未知")
                result["parsed"]["sodium"] = f"{na:.1f} mmol/L ({na_category})"
            
            # 解析传感器原始值
            if "fsr_raw" in data:
                result["parsed"]["fsr_raw"] = data["fsr_raw"]
            
            if "fsr_resistance" in data:
                result["parsed"]["fsr_resistance"] = data["fsr_resistance"]
            
            # 解析小便事件相关数据
            if "urination_in_progress" in data:
                result["parsed"]["urination_in_progress"] = data["urination_in_progress"]
            
            if "event_count" in data:
                result["parsed"]["event_count"] = data["event_count"]
            
            return result
            
        except Exception as e:
            logger.error(f"解析数据失败: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

class UrineAnalyzer:
    """尿液分析器"""
    
    def __init__(self, ai_config=None):
        self.ai_config = ai_config or AI_CONFIG
        self.ai_enabled = self.ai_config.get("enabled", False) and self.ai_config.get("api_key")
        self.client = None
        self.volume_analyzer = UrineVolumeAnalyzer()
        
        # 初始化OpenAI客户端
        if self.ai_enabled:
            try:
                self.client = OpenAI(
                    base_url=self.ai_config.get("base_url"),
                    api_key=self.ai_config.get("api_key"),
                    timeout=self.ai_config.get("timeout", 120)
                )
                logger.info(f"AI分析器初始化成功，使用模型: {self.ai_config.get('model')}")
            except Exception as e:
                logger.error(f"AI客户端初始化失败: {e}")
                self.ai_enabled = False
                self.client = None
        else:
            logger.info(f"AI分析器初始化，启用状态: {self.ai_enabled}")
    
    def analyze(self, parsed_data: Dict) -> Dict:
        """分析尿液数据"""
        try:
            analysis_id = f"analysis_{int(time.time())}"
            
            # 基础分析
            basic_analysis = self._basic_analysis(parsed_data)
            
            # 尿量模式分析
            volume_analysis = self._volume_analysis(parsed_data)
            
            # 如果需要且配置了AI，进行AI分析
            ai_analysis = None
            if self.ai_enabled:
                logger.info("开始AI分析...")
                ai_analysis = self._ai_analysis_openai(parsed_data)
                logger.info(f"AI分析完成，成功: {ai_analysis.get('success', False)}")
            else:
                logger.info("AI分析未启用")
                ai_analysis = {"enabled": False, "message": "AI分析未启用或未配置API密钥"}
            
            result = {
                "analysis_id": analysis_id,
                "timestamp": datetime.now().isoformat(),
                "basic_analysis": basic_analysis,
                "volume_analysis": volume_analysis,
                "ai_analysis": ai_analysis,
                "summary": self._generate_summary(basic_analysis, volume_analysis, ai_analysis)
            }
            
            return result
            
        except Exception as e:
            logger.error(f"分析失败: {e}")
            return {
                "analysis_id": f"error_{int(time.time())}",
                "timestamp": datetime.now().isoformat(),
                "error": str(e)
            }
    
    def _basic_analysis(self, data: Dict) -> Dict:
        """基础医学分析"""
        analysis = {
            "risk_level": "low",
            "risk_description": "风险较低",
            "risk_color": "success",
            "key_findings": [],
            "recommendations": [],
            "normal_ranges": {
                "conductivity": "0.5-20 mS/cm",
                "specific_gravity": "1.003-1.030",
                "sodium": "40-220 mmol/L",
                "urine_volume": f"{URINE_VOLUME_CONFIG['normal_urination_range'][0]}-{URINE_VOLUME_CONFIG['normal_urination_range'][1]} ml",
                "daily_volume": f"{URINE_VOLUME_CONFIG['normal_daily_range'][0]}-{URINE_VOLUME_CONFIG['normal_daily_range'][1]} ml"
            },
            "color_analysis": {}
        }
        
        # 检查尿液颜色
        if "color_analysis" in data.get("parsed", {}):
            color_data = data["parsed"]["color_analysis"]
            if color_data.get("success"):
                analysis["color_analysis"] = color_data
                
                # 根据颜色设置风险等级
                color_name = color_data.get("color_name", "")
                if color_name in ["红色", "棕色", "绿色/蓝色"]:
                    analysis["risk_level"] = "high"
                    analysis["key_findings"].append(f"尿液颜色异常: {color_name}")
                elif color_name in ["橙色", "琥珀色", "浑浊白色"]:
                    if analysis["risk_level"] != "high":
                        analysis["risk_level"] = "medium"
                    analysis["key_findings"].append(f"尿液颜色异常: {color_name}")
                elif color_name in ["深黄色"]:
                    analysis["key_findings"].append(f"尿液颜色提示脱水: {color_name}")
                
                # 添加颜色相关建议
                if "recommendations" in color_data:
                    analysis["recommendations"].extend(color_data["recommendations"][:2])  # 只取前两个建议
        
        # 检查电导率
        if "conductivity" in data.get("parsed", {}):
            conductivity_str = data["parsed"]["conductivity"]
            match = re.search(r'([\d.]+)', conductivity_str)
            if match:
                conductivity = float(match.group(1))
                if conductivity < 0.5:
                    analysis["key_findings"].append("电导率偏低，可能为极度稀释尿")
                    analysis["risk_level"] = "medium"
                elif conductivity > 20:
                    analysis["key_findings"].append("电导率偏高，可能为浓缩尿")
                    analysis["risk_level"] = "medium"
        
        # 检查尿比重
        if "specific_gravity" in data.get("parsed", {}):
            sg_str = data["parsed"]["specific_gravity"]
            match = re.search(r'([\d.]+)', sg_str)
            if match:
                sg = float(match.group(1))
                if sg < 1.003:
                    analysis["key_findings"].append("尿比重偏低，可能为低渗尿")
                    analysis["risk_level"] = "medium"
                elif sg > 1.030:
                    analysis["key_findings"].append("尿比重偏高，可能为高渗尿")
                    analysis["risk_level"] = "medium"
        
        # 检查尿钠
        if "sodium" in data.get("parsed", {}):
            sodium_str = data["parsed"]["sodium"]
            match = re.search(r'([\d.]+)', sodium_str)
            if match:
                sodium = float(match.group(1))
                if sodium < 40:
                    analysis["key_findings"].append("尿钠偏低")
                    analysis["recommendations"].append("建议增加钠摄入")
                elif sodium > 220:
                    analysis["key_findings"].append("尿钠偏高")
                    analysis["risk_level"] = "medium"
                    analysis["recommendations"].append("建议控制钠摄入")
        
        # 根据风险等级调整描述和颜色
        if analysis["risk_level"] == "medium":
            analysis["risk_description"] = "中等风险，建议关注"
            analysis["risk_color"] = "warning"
        elif analysis["risk_level"] == "high":
            analysis["risk_description"] = "高风险，建议就医"
            analysis["risk_color"] = "danger"
        
        # 如果没有特定建议，添加通用建议
        if not analysis["recommendations"]:
            analysis["recommendations"] = [
                "保持充足水分摄入",
                "均衡饮食，适量运动",
                "如有不适，及时就医"
            ]
        
        return analysis
    
    def _volume_analysis(self, data: Dict) -> Dict:
        """尿量分析"""
        analysis = {
            "volume_status": "正常",
            "volume_color": "success",
            "current_volume": 0,
            "daily_stats": {},
            "patterns": {},
            "alerts": []
        }
        
        # 获取当前尿量
        if "urine_volume" in data.get("parsed", {}):
            volume_str = data["parsed"]["urine_volume"]
            match = re.search(r'([\d.]+)', volume_str)
            if match:
                current_volume = float(match.group(1))
                analysis["current_volume"] = current_volume
                
                # 检查单次尿量是否正常
                normal_min, normal_max = URINE_VOLUME_CONFIG["normal_urination_range"]
                if current_volume < normal_min:
                    analysis["volume_status"] = "尿量偏少"
                    analysis["volume_color"] = "warning"
                    analysis["alerts"].append(f"单次尿量偏少: {current_volume:.1f} ml (正常范围: {normal_min}-{normal_max} ml)")
                elif current_volume > normal_max:
                    analysis["volume_status"] = "尿量偏多"
                    analysis["volume_color"] = "warning"
                    analysis["alerts"].append(f"单次尿量偏多: {current_volume:.1f} ml (正常范围: {normal_min}-{normal_max} ml)")
        
        # 计算每日统计
        if data_store["urination_events"]:
            daily_stats = self.volume_analyzer.calculate_daily_stats(data_store["urination_events"])
            analysis["daily_stats"] = daily_stats
            
            # 检查每日总尿量
            daily_total = daily_stats.get("total_volume", 0)
            daily_min, daily_max = URINE_VOLUME_CONFIG["normal_daily_range"]
            
            if daily_total < daily_min:
                analysis["alerts"].append(f"今日总尿量偏少: {daily_total:.1f} ml (正常范围: {daily_min}-{daily_max} ml)")
                if analysis["volume_status"] == "正常":
                    analysis["volume_status"] = "日尿量不足"
                    analysis["volume_color"] = "warning"
            elif daily_total > daily_max:
                analysis["alerts"].append(f"今日总尿量偏多: {daily_total:.1f} ml (正常范围: {daily_min}-{daily_max} ml)")
                if analysis["volume_status"] == "正常":
                    analysis["volume_status"] = "日尿量过多"
                    analysis["volume_color"] = "warning"
            
            # 检查排尿频率
            frequency_hours = daily_stats.get("frequency_hours", 0)
            if frequency_hours > 0:
                if frequency_hours < 1.5:
                    analysis["alerts"].append(f"排尿频率较高: 平均{frequency_hours:.1f}小时一次")
                    analysis["volume_status"] = "排尿频繁"
                    analysis["volume_color"] = "warning"
                elif frequency_hours > 6:
                    analysis["alerts"].append(f"排尿频率较低: 平均{frequency_hours:.1f}小时一次")
                    analysis["volume_status"] = "排尿间隔过长"
                    analysis["volume_color"] = "warning"
            
            # 分析尿量模式
            if len(data_store["urination_events"]) >= 3:
                patterns = self.volume_analyzer.analyze_volume_patterns(data_store["urination_events"])
                analysis["patterns"] = patterns
                
                # 添加异常模式警告
                for anomaly in patterns.get("anomalies", []):
                    if anomaly["type"] == "low_volume":
                        analysis["alerts"].append(f"低尿量事件: {anomaly['volume']:.1f} ml ({anomaly['time'][11:16]})")
                    elif anomaly["type"] == "high_volume":
                        analysis["alerts"].append(f"高尿量事件: {anomaly['volume']:.1f} ml ({anomaly['time'][11:16]})")
        
        return analysis
    
    def _ai_analysis_openai(self, data: Dict) -> Dict:
        """AI分析（使用OpenAI SDK）"""
        try:
            data_store["system_stats"]["total_ai_requests"] += 1
            start_time = time.time()
            
            if not self.ai_enabled or not self.client:
                return {"enabled": False, "message": "AI分析未启用或客户端未初始化"}
            
            prompt = self._build_ai_prompt(data)
            
            # 使用OpenAI SDK调用API
            response = self.client.chat.completions.create(
                model=self.ai_config["model"],
                messages=[
                    {"role": "system", "content": """你是一个专业的泌尿科医生。请根据以下尿液检测数据进行分析：
1. 首先评估数据的可靠性
2. 分析尿液颜色的临床意义
3. 分析尿量、频率等排尿模式
4. 分析各项指标的临床意义
5. 给出可能的诊断建议
6. 提供后续行动建议
请用专业但易懂的语言回答，结构清晰，分点说明。特别关注尿液颜色和尿量的分析。"""},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.ai_config["max_tokens"],
                temperature=0.7
            )
            
            response_time = time.time() - start_time
            
            # 从OpenAI响应中提取内容
            if response and response.choices and len(response.choices) > 0:
                ai_text = response.choices[0].message.content
                
                if not ai_text:
                    ai_text = "AI服务返回了空回复"
                
                # 格式化AI文本
                formatted_ai_text = self._format_ai_response(ai_text)
                
                data_store["system_stats"]["successful_ai_requests"] += 1
                data_store["system_stats"]["avg_response_time"] = (
                    data_store["system_stats"]["avg_response_time"] * 0.8 + response_time * 0.2
                )
                
                return {
                    "enabled": True,
                    "success": True,
                    "text": ai_text,
                    "formatted_text": formatted_ai_text,
                    "summary": self._extract_ai_summary(ai_text),
                    "response_time": round(response_time, 2),
                    "model_used": response.model if hasattr(response, 'model') else self.ai_config["model"]
                }
            else:
                error_msg = "API返回了空响应"
                return {
                    "enabled": True,
                    "success": False,
                    "error": error_msg,
                    "text": "",
                    "response_time": round(response_time, 2)
                }
                
        except Exception as e:
            logger.error(f"AI分析异常: {e}")
            return {
                "enabled": True,
                "success": False,
                "error": str(e),
                "text": "",
                "response_time": 0
            }
    
    def _build_ai_prompt(self, data: Dict) -> str:
        """构建AI提示词"""
        parsed = data.get("parsed", {})
        
        prompt = f"""请分析以下尿液检测数据，并给出专业的医学诊断建议：

【患者信息】
- 检测时间: {data.get('timestamp', '未知')}
- 设备ID: {data.get('device_id', '未知')}

【尿液颜色分析】
"""
        
        # 添加颜色分析信息
        if "color_analysis" in parsed:
            color_data = parsed["color_analysis"]
            if color_data.get("success"):
                prompt += f"- 尿液颜色: {color_data.get('color_name', '未知')}\n"
                prompt += f"- 临床意义: {color_data.get('clinical_meaning', '未知')}\n"
                prompt += f"- 健康状态: {color_data.get('health_status', '未知')}\n"
                if "detailed_analysis" in color_data:
                    detailed = color_data["detailed_analysis"]
                    prompt += f"- 水合水平: {detailed.get('hydration_level', '未知')}\n"
                    prompt += f"- 紧急程度: {detailed.get('urgency_level', '未知')}\n"
        
        prompt += """
【尿量数据】
"""
        
        # 添加尿量信息
        if "urine_volume" in parsed:
            prompt += f"- 当前尿量: {parsed['urine_volume']}\n"
        
        # 添加每日统计
        if data_store["urination_events"]:
            daily_stats = self.volume_analyzer.calculate_daily_stats(data_store["urination_events"])
            prompt += f"- 今日总尿量: {daily_stats.get('total_volume', 0)} ml\n"
            prompt += f"- 今日排尿次数: {daily_stats.get('event_count', 0)} 次\n"
            prompt += f"- 平均单次尿量: {daily_stats.get('average_volume', 0)} ml\n"
            prompt += f"- 平均排尿间隔: {daily_stats.get('frequency_hours', 0)} 小时\n"
            prompt += f"- 目标完成度: {daily_stats.get('volume_percentage', 0)}%\n"
        
        prompt += """
【其他检测数据】
"""
        
        for key, value in parsed.items():
            if key not in ["color_analysis", "urine_volume"]:  # 已经单独处理
                if isinstance(value, dict):
                    continue  # 跳过字典类型的数据
                prompt += f"- {key}: {value}\n"
        
        prompt += """
【请从以下几个方面进行分析】
1. 尿液颜色的临床意义和可能的病因
2. 尿量模式分析（单次尿量、每日总量、排尿频率）
3. 数据可靠性评估
4. 各项指标临床意义解读
5. 可能的健康问题或疾病风险
6. 建议的进一步检查
7. 生活与饮食建议
8. 紧急程度评估

请以专业医生的身份，用清晰、易懂的语言撰写分析报告，并给出具体的建议。特别关注尿液颜色和尿量的临床意义。"""
        
        return prompt
    
    def _format_ai_response(self, ai_text: str) -> str:
        """格式化AI响应文本"""
        # 确保有换行
        formatted = ai_text.replace('。', '。\n').replace('；', '；\n')
        
        # 添加标题标记
        lines = formatted.split('\n')
        formatted_lines = []
        for line in lines:
            line = line.strip()
            if line:
                # 检测标题行
                if any(marker in line for marker in ['【', '】', '1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '一、', '二、', '三、', '（1）', '（2）']):
                    formatted_lines.append(f"<strong>{line}</strong>")
                elif line.startswith('-') or line.startswith('•'):
                    formatted_lines.append(f"<li>{line}</li>")
                else:
                    formatted_lines.append(line)
        
        return '<br>'.join(formatted_lines)
    
    def _extract_ai_summary(self, ai_text: str) -> str:
        """从AI回复中提取摘要"""
        # 取前3句作为摘要
        sentences = re.split(r'[。！？]', ai_text)
        valid_sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 10]
        
        if len(valid_sentences) >= 3:
            summary = '。'.join(valid_sentences[:3]) + '。'
        elif valid_sentences:
            summary = valid_sentences[0] + '。'
        else:
            summary = "AI分析完成，请查看详细报告。"
        
        return summary[:200]
    
    def _generate_summary(self, basic_analysis: Dict, volume_analysis: Dict, ai_analysis: Dict = None) -> str:
        """生成综合分析摘要"""
        risk_map = {
            "low": "低风险",
            "medium": "中等风险",
            "high": "高风险"
        }
        
        risk_level = basic_analysis.get("risk_level", "low")
        
        summary = f"风险评估: {risk_map.get(risk_level, '未知')}"
        
        # 添加颜色信息
        if "color_analysis" in basic_analysis and basic_analysis["color_analysis"].get("success"):
            color_name = basic_analysis["color_analysis"].get("color_name", "")
            if color_name:
                summary += f" | 尿液颜色: {color_name}"
        
        # 添加尿量信息
        volume_status = volume_analysis.get("volume_status", "")
        if volume_status and volume_status != "正常":
            summary += f" | 尿量: {volume_status}"
        
        if ai_analysis and ai_analysis.get("success"):
            ai_summary = ai_analysis.get("summary", "")
            if ai_summary:
                summary += f" | AI分析: {ai_summary}"
        
        return summary

class DataStorage:
    """数据存储器"""
    
    def __init__(self, config=STORAGE_CONFIG):
        self.config = config
        self.data_file = config.get("data_file", "urine_data.json")
        
    def save_data(self, data_store: Dict):
        """保存数据到文件"""
        try:
            if self.config.get("save_to_file"):
                with open(self.data_file, 'w', encoding='utf-8') as f:
                    json.dump(data_store, f, ensure_ascii=False, indent=2)
                logger.info(f"数据已保存到 {self.data_file}")
        except Exception as e:
            logger.error(f"保存数据失败: {e}")
    
    def load_data(self) -> Dict:
        """从文件加载数据"""
        try:
            if os.path.exists(self.data_file):
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    loaded_data = json.load(f)
                    
                    # 确保新版本的数据结构兼容性
                    if "urination_events" not in loaded_data:
                        loaded_data["urination_events"] = []
                    if "daily_stats" not in loaded_data:
                        loaded_data["daily_stats"] = {
                            "today": datetime.now().strftime("%Y-%m-%d"),
                            "total_volume": 0,
                            "event_count": 0,
                            "average_volume": 0,
                            "frequency_hours": 0
                        }
                    if "volume_trends" not in loaded_data:
                        loaded_data["volume_trends"] = {
                            "last_24h": {"volume": 0, "events": 0},
                            "last_week": {"volume": 0, "events": 0}
                        }
                    
                    return loaded_data
        except Exception as e:
            logger.error(f"加载数据失败: {e}")
        
        # 返回默认数据结构
        return {
            "total_received": 0,
            "last_received": None,
            "arduino_data": [],
            "analysis_results": [],
            "latest_data": None,
            "urination_events": [],
            "daily_stats": {
                "today": datetime.now().strftime("%Y-%m-%d"),
                "total_volume": 0,
                "event_count": 0,
                "average_volume": 0,
                "frequency_hours": 0
            },
            "volume_trends": {
                "last_24h": {"volume": 0, "events": 0},
                "last_week": {"volume": 0, "events": 0}
            },
            "system_stats": {
                "total_ai_requests": 0,
                "successful_ai_requests": 0,
                "avg_response_time": 0
            }
        }

# ===========================================
# 5. 初始化服务
# ===========================================

data_parser = ArduinoDataParser()
urine_analyzer = UrineAnalyzer()
data_storage = DataStorage()
urine_color_analyzer = UrineColorAnalyzer()

# 加载历史数据
try:
    saved_data = data_storage.load_data()
    data_store.update(saved_data)
    logger.info(f"已加载 {data_store['total_received']} 条历史数据")
    logger.info(f"已加载 {len(data_store['urination_events'])} 个小便事件")
except Exception as e:
    logger.info(f"无历史数据或加载失败，从头开始: {e}")

# ===========================================
# 6. Flask路由
# ===========================================

@app.route('/upload', methods=['POST'])
def upload_data():
    """接收Arduino数据的主接口"""
    try:
        start_time = time.time()
        
        # 记录请求
        logger.info(f"收到请求，客户端IP: {request.remote_addr}")
        
        # 检查内容类型
        content_type = request.headers.get('Content-Type', '')
        
        # 解析数据
        if 'application/json' in content_type:
            data = request.get_json()
        else:
            # 尝试解析为JSON
            try:
                data = json.loads(request.data)
            except:
                return jsonify({
                    "success": False,
                    "message": "请使用JSON格式发送数据",
                    "timestamp": datetime.now().isoformat()
                }), 400
        
        # 验证数据
        if not data:
            return jsonify({
                "success": False,
                "message": "未接收到数据",
                "timestamp": datetime.now().isoformat()
            }), 400
        
        # 解析数据
        parse_result = data_parser.parse_json_data(data)
        
        if not parse_result.get("success"):
            return jsonify({
                "success": False,
                "message": "数据解析失败",
                "error": parse_result.get("error"),
                "timestamp": datetime.now().isoformat()
            }), 400
        
        # 记录小便事件
        if "volume_data" in parse_result:
            volume_data = parse_result["volume_data"]
            if "event" in volume_data:
                event_result = volume_data["event"]
                if event_result.get("event_completed"):
                    completed_event = event_result.get("event")
                    if completed_event:
                        data_store["urination_events"].append(completed_event)
                        logger.info(f"记录小便事件: {completed_event['event_id']}, 尿量: {completed_event['total_volume']} ml")
        
        # 进行分析
        analysis_result = urine_analyzer.analyze(parse_result)
        
        # 保存AI分析结果
        if analysis_result.get("ai_analysis", {}).get("success"):
            data_store["latest_ai_analysis"] = {
                "timestamp": datetime.now().isoformat(),
                "analysis_id": analysis_result["analysis_id"],
                "text": analysis_result["ai_analysis"].get("text", ""),
                "formatted_text": analysis_result["ai_analysis"].get("formatted_text", ""),
                "summary": analysis_result["ai_analysis"].get("summary", ""),
                "response_time": analysis_result["ai_analysis"].get("response_time", 0),
                "model_used": analysis_result["ai_analysis"].get("model_used", "gpt-4o")
            }
        
        # 更新数据存储
        data_record = {
            "id": f"rec_{data_store['total_received']}",
            "timestamp": parse_result["timestamp"],
            "raw_data": parse_result["raw_data"],
            "parsed_data": parse_result["parsed"],
            "volume_data": parse_result.get("volume_data", {}),
            "analysis": analysis_result,
            "warnings": parse_result.get("warnings", [])
        }
        
        data_store["arduino_data"].append(data_record)
        data_store["analysis_results"].append(analysis_result)
        data_store["total_received"] += 1
        data_store["last_received"] = datetime.now().isoformat()
        data_store["latest_data"] = data_record
        
        # 更新每日统计
        if data_store["urination_events"]:
            daily_stats = urine_analyzer.volume_analyzer.calculate_daily_stats(data_store["urination_events"])
            data_store["daily_stats"] = daily_stats
        
        # 更新设备状态
        device_id = parse_result.get("device_id", "unknown")
        data_store["device_status"][device_id] = {
            "last_seen": datetime.now().isoformat(),
            "status": "online",
            "data_count": sum(1 for d in data_store["arduino_data"] 
                            if d.get("raw_data", {}).get("device_id") == device_id)
        }
        
        # 限制存储大小
        if len(data_store["arduino_data"]) > STORAGE_CONFIG["max_records"]:
            data_store["arduino_data"] = data_store["arduino_data"][-STORAGE_CONFIG["max_records"]:]
        
        if len(data_store["urination_events"]) > STORAGE_CONFIG["max_records"]:
            data_store["urination_events"] = data_store["urination_events"][-STORAGE_CONFIG["max_records"]:]
        
        # 保存数据
        if STORAGE_CONFIG["save_to_file"]:
            data_storage.save_data(data_store)
        
        # 计算处理时间
        processing_time = time.time() - start_time
        
        # 获取颜色分析结果
        color_info = {}
        if "color_analysis" in parse_result.get("parsed", {}):
            color_data = parse_result["parsed"]["color_analysis"]
            if color_data.get("success"):
                color_info = {
                    "color_name": color_data.get("color_name"),
                    "health_status": color_data.get("health_status"),
                    "clinical_meaning": color_data.get("clinical_meaning")
                }
        
        # 获取尿量分析结果
        volume_info = {}
        if "volume_data" in parse_result:
            volume_info = {
                "current_volume": parse_result["volume_data"].get("current_volume", 0),
                "event_detected": parse_result["volume_data"].get("event", {}).get("event_detected", False)
            }
        
        # 构建响应
        response = {
            "success": True,
            "message": "数据接收成功",
            "receive_id": data_record["id"],
            "timestamp": datetime.now().isoformat(),
            "processing_time": f"{processing_time:.3f}秒",
            "analysis_id": analysis_result.get("analysis_id"),
            "risk_level": analysis_result.get("basic_analysis", {}).get("risk_level"),
            "risk_description": analysis_result.get("basic_analysis", {}).get("risk_description"),
            "volume_status": analysis_result.get("volume_analysis", {}).get("volume_status", "未知"),
            "summary": analysis_result.get("summary"),
            "color_analysis": color_info,
            "volume_info": volume_info,
            "daily_stats": data_store.get("daily_stats", {}),
            "warnings": parse_result.get("warnings", [])
        }
        
        logger.info(f"数据处理完成，ID: {data_record['id']}, 耗时: {processing_time:.3f}秒")
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"处理请求异常: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "message": f"服务器内部错误: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/volume/stats', methods=['GET'])
def get_volume_stats():
    """获取尿量统计"""
    try:
        # 获取查询参数
        days = request.args.get('days', 1, type=int)
        if days > 30:
            days = 30
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # 筛选指定天数内的事件
        recent_events = [
            event for event in data_store.get("urination_events", [])
            if datetime.fromisoformat(event.get("start_time", "")) > cutoff_date
        ]
        
        # 计算统计
        volumes = [event.get("total_volume", 0) for event in recent_events]
        total_volume = sum(volumes) if volumes else 0
        event_count = len(recent_events)
        average_volume = total_volume / event_count if event_count > 0 else 0
        
        # 按日期分组
        daily_stats = {}
        for event in recent_events:
            event_time = datetime.fromisoformat(event.get("start_time", ""))
            date_str = event_time.strftime("%Y-%m-%d")
            if date_str not in daily_stats:
                daily_stats[date_str] = {
                    "date": date_str,
                    "total_volume": 0,
                    "event_count": 0,
                    "events": []
                }
            daily_stats[date_str]["total_volume"] += event.get("total_volume", 0)
            daily_stats[date_str]["event_count"] += 1
            daily_stats[date_str]["events"].append({
                "time": event_time.strftime("%H:%M"),
                "volume": event.get("total_volume", 0),
                "duration": event.get("duration", 0)
            })
        
        return jsonify({
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "stats": {
                "period_days": days,
                "total_volume": round(total_volume, 1),
                "event_count": event_count,
                "average_volume": round(average_volume, 1),
                "max_volume": round(max(volumes), 1) if volumes else 0,
                "min_volume": round(min(volumes), 1) if volumes else 0,
                "daily_goal": URINE_VOLUME_CONFIG["daily_volume_goal"],
                "normal_daily_range": f"{URINE_VOLUME_CONFIG['normal_daily_range'][0]}-{URINE_VOLUME_CONFIG['normal_daily_range'][1]} ml",
                "normal_single_range": f"{URINE_VOLUME_CONFIG['normal_urination_range'][0]}-{URINE_VOLUME_CONFIG['normal_urination_range'][1]} ml"
            },
            "daily_details": list(daily_stats.values()),
            "events": recent_events[-20:]  # 返回最近20个事件
        })
        
    except Exception as e:
        logger.error(f"获取尿量统计失败: {e}")
        return jsonify({
            "success": False,
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/volume/daily', methods=['GET'])
def get_daily_volume():
    """获取每日尿量统计"""
    try:
        daily_stats = data_store.get("daily_stats", {})
        
        # 如果今天没有数据或日期不同，重新计算
        today = datetime.now().strftime("%Y-%m-%d")
        if daily_stats.get("date") != today and data_store.get("urination_events"):
            daily_stats = urine_analyzer.volume_analyzer.calculate_daily_stats(data_store["urination_events"])
            data_store["daily_stats"] = daily_stats
        
        return jsonify({
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "daily_stats": daily_stats
        })
        
    except Exception as e:
        logger.error(f"获取每日尿量统计失败: {e}")
        return jsonify({
            "success": False,
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/color/analyze', methods=['POST'])
def analyze_color():
    """分析尿液颜色接口"""
    try:
        data = request.get_json()
        
        if not data or 'rgb' not in data:
            return jsonify({
                "success": False,
                "message": "请提供RGB值",
                "timestamp": datetime.now().isoformat()
            }), 400
        
        rgb_str = data['rgb']
        
        # 分析颜色
        color_result = urine_color_analyzer.analyze_color_from_rgb(rgb_str)
        
        return jsonify({
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "analysis": color_result
        })
        
    except Exception as e:
        logger.error(f"颜色分析失败: {e}")
        return jsonify({
            "success": False,
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/color/chart', methods=['GET'])
def get_color_chart():
    """获取尿液颜色对照表"""
    try:
        color_chart = urine_color_analyzer.get_color_chart()
        
        return jsonify({
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "color_chart": color_chart
        })
        
    except Exception as e:
        logger.error(f"获取颜色对照表失败: {e}")
        return jsonify({
            "success": False,
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/color/test', methods=['GET'])
def test_color_analysis():
    """测试颜色分析"""
    test_colors = [
        {"name": "透明无色", "rgb": "230,230,230"},
        {"name": "淡黄色", "rgb": "240,240,180"},
        {"name": "深黄色", "rgb": "200,180,100"},
        {"name": "琥珀色", "rgb": "180,140,80"},
        {"name": "橙色", "rgb": "220,140,70"},
        {"name": "棕色", "rgb": "140,100,60"},
        {"name": "红色", "rgb": "200,50,50"},
        {"name": "粉红色", "rgb": "220,150,170"},
        {"name": "绿色", "rgb": "100,180,150"},
    ]
    
    results = []
    for test in test_colors:
        analysis = urine_color_analyzer.analyze_color_from_rgb(test['rgb'])
        results.append({
            "test_name": test["name"],
            "rgb": test["rgb"],
            "analysis": analysis
        })
    
    return jsonify({
        "success": True,
        "timestamp": datetime.now().isoformat(),
        "test_results": results
    })

@app.route('/data/latest', methods=['GET'])
def get_latest_data():
    """获取最新数据"""
    try:
        latest = data_store.get("latest_data")
        if not latest:
            return jsonify({
                "success": False,
                "message": "暂无数据",
                "timestamp": datetime.now().isoformat()
            }), 404
        
        return jsonify({
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "data": latest
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/ai/latest', methods=['GET'])
def get_latest_ai_analysis():
    """获取最新AI分析结果"""
    try:
        latest_ai = data_store.get("latest_ai_analysis")
        if not latest_ai:
            return jsonify({
                "success": False,
                "message": "暂无AI分析结果",
                "timestamp": datetime.now().isoformat()
            }), 404
        
        return jsonify({
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "ai_analysis": latest_ai
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/dashboard', methods=['GET'])
def dashboard():
    """仪表盘页面 - 显示实时数据和AI分析结果"""
    latest_data = data_store.get("latest_data")
    latest_ai = data_store.get("latest_ai_analysis")
    daily_stats = data_store.get("daily_stats", {})
    
    # 准备显示数据
    display_data = {
        "current_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_received": data_store["total_received"],
        "last_received": data_store["last_received"],
        "urination_events_count": len(data_store.get("urination_events", [])),
        "ai_enabled": urine_analyzer.ai_enabled,
        "ai_stats": data_store["system_stats"],
        "has_data": latest_data is not None,
        "has_ai_analysis": latest_ai is not None,
        "daily_stats": daily_stats
    }
    
    if latest_data:
        display_data.update({
            "device_id": latest_data.get("raw_data", {}).get("device_id", "未知"),
            "timestamp": latest_data.get("timestamp", "未知"),
            "parsed_data": latest_data.get("parsed_data", {}),
            "warnings": latest_data.get("warnings", []),
            "risk_level": latest_data.get("analysis", {}).get("basic_analysis", {}).get("risk_level", "unknown"),
            "risk_description": latest_data.get("analysis", {}).get("basic_analysis", {}).get("risk_description", "未知"),
            "risk_color": latest_data.get("analysis", {}).get("basic_analysis", {}).get("risk_color", "secondary"),
            "key_findings": latest_data.get("analysis", {}).get("basic_analysis", {}).get("key_findings", []),
            "recommendations": latest_data.get("analysis", {}).get("basic_analysis", {}).get("recommendations", []),
            "volume_status": latest_data.get("analysis", {}).get("volume_analysis", {}).get("volume_status", "未知"),
            "volume_color": latest_data.get("analysis", {}).get("volume_analysis", {}).get("volume_color", "secondary"),
            "volume_alerts": latest_data.get("analysis", {}).get("volume_analysis", {}).get("alerts", [])
        })
        
        # 获取颜色分析数据
        if "color_analysis" in latest_data.get("parsed_data", {}):
            color_data = latest_data["parsed_data"]["color_analysis"]
            if color_data.get("success"):
                display_data.update({
                    "color_name": color_data.get("color_name", "未知"),
                    "color_description": color_data.get("description", "未知"),
                    "color_clinical_meaning": color_data.get("clinical_meaning", "未知"),
                    "color_health_status": color_data.get("health_status", "未知"),
                    "color_rgb": color_data.get("rgb", "未知"),
                    "color_hsv": color_data.get("hsv_values", {}),
                    "color_detailed_analysis": color_data.get("detailed_analysis", {}),
                    "color_recommendations": color_data.get("recommendations", [])
                })
    
    if latest_ai:
        display_data.update({
            "ai_timestamp": latest_ai.get("timestamp", "未知"),
            "ai_summary": latest_ai.get("summary", "暂无摘要"),
            "ai_text": latest_ai.get("formatted_text", latest_ai.get("text", "暂无AI分析")),
            "ai_response_time": latest_ai.get("response_time", 0),
            "ai_model": latest_ai.get("model_used", "gpt-4o")
        })
    
    # 生成HTML模板
    html_template = generate_dashboard_html()
    
    return render_template_string(html_template, **display_data)

@app.route('/history', methods=['GET'])
def history_page():
    """历史数据页面"""
    limit = request.args.get('limit', 20, type=int)
    if limit > 100:
        limit = 100
    
    history = data_store.get("arduino_data", [])[-limit:]
    
    html_template = generate_history_html()
    
    return render_template_string(html_template, 
                                history=history[::-1],  # 倒序，最新的在前
                                total=data_store["total_received"],
                                current_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

@app.route('/volume/history', methods=['GET'])
def volume_history_page():
    """尿量历史页面"""
    limit = request.args.get('limit', 50, type=int)
    if limit > 200:
        limit = 200
    
    events = data_store.get("urination_events", [])[-limit:]
    
    html_template = generate_volume_history_html()
    
    return render_template_string(html_template, 
                                events=events[::-1],  # 倒序，最新的在前
                                total_events=len(data_store.get("urination_events", [])),
                                current_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

@app.route('/data/history', methods=['GET'])
def get_history():
    """获取历史数据"""
    try:
        limit = request.args.get('limit', 10, type=int)
        if limit > 100:
            limit = 100
        
        history = data_store.get("arduino_data", [])[-limit:]
        
        return jsonify({
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "total": data_store["total_received"],
            "count": len(history),
            "data": history
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/status', methods=['GET'])
def get_status():
    """获取服务器状态"""
    try:
        return jsonify({
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "server": {
                "name": "尿液分析服务器",
                "version": "1.3.0",
                "uptime": time.time() - app_start_time,
                "status": "running"
            },
            "data": {
                "total_received": data_store["total_received"],
                "last_received": data_store["last_received"],
                "urination_events": len(data_store.get("urination_events", [])),
                "devices_count": len(data_store["device_status"])
            },
            "ai": {
                "enabled": urine_analyzer.ai_enabled,
                "model": AI_CONFIG.get("model"),
                "client_ready": urine_analyzer.client is not None,
                "stats": data_store["system_stats"]
            },
            "features": {
                "color_analysis": True,
                "urine_volume_tracking": True,
                "volume_pattern_analysis": True,
                "daily_statistics": True
            },
            "config": {
                "daily_volume_goal": URINE_VOLUME_CONFIG["daily_volume_goal"],
                "normal_urination_range": URINE_VOLUME_CONFIG["normal_urination_range"],
                "normal_daily_range": URINE_VOLUME_CONFIG["normal_daily_range"]
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/', methods=['GET'])
def index():
    """主页 - 重定向到仪表盘"""
    return dashboard()

@app.route('/test', methods=['GET'])
def test_endpoint():
    """测试端点"""
    test_data = {
        "device_id": "TEST_DEVICE",
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "color_rgb": "240,220,150",
        "ec_value": 1.234,
        "concentration": "正常",
        "urine_volume": 250.5,
        "flow_rate": 12.3,
        "estimated_sg": 1.012,
        "estimated_na": 75.5,
        "sg_category": "正常范围",
        "na_category": "正常",
        "fsr_raw": 1234,
        "fsr_resistance": 56000
    }
    
    return jsonify({
        "success": True,
        "message": "尿液分析服务器正在运行",
        "timestamp": datetime.now().isoformat(),
        "version": "1.3.0",
        "features": {
            "urine_volume_tracking": "已启用",
            "color_analysis": "已启用",
            "ai_analysis": "已启用" if urine_analyzer.ai_enabled else "未启用",
            "daily_statistics": "已启用"
        },
        "endpoints": {
            "POST /upload": "接收Arduino数据",
            "GET /volume/stats": "获取尿量统计",
            "GET /volume/daily": "获取每日尿量",
            "POST /color/analyze": "分析尿液颜色",
            "GET /color/chart": "获取颜色对照表",
            "GET /color/test": "测试颜色分析",
            "GET /dashboard": "仪表盘（推荐）",
            "GET /history": "历史数据",
            "GET /volume/history": "尿量历史",
            "GET /data/latest": "获取最新数据",
            "GET /ai/latest": "获取最新AI分析",
            "GET /data/history": "获取历史数据",
            "GET /status": "服务器状态",
            "GET /test": "测试页面"
        },
        "test_data": test_data,
        "usage_example": {
            "curl": 'curl -X POST http://localhost:5000/upload -H "Content-Type: application/json" -d \'{"device_id":"TEST","color_rgb":"240,220,150","urine_volume":250.5,"ec_value":1.5}\''
        }
    })

# ===========================================
# 7. 模板生成函数
# ===========================================

def generate_dashboard_html():
    """生成仪表盘HTML模板"""
    return '''
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🧪 尿液分析仪表盘 v1.3.0</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            background-color: #f8f9fa;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .card {
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            margin-bottom: 20px;
            border: none;
        }
        .card-header {
            background-color: #fff;
            border-bottom: 2px solid #3498db;
            font-weight: 600;
        }
        .badge-risk-low { background-color: #28a745; }
        .badge-risk-medium { background-color: #ffc107; color: #212529; }
        .badge-risk-high { background-color: #dc3545; }
        .sensor-value {
            font-size: 1.2rem;
            font-weight: 600;
            color: #2c3e50;
        }
        .ai-analysis {
            background-color: #f8f9fa;
            border-left: 4px solid #3498db;
            padding: 15px;
            margin-top: 10px;
            border-radius: 0 5px 5px 0;
        }
        .refresh-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
        }
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 5px;
        }
        .status-online { background-color: #28a745; }
        .status-offline { background-color: #dc3545; }
        .ai-text {
            line-height: 1.6;
            white-space: pre-line;
        }
        .color-box {
            width: 30px;
            height: 30px;
            border-radius: 5px;
            display: inline-block;
            margin-right: 10px;
            border: 1px solid #ddd;
        }
        .hydration-indicator {
            height: 10px;
            border-radius: 5px;
            margin-top: 5px;
        }
        .hydration-good { background-color: #28a745; }
        .hydration-fair { background-color: #ffc107; }
        .hydration-poor { background-color: #dc3545; }
        .color-analysis-card {
            border-left: 4px solid #9b59b6 !important;
        }
        .volume-analysis-card {
            border-left: 4px solid #2ecc71 !important;
        }
        .progress-bar-volume {
            background-color: #2ecc71;
            height: 20px;
            border-radius: 10px;
        }
        .volume-stat-card {
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            color: white;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 10px;
        }
        .volume-stat-card h6 {
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.9rem;
            margin-bottom: 5px;
        }
        .volume-stat-card .value {
            font-size: 1.5rem;
            font-weight: bold;
        }
        .volume-stat-card .unit {
            font-size: 0.8rem;
            opacity: 0.8;
        }
        .hourly-chart {
            display: flex;
            align-items: flex-end;
            height: 100px;
            margin-top: 10px;
        }
        .hour-bar {
            flex: 1;
            background-color: #3498db;
            margin: 0 2px;
            border-radius: 3px 3px 0 0;
            transition: height 0.3s;
            position: relative;
        }
        .hour-bar:hover {
            background-color: #2980b9;
        }
        .hour-label {
            font-size: 0.7rem;
            text-align: center;
            margin-top: 5px;
        }
        .volume-alert {
            border-left: 4px solid #e74c3c;
            background-color: #fff5f5;
            padding: 10px;
            margin-bottom: 5px;
            border-radius: 0 5px 5px 0;
        }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary mb-4">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-flask"></i> 尿液智能分析系统 v1.3.0
            </a>
            <div class="navbar-nav">
                <a class="nav-link active" href="/dashboard">仪表盘</a>
                <a class="nav-link" href="/volume/history">尿量历史</a>
                <a class="nav-link" href="/history">历史数据</a>
                <a class="nav-link" href="/color/chart">颜色对照表</a>
                <a class="nav-link" href="/color/test">测试颜色分析</a>
                <a class="nav-link" href="/status">系统状态</a>
                <a class="nav-link" href="/test">API文档</a>
            </div>
        </div>
    </nav>

    <div class="container">
        <!-- 顶部状态栏 -->
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-2">
                                <h6><i class="fas fa-database"></i> 数据统计</h6>
                                <p class="sensor-value">{{ total_received }} 条</p>
                            </div>
                            <div class="col-md-2">
                                <h6><i class="fas fa-clock"></i> 最后接收</h6>
                                <p class="sensor-value">{{ last_received[11:19] if last_received else "暂无" }}</p>
                            </div>
                            <div class="col-md-2">
                                <h6><i class="fas fa-tint"></i> 小便事件</h6>
                                <p class="sensor-value">{{ urination_events_count }} 次</p>
                            </div>
                            <div class="col-md-2">
                                <h6><i class="fas fa-robot"></i> AI状态</h6>
                                <p>
                                    <span class="status-indicator {{ 'status-online' if ai_enabled else 'status-offline' }}"></span>
                                    {{ "已启用" if ai_enabled else "未启用" }}
                                </p>
                            </div>
                            <div class="col-md-2">
                                <h6><i class="fas fa-palette"></i> 颜色分析</h6>
                                <p>
                                    <span class="status-indicator status-online"></span>
                                    已启用
                                </p>
                            </div>
                            <div class="col-md-2">
                                <h6><i class="fas fa-sync-alt"></i> 当前时间</h6>
                                <p class="sensor-value">{{ current_time[11:19] }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <!-- 左侧：传感器数据和颜色分析 -->
            <div class="col-md-4">
                <!-- 尿液颜色分析卡片 -->
                <div class="card color-analysis-card mb-4">
                    <div class="card-header">
                        <i class="fas fa-palette"></i> 尿液颜色分析
                    </div>
                    <div class="card-body">
                        {% if has_data and color_name %}
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <h6>颜色名称</h6>
                                <p class="sensor-value">
                                    <span class="color-box" style="background-color: rgb({{ color_rgb }})"></span>
                                    {{ color_name }}
                                </p>
                            </div>
                            <div class="col-md-6">
                                <h6>健康状态</h6>
                                <p class="sensor-value">{{ color_health_status }}</p>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <h6>临床意义</h6>
                            <p class="small">{{ color_clinical_meaning }}</p>
                        </div>
                        
                        <div class="mb-3">
                            <h6>水合水平</h6>
                            {% if color_detailed_analysis.hydration_level == "良好" %}
                                <div class="hydration-indicator hydration-good" style="width: 90%"></div>
                                <small class="text-muted">良好水合状态</small>
                            {% elif color_detailed_analysis.hydration_level == "轻度脱水" %}
                                <div class="hydration-indicator hydration-fair" style="width: 60%"></div>
                                <small class="text-muted">轻度脱水，建议增加饮水</small>
                            {% elif color_detailed_analysis.hydration_level == "中度脱水" %}
                                <div class="hydration-indicator hydration-fair" style="width: 40%"></div>
                                <small class="text-muted">中度脱水，需要补充水分</small>
                            {% elif color_detailed_analysis.hydration_level == "重度脱水" %}
                                <div class="hydration-indicator hydration-poor" style="width: 20%"></div>
                                <small class="text-muted">重度脱水，立即补充水分</small>
                            {% elif color_detailed_analysis.hydration_level == "紧急" %}
                                <div class="hydration-indicator hydration-poor" style="width: 10%"></div>
                                <small class="text-muted">紧急情况，需要立即就医</small>
                            {% endif %}
                        </div>
                        
                        {% else %}
                        <div class="text-center py-4">
                            <i class="fas fa-palette fa-3x text-muted mb-3"></i>
                            <p class="text-muted">等待尿液颜色数据...</p>
                        </div>
                        {% endif %}
                    </div>
                </div>
                
                <!-- 传感器数据卡片 -->
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-microchip"></i> 实时传感器数据
                    </div>
                    <div class="card-body">
                        {% if has_data %}
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <h6>设备ID</h6>
                                <p class="sensor-value">{{ device_id }}</p>
                            </div>
                            <div class="col-md-6">
                                <h6>检测时间</h6>
                                <p class="sensor-value">{{ timestamp[11:19] }}</p>
                            </div>
                        </div>
                        
                        <hr>
                        
                        <div class="row">
                            {% for key, value in parsed_data.items() %}
                                {% if key != "color_analysis" and key != "urine_volume" %}
                                <div class="col-md-12 mb-2">
                                    <div class="d-flex justify-content-between">
                                        <span>{{ key }}</span>
                                        <span class="sensor-value">{{ value }}</span>
                                    </div>
                                </div>
                                {% endif %}
                            {% endfor %}
                        </div>
                        
                        <!-- 当前尿量显示 -->
                        {% if parsed_data.urine_volume %}
                        <div class="alert alert-info mt-3">
                            <h6><i class="fas fa-tint"></i> 当前尿量</h6>
                            <p class="sensor-value text-center">{{ parsed_data.urine_volume }}</p>
                        </div>
                        {% endif %}
                        
                        <!-- 风险评估 -->
                        <div class="alert alert-{{ risk_color }} mt-3">
                            <h6><i class="fas fa-clipboard-check"></i> 风险评估</h6>
                            <p><strong>等级:</strong> 
                                <span class="badge badge-risk-{{ risk_level }}">{{ risk_description }}</span>
                            </p>
                        </div>
                        
                        <!-- 警告信息 -->
                        {% if warnings %}
                        <div class="alert alert-warning">
                            <h6><i class="fas fa-exclamation-triangle"></i> 警告</h6>
                            <ul class="mb-0">
                                {% for warning in warnings %}
                                <li>{{ warning }}</li>
                                {% endfor %}
                            </ul>
                        </div>
                        {% endif %}
                        
                        {% else %}
                        <div class="text-center py-5">
                            <i class="fas fa-cloud-download-alt fa-3x text-muted mb-3"></i>
                            <p class="text-muted">等待Arduino数据...</p>
                            <p class="small text-muted">请通过POST /upload接口发送JSON数据</p>
                        </div>
                        {% endif %}
                    </div>
                </div>
            </div>

            <!-- 中间：尿量统计分析 -->
            <div class="col-md-4">
                <!-- 尿量分析卡片 -->
                <div class="card volume-analysis-card">
                    <div class="card-header">
                        <i class="fas fa-chart-line"></i> 尿量统计分析
                    </div>
                    <div class="card-body">
                        <!-- 今日统计 -->
                        <h6><i class="fas fa-calendar-day"></i> 今日统计 ({{ daily_stats.date }})</h6>
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <div class="volume-stat-card">
                                    <h6>总尿量</h6>
                                    <div class="value">{{ daily_stats.total_volume }}</div>
                                    <div class="unit">ml</div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="volume-stat-card" style="background: linear-gradient(135deg, #3498db, #2980b9);">
                                    <h6>排尿次数</h6>
                                    <div class="value">{{ daily_stats.event_count }}</div>
                                    <div class="unit">次</div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="volume-stat-card" style="background: linear-gradient(135deg, #9b59b6, #8e44ad);">
                                    <h6>平均尿量</h6>
                                    <div class="value">{{ daily_stats.average_volume }}</div>
                                    <div class="unit">ml/次</div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="volume-stat-card" style="background: linear-gradient(135deg, #e74c3c, #c0392b);">
                                    <h6>平均间隔</h6>
                                    <div class="value">{{ daily_stats.frequency_hours }}</div>
                                    <div class="unit">小时</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 目标进度 -->
                        <div class="mb-3">
                            <h6>每日目标进度</h6>
                            <div class="progress" style="height: 25px;">
                                <div class="progress-bar progress-bar-volume" 
                                     role="progressbar" 
                                     style="width: {{ daily_stats.volume_percentage }}%;"
                                     aria-valuenow="{{ daily_stats.volume_percentage }}" 
                                     aria-valuemin="0" 
                                     aria-valuemax="100">
                                    {{ daily_stats.volume_percentage }}%
                                </div>
                            </div>
                            <small class="text-muted">目标: {{ daily_stats.goal_ml }} ml | 已完成: {{ daily_stats.total_volume }} ml</small>
                        </div>
                        
                        <!-- 尿量状态 -->
                        <div class="alert alert-{{ volume_color }} mb-3">
                            <h6><i class="fas fa-tachometer-alt"></i> 尿量状态</h6>
                            <p class="mb-0">{{ volume_status }}</p>
                        </div>
                        
                        <!-- 尿量警告 -->
                        {% if volume_alerts %}
                        <div class="mb-3">
                            <h6><i class="fas fa-exclamation-circle"></i> 尿量提醒</h6>
                            {% for alert in volume_alerts %}
                            <div class="volume-alert">
                                <small>{{ alert }}</small>
                            </div>
                            {% endfor %}
                        </div>
                        {% endif %}
                        
                        <!-- 正常范围说明 -->
                        <div class="alert alert-light">
                            <h6><i class="fas fa-info-circle"></i> 正常范围参考</h6>
                            <p class="small mb-1">
                                <strong>单次尿量:</strong> 200-500 ml<br>
                                <strong>每日尿量:</strong> 800-2000 ml<br>
                                <strong>排尿频率:</strong> 4-8次/天<br>
                                <strong>排尿间隔:</strong> 2-4小时
                            </p>
                        </div>
                        
                        <!-- 快速操作 -->
                        <div class="mt-3">
                            <a href="/volume/history" class="btn btn-outline-primary btn-sm">
                                <i class="fas fa-history"></i> 查看详细历史
                            </a>
                            <a href="/volume/stats?days=7" class="btn btn-outline-info btn-sm">
                                <i class="fas fa-chart-bar"></i> 周度统计
                            </a>
                        </div>
                    </div>
                </div>
                
                <!-- 建议卡片 -->
                <div class="card mt-4">
                    <div class="card-header">
                        <i class="fas fa-lightbulb"></i> 健康建议
                    </div>
                    <div class="card-body">
                        {% if recommendations %}
                        <ul class="list-group list-group-flush">
                            {% for rec in recommendations %}
                            <li class="list-group-item">
                                <i class="fas fa-check-circle text-success me-2"></i>
                                {{ rec }}
                            </li>
                            {% endfor %}
                        </ul>
                        {% else %}
                        <div class="text-center py-3">
                            <i class="fas fa-lightbulb fa-2x text-muted mb-2"></i>
                            <p class="text-muted small">等待AI分析提供建议...</p>
                        </div>
                        {% endif %}
                        
                        <!-- 通用建议 -->
                        <div class="mt-3">
                            <h6 class="text-muted">通用健康建议</h6>
                            <ul class="small text-muted mb-0">
                                <li>保持每日饮水1500-2000ml</li>
                                <li>避免长时间憋尿</li>
                                <li>注意观察尿液颜色变化</li>
                                <li>如有异常及时就医</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 右侧：AI分析结果 -->
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-robot"></i> AI智能诊断分析
                        {% if ai_stats.total_ai_requests > 0 %}
                        <span class="badge bg-info float-end">
                            成功率: {{ (ai_stats.successful_ai_requests / ai_stats.total_ai_requests * 100) | round(1) }}%
                        </span>
                        {% endif %}
                    </div>
                    <div class="card-body">
                        {% if has_ai_analysis %}
                        <div class="mb-3">
                            <div class="row">
                                <div class="col-md-5">
                                    <small class="text-muted">
                                        <i class="fas fa-robot"></i> {{ ai_model }}
                                    </small>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted">
                                        <i class="fas fa-clock"></i> {{ ai_timestamp[11:19] }}
                                    </small>
                                </div>
                                <div class="col-md-3 text-end">
                                    <small class="text-muted">
                                        <i class="fas fa-stopwatch"></i> {{ ai_response_time }}秒
                                    </small>
                                </div>
                            </div>
                        </div>
                        
                        <!-- AI分析摘要 -->
                        <div class="alert alert-info">
                            <h6><i class="fas fa-stethoscope"></i> 分析摘要</h6>
                            <p class="mb-0">{{ ai_summary }}</p>
                        </div>
                        
                        <!-- AI详细分析 -->
                        <div class="ai-analysis">
                            <h6><i class="fas fa-file-medical-alt"></i> 详细诊断报告</h6>
                            <div class="ai-text mt-3">
                                {{ ai_text | safe }}
                            </div>
                        </div>
                        
                        {% else %}
                        <div class="text-center py-5">
                            {% if ai_enabled %}
                                {% if has_data %}
                                <i class="fas fa-spinner fa-spin fa-3x text-primary mb-3"></i>
                                <p class="text-primary">正在等待AI分析结果...</p>
                                <p class="text-muted small">Arduino数据已收到，AI分析可能需要几秒钟</p>
                                {% else %}
                                <i class="fas fa-robot fa-3x text-muted mb-3"></i>
                                <p class="text-muted">等待Arduino数据以进行AI分析...</p>
                                {% endif %}
                            {% else %}
                            <i class="fas fa-robot fa-3x text-secondary mb-3"></i>
                            <p class="text-muted">AI分析功能未启用</p>
                            <p class="small text-muted">请在配置中启用AI分析功能</p>
                            {% endif %}
                        </div>
                        {% endif %}
                    </div>
                </div>
                
                <!-- 关键发现 -->
                <div class="card mt-4">
                    <div class="card-header">
                        <i class="fas fa-search"></i> 关键发现
                    </div>
                    <div class="card-body">
                        {% if key_findings %}
                        <ul class="list-group list-group-flush">
                            {% for finding in key_findings %}
                            <li class="list-group-item">
                                <i class="fas fa-binoculars text-primary me-2"></i>
                                {{ finding }}
                            </li>
                            {% endfor %}
                        </ul>
                        {% else %}
                        <div class="text-center py-3">
                            <i class="fas fa-search fa-2x text-muted mb-2"></i>
                            <p class="text-muted small">无显著异常发现</p>
                            <p class="text-muted small">这是一个良好的健康信号</p>
                        </div>
                        {% endif %}
                    </div>
                </div>
            </div>
        </div>

        <!-- AI统计信息 -->
        {% if ai_stats.total_ai_requests > 0 %}
        <div class="row mt-3">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-chart-line"></i> AI分析统计
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-3">
                                <h6>总请求数</h6>
                                <p class="sensor-value">{{ ai_stats.total_ai_requests }}</p>
                            </div>
                            <div class="col-md-3">
                                <h6>成功请求</h6>
                                <p class="sensor-value">{{ ai_stats.successful_ai_requests }}</p>
                            </div>
                            <div class="col-md-3">
                                <h6>平均响应时间</h6>
                                <p class="sensor-value">{{ ai_stats.avg_response_time | round(2) }}秒</p>
                            </div>
                            <div class="col-md-3">
                                <h6>成功率</h6>
                                <p class="sensor-value">
                                    {{ (ai_stats.successful_ai_requests / ai_stats.total_ai_requests * 100) | round(1) }}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        {% endif %}
    </div>

    <!-- 刷新按钮 -->
    <button class="btn btn-primary refresh-btn rounded-circle" onclick="window.location.reload()">
        <i class="fas fa-sync-alt"></i>
    </button>

    <footer class="mt-5 py-3 bg-light text-center">
        <div class="container">
            <p class="mb-0 text-muted">
                尿液智能分析系统 v1.3.0 | 
                <i class="fas fa-tint text-info"></i> 
                尿量追踪与分析 |
                <i class="fas fa-palette text-purple"></i>
                尿液颜色分析 |
                <i class="fas fa-robot text-primary"></i>
                AI智能诊断
            </p>
            <p class="small text-muted mt-2">
                最后更新: {{ current_time }} | 
                数据接收: {{ total_received }} 次 | 
                小便事件: {{ urination_events_count }} 次 |
                AI分析: {{ ai_stats.total_ai_requests }} 次
            </p>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // 自动刷新页面（每30秒）
        setTimeout(function() {
            window.location.reload();
        }, 30000);
        
        // 页面加载时滚动到顶部
        window.onload = function() {
            window.scrollTo(0, 0);
        };
        
        // 动态更新颜色框
        function updateColorBox() {
            const colorBox = document.querySelector('.color-box');
            if (colorBox && colorBox.style.backgroundColor === '') {
                const rgb = '{{ color_rgb }}';
                if (rgb && rgb !== '未知') {
                    colorBox.style.backgroundColor = `rgb(${rgb})`;
                }
            }
        }
        
        // 页面加载后更新颜色框
        document.addEventListener('DOMContentLoaded', updateColorBox);
    </script>
</body>
</html>
'''

def generate_history_html():
    """生成历史数据HTML模板"""
    return '''
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>历史数据 - 尿液分析系统</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body { background-color: #f8f9fa; }
        .card { border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
        .table-hover tbody tr:hover { background-color: rgba(52, 152, 219, 0.1); }
        .risk-badge { font-size: 0.8rem; padding: 0.25rem 0.5rem; }
        .data-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .color-badge { 
            display: inline-block; 
            width: 15px; 
            height: 15px; 
            border-radius: 3px; 
            margin-right: 5px;
            border: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary mb-4">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-flask"></i> 尿液智能分析系统 v1.3.0
            </a>
            <div class="navbar-nav">
                <a class="nav-link" href="/dashboard">仪表盘</a>
                <a class="nav-link" href="/volume/history">尿量历史</a>
                <a class="nav-link active" href="/history">历史数据</a>
                <a class="nav-link" href="/color/chart">颜色对照表</a>
                <a class="nav-link" href="/color/test">测试颜色分析</a>
                <a class="nav-link" href="/status">系统状态</a>
            </div>
        </div>
    </nav>

    <div class="container">
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        <h4><i class="fas fa-history"></i> 历史数据记录</h4>
                        <p class="text-muted mb-0">共 {{ total }} 条记录，显示最近 {{ history|length }} 条</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        {% if history %}
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>时间</th>
                                        <th>设备ID</th>
                                        <th>尿液颜色</th>
                                        <th>尿量</th>
                                        <th>电导率</th>
                                        <th>尿比重</th>
                                        <th>风险等级</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {% for record in history %}
                                    <tr>
                                        <td>{{ record.timestamp[:19] }}</td>
                                        <td>{{ record.raw_data.device_id }}</td>
                                        <td>
                                            {% if record.parsed_data.color_analysis and record.parsed_data.color_analysis.success %}
                                                {% set color_data = record.parsed_data.color_analysis %}
                                                <span class="color-badge" style="background-color: rgb({{ color_data.rgb }})"></span>
                                                {{ color_data.color_name }}
                                            {% elif record.parsed_data.color_rgb %}
                                                <span class="color-badge" style="background-color: rgb({{ record.parsed_data.color_rgb }})"></span>
                                                颜色已记录
                                            {% else %}
                                                <span class="text-muted">-</span>
                                            {% endif %}
                                        </td>
                                        <td>
                                            {% if record.parsed_data.urine_volume %}
                                                {{ record.parsed_data.urine_volume }}
                                            {% else %}
                                                <span class="text-muted">-</span>
                                            {% endif %}
                                        </td>
                                        <td>
                                            {% if record.parsed_data.conductivity %}
                                                {{ record.parsed_data.conductivity }}
                                            {% else %}
                                                <span class="text-muted">-</span>
                                            {% endif %}
                                        </td>
                                        <td>
                                            {% if record.parsed_data.specific_gravity %}
                                                {{ record.parsed_data.specific_gravity }}
                                            {% else %}
                                                <span class="text-muted">-</span>
                                            {% endif %}
                                        </td>
                                        <td>
                                            {% set risk = record.analysis.basic_analysis.risk_level %}
                                            {% if risk == "low" %}
                                                <span class="badge bg-success risk-badge">低风险</span>
                                            {% elif risk == "medium" %}
                                                <span class="badge bg-warning risk-badge">中风险</span>
                                            {% elif risk == "high" %}
                                                <span class="badge bg-danger risk-badge">高风险</span>
                                            {% else %}
                                                <span class="badge bg-secondary risk-badge">未知</span>
                                            {% endif %}
                                        </td>
                                        <td>
                                            <button class="btn btn-sm btn-outline-primary" onclick="viewDetails('{{ record.id }}')">
                                                <i class="fas fa-eye"></i> 查看
                                            </button>
                                        </td>
                                    </tr>
                                    {% endfor %}
                                </tbody>
                            </table>
                        </div>
                        {% else %}
                        <div class="text-center py-5">
                            <i class="fas fa-database fa-3x text-muted mb-3"></i>
                            <p class="text-muted">暂无历史数据</p>
                            <a href="/dashboard" class="btn btn-primary">
                                <i class="fas fa-redo"></i> 返回仪表盘
                            </a>
                        </div>
                        {% endif %}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mt-3">
            <div class="col-md-12 text-center">
                <a href="/dashboard" class="btn btn-outline-primary">
                    <i class="fas fa-arrow-left"></i> 返回仪表盘
                </a>
                <button class="btn btn-primary" onclick="window.location.reload()">
                    <i class="fas fa-sync-alt"></i> 刷新数据
                </button>
                <a href="/volume/history" class="btn btn-info">
                    <i class="fas fa-tint"></i> 查看尿量历史
                </a>
            </div>
        </div>
    </div>

    <footer class="mt-5 py-3 bg-light text-center">
        <div class="container">
            <p class="mb-0 text-muted">
                尿液智能分析系统 v1.3.0 | 尿液颜色分析功能 | 当前时间: {{ current_time }}
            </p>
        </div>
    </footer>

    <script>
        function viewDetails(recordId) {
            alert('记录ID: ' + recordId + '\\n详细功能正在开发中...');
        }
        
        // 更新所有颜色徽章
        document.addEventListener('DOMContentLoaded', function() {
            const colorBadges = document.querySelectorAll('.color-badge');
            colorBadges.forEach(badge => {
                const bgColor = badge.style.backgroundColor;
                if (!bgColor || bgColor === '') {
                    const rgb = badge.parentElement.textContent.match(/\d+,\d+,\d+/);
                    if (rgb) {
                        badge.style.backgroundColor = `rgb(${rgb[0]})`;
                    }
                }
            });
        });
    </script>
</body>
</html>
'''

def generate_volume_history_html():
    """生成尿量历史HTML模板"""
    return '''
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>尿量历史 - 尿液分析系统</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body { background-color: #f8f9fa; }
        .card { border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
        .volume-event-card {
            border-left: 4px solid #2ecc71;
            margin-bottom: 10px;
        }
        .volume-badge {
            background-color: #2ecc71;
            color: white;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 0.9rem;
        }
        .time-badge {
            background-color: #3498db;
            color: white;
            padding: 3px 8px;
            border-radius: 15px;
            font-size: 0.8rem;
        }
        .duration-badge {
            background-color: #9b59b6;
            color: white;
            padding: 3px 8px;
            border-radius: 15px;
            font-size: 0.8rem;
        }
        .volume-progress {
            height: 10px;
            border-radius: 5px;
            background-color: #ecf0f1;
            margin-top: 5px;
        }
        .volume-progress-bar {
            height: 100%;
            border-radius: 5px;
            background-color: #2ecc71;
        }
        .volume-stat {
            font-size: 1.5rem;
            font-weight: bold;
            color: #2c3e50;
        }
        .stat-card {
            background: white;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary mb-4">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-flask"></i> 尿液智能分析系统 v1.3.0
            </a>
            <div class="navbar-nav">
                <a class="nav-link" href="/dashboard">仪表盘</a>
                <a class="nav-link active" href="/volume/history">尿量历史</a>
                <a class="nav-link" href="/history">历史数据</a>
                <a class="nav-link" href="/color/chart">颜色对照表</a>
                <a class="nav-link" href="/color/test">测试颜色分析</a>
                <a class="nav-link" href="/status">系统状态</a>
            </div>
        </div>
    </nav>

    <div class="container">
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        <h4><i class="fas fa-tint"></i> 尿量历史记录</h4>
                        <p class="text-muted mb-0">共 {{ total_events }} 个小便事件，显示最近 {{ events|length }} 个</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- 统计卡片 -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="stat-card">
                    <h6><i class="fas fa-tint text-info"></i> 总尿量</h6>
                    {% if events %}
                        {% set total_volume = events|sum(attribute='total_volume') %}
                        <div class="volume-stat">{{ "%.1f"|format(total_volume) }}</div>
                        <small class="text-muted">ml</small>
                    {% else %}
                        <div class="volume-stat">0</div>
                        <small class="text-muted">ml</small>
                    {% endif %}
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <h6><i class="fas fa-list-ol text-primary"></i> 事件总数</h6>
                    <div class="volume-stat">{{ events|length }}</div>
                    <small class="text-muted">个</small>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <h6><i class="fas fa-calculator text-success"></i> 平均尿量</h6>
                    {% if events %}
                        {% set avg_volume = events|sum(attribute='total_volume') / events|length %}
                        <div class="volume-stat">{{ "%.1f"|format(avg_volume) }}</div>
                        <small class="text-muted">ml/次</small>
                    {% else %}
                        <div class="volume-stat">0</div>
                        <small class="text-muted">ml/次</small>
                    {% endif %}
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <h6><i class="fas fa-clock text-warning"></i> 平均时长</h6>
                    {% if events %}
                        {% set avg_duration = events|sum(attribute='duration') / events|length %}
                        <div class="volume-stat">{{ "%.1f"|format(avg_duration) }}</div>
                        <small class="text-muted">秒</small>
                    {% else %}
                        <div class="volume-stat">0</div>
                        <small class="text-muted">秒</small>
                    {% endif %}
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        {% if events %}
                        <h5><i class="fas fa-history"></i> 最近小便事件</h5>
                        
                        {% for event in events %}
                        <div class="card volume-event-card">
                            <div class="card-body">
                                <div class="row align-items-center">
                                    <div class="col-md-3">
                                        <h6>{{ event.start_time[11:19] }}</h6>
                                        <small class="text-muted">{{ event.start_time[:10] }}</small>
                                    </div>
                                    <div class="col-md-4">
                                        <span class="volume-badge">
                                            <i class="fas fa-tint"></i> {{ "%.1f"|format(event.total_volume) }} ml
                                        </span>
                                        <span class="time-badge ms-2">
                                            <i class="fas fa-clock"></i> {{ "%.1f"|format(event.duration) }}s
                                        </span>
                                        {% if event.average_flow_rate > 0 %}
                                        <span class="duration-badge ms-2">
                                            <i class="fas fa-tachometer-alt"></i> {{ "%.1f"|format(event.average_flow_rate) }} ml/s
                                        </span>
                                        {% endif %}
                                    </div>
                                    <div class="col-md-5">
                                        <div class="volume-progress">
                                            {% set percentage = (event.total_volume / 500) * 100 %}
                                            {% if percentage > 100 %}{% set percentage = 100 %}{% endif %}
                                            <div class="volume-progress-bar" style="width: {{ percentage }}%"></div>
                                        </div>
                                        <small class="text-muted">
                                            正常范围: 200-500 ml | 
                                            状态: 
                                            {% if event.total_volume < 200 %}
                                                <span class="text-warning">偏少</span>
                                            {% elif event.total_volume > 500 %}
                                                <span class="text-warning">偏多</span>
                                            {% else %}
                                                <span class="text-success">正常</span>
                                            {% endif %}
                                        </small>
                                    </div>
                                </div>
                                
                                {% if event.flow_data and event.flow_data|length > 1 %}
                                <div class="mt-2">
                                    <small class="text-muted">
                                        <i class="fas fa-chart-line"></i> 流量数据: {{ event.flow_data|length }} 个采样点
                                    </small>
                                </div>
                                {% endif %}
                            </div>
                        </div>
                        {% endfor %}
                        
                        {% else %}
                        <div class="text-center py-5">
                            <i class="fas fa-tint fa-3x text-muted mb-3"></i>
                            <p class="text-muted">暂无尿量历史记录</p>
                            <p class="small text-muted">小便事件将在这里显示</p>
                            <a href="/dashboard" class="btn btn-primary">
                                <i class="fas fa-redo"></i> 返回仪表盘
                            </a>
                        </div>
                        {% endif %}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mt-3">
            <div class="col-md-12 text-center">
                <a href="/dashboard" class="btn btn-outline-primary">
                    <i class="fas fa-arrow-left"></i> 返回仪表盘
                </a>
                <button class="btn btn-primary" onclick="window.location.reload()">
                    <i class="fas fa-sync-alt"></i> 刷新数据
                </button>
                <a href="/volume/stats?days=7" class="btn btn-info">
                    <i class="fas fa-chart-bar"></i> 查看周度统计
                </a>
            </div>
        </div>
    </div>

    <footer class="mt-5 py-3 bg-light text-center">
        <div class="container">
            <p class="mb-0 text-muted">
                尿液智能分析系统 v1.3.0 | 尿量追踪与分析 | 当前时间: {{ current_time }}
            </p>
        </div>
    </footer>

    <script>
        // 自动刷新页面（每60秒）
        setTimeout(function() {
            window.location.reload();
        }, 60000);
    </script>
</body>
</html>
'''

# ===========================================
# 8. 启动服务器
# ===========================================

if __name__ == '__main__':
    # 记录启动时间
    app_start_time = time.time()
    
    # 显示启动信息
    print("\n" + "="*60)
    print("🧪 尿液分析服务器 v1.3.0")
    print("="*60)
    print(f"📡 地址: http://{FLASK_CONFIG['host']}:{FLASK_CONFIG['port']}")
    print(f"🔧 调试模式: {'开启' if FLASK_CONFIG['debug'] else '关闭'}")
    print(f"🤖 AI分析: {'已启用' if urine_analyzer.ai_enabled else '未启用'}")
    print(f"🤖 AI模型: {AI_CONFIG.get('model', '未知')}")
    print(f"💧 尿量追踪: 已启用")
    print(f"🎨 颜色分析: 已启用")
    print(f"💾 数据存储: {STORAGE_CONFIG['save_to_file']}")
    print(f"📊 历史数据: {data_store['total_received']} 条")
    print(f"💦 小便事件: {len(data_store.get('urination_events', []))} 次")
    print("="*60)
    print("🌐 Web界面:")
    print(f"  1. 仪表盘: http://{FLASK_CONFIG['host']}:{FLASK_CONFIG['port']}/")
    print(f"  2. 尿量历史: http://{FLASK_CONFIG['host']}:{FLASK_CONFIG['port']}/volume/history")
    print(f"  3. 颜色分析: http://{FLASK_CONFIG['host']}:{FLASK_CONFIG['port']}/color/chart")
    print(f"  4. 历史数据: http://{FLASK_CONFIG['host']}:{FLASK_CONFIG['port']}/history")
    print(f"  5. 系统状态: http://{FLASK_CONFIG['host']}:{FLASK_CONFIG['port']}/status")
    print("="*60)
    print("📡 API端点:")
    print(f"  POST /upload - 接收Arduino数据")
    print(f"  GET /volume/stats - 获取尿量统计")
    print(f"  GET /volume/daily - 获取每日尿量")
    print("="*60)
    print("🔄 正在启动服务器...")
    
    try:
        # 获取本机IP地址
        import socket
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        print(f"🌍 本地网络访问: http://{local_ip}:{FLASK_CONFIG['port']}")
        
        app.run(
            host=FLASK_CONFIG['host'],
            port=FLASK_CONFIG['port'],
            debug=FLASK_CONFIG['debug'],
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n\n🛑 服务器已停止")
        logger.info("服务器已停止")
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        logger.error(f"启动失败: {e}")