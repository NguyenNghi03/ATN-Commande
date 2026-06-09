import { describe, expect, it } from 'vitest';
import { replayScenario, type ScenarioAction } from '../src/lib/scenarioEngine';
import dialogue800 from './fixtures/dialogue-scenarios-800.sample.json';
import hardcore800 from './fixtures/dialogue-scenarios-hardcore-800.sample.json';

type Scenario = {
  id: number;
  dialogue: string[];
  expected_actions: ScenarioAction[];
  expected_behavior?: string;
};

function runGroup(title: string, scenarios: Scenario[]) {
  describe(title, () => {
    for (const sc of scenarios) {
      it(`#${sc.id}`, () => {
        const actions = replayScenario(sc.dialogue);
        if (sc.expected_behavior === 'skip') {
          expect(actions.filter((a) => a.type === 'ADD_LIGNE' || a.type === 'UPDATE_LIGNE')).toEqual([]);
          return;
        }
        expect(actions).toEqual(sc.expected_actions);
      });
    }
  });
}

runGroup('P3-TASK-002 - dialogue scenarios', dialogue800.scenarios as Scenario[]);
runGroup('P3-TASK-003 - hardcore scenarios', hardcore800.scenarios as Scenario[]);
