import React from 'react'
import { X } from 'lucide-react'
import { buttonClass } from '../../ui'
import type { Category } from '../../../types'

interface TaskModalProps {
  taskModalMode: 'create' | 'edit' | null
  setTaskModalMode: (mode: 'create' | 'edit' | null) => void
  editingTaskIndex: number
  taskTitle: string
  setTaskTitle: (v: string) => void
  taskCategory: Category
  setTaskCategory: (v: Category) => void
  taskComplexity: 'easy' | 'medium' | 'hard' | 'extreme'
  setTaskComplexity: (v: 'easy' | 'medium' | 'hard' | 'extreme') => void
  taskTarget: number
  setTaskTarget: (v: number) => void
  taskBounty: number
  setTaskBounty: (v: number) => void
  taskMetric: 'count' | 'sum' | 'distinct'
  setTaskMetric: (v: 'count' | 'sum' | 'distinct') => void
  taskLogPattern: string
  setTaskLogPattern: (v: string) => void
  taskAgentNote: string
  setTaskAgentNote: (v: string) => void
  taskError: string | null
  setTaskError: (v: string | null) => void
  addObjectiveToContract: (obj: any) => void
  editObjectiveInContract: (idx: number, obj: any) => void
  addObjectiveToPool?: (obj: any) => string
}

