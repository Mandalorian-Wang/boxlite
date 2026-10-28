import { describe, expect, it } from 'vitest'
import {
  getOnboardingInterfaces,
  renderOnboardingCodeExample,
  renderOnboardingCodeSteps,
} from '../onboarding-code-examples'

describe('quickstart creation and execution sections', () => {
  const options = {
    restApiUrl: 'https://api.example.test',
    command: { executable: 'echo', args: ['Hello from BoxLite'] },
  }
  for (const item of getOnboardingInterfaces()) {
    it(`keeps ${item.id} setup and execution in one complete example`, () => {
      const parts = renderOnboardingCodeSteps(item.id, options)
      expect(parts.creation).not.toContain('Hello from BoxLite')
      expect(parts.execution).toContain('Hello from BoxLite')
      expect(parts.creation + '\n\n' + parts.execution).toBe(parts.example)
      if (item.id !== 'cli') expect(parts.example).toBe(renderOnboardingCodeExample(item.id, options))
      else {
        expect(parts.creation).toContain('boxlite create --name "$box_name"')
        expect(parts.creation).toContain('boxlite start "$box_name"')
        expect(parts.execution).toContain('boxlite exec "$box_name" --')
        expect(parts.execution).toContain('boxlite rm -f "$box_name"')
      }
    })
  }
})
