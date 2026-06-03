"""
=============================================================
 【学习任务】阶段 5 — 自定义工具实现

 你需要完成的任务：
   1. 实现 search_web() — 模拟网络搜索（或对接真实 API）
   2. 实现 generate_chart() — 生成 BI 图表数据
   3. 理解 @register_tool 装饰器如何注册工具到路由表

 工具规范：
   - 每个工具必须是 async 函数
   - 返回值是字符串或可序列化的 dict
   - 使用 @register_tool("工具名") 注册

 图表工具的特殊约定：
   返回值包含 __chart__ 键时，graph_service 会识别为图表数据，
   发送 chart_data 事件而非普通 token 事件。
=============================================================
"""

import json
from datetime import datetime
from services.graph_service import register_tool


@register_tool("get_current_time")
async def get_current_time() -> str:
    """获取当前时间"""
    now = datetime.now()
    return f"当前时间：{now.strftime('%Y年%m月%d日 %H:%M:%S')}"


@register_tool("generate_chart")
async def generate_chart(
    data_description: str,
    chart_type: str = "bar",
) -> dict:
    """
    ============================================================
    【你的任务】生成 BI 图表数据

    当用户请求数据分析/图表时，Agent 调用此工具生成结构化图表数据，
    前端收到 chart_data 事件后用 Recharts 渲染。

    示例返回值（Agent 返回后会触发 chart_data SSE 事件）：
    {
        "__chart__": true,           ← 标记这是图表数据
        "chart_type": "bar",
        "title": "月度销售统计",
        "x_field": "month",
        "y_field": "sales",
        "data": [
            {"month": "1月", "sales": 1200},
            {"month": "2月", "sales": 1500},
            ...
        ]
    }

    你需要：
      1. 根据 data_description 决定生成什么类型的示例数据
      2. 填充真实数据（或从数据库查询）
    ============================================================
    """
    # TODO: 你来实现图表数据生成逻辑
    sample_data = [
        {"month": "1月", "value": 1200},
        {"month": "2月", "value": 1500},
        {"month": "3月", "value": 800},
        {"month": "4月", "value": 2000},
    ]
    return {
        "__chart__": True,
        "chart_type": chart_type,
        "title": data_description,
        "x_field": "month",
        "y_field": "value",
        "data": sample_data,
    }


@register_tool("search_web")
async def search_web(query: str) -> str:
    """
    ============================================================
    【你的任务】实现网络搜索工具

    可以选择：
      1. 模拟返回（学习阶段先用固定数据）
      2. 对接 DuckDuckGo API（免费，无需 key）
      3. 对接 Tavily API（LangChain 生态推荐）

    DuckDuckGo 示例（需安装 duckduckgo-search）：
      from duckduckgo_search import DDGS
      results = DDGS().text(query, max_results=3)
      return "\n".join([r["body"] for r in results])
    ============================================================
    """
    # TODO: 你来实现真实搜索
    return f"[模拟搜索结果] 关于「{query}」的搜索结果：这是一个示例搜索结果。"


@register_tool("delete_record")
async def delete_record(record_id: str, table: str) -> str:
    """
    危险操作示例 — 删除数据库记录。
    此工具在 graph_service 中被标记为 DANGEROUS_TOOLS，
    执行前会触发 HITL 确认流程。
    """
    # TODO: 实现真实的数据库删除逻辑
    return f"已从 {table} 表中删除记录 {record_id}"
