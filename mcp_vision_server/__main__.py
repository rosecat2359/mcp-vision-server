"""允许通过 python -m mcp_vision_server 启动服务"""
import asyncio
from .server import main

if __name__ == "__main__":
    asyncio.run(main())
