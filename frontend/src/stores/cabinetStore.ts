import { create } from 'zustand'
import { cabinetLabel, type CabinetSlot, type CabinetSlotInput } from '../types/cabinet-slot'
import type { PaperSample } from '../types/paper-sample'
import { db, plain } from '../utils/db'

export interface SlotUsage {
  slot: CabinetSlot
  used: number
  remaining: number
  full: boolean
}

export function buildSlotUsage(slots: CabinetSlot[], samples: PaperSample[]): SlotUsage[] {
  return slots.map((slot) => {
    const used = samples.filter((sample) => sample.archiveBin === slot.label).length
    return { slot, used, remaining: Math.max(slot.capacity - used, 0), full: used >= slot.capacity }
  })
}

interface CabinetStore {
  cabinetSlots: CabinetSlot[]
  isLoading: boolean
  loaded: boolean
  error: string | null
  loadSlots: () => Promise<void>
  addSlot: (input: CabinetSlotInput) => Promise<CabinetSlot | null>
}

export const useCabinetStore = create<CabinetStore>((set, get) => ({
  cabinetSlots: [],
  isLoading: false,
  loaded: false,
  error: null,
  loadSlots: async () => {
    if (get().loaded) return
    set({ isLoading: true, error: null })
    try {
      const cabinetSlots = await db.cabinetSlots.orderBy('label').toArray()
      set({ cabinetSlots, isLoading: false, loaded: true })
    } catch {
      set({ isLoading: false, error: '柜位台账读取失败，请检查浏览器存储权限' })
    }
  },
  addSlot: async (input) => {
    set({ error: null })
    try {
      const payload = plain({ ...input, label: cabinetLabel(input.group, input.slotNo) })
      const id = Number(await db.cabinetSlots.add(payload))
      const created: CabinetSlot = { ...payload, id, schemaRev: 3 }
      set((state) => ({
        cabinetSlots: [...state.cabinetSlots, created].sort((a, b) => a.label.localeCompare(b.label)),
      }))
      return created
    } catch {
      set({ error: '柜位登记失败，该柜组格号可能已在台账中' })
      return null
    }
  },
}))
