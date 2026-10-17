/**
 * Log Pattern Compiler, Parser & Tester
 * Implements §6 of THE_CONTRACT_BACKEND_SPEC.md
 * Supports Template syntax ({name:int}, {name:number}, {name:word}, {name:text}, {...}, [abc])
 * and regex mode with named captures and condition checking.
 */

export interface PatternCondition {
  capture: string
  op: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'equals' | 'not_equals' | 'contains' | 'starts_with'
  value: string | number
}

export interface StoredLogPattern {
  key: string
  label?: string
  mode?: 'template' | 'regex'
  template: string
  case_insensitive?: boolean
  value_capture?: string | null
  conditions?: PatternCondition[]
}

export interface CompiledPattern {
  key: string
  regex: RegExp
  valueCapture: string | null
  conditions: PatternCondition[]
  caseInsensitive: boolean
}

/**
 * Strips the Torn timestamp prefix if present:
 * e.g. "23:41:35 - 13/10/26 You used 400 energy..." -> "You used 400 energy..."
 */
export function stripPrefix(line: string): string {
  if (!line) return ''
  // Matches "HH:MM:SS - DD/MM/YY " or "HH:MM:SS - DD/MM/YYYY "
  return line.replace(/^\d{2}:\d{2}:\d{2}\s*-\s*\d{2}\/\d{2}\/\d{2,4}\s+/, '').trim()
}

/**
 * Extracts numeric timestamp from Torn log line prefix or returns undefined.
 */
export function parsePrefixTimestamp(line: string): Date | undefined {
  const match = line.match(/^(\d{2}):(\d{2}):(\d{2})\s*-\s*(\d{2})\/(\d{2})\/(\d{2,4})/)
  if (!match) return undefined
  const [, hh, mm, ss, day, month, yearPart] = match
  const year = yearPart.length === 2 ? 2000 + parseInt(yearPart, 10) : parseInt(yearPart, 10)
  return new Date(Date.UTC(year, parseInt(month, 10) - 1, parseInt(day, 10), parseInt(hh, 10), parseInt(mm, 10), parseInt(ss, 10)))
}

/**
 * Compiles a template syntax string into a RegExp
 * e.g. "You used {energy:int} energy attacking {opponent:text} and defeated them"
 */
