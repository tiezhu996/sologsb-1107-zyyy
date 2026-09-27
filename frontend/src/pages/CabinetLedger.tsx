import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { StatBadge } from '../components/common/StatBadge'
import { useCabinetStore } from '../stores/cabinetStore'
import { useSampleStore } from '../stores/sampleStore'
import { CABINET_GROUPS, type CabinetGroup, type CabinetSlotInput } from '../types/cabinet-slot'
import { countSamplesBySlot, isSlotFull, slotCode, slotPlaced } from '../utils/cabinet'

const emptySlotForm: CabinetSlotInput = {
  group: '甲',
  cellNo: 1,
  capacity: 4,
}

export default function CabinetLedger() {
  const slots = useCabinetStore((state) => state.cabinetSlots)
  const cabinetError = useCabinetStore((state) => state.error)
  const loadSlots = useCabinetStore((state) => state.loadSlots)
  const addSlot = useCabinetStore((state) => state.addSlot)
  const samples = useSampleStore((state) => state.paperSamples)
  const sampleError = useSampleStore((state) => state.error)
  const loadSamples = useSampleStore((state) => state.loadSamples)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CabinetSlotInput>(emptySlotForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void loadSlots()
    void loadSamples()
  }, [loadSamples, loadSlots])

  const counts = useMemo(() => countSamplesBySlot(samples), [samples])
  const samplesByBin = useMemo(() => {
    const grouped = new Map<string, string[]>()
    for (const sample of samples) {
      const list = grouped.get(sample.archiveBin) ?? []
      list.push(sample.sampleNo)
      grouped.set(sample.archiveBin, list)
    }
    return grouped
  }, [samples])
  const totalCapacity = slots.reduce((sum, slot) => sum + slot.capacity, 0)
  const totalPlaced = slots.reduce((sum, slot) => sum + slotPlaced(slot, counts), 0)
  const fullCount = slots.filter((slot) => isSlotFull(slot, counts)).length

  const updateForm = <K extends keyof CabinetSlotInput,>(key: K, value: CabinetSlotInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async () => {
    if (form.cellNo < 1 || form.capacity < 1) return
    setSubmitting(true)
    const created = await addSlot({ ...form, cellNo: Math.floor(form.cellNo), capacity: Math.floor(form.capacity) })
    setSubmitting(false)
    if (created) {
      setForm(emptySlotForm)
      setShowForm(false)
    }
  }

  const errorMessage = cabinetError ?? sampleError

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' } }}>
        <Box>
          <Typography component="h1" variant="h3" color="#344a34">档案柜位台账</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>甲、乙、丙三组档案柜按格登记，一格一格写明容量，占用数翻柜子实时清点。</Typography>
        </Box>
        <Button variant="contained" size="large" onClick={() => setShowForm((current) => !current)} data-testid="new-slot">
          {showForm ? '收起登记' : '登记柜位'}
        </Button>
      </Box>

      {errorMessage && <Alert severity="warning">{errorMessage}</Alert>}

      {showForm && (
        <Card data-testid="form-slot" sx={{ borderColor: '#9eb096' }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h5" sx={{ mb: 2 }}>登记柜位</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="柜组" value={form.group} onChange={(event) => updateForm('group', event.target.value as CabinetGroup)} SelectProps={{ native: true, inputProps: { 'data-testid': 'field-slotGroup' } }}>
                  {CABINET_GROUPS.map((option) => <option key={option} value={option}>{option}柜</option>)}
                </TextField>
              </Grid>
              <Grid item xs={6} md={4}><TextField fullWidth type="number" label="格号" value={form.cellNo} onChange={(event) => updateForm('cellNo', Number(event.target.value))} inputProps={{ min: 1, max: 99, step: 1, 'data-testid': 'field-cellNo' }} /></Grid>
              <Grid item xs={6} md={4}><TextField fullWidth type="number" label="每格容量" value={form.capacity} onChange={(event) => updateForm('capacity', Number(event.target.value))} inputProps={{ min: 1, max: 50, step: 1, 'data-testid': 'field-capacity' }} InputProps={{ endAdornment: '张' }} /></Grid>
            </Grid>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              将登记为 {slotCode(form.group, Math.max(1, Math.floor(form.cellNo || 1)))}，一格放 {Math.max(1, Math.floor(form.capacity || 1))} 张样本。
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 2.5 }}>
              <Button onClick={() => setShowForm(false)}>取消</Button>
              <Button variant="contained" onClick={handleSubmit} disabled={submitting} data-testid="submit-slot">保存柜位</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <StatBadge label="柜位总数" value={slots.length} detail={`甲乙丙三组共 ${slots.length} 格`} />
        <StatBadge label="总容量" value={totalCapacity} detail="全部格位可放样本数" tone="bamboo" />
        <StatBadge label="已存样本" value={totalPlaced} detail={`剩余空位 ${totalCapacity - totalPlaced} 张`} tone="bamboo" />
        <StatBadge label="已满格位" value={fullCount} detail="放满的格子不可再选" tone={fullCount ? 'warning' : 'neutral'} />
      </Box>

      {CABINET_GROUPS.map((group) => {
        const groupSlots = slots.filter((slot) => slot.group === group)
        const groupPlaced = groupSlots.reduce((sum, slot) => sum + slotPlaced(slot, counts), 0)
        const groupCapacity = groupSlots.reduce((sum, slot) => sum + slot.capacity, 0)
        return (
          <Card key={group} data-testid={`group-${group}`}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 1.5 }}>
                <Box>
                  <Typography variant="h5">{group}柜</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    共 {groupSlots.length} 格，已放 {groupPlaced}/{groupCapacity} 张。
                  </Typography>
                </Box>
                <Chip label={`${groupPlaced}/${groupCapacity} 张`} color={groupPlaced >= groupCapacity && groupCapacity > 0 ? 'warning' : 'success'} variant="outlined" />
              </Box>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>柜位</TableCell>
                      <TableCell align="right">每格容量</TableCell>
                      <TableCell align="right">已放</TableCell>
                      <TableCell align="right">剩余</TableCell>
                      <TableCell>存放样本</TableCell>
                      <TableCell>状态</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groupSlots.map((slot) => {
                      const code = slotCode(slot.group, slot.cellNo)
                      const placed = slotPlaced(slot, counts)
                      const full = isSlotFull(slot, counts)
                      const sampleNos = samplesByBin.get(code) ?? []
                      return (
                        <TableRow key={slot.id ?? code} data-testid="row-slot" sx={full ? { bgcolor: '#fff3cd' } : undefined}>
                          <TableCell sx={{ fontWeight: 700 }}>{code}</TableCell>
                          <TableCell align="right">{slot.capacity} 张</TableCell>
                          <TableCell align="right">{placed} 张</TableCell>
                          <TableCell align="right">{slot.capacity - placed} 张</TableCell>
                          <TableCell>
                            {sampleNos.length > 0 ? (
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {sampleNos.map((no) => <Chip key={no} size="small" variant="outlined" label={no} />)}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">空</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {full ? <Chip size="small" color="warning" label="已满" data-testid="flag-full" /> : <Chip size="small" color="success" variant="outlined" label="可放" />}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {groupSlots.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>{group}柜尚未登记柜位</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        )
      })}
    </Stack>
  )
}
