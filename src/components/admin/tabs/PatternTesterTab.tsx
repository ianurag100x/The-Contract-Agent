import { Sparkles } from 'lucide-react'
import { Card } from '../../ui'
import { adminApi } from '../../../lib/api'

interface PatternTesterTabProps {
  testTemplate: string
  setTestTemplate: (v: string) => void
  testMetric: 'count' | 'sum' | 'distinct'
  setTestMetric: (v: 'count' | 'sum' | 'distinct') => void
  testTarget: number
  setTestTarget: (v: number) => void
  testValueCapture: string
  setTestValueCapture: (v: string) => void
  testSamples: string
  setTestSamples: (v: string) => void
  isTestingPattern: boolean
  setIsTestingPattern: (v: boolean) => void
  patternTestResult: any
  setPatternTestResult: (v: any) => void
}

export function PatternTesterTab({
  testTemplate,
  setTestTemplate,
  testMetric,
  setTestMetric,
  testTarget,
  setTestTarget,
  testValueCapture,
  setTestValueCapture,
  testSamples,
  setTestSamples,
  isTestingPattern,
  setIsTestingPattern,
  patternTestResult,
  setPatternTestResult,
}: PatternTesterTabProps) {
  return (
    <div className="space-y-6">
      <Card title="Log Pattern Compiler & Syntax Tester (§6.8)">
        <div className="p-4 space-y-4 sm:p-5">
          <p className="text-xs text-muted leading-relaxed">
            Admins write task log syntax using placeholders (e.g.{' '}
            <code className="text-accent bg-raised px-1 py-0.5 rounded">&#123;energy:int&#125;</code>,{' '}
            <code className="text-accent bg-raised px-1 py-0.5 rounded">&#123;opponent:text&#125;</code>,{' '}
            <code className="text-accent bg-raised px-1 py-0.5 rounded">&#123;stat:word&#125;</code>,{' '}
            <code className="text-accent bg-raised px-1 py-0.5 rounded">[abc]</code> optional literal). Test patterns live against sample log lines before saving.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-fg">Log Pattern Template(s) (1 per line)</label>
              <textarea
                rows={3}
                value={testTemplate}
                onChange={(e) => setTestTemplate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs font-mono text-fg focus:border-accent"
                placeholder="Enter one or multiple pattern templates..."
              />
              <p className="mt-1 text-[11px] text-faint">
                Prefix (e.g. <span className="font-mono">23:41:35 - 13/10/26</span>) is stripped automatically. Supports multiple syntax templates.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-semibold text-fg">Metric</label>
                <select
                  value={testMetric}
                  onChange={(e) => setTestMetric(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  <option value="count">count (1 per match)</option>
                  <option value="sum">sum (add captured)</option>
                  <option value="distinct">distinct (unique)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-fg">Target</label>
                <input
                  type="number"
                  value={testTarget}
                  onChange={(e) => setTestTarget(parseInt(e.target.value, 10) || 1)}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-fg">Value Capture</label>
                <input
                  type="text"
                  value={testValueCapture}
                  onChange={(e) => setTestValueCapture(e.target.value)}
                  placeholder="e.g. energy"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-fg">Sample Log Lines (1 per line)</label>
            <textarea
              rows={4}
              value={testSamples}
              onChange={(e) => setTestSamples(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs font-mono text-fg focus:border-accent"
              placeholder="Paste in-game log lines here..."
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isTestingPattern}
              onClick={async () => {
                setIsTestingPattern(true)
                try {
                  const sampleLines = testSamples.split('\n').map((s) => s.trim()).filter(Boolean)
                  const patternLines = testTemplate.split('\n').map((l) => l.trim()).filter(Boolean)
                  const patternObjs = patternLines.map((pat, pIdx) => ({
                    key: `pattern_${pIdx + 1}`,
                    template: pat,
                    value_capture: testValueCapture || undefined,
                  }))

                  const res = await adminApi.testPattern({
                    patterns: patternObjs,
                    metric: testMetric,
                    target: testTarget,
                    samples: sampleLines,
                  })
                  setPatternTestResult(res)
                } catch (err) {
                  console.error(err)
                } finally {
                  setIsTestingPattern(false)
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-accent-ink hover:bg-accent/90"
            >
              <Sparkles className="size-3.5" />
              {isTestingPattern ? 'Compiling & Testing...' : 'Test Pattern Matching'}
            </button>
          </div>

          {patternTestResult && (
            <div className="mt-4 rounded-xl border border-line bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="text-xs font-bold text-fg">
                  Test Results: {patternTestResult.totalMatches} / {patternTestResult.results?.length} Matched
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    patternTestResult.targetReached
                      ? 'bg-accent/20 text-accent border border-accent/30'
                      : 'bg-medium/20 text-medium border border-medium/30'
                  }`}
                >
                  Progress: {patternTestResult.progressTotal} / {testTarget} {patternTestResult.targetReached ? '✓ TARGET REACHED' : 'INCOMPLETE'}
                </span>
              </div>

              <div className="space-y-2">
                {patternTestResult.results?.map((res: any, idx: number) => (
                  <div
                    key={idx}
                    className={`rounded-lg p-2.5 text-xs border ${
                      res.matched ? 'border-accent/30 bg-accent/5' : 'border-line bg-raised/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-muted truncate max-w-[80%]">
                        {res.sample}
                      </span>
                      <span
                        className={`font-bold text-[10px] uppercase px-1.5 py-0.5 rounded ${
                          res.matched ? 'bg-accent text-accent-ink' : 'bg-line text-muted'
                        }`}
                      >
                        {res.matched ? 'MATCHED' : 'NO MATCH'}
                      </span>
                    </div>
                    {res.matched && res.captures && (
                      <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-accent">
                        {Object.entries(res.captures).map(([k, v]) => (
                          <span key={k} className="bg-raised rounded px-1.5 py-0.5">
                            <span className="text-muted">{k}:</span> {String(v)}
                          </span>
                        ))}
                        {res.value !== undefined && (
                          <span className="bg-raised rounded px-1.5 py-0.5 font-bold">
                            Contribution: +{res.value}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
