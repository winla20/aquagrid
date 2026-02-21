import { create } from 'zustand';

export const useStore = create((set) => ({
  counties: null,
  dataCenters: null,
  proposalLocation: null,
  simulationResult: null,
  isLoading: false,
  error: null,
  toast: null,

  setCounties: (counties) => set({ counties }),
  setDataCenters: (dataCenters) => set({ dataCenters }),

  setProposalLocation: (location) =>
    set({ proposalLocation: location, simulationResult: null, error: null }),

  setSimulationResult: (result) =>
    set({ simulationResult: result, isLoading: false }),

  setIsLoading: (v) => set({ isLoading: v }),
  setError: (error) => set({ error, isLoading: false }),
  setToast: (toast) => set({ toast }),

  reset: () =>
    set({ proposalLocation: null, simulationResult: null, error: null }),
}));
