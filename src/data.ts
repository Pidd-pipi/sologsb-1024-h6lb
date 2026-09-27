import type { Cue, CueConflict, LightingPlan, Scene, UserRole } from './types';

const FIXED_TIME = '2026-09-25T02:00:00.000Z';

export const roleLabels: Record<UserRole, string> = {
  designer: '灯光设计',
  programmer: '编程执行',
  'stage-manager': '舞台监督',
  readonly: '只读查看'
};

export const statusLabels = {
  draft: '未完成',
  ready: '待执行',
  confirmed: '已确认'
} as const;

export const colorPresets = [
  { name: '黑场', value: '#000000' },
  { name: '深蓝', value: '#1D4ED8' },
  { name: '天青', value: '#0EA5E9' },
  { name: '暖白', value: '#FFF1C7' },
  { name: '琥珀', value: '#F59E0B' },
  { name: '品红', value: '#D946EF' },
  { name: '舞台红', value: '#DC2626' },
  { name: '松绿', value: '#059669' },
  { name: '薰衣草', value: '#8B5CF6' }
];

let cueSequence = 0;

function cue(
  number: string,
  label: string,
  position: string,
  channel: string,
  color: string,
  colorHex: string,
  brightness: number,
  fadeIn: number,
  hold: number,
  fadeOut: number,
  followCueId = '',
  targetNote = '',
  notes = '',
  status: Cue['status'] = 'ready'
): Cue {
  cueSequence += 1;
  return {
    id: `cue-${cueSequence}`,
    number,
    label,
    position,
    channel,
    color,
    colorHex,
    brightness,
    fadeIn,
    hold,
    fadeOut,
    followCueId,
    targetNote,
    notes,
    status
  };
}

function scene(id: string, name: string, order: number, frozen: boolean, cues: Cue[]): Scene {
  return { id, name, order, frozen, cues };
}

const mainPlan: LightingPlan = {
  id: 'plan-main',
  name: '主舞台方案',
  description: '完整剧院版本，保留大面积侧光与低角度造型。',
  updatedAt: FIXED_TIME,
  scenes: [
    scene('scene-1', '序章 · 入梦', 1, false, [
      cue('Q1', '观众席暗场', '全台', 'Grand Master', '黑场', '#000000', 0, 4, 6, 3, '', '场灯降至 10%', '开演提示与场灯联动。', 'confirmed'),
      cue('Q2', '月幕初升', '天幕', 'Cyc 1', '深蓝', '#1D4ED8', 62, 8, 18, 6, 'cue-1', '月幕形成冷色底', '天幕均匀，避免中心热斑。'),
      cue('Q3', '人物侧光', '左前区', 'FOH L 3', '暖白', '#FFF1C7', 74, 2.5, 22, 5, 'cue-2', '演员入画', '为独白人物补面，保留右侧阴影。', 'ready'),
      cue('Q4', '雾门显现', '后区', 'Beam 2', '天青', '#0EA5E9', 58, 5, 12, 8, '', '雾机启动后可见', '通道尚未实测。', 'draft')
    ]),
    scene('scene-2', '独白 · 失语', 2, false, [
      cue('Q10', '独白收束', '前区', 'FOH 1-4', '琥珀', '#F59E0B', 46, 7, 32, 9, '', '演员坐于长椅', '压低背景，仅保留边光。'),
      cue('Q11', '呼吸变化', '前区', 'FOH L 3', '暖白', '#FFF1C7', 72, 3, 8, 3, 'cue-5', '吸气点触发', '与台词“我听见”同步。', 'ready'),
      cue('Q12', '影子分裂', '侧幕', 'Side 5', '品红', '#D946EF', 54, 2, 15, 7, 'cue-11', '两次呼吸后', '需要检查侧幕遮挡。', 'draft'),
      cue('Q13', '冷色侵入', '全台', 'Grand Master', '深蓝', '#1D4ED8', 38, 10, 24, 12, '', '音乐低频进入', '与 Q12 通道存在叠光风险。')
    ]),
    scene('scene-3', '群舞 · 潮汐', 3, false, [
      cue('Q20', '群舞起光', '后区', 'Dance 1-6', '松绿', '#059669', 68, 2, 18, 4, '', '第一组舞者进入', '两侧亮度需平衡。', 'ready'),
      cue('Q21', '潮线推移', '侧区', 'Side 1-4', '天青', '#0EA5E9', 60, 5, 16, 5, 'cue-9', '第二组越过中线', '跟随舞者视线。'),
      cue('Q22', '高点爆闪', '全台', 'Grand Master', '暖白', '#FFF1C7', 92, 0.3, 0.8, 8, 'cue-10', '定音鼓重音', '确认频闪安全。', 'draft'),
      cue('Q23', '潮退', '后区', 'Dance 1-6', '深蓝', '#1D4ED8', 26, 12, 28, 14, '', '音乐进入尾奏', '')
    ]),
    scene('scene-4', '终场 · 归岸', 4, true, [
      cue('Q30', '归岸定点', '前区', 'FOH 1-2', '暖白', '#FFF1C7', 48, 8, 26, 10, '', '演员回到长椅', '已与导演确认。', 'confirmed'),
      cue('Q31', '星空落幕', '天幕', 'Cyc 2', '薰衣草', '#8B5CF6', 34, 6, 36, 16, 'cue-12', '演员抬头后', '冻结场次，保留最终状态。', 'confirmed')
    ])
  ]
};

