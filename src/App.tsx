import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Heading,
  IconButton,
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  SimpleGrid,
  Spacer,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Text,
  Textarea,
  Tooltip,
  VStack,
  useToast
} from '@chakra-ui/react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Copy,
  GripVertical,
  Lightbulb,
  Lock,
  LockOpen,
  Pause,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  ShieldCheck,
  SkipForward,
  Trash2,
  Undo2,
  Unlock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  colorPresets,
  detectConflicts,
  roleLabels,
  statusLabels
} from './data';
import {
  LIGHTING_STORAGE_KEY,
  canEditScene,
  canFreeze,
  findActivePlan,
  findActiveScene,
  findActiveCue,
  formatTime,
  useLightingDesk
} from './state/useLightingDesk';
import type { Cue, CueConflict, LightingPlan, Scene, UserRole, Workspace } from './types';

const statusColors = {
  draft: 'orange',
  ready: 'blue',
  confirmed: 'green'
} as const;

function conflictLabel(conflict: CueConflict) {
  return {
    'channel-overlap': '通道叠光',
    'follow-order': '跟随关系',
    'missing-data': '数据缺失',
    'duplicate-position': '灯位重复',
    duration: '时间异常'
  }[conflict.type];
}

interface SortableCueRowProps {
  cue: Cue;
  index: number;
  selected: boolean;
  disabled: boolean;
  conflicts: CueConflict[];
  onSelect: () => void;
}

