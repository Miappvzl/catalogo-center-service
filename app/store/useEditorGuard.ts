import { create } from 'zustand'

interface EditorGuardState {
  isDirty: boolean
  setDirty: (value: boolean) => void
}

export const useEditorGuard = create<EditorGuardState>((set) => ({
  isDirty: false,
  setDirty: (value) => set({ isDirty: value }),
}))