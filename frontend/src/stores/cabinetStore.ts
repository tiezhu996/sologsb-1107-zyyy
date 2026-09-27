import { create } from 'zustand'
import type { CabinetSlot, CabinetSlotInput } from '../types/cabinet-slot'
import { slotCode, sortSlots } from '../utils/cabinet'
import { db, plain } from '../utils/db'

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
      const cabinetSlots = sortSlots(await db.cabinetSlots.toArray())
      set({ cabinetSlots, isLoading: false, loaded: true })
    } catch {
      set({ isLoading: false, error: '柜位台账读取失败，请检查浏览器存储权限' })
    }
  },
  addSlot: async (input) => {
    set({ error: null })
    if (input.cellNo < 1 || input.capacity < 1) {
      set({ error: '格号与每格容量都不得小于 1' })
      return null
    }
    try {
      const payload = plain(input)
      const id = Number(await db.cabinetSlots.add(payload))
      const created: CabinetSlot = { ...payload, id, schemaRev: 3 }
      set((state) => ({ cabinetSlots: sortSlots([...state.cabinetSlots, created]) }))
      return created
    } catch {
      set({ error: `柜位登记失败，${slotCode(input.group, input.cellNo)} 可能已在台账中` })
      return null
    }
  },
}))
