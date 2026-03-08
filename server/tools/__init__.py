"""
Pluggable tool registry for SAP Helpdesk Agent.

Tools are registered via register_all_tools(gemini_client) which
hooks into GeminiLive's tool_mapping dict. Each tool is a simple
async/sync function — add or remove tools without touching core code.
"""
from server.tools.registry import register_all_tools, TOOL_DECLARATIONS

__all__ = ["register_all_tools", "TOOL_DECLARATIONS"]