const coolPlan: LightingPlan = {
  id: 'plan-cool',
  name: '冷调实验方案',
  description: '减少正面光，以侧逆光和天幕色块建立空间。',
  updatedAt: FIXED_TIME,
  scenes: [
    scene('cool-scene-1', '序章 · 入梦（冷调）', 1, false, [
      cue('C1', '冷场', '全台', 'Grand Master', '深蓝', '#1D4ED8', 14, 5, 8, 5, '', '场灯渐暗', '冷调版本无全黑场。', 'ready'),
      cue('C2', '逆光月幕', '天幕', 'Cyc 1', '天青', '#0EA5E9', 72, 10, 18, 8, 'cue-13', '月幕升起', '')
    ]),
    scene('cool-scene-2', '独白 · 失语（冷调）', 2, false, [
      cue('C10', '侧逆光', '左后', 'Beam 1', '薰衣草', '#8B5CF6', 58, 4, 28, 10, '', '演员背向观众', ''),
      cue('C11', '边缘呼吸', '右侧', 'Side 5', '品红', '#D946EF', 42, 1, 7, 4, 'cue-14', '台词停顿', '')
    ])
  ]
};

const tourPlan: LightingPlan = {
  id: 'plan-tour',
  name: '巡演简约方案',
  description: '适配中小剧场，合并天幕和侧光通道。',
  updatedAt: FIXED_TIME,
  scenes: [
    scene('tour-scene-1', '序章 · 入梦', 1, false, [
      cue('T1', '场灯收束', '全台', 'Master', '暖白', '#FFF1C7', 18, 3, 5, 4, '', '开场', '巡演设备清单已确认。', 'ready'),
      cue('T2', '蓝色天幕', '天幕', 'Wash A', '深蓝', '#1D4ED8', 55, 6, 24, 8, 'cue-15', '演员入场', '')
    ]),
    scene('tour-scene-2', '群舞 · 潮汐', 2, false, [
      cue('T10', '侧光推进', '后区', 'Wash B', '松绿', '#059669', 64, 2, 20, 5, '', '群舞起点', ''),
      cue('T11', '潮点', '全台', 'Master', '琥珀', '#F59E0B', 84, 1, 2, 7, 'cue-16', '鼓点', '')
    ])
  ]
};

export const samplePlans = [mainPlan, coolPlan, tourPlan];

