import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card, PageHeader } from '../components/ui'
import { archive as defaultArchive } from '../data/mock'
import { archiveApi } from '../lib/api'
import { duration } from '../lib/format'
import { contractTypeMeta } from '../lib/meta'

export default function ArchivePage() {
  const [archiveList, setArchiveList] = useState(defaultArchive)

  useEffect(() => {
    let mounted = true
    archiveApi.getHistory().then((res) => {
      if (mounted && res && res.length > 0) {
        setArchiveList(res)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <>
      <PageHeader
        title="Contract Archive"
        subtitle="Every past contract, its winner and how fast it was cleared."
      />

      <Card>
        {/* Table ≥ md */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Past contracts</caption>
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th scope="col" className="px-5 py-3 font-medium">Contract</th>
                <th scope="col" className="px-3 py-3 font-medium">Date</th>
                <th scope="col" className="px-3 py-3 font-medium">Type</th>
                <th scope="col" className="px-3 py-3 font-medium">Winner</th>
                <th scope="col" className="px-3 py-3 font-medium">Completion time</th>
                <th scope="col" className="px-5 py-3"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {archiveList.map((e) => (
                <tr
                  key={e.number}
                  className="border-b border-line last:border-0 hover:bg-raised/40"
                >
                  <td className="tabular px-5 py-3.5 font-medium">
                    <Link
                      to={`/archive/${e.number}`}
                      className="hover:text-accent"
                    >
                      #{e.number}
                    </Link>
                  </td>
                  <td className="px-3 py-3.5 text-muted">{e.date}</td>
                  <td className="px-3 py-3.5 text-muted">
                    {contractTypeMeta[e.type]?.label || e.type}
                    <span className="text-faint">
                      {' '}· {contractTypeMeta[e.type]?.winners || '1 winner'}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 font-medium">{e.winner}</td>
                  <td className="tabular px-3 py-3.5">{duration(e.minutes)}</td>
                  <td className="px-5 py-3.5 text-right text-faint">
                    <ChevronRight className="inline size-4" aria-hidden />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards < md */}
        <ul className="divide-y divide-line md:hidden">
          {archiveList.map((e) => (
            <li key={e.number}>
              <Link
                to={`/archive/${e.number}`}
                className="flex items-center gap-3 px-4 py-3.5 active:bg-raised/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="tabular text-sm font-medium">
                    #{e.number}{' '}
                    <span className="font-normal text-muted">· {e.date}</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {contractTypeMeta[e.type]?.label || e.type} · {e.winner} ·{' '}
                    {duration(e.minutes)}
                  </p>
                </div>
                <ChevronRight className="size-4 text-faint" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