function SortableCueRow({ cue, index, selected, disabled, conflicts, onSelect }: SortableCueRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cue.id,
    disabled
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      role="option"
      aria-selected={selected}
      aria-label={`${cue.number} ${cue.label}，${statusLabels[cue.status]}，${conflicts.length} 个冲突`}
      className={`cue-row ${selected ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
      borderBottomWidth="1px"
      borderColor="whiteAlpha.100"
      onClick={onSelect}
    >
      <Flex align="center" gap={3} px={3} py={3}>
        <Tooltip label={disabled ? '场次已冻结或当前角色无排序权限' : '拖动调整提示顺序'}>
          <IconButton
            aria-label={`拖动 ${cue.number}`}
            icon={<GripVertical size={17} />}
            size="sm"
            variant="ghost"
            color="whiteAlpha.500"
            cursor={disabled ? 'not-allowed' : 'grab'}
            isDisabled={disabled}
            {...attributes}
            {...listeners}
          />
        </Tooltip>
        <Text w="42px" color="whiteAlpha.500" fontFamily="mono" fontSize="xs">
          {(index + 1).toString().padStart(2, '0')}
        </Text>
        <Box w="84px">
          <Text fontFamily="mono" fontWeight="700" color="amber.300">{cue.number}</Text>
          <Text color="whiteAlpha.500" fontSize="10px">{formatTime(cue.startTime)}</Text>
        </Box>
        <Box className="color-swatch" bg={cue.colorHex} boxSize="14px" flexShrink={0} />
        <Box minW={0} flex="1">
          <Flex align="center" gap={2}>
            <Text fontWeight="650" noOfLines={1}>{cue.label}</Text>
            {cue.followCueId ? <Tag size="sm" variant="subtle" colorScheme="purple">跟随</Tag> : null}
          </Flex>
          <Text color="whiteAlpha.500" fontSize="xs" noOfLines={1}>
            {cue.position} · {cue.channel} · {cue.color}
          </Text>
        </Box>
        <Box w="72px" textAlign="right">
          <Text fontFamily="mono" fontSize="sm">{cue.brightness}%</Text>
          <Text color="whiteAlpha.500" fontSize="10px">亮度</Text>
        </Box>
        <Box w="112px" textAlign="right" display={{ base: 'none', xl: 'block' }}>
          <Text fontFamily="mono" fontSize="xs">{cue.fadeIn}s / {cue.hold}s / {cue.fadeOut}s</Text>
          <Text color="whiteAlpha.500" fontSize="10px">入/保持/出</Text>
        </Box>
        <Tag size="sm" colorScheme={statusColors[cue.status]} minW="62px" justifyContent="center">
          {statusLabels[cue.status]}
        </Tag>
        <Tooltip label={conflicts.length ? conflicts.map((item) => item.message).join('；') : '无冲突'}>
          <Box color={conflicts.length ? (conflicts.some((item) => item.severity === 'error') ? 'red.300' : 'orange.300') : 'green.300'}>
            {conflicts.length ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          </Box>
        </Tooltip>
      </Flex>
    </Box>
  );
}

interface CueListProps {
  scene: Scene;
  selectedCueId: string;
  canEdit: boolean;
  conflicts: CueConflict[];
  onSelect: (cueId: string) => void;
  onReorder: (activeId: string, overId: string) => void;
}

function CueList({ scene, selectedCueId, canEdit, conflicts, onSelect, onReorder }: CueListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={scene.cues.map((cue) => cue.id)} strategy={verticalListSortingStrategy}>
        <Box role="listbox" aria-label={`${scene.name}灯光提示列表`} bg="blackAlpha.200" borderRadius="xl" overflow="hidden">
          {scene.cues.map((cue, index) => (
            <SortableCueRow
              key={cue.id}
              cue={cue}
              index={index}
              selected={cue.id === selectedCueId}
              disabled={!canEdit}
              conflicts={conflicts.filter((item) => item.cueId === cue.id)}
              onSelect={() => onSelect(cue.id)}
            />
          ))}
          {!scene.cues.length ? (
            <Flex minH="180px" align="center" justify="center" color="whiteAlpha.500">
              当前场次暂无提示，可使用“新增提示”开始设计。
            </Flex>
          ) : null}
        </Box>
      </SortableContext>
    </DndContext>
  );
}

interface InspectorProps {
  cue: Cue | undefined;
  scene: Scene;
  roles: UserRole;
  workspace: Workspace;
  canEdit: boolean;
  conflicts: CueConflict[];
  onApply: (draft: Cue) => void;
  onDelete: () => void;
  onSelectCue: (cueId: string) => void;
}

function CueInspector({ cue, scene, workspace, canEdit, conflicts, onApply, onDelete, onSelectCue }: InspectorProps) {
  const [draft, setDraft] = useState<Cue | null>(cue ? structuredClone(cue) : null);

  useEffect(() => {
    setDraft(cue ? structuredClone(cue) : null);
  }, [cue?.id]);

  if (!cue || !draft) {
    return (
      <Flex minH="360px" align="center" justify="center" color="whiteAlpha.500" textAlign="center">
        <Box>
          <Lightbulb size={34} style={{ margin: '0 auto 10px' }} />
          <Text>选择一条灯光提示查看并编辑参数</Text>
        </Box>
      </Flex>
    );
  }

  const update = <K extends keyof Cue>(key: K, value: Cue[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  return (
    <VStack align="stretch" spacing={4}>
      <Flex align="center">
        <Box>
          <Heading size="sm">{cue.number} · {cue.label}</Heading>
          <Text color="whiteAlpha.500" fontSize="xs">开始 {formatTime(cue.startTime)} · 总时长 {cue.duration?.toFixed(1)}s</Text>
        </Box>
        <Spacer />
        <Tag colorScheme={statusColors[cue.status]}>{statusLabels[cue.status]}</Tag>
      </Flex>

      {!canEdit ? (
        <Alert status="warning" borderRadius="lg">
          <AlertIcon />
          <AlertDescription fontSize="sm">
            {scene.frozen ? '该场次已冻结。解除冻结后才能修改。' : '当前角色只能查看或执行场次冻结，不能修改提示参数。'}
          </AlertDescription>
        </Alert>
      ) : null}

      <SimpleGrid columns={2} spacing={3}>
        <FormControl>
          <FormLabel htmlFor="cue-number">提示编号</FormLabel>
          <Input id="cue-number" value={draft.number} isDisabled={!canEdit} onChange={(event) => update('number', event.target.value)} />
        </FormControl>
        <FormControl>
          <FormLabel htmlFor="cue-label">提示名称</FormLabel>
          <Input id="cue-label" value={draft.label} isDisabled={!canEdit} onChange={(event) => update('label', event.target.value)} />
        </FormControl>
        <FormControl>
          <FormLabel htmlFor="cue-position">灯位 / 区域</FormLabel>
          <Input id="cue-position" value={draft.position} isDisabled={!canEdit} onChange={(event) => update('position', event.target.value)} />
        </FormControl>
        <FormControl>
          <FormLabel htmlFor="cue-channel">控制通道</FormLabel>
          <Input id="cue-channel" value={draft.channel} isDisabled={!canEdit} onChange={(event) => update('channel', event.target.value)} />
        </FormControl>
        <FormControl>
          <FormLabel htmlFor="cue-color">颜色名称</FormLabel>
          <Select id="cue-color" value={draft.color} isDisabled={!canEdit} onChange={(event) => update('color', event.target.value)}>
            {colorPresets.map((preset) => <option key={preset.value} value={preset.name}>{preset.name}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel htmlFor="cue-color-hex">色值</FormLabel>
          <HStack>
            <Input
              id="cue-color-hex"
              type="color"
              p={1}
              w="56px"
              value={draft.colorHex}
              isDisabled={!canEdit}
              onChange={(event) => update('colorHex', event.target.value)}
            />
            <Input value={draft.colorHex} isDisabled={!canEdit} onChange={(event) => update('colorHex', event.target.value)} fontFamily="mono" />
          </HStack>
        </FormControl>
      </SimpleGrid>

      <FormControl>
        <FormLabel>亮度 {draft.brightness}%</FormLabel>
        <input
          aria-label="提示亮度"
          type="range"
          min={0}
          max={100}
          value={draft.brightness}
          disabled={!canEdit}
          onChange={(event) => update('brightness', Number(event.target.value))}
          style={{ width: '100%', accentColor: '#f6c453' }}
        />
      </FormControl>

      <SimpleGrid columns={3} spacing={3}>
        {([
          ['fadeIn', '渐入'],
          ['hold', '保持'],
          ['fadeOut', '渐出']
        ] as const).map(([key, label]) => (
          <FormControl key={key}>
            <FormLabel htmlFor={`cue-${key}`}>{label}（秒）</FormLabel>
            <NumberInput
              id={`cue-${key}`}
              min={0}
              step={0.5}
              precision={1}
              value={draft[key]}
              isDisabled={!canEdit}
              onChange={(_, value) => update(key, Number.isNaN(value) ? draft[key] : value)}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>
        ))}
      </SimpleGrid>

      <FormControl>
        <FormLabel htmlFor="cue-follow">跟随关系</FormLabel>
        <Select
          id="cue-follow"
          value={draft.followCueId}
          isDisabled={!canEdit}
          onChange={(event) => update('followCueId', event.target.value)}
        >
          <option value="">不跟随，按顺序触发</option>
          {scene.cues.filter((item) => item.id !== cue.id).map((item) => (
            <option key={item.id} value={item.id}>{item.number} · {item.label}</option>
          ))}
        </Select>
        <Text mt={1} color="whiteAlpha.500" fontSize="11px">跟随目标结束后触发；时间会在拖拽或参数变化后自动重算。</Text>
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="cue-target">触发点 / 舞台动作</FormLabel>
        <Input
          id="cue-target"
          value={draft.targetNote}
          isDisabled={!canEdit}
          onChange={(event) => update('targetNote', event.target.value)}
          placeholder="台词、音乐节拍、演员动作或手动 GO"
        />
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="cue-notes">备注</FormLabel>
        <Textarea
          id="cue-notes"
          value={draft.notes}
          isDisabled={!canEdit}
          onChange={(event) => update('notes', event.target.value)}
          minH="92px"
          placeholder="记录焦点、遮光、设备限制或执行提醒"
        />
      </FormControl>

      <FormControl>
        <FormLabel>执行状态</FormLabel>
        <ButtonGroup isAttached variant="outline" width="100%">
          {(['draft', 'ready', 'confirmed'] as const).map((status) => (
            <Button
              key={status}
              flex="1"
              colorScheme={draft.status === status ? statusColors[status] : 'whiteAlpha'}
              variant={draft.status === status ? 'solid' : 'outline'}
              isDisabled={!canEdit}
              onClick={() => update('status', status)}
            >
              {statusLabels[status]}
            </Button>
          ))}
        </ButtonGroup>
      </FormControl>

      {conflicts.length ? (
        <Alert status={conflicts.some((item) => item.severity === 'error') ? 'error' : 'warning'} borderRadius="lg">
          <AlertIcon />
          <AlertDescription fontSize="sm">
            {conflicts.map((item) => item.message).join('；')}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert status="success" borderRadius="lg">
          <AlertIcon />
          <AlertDescription fontSize="sm">当前提示没有检测到时间、通道或数据冲突。</AlertDescription>
        </Alert>
      )}

      <HStack>
        <Button colorScheme="amber" isDisabled={!canEdit} leftIcon={<Save size={16} />} onClick={() => onApply(draft)}>
          应用参数并重算
        </Button>
        <Spacer />
        <Button colorScheme="red" variant="ghost" isDisabled={!canEdit} leftIcon={<Trash2 size={16} />} onClick={onDelete}>
          删除
        </Button>
      </HStack>

      <Divider />
      <Box>
        <Text color="whiteAlpha.600" fontSize="xs" mb={2}>其他提示快速跳转</Text>
        <HStack wrap="wrap">
          {scene.cues.filter((item) => item.id !== cue.id).map((item) => (
            <Button key={item.id} size="xs" variant="ghost" onClick={() => onSelectCue(item.id)}>{item.number}</Button>
          ))}
        </HStack>
      </Box>
    </VStack>
  );
}

function ConflictList({
  conflicts,
  onSelect
}: {
  conflicts: CueConflict[];
  onSelect: (sceneId: string, cueId: string) => void;
}) {
  if (!conflicts.length) {
    return (
      <Flex minH="240px" align="center" justify="center" color="green.300" textAlign="center">
        <Box>
          <ShieldCheck size={36} style={{ margin: '0 auto 10px' }} />
          <Text>没有检测到时间、通道或数据冲突</Text>
        </Box>
      </Flex>
    );
  }

  return (
    <VStack align="stretch" spacing={3}>
      {conflicts.map((conflict) => (
        <Box
          key={conflict.id}
          as="button"
          textAlign="left"
          p={3}
          borderRadius="lg"
          borderWidth="1px"
          borderColor={conflict.severity === 'error' ? 'red.700' : 'orange.700'}
          bg={conflict.severity === 'error' ? 'red.900' : 'orange.900'}
          _hover={{ filter: 'brightness(1.12)' }}
          onClick={() => onSelect(conflict.sceneId, conflict.cueId)}
        >
          <HStack mb={1}>
            <AlertCircle size={15} color={conflict.severity === 'error' ? '#fc8181' : '#f6ad55'} />
            <Text fontSize="xs" color="whiteAlpha.700">{conflictLabel(conflict)}</Text>
          </HStack>
          <Text fontSize="sm">{conflict.message}</Text>
        </Box>
      ))}
    </VStack>
  );
}

function ComparePlan({
  activePlan,
  comparePlan,
  sceneOrder,
  onSelectCue
}: {
  activePlan: LightingPlan;
  comparePlan: LightingPlan;
  sceneOrder: number;
  onSelectCue: (cueId: string) => void;
}) {
  const leftScene = activePlan.scenes.find((scene) => scene.order === sceneOrder) ?? activePlan.scenes[0];
  const rightScene = comparePlan.scenes.find((scene) => scene.order === sceneOrder) ?? comparePlan.scenes[0];

  function column(plan: LightingPlan, scene: Scene | undefined, active: boolean) {
    return (
      <Box borderWidth="1px" borderColor="whiteAlpha.100" borderRadius="lg" overflow="hidden" bg="blackAlpha.200">
        <Box px={3} py={2} bg={active ? 'blue.900' : 'whiteAlpha.50'}>
          <Text fontWeight="700" fontSize="sm">{plan.name}</Text>
          <Text color="whiteAlpha.500" fontSize="xs">{scene?.name ?? '无对应场次'} · {formatTime(scene?.duration)}</Text>
        </Box>
        <VStack align="stretch" spacing={0}>
          {scene?.cues.map((cue) => (
            <Flex key={cue.id} px={3} py={2} borderBottomWidth="1px" borderColor="whiteAlpha.50" align="center" gap={2}>
              <Box className="color-swatch" bg={cue.colorHex} />
              <Text fontFamily="mono" fontSize="xs" color="amber.300" w="42px">{cue.number}</Text>
              <Box flex="1" minW={0}>
                <Text fontSize="xs" noOfLines={1}>{cue.label}</Text>
                <Text color="whiteAlpha.500" fontSize="10px">{formatTime(cue.startTime)} · {cue.channel} · {cue.brightness}%</Text>
              </Box>
              {active ? (
                <IconButton aria-label={`选择 ${cue.number}`} size="xs" variant="ghost" icon={<ChevronRight size={14} />} onClick={() => onSelectCue(cue.id)} />
              ) : null}
            </Flex>
          ))}
          {!scene?.cues.length ? <Text p={4} color="whiteAlpha.500" fontSize="sm">该方案此处无对应提示。</Text> : null}
        </VStack>
      </Box>
    );
  }

  return (
    <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={3}>
      {column(activePlan, leftScene, true)}
      {column(comparePlan, rightScene, false)}
    </Grid>
  );
}

export default function App() {
  const [state, dispatch] = useLightingDesk();
  const [hydrated, setHydrated] = useState(false);
  const [online, setOnline] = useState(true);
  const [savedAt, setSavedAt] = useState('');
  const [syncMessage, setSyncMessage] = useState('离线草稿待命');
  const toast = useToast();
  const workspace = state.workspace;
  const activePlan = findActivePlan(workspace);
  const activeScene = findActiveScene(workspace);
  const selectedCue = findActiveCue(workspace);
  const comparePlan = workspace.plans.find((plan) => plan.id === workspace.comparePlanId) ?? workspace.plans[0];
  const allConflicts = useMemo(() => detectConflicts(workspace.plans), [workspace.plans]);
  const activeConflicts = allConflicts.filter((item) => item.planId === activePlan.id);
  const activeCueConflicts = selectedCue
    ? allConflicts.filter((item) => item.cueId === selectedCue.id)
    : [];
  const editable = canEditScene(workspace.role, activeScene);
  const freezer = canFreeze(workspace.role);
  const incompleteCount = activePlan.scenes.flatMap((scene) => scene.cues).filter((cue) => cue.status !== 'confirmed').length;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LIGHTING_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Workspace;
        if (parsed.plans?.length) dispatch({ type: 'hydrate', workspace: parsed });
      }
    } catch {
      setSyncMessage('离线草稿损坏，已载入模拟方案');
    }
    setHydrated(true);
    setOnline(navigator.onLine);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(LIGHTING_STORAGE_KEY, JSON.stringify(workspace));
      setSavedAt(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [hydrated, workspace]);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  function commit(label: string, mutate: (next: Workspace) => void) {
    dispatch({ type: 'commit', label, mutate });
  }

  function reorderCue(activeId: string, overId: string) {
    commit('拖动提示并自动重算时间', (next) => {
      const plan = next.plans.find((item) => item.id === next.activePlanId);
      const scene = plan?.scenes.find((item) => item.id === next.selectedSceneId);
      if (!scene) return;
      const oldIndex = scene.cues.findIndex((cue) => cue.id === activeId);
      const newIndex = scene.cues.findIndex((cue) => cue.id === overId);
      if (oldIndex < 0 || newIndex < 0) return;
      scene.cues = arrayMove(scene.cues, oldIndex, newIndex);
    });
  }

  function applyCue(draft: Cue) {
    commit('应用提示参数并重算', (next) => {
      const cue = next.plans
        .find((plan) => plan.id === next.activePlanId)
        ?.scenes.find((scene) => scene.id === next.selectedSceneId)
        ?.cues.find((item) => item.id === draft.id);
      if (!cue) return;
      const { startTime: _start, duration: _duration, endTime: _end, ...fields } = draft;
      Object.assign(cue, fields);
    });
    toast({ title: '提示参数已应用', status: 'success', duration: 1800 });
  }

  function deleteCue() {
    if (!selectedCue || !window.confirm(`删除提示 ${selectedCue.number}？后续时间将自动重算。`)) return;
    commit('删除灯光提示', (next) => {
      const scene = next.plans
        .find((plan) => plan.id === next.activePlanId)
        ?.scenes.find((item) => item.id === next.selectedSceneId);
      if (!scene) return;
      scene.cues = scene.cues.filter((cue) => cue.id !== selectedCue.id);
      next.selectedCueId = scene.cues[0]?.id ?? '';
    });
  }

  function addCue() {
    if (!activeScene) return;
    const id = `cue-${Date.now().toString(36)}`;
    commit('新增灯光提示', (next) => {
      const scene = next.plans
        .find((plan) => plan.id === next.activePlanId)
        ?.scenes.find((item) => item.id === next.selectedSceneId);
      if (!scene) return;
      const sequence = scene.cues.length + 1;
      scene.cues.push({
        id,
        number: `Q${activeScene.order * 10 + sequence}`,
        label: '新提示',
        position: '待指定',
        channel: '',
        color: '暖白',
        colorHex: '#FFF1C7',
        brightness: 60,
        fadeIn: 3,
        hold: 5,
        fadeOut: 3,
        followCueId: '',
        targetNote: '',
        notes: '',
        status: 'draft'
      });
      next.selectedCueId = id;
    });
  }

  function toggleFreeze() {
    if (!activeScene || !freezer) {
      toast({ title: '当前角色不能冻结或解冻场次', status: 'warning' });
      return;
    }
    commit(activeScene.frozen ? '解除场次冻结' : '冻结已确认场次', (next) => {
      const scene = next.plans.find((plan) => plan.id === next.activePlanId)?.scenes.find((item) => item.id === next.selectedSceneId);
      if (scene) scene.frozen = !scene.frozen;
    });
  }

  function duplicatePlan() {
    const id = `plan-${Date.now().toString(36)}`;
    commit('复制为新方案', (next) => {
      const source = next.plans.find((plan) => plan.id === next.activePlanId);
      if (!source) return;
      const copy = structuredClone(source);
      copy.id = id;
      copy.name = `${source.name} · 副本`;
      copy.description = '从现有方案复制，可独立调整场次和提示。';
      copy.scenes.forEach((scene) => {
        scene.id = `${id}-${scene.id}`;
        scene.cues.forEach((cue) => {
          cue.id = `${id}-${cue.id}`;
          cue.followCueId = cue.followCueId ? `${id}-${cue.followCueId}` : '';
        });
      });
      next.plans.push(copy);
      next.activePlanId = id;
      next.comparePlanId = source.id;
      next.selectedSceneId = copy.scenes[0]?.id ?? '';
      next.selectedCueId = copy.scenes[0]?.cues[0]?.id ?? '';
    });
    toast({ title: '已复制方案', status: 'success' });
  }

  function jumpIncomplete() {
    const scenes = activePlan.scenes;
    const startScene = Math.max(0, scenes.findIndex((scene) => scene.id === activeScene?.id));
    const all: { scene: Scene; cue: Cue }[] = [];
    for (let index = 0; index < scenes.length; index += 1) {
      const scene = scenes[(startScene + index) % scenes.length];
      scene.cues.forEach((cue) => {
        const hasConflict = activeConflicts.some((item) => item.cueId === cue.id && item.severity === 'error');
        if (cue.status !== 'confirmed' || hasConflict) all.push({ scene, cue });
      });
    }
    const currentIndex = all.findIndex((item) => item.cue.id === selectedCue?.id);
    const target = all[(currentIndex + 1) % Math.max(1, all.length)];
    if (!target) {
      toast({ title: '所有提示均已完成且无阻断冲突', status: 'success' });
      return;
    }
    dispatch({ type: 'selectCue', sceneId: target.scene.id, cueId: target.cue.id });
    window.setTimeout(() => document.getElementById(`cue-${target.cue.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }

  async function persistNow() {
    setSyncMessage('正在模拟同步到制作服务器…');
    await new Promise((resolve) => window.setTimeout(resolve, 320));
    localStorage.setItem(LIGHTING_STORAGE_KEY, JSON.stringify(workspace));
    setSavedAt(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    setSyncMessage('模拟接口返回 200，本地草稿保持一致');
    toast({ title: '当前方案已保存', description: syncMessage, status: 'success', duration: 2200 });
  }

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void persistNow();
        return;
      }
      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? 'redo' : 'undo' });
        return;
      }
      if (modifier && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        dispatch({ type: 'redo' });
        return;
      }
      if (typing) return;
      if (event.altKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        jumpIncomplete();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!activeScene?.cues.length) return;
        const index = activeScene.cues.findIndex((cue) => cue.id === selectedCue?.id);
        const nextIndex = Math.max(0, Math.min(activeScene.cues.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
        dispatch({ type: 'selectCue', sceneId: activeScene.id, cueId: activeScene.cues[nextIndex].id });
      } else if (event.key.toLowerCase() === 'f') {
        toggleFreeze();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  function selectCue(sceneId: string, cueId: string) {
    dispatch({ type: 'selectCue', sceneId, cueId });
  }

  function exportPlan() {
    const payload = {
      exportedAt: new Date().toISOString(),
      plan: activePlan,
      conflicts: activeConflicts,
      role: workspace.role
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activePlan.name}-灯光提示.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Box minH="100vh">
      <Box as="header" position="sticky" top={0} zIndex={50} bg="rgba(9, 14, 24, .88)" backdropFilter="blur(18px)" borderBottomWidth="1px" borderColor="whiteAlpha.100">
        <Flex px={{ base: 3, xl: 5 }} py={3} align="center" gap={3} wrap="wrap">
          <Flex align="center" gap={3}>
            <Flex w="42px" h="42px" borderRadius="12px" align="center" justify="center" bg="amber.400" color="stage.950" boxShadow="0 8px 24px rgba(246,196,83,.2)">
              <Lightbulb size={22} />
            </Flex>
            <Box>
              <Heading size="md" letterSpacing="wide">光影谱 · 灯光提示设计台</Heading>
              <Text color="whiteAlpha.500" fontSize="xs">场次编排、跟随关系、冲突核对与多方案比较</Text>
            </Box>
          </Flex>

          <HStack ml={{ base: 0, xl: 'auto' }} spacing={2} wrap="wrap">
            <Tooltip label="当前编辑方案">
              <Select
                aria-label="当前编辑方案"
                size="sm"
                w="190px"
                value={workspace.activePlanId}
                bg="whiteAlpha.100"
                onChange={(event) => dispatch({ type: 'selectPlan', planId: event.target.value })}
              >
                {workspace.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </Select>
            </Tooltip>
            <Tooltip label="并排比较的双方案">
              <Select
                aria-label="比较方案"
                size="sm"
                w="170px"
                value={workspace.comparePlanId}
                bg="whiteAlpha.100"
                onChange={(event) => dispatch({ type: 'comparePlan', planId: event.target.value })}
              >
                {workspace.plans.filter((plan) => plan.id !== workspace.activePlanId).map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </Select>
            </Tooltip>
            <Tooltip label="角色权限决定可编辑的场次与提示范围">
              <Select
                aria-label="当前角色"
                size="sm"
                w="132px"
                value={workspace.role}
                bg="whiteAlpha.100"
                onChange={(event) => dispatch({ type: 'setRole', role: event.target.value as UserRole })}
              >
                {Object.entries(roleLabels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
              </Select>
            </Tooltip>
            <Badge colorScheme={online ? 'green' : 'orange'} variant="subtle" px={2} py={1} borderRadius="md">
              <HStack spacing={1}>{online ? <Wifi size={12} /> : <WifiOff size={12} />}<Text>{online ? '在线' : '离线草稿'}</Text></HStack>
            </Badge>
            <IconButton
              aria-label="撤销"
              icon={<Undo2 size={17} />}
              size="sm"
              isDisabled={!state.past.length}
              onClick={() => dispatch({ type: 'undo' })}
            />
            <IconButton
              aria-label="重做"
              icon={<Redo2 size={17} />}
              size="sm"
              isDisabled={!state.future.length}
              onClick={() => dispatch({ type: 'redo' })}
            />
            <Button size="sm" colorScheme="amber" leftIcon={<Save size={16} />} onClick={() => void persistNow()}>保存</Button>
          </HStack>
        </Flex>
        <Flex px={{ base: 3, xl: 5 }} pb={2} gap={3} color="whiteAlpha.500" fontSize="11px" wrap="wrap">
          <Text>最近操作：{state.lastAction}</Text>
          {savedAt ? <Text>本地草稿 {savedAt}</Text> : null}
          <Text>{syncMessage}</Text>
          <Text ml="auto">快捷键：↑/↓ 选择 · Alt+N 下一未完成 · F 冻结/解冻 · Ctrl/⌘+Z 撤销 · Ctrl/⌘+S 保存</Text>
        </Flex>
      </Box>

      <Grid className="desk-grid" templateColumns={{ base: '1fr', xl: '286px minmax(0, 1fr) 380px' }} gap={4} p={{ base: 3, xl: 5 }} maxW="1920px" mx="auto">
        <Box as="aside" className="side-panel" position="sticky" top="104px" alignSelf="start" maxH="calc(100vh - 124px)" overflowY="auto" pr={1}>
          <VStack align="stretch" spacing={4}>
            <Box borderWidth="1px" borderColor="whiteAlpha.100" borderRadius="xl" bg="whiteAlpha.50" p={4}>
              <Flex align="center" mb={3}>
                <Heading size="sm">场次</Heading>
                <Spacer />
                <Tag size="sm" colorScheme="blue">{activePlan.scenes.length} 场</Tag>
              </Flex>
              <VStack align="stretch" spacing={2}>
                {activePlan.scenes.map((scene) => {
                  const sceneConflicts = activeConflicts.filter((item) => item.sceneId === scene.id);
                  const selected = scene.id === activeScene?.id;
                  return (
                    <Box
                      key={scene.id}
                      as="button"
                      textAlign="left"
                      p={3}
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor={selected ? 'blue.400' : 'transparent'}
                      bg={selected ? 'blue.900' : 'blackAlpha.200'}
                      _hover={{ bg: selected ? 'blue.900' : 'whiteAlpha.100' }}
                      onClick={() => dispatch({ type: 'selectScene', sceneId: scene.id })}
                    >
                      <Flex align="center" gap={2}>
                        <Text color="amber.300" fontFamily="mono" fontSize="xs">{(scene.order).toString().padStart(2, '0')}</Text>
                        <Text fontWeight="650" fontSize="sm" flex="1" noOfLines={1}>{scene.name}</Text>
                        {scene.frozen ? <Lock size={13} color="#9ae6b4" /> : <Unlock size={13} color="#718096" />}
                      </Flex>
                      <Flex mt={2} color="whiteAlpha.500" fontSize="10px" gap={2}>
                        <Text>{formatTime(scene.duration)}</Text>
                        <Text>{scene.cues.length} 条</Text>
                        <Text color={sceneConflicts.length ? 'orange.300' : 'green.300'}>{sceneConflicts.length} 冲突</Text>
                      </Flex>
                    </Box>
                  );
                })}
              </VStack>
            </Box>

            <Box borderWidth="1px" borderColor="whiteAlpha.100" borderRadius="xl" bg="whiteAlpha.50" p={4}>
              <Heading size="sm" mb={3}>执行概览</Heading>
              <SimpleGrid columns={2} spacing={2}>
                <Box p={3} borderRadius="lg" bg="blackAlpha.200">
                  <Text fontSize="2xl" fontWeight="800">{incompleteCount}</Text>
                  <Text color="whiteAlpha.500" fontSize="xs">未确认提示</Text>
                </Box>
                <Box p={3} borderRadius="lg" bg="blackAlpha.200">
                  <Text fontSize="2xl" fontWeight="800" color={activeConflicts.length ? 'orange.300' : 'green.300'}>{activeConflicts.length}</Text>
                  <Text color="whiteAlpha.500" fontSize="xs">当前方案冲突</Text>
                </Box>
              </SimpleGrid>
              <Button mt={3} w="full" colorScheme="blue" variant="outline" leftIcon={<SkipForward size={16} />} onClick={jumpIncomplete}>
                下一未完成 / 阻断项
              </Button>
            </Box>

            <Box borderWidth="1px" borderColor="whiteAlpha.100" borderRadius="xl" bg="whiteAlpha.50" p={4}>
              <Heading size="sm" mb={3}>角色权限</Heading>
              <HStack mb={3}><ShieldCheck size={17} color="#f6c453" /><Text fontSize="sm">{roleLabels[workspace.role]}</Text></HStack>
              <Text color="whiteAlpha.500" fontSize="xs" lineHeight="1.7">
                {workspace.role === 'designer' && '可编辑所有未冻结方案与提示，也可冻结场次。'}
                {workspace.role === 'programmer' && '可编辑通道、亮度、渐变和跟随关系；不能冻结场次。'}
                {workspace.role === 'stage-manager' && '只能冻结或解冻场次，不能修改提示内容。'}
                {workspace.role === 'readonly' && '只读查看所有方案、冲突和比较结果。'}
              </Text>
            </Box>

            <Button variant="outline" leftIcon={<Copy size={16} />} onClick={duplicatePlan}>复制为新方案</Button>
            <Button variant="ghost" leftIcon={<RefreshCw size={16} />} onClick={exportPlan}>导出当前方案 JSON</Button>
          </VStack>
        </Box>

        <Box minW={0}>
          {!activeScene ? (
            <Alert status="warning" borderRadius="xl"><AlertIcon />请选择或新建场次。</Alert>
          ) : (
            <VStack align="stretch" spacing={4}>
              <Box borderWidth="1px" borderColor="whiteAlpha.100" borderRadius="xl" bg="whiteAlpha.50" p={4}>
                <Flex align={{ base: 'start', md: 'center' }} gap={3} wrap="wrap">
                  <Box>
                    <Flex align="center" gap={2}>
                      <Heading size="md">{activeScene.name}</Heading>
                      {activeScene.frozen ? <Tag colorScheme="green"><HStack spacing={1}><Lock size={12} /><Text>已冻结</Text></HStack></Tag> : <Tag variant="subtle">编辑中</Tag>}
                    </Flex>
                    <Text color="whiteAlpha.500" fontSize="sm" mt={1}>
                      场次开始 {formatTime(activeScene.startTime)} · 时长 {formatTime(activeScene.duration)} · {activeScene.cues.length} 条提示
                    </Text>
                  </Box>
                  <Spacer />
                  <ButtonGroup size="sm" variant="outline">
                    <Button leftIcon={<Plus size={15} />} isDisabled={!editable} onClick={addCue}>新增提示</Button>
                    <Button leftIcon={activeScene.frozen ? <LockOpen size={15} /> : <Lock size={15} />} isDisabled={!freezer} onClick={toggleFreeze}>
                      {activeScene.frozen ? '解除冻结' : '冻结场次'}
                    </Button>
                    <Button leftIcon={<SkipForward size={15} />} onClick={jumpIncomplete}>定位未完成</Button>
                  </ButtonGroup>
                </Flex>

                <Box mt={4}>
                  <Flex mb={2} align="center">
                    <Text color="whiteAlpha.600" fontSize="xs">自动重算时间轴</Text>
                    <Spacer />
                    <Text color="whiteAlpha.500" fontSize="xs">{formatTime(activeScene.startTime)} — {formatTime((activeScene.startTime ?? 0) + (activeScene.duration ?? 0))}</Text>
                  </Flex>
                  <Flex className="timeline-track" role="list" aria-label={`${activeScene.name}时间轴`}>
                    {activeScene.cues.map((cue) => (
                      <Tooltip key={cue.id} label={`${cue.number} ${cue.label}，${formatTime(cue.startTime)} 开始，持续 ${cue.duration?.toFixed(1)} 秒`}>
                        <Box
                          as="button"
                          role="listitem"
                          className="timeline-block focus-ring"
                          aria-label={`时间轴 ${cue.number} ${cue.label}`}
                          bg={cue.colorHex}
                          color={cue.brightness > 55 ? '#111827' : '#fff'}
                          flexGrow={Math.max(1, cue.duration ?? 1)}
                          flexBasis={`${Math.max(40, (cue.duration ?? 1) * 14)}px`}
                          borderLeft={cue.id === selectedCue?.id ? '3px solid #f6c453' : undefined}
                          onClick={() => selectCue(activeScene.id, cue.id)}
                        >
                          <Text fontWeight="800">{cue.number}</Text>
                          <Text noOfLines={1}>{cue.label}</Text>
                        </Box>
                      </Tooltip>
                    ))}
                    {!activeScene.cues.length ? <Text p={3} color="whiteAlpha.500" fontSize="sm">时间轴暂无数据</Text> : null}
                  </Flex>
                </Box>
              </Box>

              {!editable ? (
                <Alert status={activeScene.frozen ? 'success' : 'warning'} borderRadius="lg">
                  <AlertIcon />
                  <AlertDescription>
                    {activeScene.frozen
                      ? '该场次已冻结。提示顺序与参数保持只读；可由灯光设计或舞台监督解除冻结。'
                      : '当前角色处于审阅或执行权限，拖动顺序与参数编辑已锁定。'}
                  </AlertDescription>
                </Alert>
              ) : null}

              <CueList
                scene={activeScene}
                selectedCueId={workspace.selectedCueId}
                canEdit={editable}
                conflicts={activeConflicts}
                onSelect={(cueId) => selectCue(activeScene.id, cueId)}
                onReorder={reorderCue}
              />

              <Box borderWidth="1px" borderColor="whiteAlpha.100" borderRadius="xl" bg="whiteAlpha.50" p={4}>
                <Flex align="center" mb={3}>
                  <Box>
                    <Heading size="sm">双方案并排比较</Heading>
                    <Text color="whiteAlpha.500" fontSize="xs">按场次顺序对应比较通道、亮度和时间。</Text>
                  </Box>
                  <Spacer />
                  <Tag colorScheme="purple">{activePlan.name} × {comparePlan.name}</Tag>
                </Flex>
                <ComparePlan
                  activePlan={activePlan}
                  comparePlan={comparePlan}
                  sceneOrder={activeScene.order}
                  onSelectCue={(cueId) => selectCue(activeScene.id, cueId)}
                />
              </Box>
            </VStack>
          )}
        </Box>

        <Box as="aside" className="side-panel" position="sticky" top="104px" alignSelf="start" maxH="calc(100vh - 124px)" overflowY="auto" pl={1}>
          <Box borderWidth="1px" borderColor="whiteAlpha.100" borderRadius="xl" bg="whiteAlpha.50" overflow="hidden">
            <Tabs colorScheme="amber" variant="line">
              <TabList px={3} pt={2}>
                <Tab>提示编辑</Tab>
                <Tab>冲突 <Badge ml={1} colorScheme={activeConflicts.length ? 'orange' : 'green'}>{activeConflicts.length}</Badge></Tab>
                <Tab>关系图</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={4} pb={5}>
                  {activeScene ? (
                    <CueInspector
                      cue={selectedCue}
                      scene={activeScene}
                      roles={workspace.role}
                      workspace={workspace}
                      canEdit={editable}
                      conflicts={activeCueConflicts}
                      onApply={applyCue}
                      onDelete={deleteCue}
                      onSelectCue={(cueId) => selectCue(activeScene.id, cueId)}
                    />
                  ) : null}
                </TabPanel>
                <TabPanel px={4} pb={5}>
                  <ConflictList
                    conflicts={activeConflicts}
                    onSelect={(sceneId, cueId) => selectCue(sceneId, cueId)}
                  />
                </TabPanel>
                <TabPanel px={4} pb={5}>
                  {activeScene ? (
                    <VStack align="stretch" spacing={3}>
                      {activeScene.cues.map((cue, index) => {
                        const followed = activeScene.cues.find((item) => item.id === cue.followCueId);
                        return (
                          <Box key={cue.id} p={3} borderRadius="lg" bg="blackAlpha.200" borderWidth="1px" borderColor="whiteAlpha.100">
                            <Flex align="center" gap={2}>
                              <CircleDot size={14} color={cue.colorHex} />
                              <Text fontFamily="mono" color="amber.300" fontSize="sm">{cue.number}</Text>
                              <Text fontWeight="600" fontSize="sm" noOfLines={1}>{cue.label}</Text>
                              <Spacer />
                              <Text color="whiteAlpha.500" fontSize="xs">{formatTime(cue.startTime)}</Text>
                            </Flex>
                            <Box ml={4} mt={3} borderLeftWidth="2px" borderColor={followed ? 'purple.400' : 'whiteAlpha.200'} pl={3}>
                              {followed ? (
                                <>
                                  <Flex align="center" gap={1} color="purple.300" fontSize="xs"><ArrowDown size={12} />跟随 {followed.number} · {followed.label}</Flex>
                                  <Text mt={1} color="whiteAlpha.500" fontSize="10px">目标结束时间 {formatTime(followed.endTime)}</Text>
                                </>
                              ) : (
                                <Flex align="center" gap={1} color="whiteAlpha.500" fontSize="xs"><Pause size={12} />按前一条结束或手动 GO 触发</Flex>
                              )}
                            </Box>
                            {index < activeScene.cues.length - 1 ? <Box mt={3} pl="8px" color="whiteAlpha.300"><ArrowDown size={14} /></Box> : null}
                          </Box>
                        );
                      })}
                    </VStack>
                  ) : null}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>

          <Box mt={4} p={3} borderRadius="lg" borderWidth="1px" borderStyle="dashed" borderColor="whiteAlpha.200" color="whiteAlpha.500" fontSize="xs" lineHeight="1.7">
            <Text color="whiteAlpha.700" fontWeight="700" mb={1}>读屏与键盘说明</Text>
            每条提示均声明编号、名称、状态与冲突数量。拖动把手可用键盘聚焦后使用方向键排序；编辑表单均带明确标签。
          </Box>
        </Box>
      </Grid>

      <Box as="footer" maxW="1920px" mx="auto" px={5} pb={7} color="whiteAlpha.400" fontSize="xs" textAlign="center">
        所有方案与草稿保存在当前浏览器。清除站点数据会删除灯光设计台内容。
      </Box>
    </Box>
  );
}
