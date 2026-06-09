"""
=============================================================
【学习笔记】Python + logging 日志模块

核心知识点：
  1. logging.getLogger(name) — 按模块名获取独立 logger，形成层级树
  2. Handler（处理器）— 决定日志写到哪里：StreamHandler(控制台) / RotatingFileHandler(文件)
  3. Formatter（格式器）— 控制输出样式：带颜色的控制台 vs JSON 文件
  4. 日志级别从低到高：DEBUG < INFO < WARNING < ERROR < CRITICAL
  5. RotatingFileHandler — 超出 maxBytes 时自动轮转，保留 backupCount 个备份

文件输出位置（项目根目录 agent/../logs/）：
  - combined.log  → 所有日志（INFO 级别以上）
  - error.log     → 仅 ERROR 级别及以上
=============================================================
"""

import logging
import logging.handlers
import json
import os
import sys
from datetime import datetime
from typing import Optional


# logs/ 目录放在 agent/ 上级目录，与 NestJS 的 api/logs/ 保持对称
LOGS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "logs")
os.makedirs(LOGS_DIR, exist_ok=True)


# ── ANSI 颜色码 ──────────────────────────────────────────────
# 与 Winston colorize 行为对齐：不同 level 用不同颜色

_LEVEL_COLORS: dict[str, str] = {
    "DEBUG":    "\033[36m",   # 青色
    "INFO":     "\033[32m",   # 绿色
    "WARNING":  "\033[33m",   # 黄色
    "ERROR":    "\033[31m",   # 红色
    "CRITICAL": "\033[35m",   # 紫色
}
_RESET  = "\033[0m"
_BOLD   = "\033[1m"
_DIM    = "\033[2m"


class ColoredConsoleFormatter(logging.Formatter):
    """
    彩色控制台格式器 — 对标 NestJS 的 nestLike + colorize 组合

    输出示例：
      2026-06-04 17:00:00  [INFO    ]  [agent.main]  🚀 Agent service starting...
      2026-06-04 17:00:01  [ERROR   ]  [agent.chat]  处理请求时发生异常
    """

    def format(self, record: logging.LogRecord) -> str:
        color = _LEVEL_COLORS.get(record.levelname, _RESET)
        timestamp = datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S")
        level_tag = record.levelname.ljust(8)

        # 将 Python 模块路径中的下划线风格转为更易读的形式
        context = record.name

        parts = [
            f"{_DIM}{timestamp}{_RESET}",
            f"{color}{_BOLD}[{level_tag}]{_RESET}",
            f"{color}[{context}]{_RESET}",
            record.getMessage(),
        ]
        line = "  ".join(parts)

        if record.exc_info:
            line += f"\n{self.formatException(record.exc_info)}"

        return line


class JsonFileFormatter(logging.Formatter):
    """
    JSON 文件格式器 — 对标 Winston 的 format.json()

    每行一个 JSON 对象，方便 grep / 机器解析：
      {"timestamp": "2026-06-04 17:00:00", "level": "INFO", "context": "agent.main", "message": "..."}
    """

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict = {
            "timestamp": datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S"),
            "level":     record.levelname,
            "context":   record.name,
            "message":   record.getMessage(),
        }
        if record.exc_info:
            log_entry["stack"] = self.formatException(record.exc_info)
        return json.dumps(log_entry, ensure_ascii=False)


# ── 全局初始化（只执行一次）───────────────────────────────────

def _bootstrap() -> None:
    """
    配置 root logger。

    与 NestJS WinstonModule.forRoot() 对齐：
      - Transport 1: 控制台（带颜色，DEBUG 及以上）
      - Transport 2: combined.log（JSON，INFO 及以上，最大 10MB × 5 个）
      - Transport 3: error.log（JSON + stack trace，ERROR 及以上，最大 10MB × 3 个）
    """
    root = logging.getLogger()

    # 防止重复初始化（如 uvicorn reload 场景）
    if root.handlers:
        return

    root.setLevel(logging.DEBUG)

    # ── Transport 1: 控制台 ─────────────────────────────────
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    console_handler.setFormatter(ColoredConsoleFormatter())
    root.addHandler(console_handler)

    # ── Transport 2: combined.log ───────────────────────────
    combined_handler = logging.handlers.RotatingFileHandler(
        filename=os.path.join(LOGS_DIR, "combined.log"),
        maxBytes=10 * 1024 * 1024,  # 10 MB，与 Winston maxsize 对齐
        backupCount=5,               # 保留最近 5 个轮转文件
        encoding="utf-8",
    )
    combined_handler.setLevel(logging.INFO)
    combined_handler.setFormatter(JsonFileFormatter())
    root.addHandler(combined_handler)

    # ── Transport 3: error.log ──────────────────────────────
    error_handler = logging.handlers.RotatingFileHandler(
        filename=os.path.join(LOGS_DIR, "error.log"),
        maxBytes=10 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8",
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(JsonFileFormatter())
    root.addHandler(error_handler)

    # 静默第三方库的冗余日志（对标 NestJS 只输出应用日志的体验）
    for noisy_lib in ("httpx", "httpcore", "chromadb", "langchain", "langgraph"):
        logging.getLogger(noisy_lib).setLevel(logging.WARNING)


_bootstrap()


# ── 公开 API ─────────────────────────────────────────────────

def get_logger(name: Optional[str] = None) -> logging.Logger:
    """
    获取具名 logger，推荐在每个模块顶部调用：

        from logger import get_logger
        logger = get_logger(__name__)

    name 对应 NestJS 中 @Logger('context') 的 context 参数。
    传入 __name__ 会自动使用模块路径作为 context（如 services.graph_service）。
    """
    return logging.getLogger(name or "app")
