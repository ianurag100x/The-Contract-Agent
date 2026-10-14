import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Trophy } from 'lucide-react'
import ObjectiveList from '../components/ObjectiveList'
import { Card, PageHeader, Pill } from '../components/ui'
import { archiveApi } from '../lib/api'
import { duration } from '../lib/format'
import { contractTypeMeta } from '../lib/meta'
import type { ContractType } from '../types'

export default function ArchiveDetailPage() {
  const { number } = useParams()
  const [entry, setEntry] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    archiveApi.getHistory().then((list) => {
      if (list && Array.isArray(list)) {
        const found = list.find((e: any) => String(e.number) === number)
        setEntry(found || null)
      } else {
        setEntry(null)
      }
      setLoading(false)
    })
  }, [number])

  if (loading) {
    return (
      <>
        <BackLink />
        <p className="mt-4 text-muted">Loading contract archive...</p>
      </>
    )
  }

  if (!entry) {
    return (
      <>
        <BackLink />
        <p className="mt-4 text-muted">Contract #{number} not found in archive.</p>
      </>
    )
  }

  const type = contractTypeMeta[entry.type as ContractType] || contractTypeMeta.standard

  return (
    <>
      <BackLink />
      <PageHeader
        title={`Contract #${entry.number}`}
        subtitle={`${entry.date} · ${type.label} · ${type.winners}`}
        right={<Pill>Completed</Pill>}
      />

      <dl className="grid grid-cols-1 divide-y divide-line rounded-2xl border border-line bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-5 py-3.5">
          <dt className="text-xs text-muted">Winner</dt>
          <dd className="mt-1 flex items-center gap-2 text-lg font-semibold">
            <Trophy className="size-4 text-medium" aria-hidden />
            {entry.winner}
          </dd>
        </div>
        <div className="px-5 py-3.5">
          <dt className="text-xs text-muted">Completed after release</dt>
          <dd className="tabular mt-1 text-lg font-semibold">
            {duration(entry.minutes || 0)}
          </dd>
        </div>
        <div className="px-5 py-3.5">
          <dt className="text-xs text-muted">Agents</dt>
          <dd className="tabular mt-1 text-lg font-semibold">
            {(entry.participants || 0).toLocaleString('en-US')}
          </dd>
        </div>
      </dl>

      <Card title="Objectives">
        <ObjectiveList objectives={entry.objectives || []} />
      </Card>
    </>
  )
}

function BackLink() {
  return (
    <Link
      to="/archive"
      className="inline-flex w-fit items-center gap-1 text-[13px] text-muted hover:text-fg"
    >
      <ChevronLeft className="size-4" aria-hidden />
      Archive
    </Link>
  )
}
