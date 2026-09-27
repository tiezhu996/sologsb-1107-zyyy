import { create } from 'zustand'
import type { PaperSample, PaperSampleInput } from '../types/paper-sample'
import { db, plain } from '../utils/db'

interface SampleStore {
  paperSamples: PaperSample[]
  isLoading: boolean
  loaded: boolean
  error: string | null
  loadSamples: () => Promise<void>
  addSample: (input: PaperSampleInput) => Promise<PaperSample | null>
  transferSample: (id: number, targetBin: string) => Promise<boolean>
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
    const slot = await db.cabinetSlots.where('label').equals(input.archiveBin).first()
    if (!slot) {
      set({ error: '所选存档位不在柜位台账中，请先从还有空位的柜位里挑选' })
      return null
    }
    const used = get().paperSamples.filter((sample) => sample.archiveBin === slot.label).length
    if (used >= slot.capacity) {
      set({ error: `${slot.label} 已放满 ${slot.capacity} 张，请另选柜位` })
      return null
    }
    try {
      const payload = plain(input)
      const id = Number(await db.paperSamples.add(payload))
      const created: PaperSample = { ...payload, id, schemaRev: 3 }
      set((state) => ({ paperSamples: [created, ...state.paperSamples] }))
      return created
    } catch {
      set({ error: '样本登记失败，请检查样本编号是否重复' })
      return null
    }
  },
  transferSample: async (id, targetBin) => {
    set({ error: null })
    const sample = get().paperSamples.find((item) => item.id === id)
    if (!sample) {
      set({ error: '样本不存在，无法调拨' })
      return false
    }
    if (sample.archiveBin === targetBin) return true
    const slot = await db.cabinetSlots.where('label').equals(targetBin).first()
    if (!slot) {
      set({ error: '目标柜位不在柜位台账中' })
      return false
    }
    const used = get().paperSamples.filter((item) => item.archiveBin === targetBin).length
    if (used >= slot.capacity) {
      set({ error: `${slot.label} 已放满 ${slot.capacity} 张，无法调入` })
      return false
    }
    try {
      await db.paperSamples.update(id, { archiveBin: targetBin, schemaRev: 3 })
      set((state) => ({
        paperSamples: state.paperSamples.map((item) => (item.id === id ? { ...item, archiveBin: targetBin, schemaRev: 3 } : item)),
      }))
      return true
    } catch {
      set({ error: '样本调拨失败，请稍后重试' })
      return false
    }
  },
}))