export function recalculatePlans(plans: LightingPlan[]) {
  for (const plan of plans) {
    const scenes = [...plan.scenes].sort((a, b) => a.order - b.order);
    let absoluteCursor = 0;
    for (const scene of scenes) {
      scene.startTime = absoluteCursor;
      let sceneCursor = absoluteCursor;
      for (const item of scene.cues) {
        const duration = Math.max(0.1, item.fadeIn + item.hold + item.fadeOut);
        item.duration = Number(duration.toFixed(2));
        const followed = item.followCueId
          ? scene.cues.find((candidate) => candidate.id === item.followCueId)
          : undefined;
        const followTime = followed?.endTime ? followed.endTime : sceneCursor;
        item.startTime = Number(Math.max(sceneCursor, followTime).toFixed(2));
        item.endTime = Number((item.startTime + duration).toFixed(2));
        sceneCursor = Math.max(sceneCursor, item.endTime);
      }
      scene.duration = Number(Math.max(0, sceneCursor - absoluteCursor).toFixed(2));
      absoluteCursor = sceneCursor;
    }
  }
  return plans;
}

export function detectConflicts(plans: LightingPlan[]): CueConflict[] {
  const conflicts: CueConflict[] = [];
  for (const plan of plans) {
    for (const scene of plan.scenes) {
      const byChannel = new Map<string, Cue[]>();
      const positions = new Map<string, Cue[]>();
      for (const item of scene.cues) {
        const errors: string[] = [];
        if (!item.channel.trim()) errors.push('缺少通道');
        if (!item.position.trim()) errors.push('缺少灯位');
        if (!item.label.trim()) errors.push('缺少提示名称');
        if (item.brightness < 0 || item.brightness > 100) errors.push('亮度应在 0–100 之间');
        if (item.fadeIn < 0 || item.hold < 0 || item.fadeOut < 0) errors.push('渐变或保持时间不能为负');
        if (errors.length) {
          conflicts.push({
            id: `${plan.id}-${scene.id}-${item.id}-missing`,
            planId: plan.id,
            sceneId: scene.id,
            cueId: item.id,
            severity: 'error',
            type: 'missing-data',
            message: `${item.number} ${errors.join('、')}`
          });
        }
        if (!item.followCueId) continue;
        const followed = scene.cues.find((candidate) => candidate.id === item.followCueId);
        if (!followed) {
          conflicts.push({
            id: `${plan.id}-${scene.id}-${item.id}-follow`,
            planId: plan.id,
            sceneId: scene.id,
            cueId: item.id,
            severity: 'error',
            type: 'follow-order',
            message: `${item.number} 的跟随提示不存在于当前场次`
          });
        } else if ((followed.startTime ?? 0) >= (item.startTime ?? 0)) {
          conflicts.push({
            id: `${plan.id}-${scene.id}-${item.id}-follow-order`,
            planId: plan.id,
            sceneId: scene.id,
            cueId: item.id,
            severity: 'warning',
            type: 'follow-order',
            message: `${item.number} 的跟随目标不在其之前完成`
          });
        }
      }

      const sorted = [...scene.cues].sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0));
      for (const item of sorted) {
        const previous = byChannel.get(item.channel)?.at(-1);
        if (previous && (item.startTime ?? 0) < (previous.endTime ?? 0) - 0.01) {
          conflicts.push({
            id: `${plan.id}-${scene.id}-${item.id}-overlap`,
            planId: plan.id,
            sceneId: scene.id,
            cueId: item.id,
            severity: 'warning',
            type: 'channel-overlap',
            message: `${previous.number} 与 ${item.number} 在同通道 ${item.channel} 叠光`
          });
        }
        byChannel.set(item.channel, [...(byChannel.get(item.channel) ?? []), item]);
        positions.set(item.position, [...(positions.get(item.position) ?? []), item]);
      }

      for (const [position, items] of positions) {
        if (items.length > 1 && position !== '全台' && position !== '天幕') {
          conflicts.push({
            id: `${plan.id}-${scene.id}-${position}-duplicate`,
            planId: plan.id,
            sceneId: scene.id,
            cueId: items[1].id,
            severity: 'warning',
            type: 'duplicate-position',
            message: `${position} 被多个提示使用，请确认是否为有意的分区叠光`
          });
        }
      }
    }
  }
  return conflicts;
}
