import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, Grid, Stack, TextField, Typography } from '@mui/material'
import { GrainStripePreview } from '../components/common/GrainStripePreview'
import { RulerInput } from '../components/common/RulerInput'
import { StatBadge } from '../components/common/StatBadge'
import { useUnitConvert } from '../hooks/useUnitConvert'
import { buildSlotUsage, useCabinetStore } from '../stores/cabinetStore'
import { useMouldStore } from '../stores/mouldStore'
import { useRunStore } from '../stores/runStore'
import { useSampleStore } from '../stores/sampleStore'
import { CABINET_GROUPS } from '../types/cabinet-slot'
import { EVENNESS_LEVELS, type EvennessLevel, type PaperSampleInput } from '../types/paper-sample'
import { isGapOutOfTolerance } from '../utils/stripe'

const emptySampleForm: PaperSampleInput = {
  sampleNo: '',
  runId: 1,
  sizeMm: 210,
  stripeCount: 45,
  evenness: '均匀',
  archiveBin: '',
}

function stripeTier(count: number): { label: string; color: 'success' | 'info' | 'warning' } {
  if (count >= 50) return { label: '密纹档', color: 'success' }
  if (count >= 40) return { label: '中密档', color: 'info' }
  return { label: '疏纹档', color: 'warning' }
}

