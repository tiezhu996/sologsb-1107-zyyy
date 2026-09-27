import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, Grid, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { StatBadge } from '../components/common/StatBadge'
import { buildSlotUsage, useCabinetStore } from '../stores/cabinetStore'
import { useSampleStore } from '../stores/sampleStore'
import { CABINET_GROUPS, cabinetLabel, type CabinetGroup, type CabinetSlotInput } from '../types/cabinet-slot'

const emptySlotForm: CabinetSlotInput = {
  group: '甲',
  slotNo: 1,
  capacity: 4,
}

export default function CabinetLedger() {
  const cabinetSlots = useCabinetStore((state) => state.cabinetSlots)
  const error = useCabinetStore((state) => state.error)
  const loadSlots = useCabinetStore((state) => state.loadSlots)
  const addSlot = useCabinetStore((state) => state.addSlot)
  const samples = useSampleStore((state) => state.paperSamples)
  const sampleError = useSampleStore((state) => state.error)
  const loadSamples = useSampleStore((state) => state.loadSamples)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CabinetSlotInput>(emptySlotForm)
  const [groupFilter, setGroupFilter] = useState<CabinetGroup | '全部'>('全部')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void loadSlots()
    void loadSamples()
  }, [loadSamples, loadSlots])

  const usage = useMemo(() => buildSlotUsage(cabinetSlots, samples), [cabinetSlots, samples])
  const filteredUsage = useMemo(
    () => usage.filter((entry) => groupFilter === '全部' || entry.slot.group === groupFilter),
    [groupFilter, usage],
  )
  const totalCapacity = usage.reduce((sum, entry) => sum + entry.slot.capacity, 0)
  const totalUsed = usage.reduce((sum, entry) => sum + entry.used, 0)
  const fullCount = usage.filter((entry) => entry.full).length
  const previewLabel = cabinetLabel(form.group, form.slotNo)
  const labelTaken = cabinetSlots.some((slot) => slot.label === previewLabel)

  const updateForm = <K extends keyof CabinetSlotInput,>(key: K, value: CabinetSlotInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async () => {
    if (form.slotNo <= 0 || form.capacity <= 0 || labelTaken) return
    setSubmitting(true)
    const created = await addSlot(form)
    setSubmitting(false)
    if (created) {
      setForm(emptySlotForm)
      setShowForm(false)
    }
  }

  const errorMessage = error ?? sampleError

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' } }}>
        <Box>
          <Typography component="h1" variant="h3" color="#344a34">档案柜台账</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>整理间甲、乙、丙三组档案柜逐格登记，标明每格可放样本数与当前占用。</Typography>
        </Box>
        <Button variant="contained" size="large" onClick={() => setShowForm((current) => !current)} data-testid="new-cabinet">
          {showForm ? '收起登记' : '新建柜位'}
        </Button>
      </Box>

      {errorMessage && <Alert severity="warning">{errorMessage}</Alert>}

      {showForm && (
        <Card data-testid="form-cabinet" sx={{ borderColor: '#9eb096' }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="h5">登记新柜位</Typography>
                <Typography variant="body2" color="text.secondary">按柜组与格号建档，写明一格放几张样本。</Typography>
              </Box>
              <Chip color={labelTaken ? 'warning' : 'success'} label={labelTaken ? `${previewLabel} 已在台账中` : `柜位标签 ${previewLabel}`} />
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="柜组" value={form.group} onChange={(event) => updateForm('group', event.target.value as CabinetGroup)} SelectProps={{ native: true, inputProps: { 'data-testid': 'field-group' } }}>
                  {CABINET_GROUPS.map((option) => <option key={option} value={option}>{option}组柜</option>)}
                </TextField>
              </Grid>
              <Grid item xs={6} md={4}>
                <TextField fullWidth type="number" label="格号" value={form.slotNo} onChange={(event) => updateForm('slotNo', Number(event.target.value))} inputProps={{ min: 1, max: 99, step: 1, 'data-testid': 'field-slotNo' }} />
              </Grid>
              <Grid item xs={6} md={4}>
                <TextField fullWidth type="number" label="每格容量" value={form.capacity} onChange={(event) => updateForm('capacity', Number(event.target.value))} inputProps={{ min: 1, max: 50, step: 1, 'data-testid': 'field-capacity' }} InputProps={{ endAdornment: '张' }} />
              </Grid>
            </Grid>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 2.5 }}>
              <Button onClick={() => setShowForm(false)}>取消</Button>
              <Button variant="contained" onClick={handleSubmit} disabled={submitting || labelTaken} data-testid="submit-cabinet">保存柜位</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <StatBadge label="柜位总数" value={usage.length} detail="甲乙丙三组在册格数" />
        <StatBadge label="总容量" value={totalCapacity} detail="全部柜位可放样本数" tone="bamboo" />
        <StatBadge label="已存放" value={totalUsed} detail={totalCapacity ? `占总容量 ${Math.round((totalUsed / totalCapacity) * 100)}%` : '尚无柜位'} tone="bamboo" />
        <StatBadge label="已满柜位" value={fullCount} detail="放满后不可再登记样本" tone={fullCount ? 'warning' : 'neutral'} />
      </Box>

      <Card>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField select fullWidth size="small" label="柜组筛选" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value as CabinetGroup | '全部')} SelectProps={{ native: true }}>
                <option value="全部">全部柜组</option>
                {CABINET_GROUPS.map((option) => <option key={option} value={option}>{option}组柜</option>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">当前记录</Typography>
                <Typography variant="h5" data-testid="count-cabinet">{filteredUsage.length}</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Button fullWidth variant="outlined" onClick={() => setGroupFilter('全部')}>重置筛选</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <TableContainer component={Card}>
        <Table sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell>柜组</TableCell>
              <TableCell>格号</TableCell>
              <TableCell>柜位标签</TableCell>
              <TableCell align="right">每格容量</TableCell>
              <TableCell align="right">已放</TableCell>
              <TableCell align="right">剩余</TableCell>
              <TableCell>状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsage.map(({ slot, used, remaining, full }) => (
              <TableRow key={slot.id ?? slot.label} data-testid="row-cabinet" hover sx={full ? { bgcolor: '#fff4e0' } : undefined}>
                <TableCell>{slot.group}组柜</TableCell>
                <TableCell>{String(slot.slotNo).padStart(2, '0')} 格</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{slot.label}</TableCell>
                <TableCell align="right">{slot.capacity} 张</TableCell>
                <TableCell align="right">{used} 张</TableCell>
                <TableCell align="right">{remaining} 张</TableCell>
                <TableCell>
                  <Chip size="small" color={full ? 'warning' : 'success'} variant={full ? 'filled' : 'outlined'} label={full ? '已满' : '有空位'} />
                </TableCell>
              </TableRow>
            ))}
            {filteredUsage.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5 }}>该柜组尚无柜位，请先登记</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  )
}