export function compileTemplateToRegex(template: string, caseInsensitive = false): RegExp {
  let pos = 0
  let regexStr = '^'

  while (pos < template.length) {
    // Check for escaped characters
    if (template[pos] === '\\') {
      if (pos + 1 < template.length) {
        regexStr += '\\' + template[pos + 1]
        pos += 2
        continue
      }
    }

    // Check for optional literal: [abc]
    if (template[pos] === '[') {
      const closeBracket = template.indexOf(']', pos + 1)
      if (closeBracket !== -1) {
        const optionalContent = template.slice(pos + 1, closeBracket)
        // Escape regex special chars in optional literal
        const escaped = optionalContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        regexStr += `(?:${escaped})?`
        pos = closeBracket + 1
        continue
      }
    }

    // Check for placeholder: {name:type}, {"name":type}, {...}, or JSON object: {"key":type, ...}
    if (template[pos] === '{') {
      let depth = 0
      let closeBrace = -1
      for (let i = pos; i < template.length; i++) {
        if (template[i] === '{') depth++
        else if (template[i] === '}') {
          depth--
          if (depth === 0) {
            closeBrace = i
            break
          }
        }
      }

      if (closeBrace !== -1) {
        const inner = template.slice(pos + 1, closeBrace).trim()
        pos = closeBrace + 1

        if (inner === '...' && !template.slice(0, pos - 5).includes(':')) {
          // Anonymous wildcard
          regexStr += '.*?'
          continue
        }

        // Check if inner is a simple placeholder: {identifier:type} or {identifier}
        // (Must NOT contain quotes, commas, colons with quotes, or curly braces)
        const isSimplePlaceholder =
          !inner.includes('"') &&
          !inner.includes("'") &&
          !inner.includes(',') &&
          !inner.includes('{') &&
          /^[a-z_][a-z0-9_]*(?::[a-z0-9_]+)?$/i.test(inner)

        if (isSimplePlaceholder) {
          const colonIdx = inner.lastIndexOf(':')
          let name = ''
          let type = 'text'

          if (colonIdx !== -1) {
            name = inner.slice(0, colonIdx).trim()
            type = inner.slice(colonIdx + 1).trim()
          } else {
            name = inner
            type = 'text'
          }

          const cleanName = name.replace(/^["']|["']$/g, '').trim()

          let typeRegex = '.+?'
          switch (type) {
            case 'money':
              typeRegex = '\\$?[\\d,]+'
              break
            case 'int':
              typeRegex = '\\d[\\d,]*'
              break
            case 'number':
              typeRegex = '\\d[\\d,]*(?:\\.\\d+)?'
              break
            case 'word':
              typeRegex = '\\S+'
              break
            case 'text':
            default:
              typeRegex = pos >= template.length ? '.+' : '.+?'
              break
          }

          // Support both plain text logs and Torn JSON formatted logs e.g. {"cleanName":100}
          regexStr += `(?:\\{.*?"${cleanName}"\\s*:\\s*)?(?<${cleanName}>${typeRegex})(?:.*?\\})?`
          continue
        }

        // Extract key-value specifications
        // Handles "key": value, "key": "value", "key": {placeholder}, etc.
        const kvMatches = [...inner.matchAll(/"([^"]+)"\s*:\s*("(?:[^"\\]|\\.)*"|\{[^}]+\}|[^,}]+)/g)]
        const snippets: string[] = []

        for (const match of kvMatches) {
          const key = match[1].trim()
          let val = match[2].trim()

          // Check if val is a placeholder like {subKey:type} or {subKey}
          const subMatch = val.match(/^\{([a-z_][a-z0-9_]*)(?::([a-z0-9_]+))?\}$/i)
          let captureName = key
          let type = val

          if (subMatch) {
            captureName = subMatch[1]
            type = subMatch[2] || 'text'
          }

          let valRegex = ''
          switch (type.toLowerCase()) {
            case 'int':
              valRegex = `(?<${captureName}>\\d[\\d,]*)`
              break
            case 'money':
              valRegex = `(?<${captureName}>\\$?[\\d,]+(?:\\.\\d{2})?)`
              break
            case 'number':
              valRegex = `(?<${captureName}>\\d[\\d,]*(?:\\.\\d+)?)`
              break
            case 'word':
              valRegex = `(?<${captureName}>\\S+)`
              break
            case 'text':
              // Matches quoted JSON string or unquoted value
              valRegex = `(?:"(?<${captureName}>[^"\\\\]*(?:\\\\.[^"\\\\]*)*)"|(?<${captureName}>[^",}]+))`
              break
            default:
              // Literal value (e.g. 100, 1, "medical", "Japan", true)
              if (/^["'].*["']$/.test(val)) {
                const unquoted = val.replace(/^["']|["']$/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                valRegex = `"${unquoted}"`
              } else if (/^\d[\d,]*(?:\.\d+)?$/.test(val)) {
                valRegex = `(?<${captureName}>${val.replace(/,/g, '')})`
              } else {
                valRegex = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              }
              break
          }

          let keyPattern = `"${key}"`
          if (/^(amount|donated|money|cash|value)$/i.test(key)) {
            keyPattern = `(?:"${key}"|"donated"|"amount"|"money"|"cash")`
          } else if (/^(energy|energy_used)$/i.test(key)) {
            keyPattern = `(?:"${key}"|"energy_used"|"energy")`
          } else if (/^(opponent|defender|target)$/i.test(key)) {
            keyPattern = `(?:"${key}"|"opponent"|"defender"|"target")`
          }

          snippets.push(`${keyPattern}\\s*:\\s*${valRegex}`)
        }

        if (snippets.length > 0) {
          regexStr += '\\{.*?' + snippets.join('.*?') + '.*?\\}'
        } else if (inner === '...' || inner === '') {
          regexStr += '\\{.*?\\}'
        } else {
          regexStr += '\\{' + inner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\}'
        }
        continue
      }
    }



    // Handle normal characters - spaces collapse to \s+
    if (/\s/.test(template[pos])) {
      while (pos < template.length && /\s/.test(template[pos])) {
        pos++
      }
      regexStr += '\\s+'
      continue
    }

    // If there is a literal '$' right before a placeholder, make it optional: \s*\$?
    if (template[pos] === '$') {
      regexStr += '\\$?'
      pos++
      continue
    }

    // Literal characters escaped
    if (/[.*+?^${}()|[\]\\]/.test(template[pos])) {
      regexStr += '\\' + template[pos]
    } else {
      regexStr += template[pos]
    }
    pos++
  }

  regexStr += '$'
  return new RegExp(regexStr, caseInsensitive ? 'i' : undefined)
}

/**
 * Compiles a StoredLogPattern into an executable CompiledPattern.
 */
export function compileLogPattern(pattern: StoredLogPattern): CompiledPattern {
  const isRegex = pattern.mode === 'regex'
  let regex: RegExp

  const caseInsensitive = pattern.case_insensitive ?? true
  if (isRegex) {
    let raw = pattern.template.trim()
    if (!raw.startsWith('^')) raw = '^' + raw
    if (!raw.endsWith('$')) raw = raw + '$'
    // Convert (?P<name>...) to (?<name>...) for JS RegExp compatibility
    const jsNamedRegex = raw.replace(/\(\?P<([a-zA-Z0-9_]+)>/g, '(?<$1>')
    regex = new RegExp(jsNamedRegex, caseInsensitive ? 'i' : undefined)
  } else {
    regex = compileTemplateToRegex(pattern.template, caseInsensitive)
  }

  return {
    key: pattern.key,
    regex,
    valueCapture: pattern.value_capture || null,
    conditions: pattern.conditions || [],
    caseInsensitive: Boolean(pattern.case_insensitive),
  }
}

/**
 * Checks pattern conditions against captured values.
 */
export function checkConditions(captures: Record<string, string>, conditions: PatternCondition[]): { passed: boolean; failedCondition?: PatternCondition } {
  for (const cond of conditions) {
    const rawVal = captures[cond.capture]
    if (rawVal === undefined) {
      return { passed: false, failedCondition: cond }
    }

    const cleanVal = String(rawVal).replace(/,/g, '')
    const targetVal = cond.value

    if (typeof targetVal === 'number' || !isNaN(Number(cleanVal)) && !isNaN(Number(targetVal))) {
      const numVal = parseFloat(cleanVal)
      const numTarget = Number(targetVal)

      switch (cond.op) {
        case '=':
          if (numVal !== numTarget) return { passed: false, failedCondition: cond }
          break
        case '!=':
          if (numVal === numTarget) return { passed: false, failedCondition: cond }
          break
        case '>':
          if (!(numVal > numTarget)) return { passed: false, failedCondition: cond }
          break
        case '>=':
          if (!(numVal >= numTarget)) return { passed: false, failedCondition: cond }
          break
        case '<':
          if (!(numVal < numTarget)) return { passed: false, failedCondition: cond }
          break
        case '<=':
          if (!(numVal <= numTarget)) return { passed: false, failedCondition: cond }
          break
        default:
          break
      }
    } else {
      const sVal = String(rawVal).toLowerCase()
      const sTarget = String(targetVal).toLowerCase()

      switch (cond.op) {
        case 'equals':
          if (sVal !== sTarget) return { passed: false, failedCondition: cond }
          break
        case 'not_equals':
          if (sVal === sTarget) return { passed: false, failedCondition: cond }
          break
        case 'contains':
          if (!sVal.includes(sTarget)) return { passed: false, failedCondition: cond }
          break
        case 'starts_with':
          if (!sVal.startsWith(sTarget)) return { passed: false, failedCondition: cond }
          break
      }
    }
  }

  return { passed: true }
}

export interface MatchResult {
  matched: boolean
  patternKey?: string
  captures?: Record<string, string>
  value?: number
  distinctKey?: string
  failedCondition?: PatternCondition
  cleanedText?: string
}

/**
 * Tests a single raw log line against compiled patterns.
 */
export function testLogLine(
  line: string,
  patterns: CompiledPattern[],
  metric: 'count' | 'sum' | 'distinct' = 'count'
): MatchResult {
  const cleaned = stripPrefix(line)

  for (const p of patterns) {
    const match = cleaned.match(p.regex)
    if (match) {
      const captures = (match.groups || {}) as Record<string, string>
      const condCheck = checkConditions(captures, p.conditions)

      if (!condCheck.passed) {
        return {
          matched: false,
          patternKey: p.key,
          captures,
          failedCondition: condCheck.failedCondition,
          cleanedText: cleaned,
        }
      }

      let value = 1
      let distinctKey: string | undefined = undefined

      if (metric === 'sum') {
        const numericKeys = Object.keys(captures).filter((k) => !/^(details|rest|stat|info|category|title|action)$/i.test(k))
        const captureKey =
          p.valueCapture ||
          numericKeys.find((k) => /^(energy_used|energy|donated|amount|money|cost|price|value|nerve|count|num)$/i.test(k)) ||
          numericKeys.find((k) => /energy|amount|donated|money|value|nerve|count|num/i.test(k)) ||
          numericKeys[0]

        if (captureKey && captures[captureKey]) {
          const cleanNum = String(captures[captureKey]).replace(/[^\d.]/g, '')
          value = parseFloat(cleanNum) || 0
        }
      } else if (metric === 'distinct' && p.valueCapture) {
        const rawKey = captures[p.valueCapture]
        if (rawKey) {
          distinctKey = String(rawKey).trim().toLowerCase()
        }
      }

      return {
        matched: true,
        patternKey: p.key,
        captures,
        value,
        distinctKey,
        cleanedText: cleaned,
      }
    }
  }

  return {
    matched: false,
    cleanedText: cleaned,
  }
}