export default function SampleCards() {
  const samples = useSampleStore((state) => state.paperSamples)
  const error = useSampleStore((state) => state.error)
  const loadSamples = useSampleStore((state) => state.loadSamples)
  const addSample = useSampleStore((state) => state.addSample)
  const transferSample = useSampleStore((state) => state.transferSample)
  const runs = useRunStore((state) => state.sheetRuns)
  const runError = useRunStore((state) => state.error)
  const loadRuns = useRunStore((state) => state.loadRuns)
  const moulds = useMouldStore((state) => state.moulds)
  const mouldError = useMouldStore((state) => state.error)
  const loadMoulds = useMouldStore((state) => state.loadMoulds)
  const cabinetSlots = useCabinetStore((state) => state.cabinetSlots)
  const cabinetError = useCabinetStore((state) => state.error)
  const loadSlots = useCabinetStore((state) => state.loadSlots)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<PaperSampleInput>(emptySampleForm)
  const [evennessFilter, setEvennessFilter] = useState<EvennessLevel | '全部'>('全部')
  const [stripeFloor, setStripeFloor] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [transferringId, setTransferringId] = useState<number | null>(null)
  const [transferTarget, setTransferTarget] = useState('')
  const { mmToCm, formatGrammage } = useUnitConvert()

  useEffect(() => {
    void loadSamples()
    void loadRuns()
    void loadMoulds()
    void loadSlots()
  }, [loadMoulds, loadRuns, loadSamples, loadSlots])

  const runById = useMemo(() => new Map(runs.map((run) => [run.id, run])), [runs])
  const mouldById = useMemo(() => new Map(moulds.map((mould) => [mould.id, mould])), [moulds])
  const slotUsage = useMemo(() => buildSlotUsage(cabinetSlots, samples), [cabinetSlots, samples])
  const filteredSamples = useMemo(
    () => samples.filter((sample) => (evennessFilter === '全部' || sample.evenness === evennessFilter) && sample.stripeCount >= stripeFloor),
    [evennessFilter, samples, stripeFloor],
  )
  const denseCount = samples.filter((sample) => sample.stripeCount >= 50).length
  const recheckCount = samples.filter((sample) => sample.evenness !== '均匀').length

  const updateForm = <K extends keyof PaperSampleInput,>(key: K, value: PaperSampleInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!form.sampleNo.trim() || !form.archiveBin || form.sizeMm <= 0 || form.stripeCount <= 0) return
    setSubmitting(true)
    const created = await addSample({ ...form, sampleNo: form.sampleNo.trim() })
    setSubmitting(false)
    if (created) {
      setForm(emptySampleForm)
      setShowForm(false)
    }
  }

  const handleTransfer = async (sampleId: number) => {
    if (!transferTarget) return
    setSubmitting(true)
    const moved = await transferSample(sampleId, transferTarget)
    setSubmitting(false)
    if (moved) {
      setTransferringId(null)
      setTransferTarget('')
    }
  }

  const errorMessage = error ?? runError ?? mouldError ?? cabinetError

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' } }}>
        <Box>
          <Typography component="h1" variant="h3" color="#344a34">成纸样本与透光检验卡</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>按匀度与帘纹条数分档，复核样本对应的抄纸工序和归档位置。</Typography>
        </Box>
        <Button variant="contained" size="large" onClick={() => setShowForm((current) => !current)} data-testid="new-sample">
          {showForm ? '收起登记' : '新建样本'}
        </Button>
      </Box>

      {errorMessage && <Alert severity="warning">{errorMessage}</Alert>}

      {showForm && (
        <Card data-testid="form-sample" sx={{ borderColor: '#9eb096' }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h5" sx={{ mb: 2 }}>登记成纸样本</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}><TextField fullWidth label="样本编号" value={form.sampleNo} onChange={(event) => updateForm('sampleNo', event.target.value)} inputProps={{ 'data-testid': 'field-sampleNo' }} /></Grid>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="对应工序" value={form.runId} onChange={(event) => updateForm('runId', Number(event.target.value))} SelectProps={{ native: true, inputProps: { 'data-testid': 'field-runId' } }}>
                  {!runs.some((run) => run.id === form.runId) && <option value={form.runId}>工序数据载入中</option>}
                  {runs.map((run) => <option key={run.id} value={run.id}>{run.runNo} · {run.runDate}</option>)}
                </TextField>
              </Grid>
              <Grid item xs={6} md={2}><TextField fullWidth type="number" label="样本尺寸" value={form.sizeMm} onChange={(event) => updateForm('sizeMm', Number(event.target.value))} inputProps={{ min: 20, max: 1000, step: 1, 'data-testid': 'field-sizeMm' }} InputProps={{ endAdornment: 'mm' }} /></Grid>
              <Grid item xs={6} md={3}><TextField fullWidth type="number" label="帘纹条数" value={form.stripeCount} onChange={(event) => updateForm('stripeCount', Number(event.target.value))} inputProps={{ min: 1, max: 300, step: 1, 'data-testid': 'field-stripeCount' }} /></Grid>
              <Grid item xs={6} md={3}>
                <TextField select fullWidth label="匀度" value={form.evenness} onChange={(event) => updateForm('evenness', event.target.value as EvennessLevel)} SelectProps={{ native: true, inputProps: { 'data-testid': 'field-evenness' } }}>
                  {EVENNESS_LEVELS.map((option) => <option key={option} value={option}>{option}</option>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField select fullWidth label="存档位" value={form.archiveBin} onChange={(event) => updateForm('archiveBin', event.target.value)} SelectProps={{ native: true, inputProps: { 'data-testid': 'field-archiveBin' } }}>
                  <option value="">请选择有空位的柜位</option>
                  {slotUsage.map(({ slot, used, full }) => (
                    <option key={slot.id ?? slot.label} value={slot.label} disabled={full}>
                      {full ? `${slot.label} · 已满 ${used}/${slot.capacity}` : `${slot.label} · 已放 ${used}/${slot.capacity}`}
                    </option>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 2.5 }}>
              <Button onClick={() => setShowForm(false)}>取消</Button>
              <Button variant="contained" onClick={handleSubmit} disabled={submitting || !form.archiveBin} data-testid="submit-sample">保存样本</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <StatBadge label="样本总数" value={samples.length} detail="档案柜入库数量" />
        <StatBadge label="密纹样本" value={denseCount} detail="帘纹条数不少于 50" tone="bamboo" />
        <StatBadge label="待复检" value={recheckCount} detail="匀度非“均匀”" tone={recheckCount ? 'warning' : 'neutral'} />
      </Box>

      <Card>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h5">柜位占用</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>按柜组列出每格已放与剩余，放满的格子不再接受登记。</Typography>
            </Box>
            <Chip size="small" variant="outlined" label={`已满 ${slotUsage.filter((entry) => entry.full).length} / ${slotUsage.length} 格`} />
          </Box>
          <Grid container spacing={2}>
            {CABINET_GROUPS.map((group) => {
              const groupUsage = slotUsage.filter((entry) => entry.slot.group === group)
              const groupUsed = groupUsage.reduce((sum, entry) => sum + entry.used, 0)
              const groupCapacity = groupUsage.reduce((sum, entry) => sum + entry.slot.capacity, 0)
              return (
                <Grid item xs={12} md={4} key={group}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>{group}组柜 · {groupUsed}/{groupCapacity} 张</Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }} data-testid={`usage-group-${group}`}>
                    {groupUsage.map(({ slot, used, remaining, full }) => (
                      <Chip
                        key={slot.id ?? slot.label}
                        size="small"
                        color={full ? 'warning' : 'default'}
                        variant={full ? 'filled' : 'outlined'}
                        label={full ? `${slot.label} 已满 ${used}/${slot.capacity}` : `${slot.label} 余 ${remaining}`}
                        sx={full ? undefined : { bgcolor: used > 0 ? '#eef3e6' : 'transparent' }}
                      />
                    ))}
                    {groupUsage.length === 0 && <Typography variant="body2" color="text.secondary">该组尚未登记柜位</Typography>}
                  </Box>
                </Grid>
              )
            })}
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={5} md={3}>
              <TextField select fullWidth size="small" label="匀度筛选" value={evennessFilter} onChange={(event) => setEvennessFilter(event.target.value as EvennessLevel | '全部')} SelectProps={{ native: true }}>
                <option value="全部">全部匀度</option>
                {EVENNESS_LEVELS.map((option) => <option key={option} value={option}>{option}</option>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={7} md={4}>
              <RulerInput label="最低帘纹条数" value={stripeFloor} onChange={setStripeFloor} unit="条" min={0} max={300} step={1} compact />
            </Grid>
            <Grid item xs={6} md={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography variant="body2" color="text.secondary">当前记录</Typography><Typography variant="h5" data-testid="count-sample">{filteredSamples.length}</Typography></Box>
            </Grid>
            <Grid item xs={6} md={3}><Button fullWidth variant="outlined" onClick={() => { setEvennessFilter('全部'); setStripeFloor(0) }}>重置分档</Button></Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
        {filteredSamples.map((sample) => {
          const run = runById.get(sample.runId)
          const mould = run ? mouldById.get(run.mouldId) : undefined
          const tier = stripeTier(sample.stripeCount)
          const gap = run?.measuredGap ?? mould?.stripeGap ?? 1
          const transferOptions = slotUsage.filter((entry) => !entry.full && entry.slot.label !== sample.archiveBin)
          const isTransferring = transferringId === sample.id
          return (
            <Card key={sample.id ?? sample.sampleNo} data-testid="row-sample" sx={{ bgcolor: sample.evenness === '均匀' ? '#fffdf7' : '#fff9e8' }}>
              <CardContent sx={{ p: 2.25 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'flex-start', mb: 1.5 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{sample.sampleNo}</Typography>
                    <Typography variant="caption" color="text.secondary">工序 {run?.runNo ?? '待关联'} · {run?.runDate ?? '日期待补'}</Typography>
                  </Box>
                  <Chip size="small" color={tier.color} label={tier.label} />
                </Box>
                <GrainStripePreview
                  gap={gap}
                  wireDiameter={mould?.wireDiameter ?? 0.25}
                  density={mould?.meshDensity}
                  stripeCount={sample.stripeCount}
                  direction={run?.stripeDirection === '横帘纹' ? 'horizontal' : 'vertical'}
                />
                <Grid container spacing={1} sx={{ mt: 1 }}>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">帘纹条数</Typography><Typography sx={{ fontWeight: 700 }}>{sample.stripeCount} 条</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">匀度</Typography><Typography sx={{ fontWeight: 700, color: sample.evenness === '均匀' ? 'success.dark' : 'warning.dark' }}>{sample.evenness}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">样本尺寸</Typography><Typography>{sample.sizeMm} mm · {mmToCm(sample.sizeMm)} cm</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">纸页克重</Typography><Typography>{run ? formatGrammage(run.grammage) : '待补'}</Typography></Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', mt: 1.5 }}>
                  <Chip size="small" variant="outlined" label={`存档 ${sample.archiveBin}`} />
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {run && isGapOutOfTolerance(run.deviation) && <Chip size="small" color="warning" label={`偏差 ${run.deviation > 0 ? '+' : ''}${run.deviation.toFixed(2)} mm`} />}
                    {sample.id !== undefined && (
                      <Button size="small" variant="text" disabled={submitting} onClick={() => { setTransferringId(isTransferring ? null : sample.id ?? null); setTransferTarget('') }} data-testid={`transfer-${sample.sampleNo}`}>
                        {isTransferring ? '取消调拨' : '调拨'}
                      </Button>
                    )}
                  </Box>
                </Box>
                {isTransferring && sample.id !== undefined && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1.5 }}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="调拨至柜位"
                      value={transferTarget}
                      onChange={(event) => setTransferTarget(event.target.value)}
                      SelectProps={{ native: true, inputProps: { 'data-testid': `transfer-target-${sample.sampleNo}` } }}
                    >
                      <option value="">选择有空位的柜位</option>
                      {transferOptions.map(({ slot, used }) => (
                        <option key={slot.id ?? slot.label} value={slot.label}>{slot.label} · 已放 {used}/{slot.capacity}</option>
                      ))}
                    </TextField>
                    <Button size="small" variant="contained" disabled={!transferTarget || submitting} onClick={() => void handleTransfer(sample.id ?? 0)} data-testid={`transfer-confirm-${sample.sampleNo}`}>
                      确认
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          )
        })}
        {filteredSamples.length === 0 && (
          <Card sx={{ gridColumn: '1 / -1' }}><CardContent sx={{ textAlign: 'center', py: 7 }}><Typography color="text.secondary">没有符合当前匀度与帘纹条数分档的样本</Typography></CardContent></Card>
        )}
      </Box>
    </Stack>
  )
}
