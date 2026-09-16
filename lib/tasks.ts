export type WeekTask = {
  id: string;
  title: string;
  dueKey: string;
  weekKey: string;
  priority: number;
  done: boolean;
  createdAt: number;
};

export function applyOrder(tasks: WeekTask[]): WeekTask[] {
  return tasks.map((task, index) => ({ ...task, priority: index + 1 }));
}

export function rankTasks(tasks: WeekTask[]): WeekTask[] {
  return applyOrder(
    [...tasks].sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt),
  );
}

export function moveTaskTo(tasks: WeekTask[], fromId: string, toId: string): WeekTask[] {
  const ranked = rankTasks(tasks);
  const from = ranked.findIndex((task) => task.id === fromId);
  const to = ranked.findIndex((task) => task.id === toId);
  if (from < 0 || to < 0 || from === to) return ranked;
  return moveTaskToIndex(ranked, fromId, to);
}

export function moveTaskToIndex(tasks: WeekTask[], fromId: string, toIndex: number): WeekTask[] {
  const ranked = rankTasks(tasks);
  const from = ranked.findIndex((task) => task.id === fromId);
  if (from < 0) return ranked;
  const clamped = Math.max(0, Math.min(ranked.length - 1, toIndex));
  if (from === clamped) return ranked;
  const next = [...ranked];
  const [moved] = next.splice(from, 1);
  next.splice(clamped, 0, moved);
  return applyOrder(next);
}
