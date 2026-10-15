import React from 'react'
import {
  X,
  ArrowLeft,
  DollarSign,
  AlertOctagon,
  Trash2,
} from 'lucide-react'
import { Pill, buttonClass } from '../../ui'
import type { Participant } from '../types'

interface ParticipantDrawerModalProps {
  selectedParticipant: Participant | null
  setSelectedParticipant: (p: Participant | null) => void
  managingContractModal: any
  setManagingContractModal: (modal: any) => void
  setExtraBountyTarget: (target: { id: string; name: string } | null) => void
  setExtraBountyAmount: (amt: number) => void
  setExtraBountyReason: (reason: string) => void
  setOverrideModal: (modal: {
    participantId: string
    userId: string
    objId: string | number
    objTitle: string
    action: 'mark_completed' | 'mark_uncompleted' | 'reset'
    contractId?: number
  } | null) => void
  setOverrideReason: (reason: string) => void
  onDeleteParticipant?: (p: Participant) => Promise<void> | void
}

export const ParticipantDrawerModal: React.FC<ParticipantDrawerModalProps> = ({
  selectedParticipant,
  setSelectedParticipant,
  managingContractModal,
  setManagingContractModal,
  setExtraBountyTarget,
  setExtraBountyAmount,
  setExtraBountyReason,
  setOverrideModal,
  setOverrideReason,
  onDeleteParticipant,
}) => {
  if (!selectedParticipant) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-bg p-5 shadow-2xl space-y-4">
        {/* Top Modal Navigation: Back and Close */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-3">
            {managingContractModal && (
              <button
                type="button"
                onClick={() => setSelectedParticipant(null)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-fg hover:border-accent hover:text-accent"
                title={`Back to Contract #${managingContractModal.id}`}
              >
                <ArrowLeft className="size-3.5" /> Back to Contract #{managingContractModal.id}
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{selectedParticipant.name}</h3>
                <span className="text-xs text-muted">#{selectedParticipant.tornId}</span>
                <Pill tone={selectedParticipant.status === 'active' ? 'accent' : 'neutral'}>
                  Rank #{selectedParticipant.rank}
                </Pill>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Progress: {selectedParticipant.completedCount}/{selectedParticipant.totalCount} · Partial Earnings: <strong className="text-accent">${((selectedParticipant.partialRewardsEarned || 0) / 1e6).toFixed(2)}M</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedParticipant(null)}
              className="rounded-lg p-1.5 text-muted hover:text-fg"
              title="Close Agent Inspector"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {selectedParticipant.suspiciousReason && (
          <div className="rounded-xl border border-extreme/40 bg-extreme/10 p-3 text-xs text-extreme flex items-center gap-2">
            <AlertOctagon className="size-4 shrink-0" />
            <span>Flagged Anomaly: {selectedParticipant.suspiciousReason}</span>
          </div>
        )}

        {/* Objectives Progression Breakdown & Manual Overrides */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted">Tasks Telemetry Breakdown & Manual Progression Overrides</h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setExtraBountyTarget({ id: selectedParticipant.id, name: selectedParticipant.name })
                  setExtraBountyAmount(250000)
                  setExtraBountyReason('Outstanding contract execution performance')
                }}
                className="inline-flex items-center gap-1 rounded bg-accent/15 px-2.5 py-1 text-[11px] font-bold text-accent hover:bg-accent/25"
              >
                <DollarSign className="size-3" /> Award Extra Bounty
              </button>
              {onDeleteParticipant && (
                <button
                  type="button"
                  onClick={() => onDeleteParticipant(selectedParticipant)}
                  className="inline-flex items-center gap-1 rounded border border-extreme/30 bg-extreme/10 px-2.5 py-1 text-[11px] font-bold text-extreme hover:bg-extreme/20"
                  title="Remove this agent from the contract"
                >
                  <Trash2 className="size-3" /> Remove Agent
                </button>
              )}
            </div>
          </div>

          <ul className="space-y-2">
            {(selectedParticipant.objectivesProgress || []).map((op, idx) => {
              const done = (op.current ?? 0) >= (op.target ?? 1)
              return (
                <li
                  key={op.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border p-3 text-xs ${
                    op.isSuspicious
                      ? 'border-extreme/40 bg-extreme/10'
                      : done
                        ? 'border-accent/30 bg-accent/5'
                        : 'border-line bg-surface'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="tabular font-bold w-5 text-muted">#{idx + 1}</span>
                    <div>
                      <p className="font-semibold text-fg">{op.title}</p>
                      <p className="text-[10px] text-muted">
                        {op.category} · {op.difficulty} · <span className="text-accent font-medium">Bounty: ${(op.partialReward || 500000).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="tabular font-semibold mr-1">
                      {done ? '✓ Completed' : `${op.current}/${op.target}`}
                    </span>

                    <div className="flex items-center gap-1 border-l border-line pl-2">
                      {!done ? (
                        <button
                          type="button"
                          onClick={() => {
                            setOverrideModal({
                              participantId: selectedParticipant.id,
                              userId: (selectedParticipant as any).user_id || `usr-${selectedParticipant.tornId}`,
                              objId: op.id,
                              objTitle: op.title,
                              action: 'mark_completed',
                              contractId: managingContractModal?.id,
                            })
                            setOverrideReason('Manual overseer verification bypass')
                          }}
                          className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent hover:bg-accent/25"
                          title="Force mark completed"
                        >
                          Complete
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setOverrideModal({
                              participantId: selectedParticipant.id,
                              userId: (selectedParticipant as any).user_id || `usr-${selectedParticipant.tornId}`,
                              objId: op.id,
                              objTitle: op.title,
                              action: 'mark_uncompleted',
                              contractId: managingContractModal?.id,
                            })
                            setOverrideReason('Revoking false-positive verification')
                          }}
                          className="rounded bg-extreme/15 px-2 py-0.5 text-[10px] font-bold text-extreme hover:bg-extreme/25"
                          title="Force mark uncompleted"
                        >
                          Incomplete
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setOverrideModal({
                            participantId: selectedParticipant.id,
                            userId: (selectedParticipant as any).user_id || `usr-${selectedParticipant.tornId}`,
                            objId: op.id,
                            objTitle: op.title,
                            action: 'reset',
                            contractId: managingContractModal?.id,
                          })
                          setOverrideReason('Resetting progress to zero upon overseer request')
                        }}
                        className="rounded border border-line bg-raised px-2 py-0.5 text-[10px] font-medium text-muted hover:text-fg hover:border-accent"
                        title="Reset progress to 0"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-line">
          <span className="text-xs text-faint">Manual overrides take precedence and are recorded in audit logs.</span>
          <div className="flex items-center gap-2">
            {managingContractModal && (
              <button
                type="button"
                onClick={() => setSelectedParticipant(null)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-fg hover:border-accent hover:text-accent"
              >
                <ArrowLeft className="size-3.5" /> Back to Contract #{managingContractModal.id}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedParticipant(null)
                if (managingContractModal) setManagingContractModal(null)
              }}
              className={`${buttonClass('secondary')} text-xs py-1.5`}
            >
              {managingContractModal ? 'Close All' : 'Close Details'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
