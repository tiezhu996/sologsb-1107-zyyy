import { create } from 'zustand'
import type { PaperSample, PaperSampleInput } from '../types/paper-sample'
import { parseSlotCode, slotCode } from '../utils/cabinet'
import { db, plain } from '../utils/db'

async function findSlotByCode(code: string) {
  const parsed = parseSlotCode(code)
  if (!parsed) return null
  const slot = await db.cabinetSlots.where('[group+cellNo]').equals([parsed.group, parsed.cellNo]).first()
  return slot ?? null
}

async function placedInSlot(code: string, excludeId?: number): Promise<number> {
  return db.paperSamples
    .where('archiveBin')
    .equals(code)
    .filter((sample) => sample.id !== excludeId)
    .count()
}

interface SampleStore {
  paperSamples: PaperSample[]
  isLoading: boolean
  loaded: boolean
  error: string | null
  loadSamples: () => Promise<void>
  addSample: (input: PaperSampleInput) => Promise<PaperSample | null>
  transferSample: (id: number, nextBin: string) => Promise<boolean>
}

export const useSampleStore = create<SampleStore>((set, get) => ({
  paperSamples: [],
  isLoading: false,
  loaded: false,
  error: null,
  loadSamples: async () => {
    if (get().loaded) return
    set({ isLoading: true, error: null })
    try {
      const paperSamples = await db.paperSamples.orderBy('sampleNo').toArray()
      set({ paperSamples, isLoading: false, loaded: true })
    } catch {
      set({ isLoading: false, error: '样本档案读取失败，请检查浏览器存储权限' })
    }
  },
  addSample: async (input) => {
    set({ error: null })
    const slot = await findSlotByCode(input.archiveBin)
    if (!slot) {
      set({ error: `存档位 ${input.archiveBin} 不在柜位台账中，请先在柜位台账登记` })
      return null
    }
    const code = slotCode(slot.group, slot.cellNo)
    const placed = await placedInSlot(code)
    if (placed >= slot.capacity) {
      set({ error: `${code} 已放满 ${slot.capacity} 张，请改选还有空位的柜位` })
      return null
    }
    try {
      const payload = plain({ ...input, archiveBin: code })
      const id = Number(await db.paperSamples.add(payload))
      const created: PaperSample = { ...payload, id, schemaRev: 3 }
      set((state) => ({ paperSamples: [created, ...state.paperSamples] }))
      return created
    } catch {
      set({ error: '样本登记失败，请检查样本编号是否重复' })
      return null
    }
  },
  transferSample: async (id, nextBin) => {
    set({ error: null })
    const sample = get().paperSamples.find((item) => item.id === id)
    if (!sample) {
      set({ error: '未找到要调拨的样本' })
      return false
    }
    if (sample.archiveBin === nextBin) return true
    const slot = await findSlotByCode(nextBin)
    if (!slot) {
      set({ error: `目标柜位 ${nextBin} 不在柜位台账中` })
      return false
    }
    const code = slotCode(slot.group, slot.cellNo)
    const placed = await placedInSlot(code, id)
    if (placed >= slot.capacity) {
      set({ error: `${code} 已放满 ${slot.capacity} 张，调拨未执行` })
      return false
    }
    try {
      await db.paperSamples.update(id, { archiveBin: code, schemaRev: 3 })
      set((state) => ({
        paperSamples: state.paperSamples.map((item) => (item.id === id ? { ...item, archiveBin: code, schemaRev: 3 } : item)),
        error: null,
      }))
      return true
    } catch {
      set({ error: '样本调拨失败，请稍后重试' })
      return false
    }
  },
}))
