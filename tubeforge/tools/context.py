"""Lightweight ToolContext for raw SDK mode (replaces google.adk.tools.ToolContext).

Provides the same .state dict interface that all tool functions use,
without any ADK dependency.
"""

from __future__ import annotations


class ToolContext:
    """Session state container passed to tool functions.

    Drop-in replacement for google.adk.tools.ToolContext — only the
    .state dict attribute is used by our tools.
    """

    def __init__(self, state: dict | None = None):
        self.state: dict = state if state is not None else {}
