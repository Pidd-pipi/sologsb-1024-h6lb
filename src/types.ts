export type CueStatus = 'draft' | 'ready' | 'confirmed';
export type UserRole = 'designer' | 'programmer' | 'stage-manager' | 'readonly';
export type ConflictSeverity = 'error' | 'warning';

export interface Cue {
  id: string;
  number: string;
  label: string;
  position: string;
  channel: string;
  color: string;
  colorHex: string;
  brightness: number;
  fadeIn: number;
  hold: number;
  fadeOut: number;
  followCueId: string;
  targetNote: string;
  notes: string;
  status: CueStatus;
  startTime?: number;
  duration?: number;
  endTime?: number;
}

export interface Scene {
  id: string;
  name: string;
  order: number;
  frozen: boolean;
  startTime?: number;
  duration?: number;
  cues: Cue[];
}

export interface LightingPlan {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  scenes: Scene[];
}

export interface CueConflict {
  id: string;
  planId: string;
  cueId: string;
  sceneId: string;
  severity: ConflictSeverity;
  type: 'channel-overlap' | 'follow-order' | 'missing-data' | 'duplicate-position' | 'duration';
  message: string;
}

export interface Workspace {
  plans: LightingPlan[];
  activePlanId: string;
  comparePlanId: string;
  selectedSceneId: string;
  selectedCueId: string;
  role: UserRole;
}

export interface EditorState {
  workspace: Workspace;
  past: Workspace[];
  future: Workspace[];
  lastAction: string;
}

export interface PersistedState {
  workspace: Workspace;
}