export const TaskModal: React.FC<TaskModalProps> = ({
  taskModalMode,
  setTaskModalMode,
  editingTaskIndex,
  taskTitle,
  setTaskTitle,
  taskCategory,
  setTaskCategory,
  taskComplexity,
  setTaskComplexity,
  taskTarget,
  setTaskTarget,
  taskBounty,
  setTaskBounty,
  taskMetric,
  setTaskMetric,
  taskLogPattern,
  setTaskLogPattern,
  taskAgentNote,
  setTaskAgentNote,
  taskError,
  setTaskError,
  addObjectiveToContract,
  editObjectiveInContract,
  addObjectiveToPool,
}) => {
  if (!taskModalMode) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-bg p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-base font-bold text-fg">
              {taskModalMode === 'create' ? 'Create Pool Objective / Task' : `Edit Task #${editingTaskIndex + 1}`}
            </h3>
            <p className="text-xs text-muted">
              {taskModalMode === 'create'
                ? 'Adds a new objective to the Objective Master Pool library.'
                : 'Specify objective, required log syntax for real-time verification, complexity, and bounty.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTaskModalMode(null)}
            className="rounded-lg p-1.5 text-muted hover:text-fg"
          >
            <X className="size-5" />
          </button>
        </div>

        {taskError && (
          <div className="rounded-lg border border-extreme/30 bg-extreme/10 p-2.5 text-xs text-extreme">
            {taskError}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div className="sm:col-span-2">
            <label className="block text-muted font-medium">Task Objective Title *</label>
            <input
              type="text"
              placeholder="e.g. Defeat 10 opponents"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-fg focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-muted font-medium">Category</label>
            <select
              value={taskCategory}
              onChange={(e) => setTaskCategory(e.target.value as Category)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-fg focus:border-accent focus:outline-none"
            >
              <option value="combat">Combat</option>
              <option value="travel">Travel</option>
              <option value="energy">Energy</option>
              <option value="economy">Economy</option>
              <option value="general">General</option>
              <option value="faction">Faction</option>
            </select>
          </div>

          <div>
            <label className="block text-muted font-medium">Complexity Tier *</label>
            <select
              value={taskComplexity}
              onChange={(e) => setTaskComplexity(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-fg focus:border-accent focus:outline-none"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="extreme">Extreme</option>
            </select>
          </div>

          <div>
            <label className="block text-muted font-medium">Target Count / Amount *</label>
            <input
              type="number"
              min={1}
              value={taskTarget}
              onChange={(e) => setTaskTarget(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-fg focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-muted font-medium">Metric Evaluation</label>
            <select
              value={taskMetric}
              onChange={(e) => setTaskMetric(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-fg focus:border-accent focus:outline-none"
            >
              <option value="count">Count (Occurrences)</option>
              <option value="sum">Sum (Accumulate captured value)</option>
              <option value="distinct">Distinct (Unique target entries)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-muted font-medium">Bounty Value ($) *</label>
            <input
              type="number"
              min={0}
              step={50000}
              value={taskBounty}
              onChange={(e) => setTaskBounty(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-fg focus:border-accent focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="block text-muted font-medium">
                Log Syntax Template(s) (Required for Torn Ingestion) *
              </label>
              <span className="text-[10px] text-faint">Supports 1 or more patterns (1 per line)</span>
            </div>
            <textarea
              rows={4}
              placeholder="e.g.&#10;You used {nerve:int} nerve successfully shoplifting from the {store:text} gaining {items:text}&#10;You used {nerve:int} nerve successfully responding to a {scam:text}"
              value={taskLogPattern}
              onChange={(e) => setTaskLogPattern(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-accent focus:border-accent focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-faint">
              Enter one pattern per line. Any line that matches will increment/contribute to the objective.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-muted font-medium">Agent Directive Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Target players with high rank or fair fights only"
              value={taskAgentNote}
              onChange={(e) => setTaskAgentNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-fg focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-line">
          <button
            type="button"
            onClick={() => setTaskModalMode(null)}
            className={`${buttonClass('secondary')} text-xs py-1.5`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!taskTitle.trim()) {
                setTaskError('Task Title is required.')
                return
              }
              if (!taskLogPattern.trim()) {
                setTaskError('Log Syntax Template is required for task verification.')
                return
              }

              const rawLines = taskLogPattern.split('\n').map((l) => l.trim()).filter(Boolean)
              const parsedPatterns = rawLines.map((line, pIdx) => ({
                key: `pat_${Date.now()}_${pIdx + 1}`,
                template: line,
              }))

              if (taskModalMode === 'create') {
                if (addObjectiveToPool) {
                  addObjectiveToPool({
                    title: taskTitle.trim(),
                    category: taskCategory,
                    difficulty: taskComplexity as any,
                    target: taskTarget,
                    bounty: taskBounty,
                    partialReward: taskBounty,
                    metric: taskMetric,
                    log_pattern: rawLines.join('\n'),
                    log_patterns: parsedPatterns,
                    agent_note: taskAgentNote.trim(),
                    verificationMethod: 'TORN API / Log',
                    enabled: true,
                    eligibleForRng: true,
                    consecutiveAllowed: true,
                    weight: 1.0,
                  })
                } else {
                  addObjectiveToContract({
                    title: taskTitle.trim(),
                    name: taskTitle.trim(),
                    category: taskCategory,
                    difficulty: taskComplexity as any,
                    complexity: taskComplexity,
                    target: taskTarget,
                    bounty: taskBounty,
                    partialReward: taskBounty,
                    metric: taskMetric,
                    log_pattern: rawLines.join('\n'),
                    log_patterns: parsedPatterns,
                    agent_note: taskAgentNote.trim(),
                    verification: 'log',
                  })
                }
              } else if (editingTaskIndex >= 0) {
                editObjectiveInContract(editingTaskIndex, {
                  title: taskTitle.trim(),
                  name: taskTitle.trim(),
                  category: taskCategory,
                  difficulty: taskComplexity as any,
                  complexity: taskComplexity,
                  target: taskTarget,
                  bounty: taskBounty,
                  partialReward: taskBounty,
                  metric: taskMetric,
                  log_pattern: rawLines.join('\n'),
                  log_patterns: parsedPatterns,
                  agent_note: taskAgentNote.trim(),
                })
              }
              setTaskModalMode(null)
            }}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-accent-ink hover:bg-accent/90"
          >
            {taskModalMode === 'create' ? 'Add to Master Pool' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
