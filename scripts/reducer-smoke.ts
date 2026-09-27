import assert from 'node:assert';
import { lightingReducer, createInitialState, canOperateExecution } from '../src/state/useLightingDesk';
import { createEmptyExecution } from '../src/data';
import type { EditorAction } from './src/types';

let state = createInitialState();
const planId = state.workspace.activePlanId;
const exec = () => state.executions[planId] ?? createEmptyExecution();

// 初始：无执行记录，编程执行与只读无权操作
assert.deepStrictEqual(exec().events, []);
assert.equal(canOperateExecution('programmer'), false);
assert.equal(canOperateExecution('readonly'), false);
assert.equal(canOperateExecution('stage-manager'), true);
assert.equal(canOperateExecution('designer'), true);

// 编程执行按 GO：被拒绝（第一条 Q1 已确认）
state.workspace.role = 'programmer';
state = lightingReducer(state, { type: 'executionArm', cueId: state.workspace.selectedCueId, at: '2026-09-27T10:00:00.000Z' });
assert.equal(exec().currentCueId, '', '编程执行不能定位执行');
state.workspace.role = 'designer';

// 从选中的第一条提示 Q1（已确认）开始
const firstCueId = state.workspace.selectedCueId;
state = lightingReducer(state, { type: 'executionArm', cueId: firstCueId, at: '2026-09-27T10:00:00.000Z' });
assert.equal(exec().currentCueId, firstCueId);

// GO Q1，记录实际时刻并推进到下一条
state = lightingReducer(state, { type: 'executionGo', at: '2026-09-27T10:05:00.000Z' });
let events = exec().events;
assert.equal(events.length, 1);
assert.equal(events[0].type, 'go');
assert.equal(events[0].at, '2026-09-27T10:05:00.000Z');
assert.notEqual(exec().currentCueId, firstCueId);
const secondCueId = exec().currentCueId;

// Q2 是 ready（未确认），GO 必须被拦截，且不产生记录
state = lightingReducer(state, { type: 'executionGo', at: '2026-09-27T10:06:00.000Z' });
assert.equal(exec().events.length, 1, '未确认提示不能 GO');
assert.equal(exec().currentCueId, secondCueId, '指针保持在被拦截的提示');

// 设计编辑的撤销不应抹掉执行记录
state = lightingReducer(state, { type: 'commit', label: '测试编辑', mutate: (ws) => { ws.activePlanId = ws.activePlanId; } });
state = lightingReducer(state, { type: 'undo' });
assert.equal(exec().events.length, 1, '撤销设计操作不影响执行记录');

// 切到舞台监督，返回上一条必须留下返工记录
state.workspace.role = 'stage-manager';
state = lightingReducer(state, { type: 'executionBack', at: '2026-09-27T10:07:00.000Z', note: '误触，重来' });
assert.equal(exec().currentCueId, firstCueId, '返工后指针回到上一条 GO 的提示');
assert.equal(exec().events.length, 2);
assert.equal(exec().events[1].type, 'back');
assert.equal(exec().events[1].note, '误触，重来');

// 返工后重新 GO，可再次记录实际时刻
state = lightingReducer(state, { type: 'executionGo', at: '2026-09-27T10:08:00.000Z' });
assert.equal(exec().events.length, 3);
assert.equal(exec().events[2].type, 'go');
assert.equal(exec().currentCueId, secondCueId);

// 只读角色不能返回
state.workspace.role = 'readonly';
state = lightingReducer(state, { type: 'executionBack', at: '2026-09-27T10:09:00.000Z', note: 'x' });
assert.equal(exec().events.length, 3, '只读角色不能返工');

// 切换方案再回来：记录仍在
const otherPlan = state.workspace.plans.find((p) => p.id !== planId)!.id;
state = lightingReducer(state, { type: 'selectPlan', planId: otherPlan });
assert.equal(state.workspace.activePlanId, otherPlan);
state = lightingReducer(state, { type: 'selectPlan', planId });
assert.equal(exec().events.length, 3, '切换方案后执行记录保留');

// 清空
state.workspace.role = 'designer';
state = lightingReducer(state, { type: 'executionReset' });
assert.deepStrictEqual(exec(), createEmptyExecution());

console.log('所有执行流程冒烟断言通过 ✔');
