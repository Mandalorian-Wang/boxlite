import definitions from './quickstart/interfaces.json'
import cTemplate from './quickstart/templates/c.c?raw'
import cliTemplate from './quickstart/templates/cli.sh?raw'
import cliStepsTemplate from './quickstart/templates/cli-steps.sh?raw'
import goTemplate from './quickstart/templates/go.go?raw'
import pythonTemplate from './quickstart/templates/python.py?raw'
import restTemplate from './quickstart/templates/rest.sh?raw'
import restWaitTemplate from './quickstart/templates/rest-wait.sh?raw'
import rustTemplate from './quickstart/templates/rust.rs?raw'
import typescriptTemplate from './quickstart/templates/typescript.mts?raw'
import type {
  OnboardingCodeExample,
  QuickstartInterfaceDefinition,
  RenderOnboardingCodeExampleOptions,
} from './quickstart/types'

export type OnboardingInterface = string
export type { OnboardingCodeExample, QuickstartInterfaceDefinition }

type TemplateValues = Record<string, string>

const templateMap: Record<string, string> = {
  c: cTemplate,
  cli: cliTemplate,
  go: goTemplate,
  python: pythonTemplate,
  rest: restTemplate,
  rust: rustTemplate,
  typescript: typescriptTemplate,
}

const quickstartDefinitions = definitions as QuickstartInterfaceDefinition[]

function doubleQuoted(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
}

function shellSingleQuoted(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function shellApiKeyBlock(apiKey?: string): string {
  if (apiKey) {
    return `BOXLITE_API_KEY=${shellSingleQuoted(apiKey)}
export BOXLITE_API_KEY`
  }

  return `if [ -z "\${BOXLITE_API_KEY:-}" ]; then
  printf "Paste your BoxLite API key from Step 1: " >&2
  stty -echo
  IFS= read -r BOXLITE_API_KEY
  stty echo
  printf "\\n" >&2
fi
export BOXLITE_API_KEY`
}

function buildTemplateValues(options: RenderOnboardingCodeExampleOptions): TemplateValues {
  const apiKey = options.apiKey
  const command = options.command ?? { executable: 'echo', args: ['Hello from BoxLite SDK'] }
  return {
    REST_EXECUTION_RESULT: options.command
      ? restWaitTemplate.trimEnd()
      : 'curl -fsS "${BOXLITE_REST_URL}/v1/boxes/${box_id}/executions/${exec_id}" "${auth[@]}" | jq',
    COMMAND_LITERAL: doubleQuoted(command.executable),
    ARGUMENT_LITERALS: command.args.map(doubleQuoted).join(', '),
    ARGUMENT_COUNT: String(command.args.length),
    RUST_ARGUMENTS: command.args.map((arg) => `.arg(${doubleQuoted(arg)})`).join(''),
    C_ARGUMENTS: (options.command?.args ?? ['Hello from BoxLite C SDK']).map(doubleQuoted).join(', '),
    SHELL_COMMAND: options.command
      ? [command.executable, ...command.args].map(shellSingleQuoted).join(' ')
      : 'echo "Hello from BoxLite CLI"',
    EXEC_JSON_SH: shellSingleQuoted(
      JSON.stringify({ command: command.executable, args: options.command?.args ?? ['Hello from BoxLite REST'] }),
    ),
    API_KEY_C: apiKey ? doubleQuoted(apiKey) : 'getenv("BOXLITE_API_KEY")',
    API_KEY_GO: apiKey ? doubleQuoted(apiKey) : 'os.Getenv("BOXLITE_API_KEY")',
    API_KEY_PY: apiKey ? doubleQuoted(apiKey) : 'os.environ["BOXLITE_API_KEY"]',
    API_KEY_RS: apiKey ? `${doubleQuoted(apiKey)}.to_owned()` : 'std::env::var("BOXLITE_API_KEY")?',
    API_KEY_SH: shellApiKeyBlock(apiKey),
    API_KEY_TS: apiKey ? doubleQuoted(apiKey) : 'process.env.BOXLITE_API_KEY',
    REST_API_URL: options.restApiUrl,
  }
}

function renderTemplate(template: string, values: TemplateValues): string {
  const rendered = template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key: string) => {
    const value = values[key]
    if (value === undefined) {
      throw new Error(`Missing quickstart template value: ${key}`)
    }
    return value
  })

  const unresolved = rendered.match(/\{\{[^}]+}}/)
  if (unresolved) {
    throw new Error(`Unresolved quickstart template token: ${unresolved[0]}`)
  }

  return rendered.trimEnd()
}

function renderCommand(command: string, values: TemplateValues): string {
  return renderTemplate(command, values)
}

function getDefinition(id: OnboardingInterface): QuickstartInterfaceDefinition {
  const definition = quickstartDefinitions.find((item) => item.id === id)
  if (!definition) {
    throw new Error(`Unknown quickstart interface: ${id}`)
  }
  return definition
}

function renderExample(definition: QuickstartInterfaceDefinition, values: TemplateValues): OnboardingCodeExample {
  const template = templateMap[definition.template]
  if (!template) {
    throw new Error(`Missing quickstart template: ${definition.template}`)
  }

  return {
    ...definition,
    install: renderCommand(definition.install, values),
    run: renderCommand(definition.run, values),
    example: renderTemplate(template, values),
  }
}

export function getOnboardingInterfaces(): QuickstartInterfaceDefinition[] {
  return quickstartDefinitions
}

export function getOnboardingCodeExamples(): Record<OnboardingInterface, OnboardingCodeExample> {
  const values = buildTemplateValues({ restApiUrl: 'your-api-url' })
  return Object.fromEntries(
    quickstartDefinitions.map((definition) => [definition.id, renderExample(definition, values)]),
  )
}

export function renderOnboardingCodeExample(
  selectedInterface: OnboardingInterface,
  options: RenderOnboardingCodeExampleOptions,
): string {
  return renderExample(getDefinition(selectedInterface), buildTemplateValues(options)).example
}

// These sections share program scope and must be saved in order in one file.
export function renderOnboardingCodeSteps(
  selectedInterface: OnboardingInterface,
  options: RenderOnboardingCodeExampleOptions,
) {
  const example =
    selectedInterface === 'cli'
      ? renderTemplate(cliStepsTemplate, buildTemplateValues(options))
      : renderOnboardingCodeExample(selectedInterface, options)
  const boundaries: Record<string, string> = {
    python: '    execution = await box.exec(',
    typescript: 'const exec = await box.exec(',
    go: '    result, err := box.Exec(',
    rust: '    let mut exec = box_handle',
    c: '    const char *args[] =',
    rest: 'exec_id="$(',
    cli: 'boxlite exec "$box_name"',
  }
  const boundary = boundaries[selectedInterface]
  const index = boundary ? example.indexOf(`\n${boundary}`) : -1
  if (index < 0) throw new Error(`Missing execution boundary for ${selectedInterface}`)
  return { creation: example.slice(0, index).trimEnd(), execution: example.slice(index + 1), example }
}
