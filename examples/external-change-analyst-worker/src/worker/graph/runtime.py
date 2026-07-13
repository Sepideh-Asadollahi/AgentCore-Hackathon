from __future__ import annotations

from typing import Any, Callable


class LinearGraph:
    def __init__(self, steps: tuple[Callable[[dict[str, Any]], dict[str, Any]], ...]):
        self._steps = steps

    def invoke(self, state: dict[str, Any]) -> dict[str, Any]:
        current = dict(state)
        for step in self._steps:
            merged = step(current)
            if merged:
                current = {**current, **merged}
        return current


def compile_linear(*steps: Callable[[dict[str, Any]], dict[str, Any]]) -> Any:
    try:
        from langgraph.graph import END, START, StateGraph
    except ImportError:
        return LinearGraph(steps)

    graph = StateGraph(dict)
    names = [f"step_{index}" for index in range(len(steps))]
    for name, fn in zip(names, steps, strict=True):
        graph.add_node(name, fn)
    graph.add_edge(START, names[0])
    for left, right in zip(names, names[1:], strict=False):
        graph.add_edge(left, right)
    graph.add_edge(names[-1], END)
    return graph.compile()
