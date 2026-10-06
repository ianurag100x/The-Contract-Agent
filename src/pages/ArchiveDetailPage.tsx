import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Trophy } from 'lucide-react'
import ObjectiveList from '../components/ObjectiveList'
import { Card, PageHeader, Pill } from '../components/ui'
import { archive } from '../data/mock'
import { duration } from '../lib/format'
import { contractTypeMeta } from '../lib/meta'

export default function ArchiveDetailPage() {
  const { number } = useParams()
  const entry = archive.find((e) => String(e.number) === number)

  if (!entry) {
    return (
      <>
        <BackLink />
        <p className="text-muted">Contract not found.</p>
      </>
    )
  }

  const type = contractTypeMeta[entry.type]

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
            {duration(entry.minutes)}
          </dd>
        </div>
        <div className="px-5 py-3.5">
          <dt className="text-xs text-muted">Agents</dt>
          <dd className="tabular mt-1 text-lg font-semibold">
            {entry.participants.toLocaleString('en-US')}
          </dd>
        </div>
      </dl>

      <Card title="Objectives">
        <ObjectiveList objectives={entry.objectives} />
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
