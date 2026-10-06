import { Card, PageHeader } from '../components/ui'
import { champions } from '../data/mock'
import { duration } from '../lib/format'

export default function LeaderboardPage() {
  return (
    <>
      <PageHeader
        title="Contract Champions"
        subtitle="The permanent Hall of Fame. Who is the best Agent in Torn?"
      />

      <Card>
        {/* Table ≥ md */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Contract champions</caption>
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th scope="col" className="w-16 px-5 py-3 font-medium">Rank</th>
                <th scope="col" className="px-3 py-3 font-medium">Player</th>
                <th scope="col" className="px-3 py-3 font-medium">Wins</th>
                <th scope="col" className="px-3 py-3 font-medium">Top 3</th>
                <th scope="col" className="px-3 py-3 font-medium">Contracts completed</th>
                <th scope="col" className="px-5 py-3 font-medium">Fastest</th>
              </tr>
            </thead>
            <tbody>
              {champions.map((c, i) => (
                <tr
                  key={c.name}
                  className="border-b border-line last:border-0 hover:bg-raised/40"
                >
                  <td className="tabular px-5 py-3.5 text-muted">{i + 1}</td>
                  <td className="px-3 py-3.5 font-medium">{c.name}</td>
                  <td className="tabular px-3 py-3.5">{c.wins}</td>
                  <td className="tabular px-3 py-3.5">{c.top3}</td>
                  <td className="tabular px-3 py-3.5">{c.completed}</td>
                  <td className="tabular px-5 py-3.5">{duration(c.fastestMin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards < md */}
        <ol className="divide-y divide-line md:hidden">
          {champions.map((c, i) => (
            <li key={c.name} className="px-4 py-3.5">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium">
                  <span className="tabular mr-2 text-muted">{i + 1}</span>
                  {c.name}
                </p>
                <p className="tabular text-xs text-muted">
                  Fastest {duration(c.fastestMin)}
                </p>
              </div>
              <dl className="tabular mt-2 grid grid-cols-3 gap-2 text-xs">
                {[
                  ['Wins', c.wins],
                  ['Top 3', c.top3],
                  ['Completed', c.completed],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-raised/50 px-2.5 py-1.5">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-sm font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>
      </Card>
    </>
  )
}
