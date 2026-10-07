import { useEffect, useState } from 'react'
import { Coins, Trophy } from 'lucide-react'
import {
  AchievementsCard,
  HistoryCard,
  StatsCard,
} from '../components/dashboard'
import { Card, PageHeader, Pill } from '../components/ui'
import { profileApi } from '../lib/api'

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    profileApi.getProfile().then((res) => {
      if (mounted && res) {
        setProfileData(res)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  const rewards = profileData?.rewards || []
  const user = profileData?.user || { torn_username: 'Anurag', torn_level: 48, torn_user_id: 2849102 }

  return (
    <>
      <PageHeader
        title={`Agent ${user.torn_username}`}
        subtitle={`Level ${user.torn_level} • Torn ID #${user.torn_user_id} • Status: Active Agent`}
        right={
          <div className="flex items-center gap-2">
            <Pill tone="accent">Agent Verified</Pill>
          </div>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
        <HistoryCard showLink={false} />
        <StatsCard />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
        <AchievementsCard />

        <Card title="Reward & Partial Bounty Log">
          {rewards.length === 0 ? (
            <div className="px-4 pb-4 text-xs text-muted">No reward transactions recorded yet.</div>
          ) : (
            <ul className="flex flex-col gap-2 px-4 pb-4">
              {rewards.map((r: any) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-line bg-raised/50 p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="grid size-7 place-items-center rounded bg-accent/15 text-accent shrink-0">
                      {r.reward_type === 'final_winner' ? (
                        <Trophy className="size-3.5" />
                      ) : (
                        <Coins className="size-3.5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-fg">{r.description}</p>
                      <p className="text-[11px] text-faint">
                        Contract #{r.contract_id} • {r.issued_at}
                      </p>
                    </div>
                  </div>
                  <span className="tabular font-semibold text-accent shrink-0">
                    +${(Number(r.amount_cash) || 0).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
