import { PatternTesterTab } from '../../components/admin/tabs/PatternTesterTab'
import { useAdminUI } from '../../state/AdminUIContext'

export default function AdminPatternsPage() {
  const ui = useAdminUI()

  return (
    <PatternTesterTab
      testTemplate={ui.testTemplate}
      setTestTemplate={ui.setTestTemplate}
      testMetric={ui.testMetric}
      setTestMetric={ui.setTestMetric}
      testTarget={ui.testTarget}
      setTestTarget={ui.setTestTarget}
      testValueCapture={ui.testValueCapture}
      setTestValueCapture={ui.setTestValueCapture}
      testSamples={ui.testSamples}
      setTestSamples={ui.setTestSamples}
      isTestingPattern={ui.isTestingPattern}
      setIsTestingPattern={ui.setIsTestingPattern}
      patternTestResult={ui.patternTestResult}
      setPatternTestResult={ui.setPatternTestResult}
    />
  )
}
