import { create } from "zustand";

type WoredaHibretDetailHeaderState = {
  detailTitle: string | null;
  setDetailTitle: (title: string | null) => void;
};

export const useWoredaHibretDetailHeaderStore = create<WoredaHibretDetailHeaderState>((set) => ({
  detailTitle: null,
  setDetailTitle: (title) => set({ detailTitle: title }),
}));
