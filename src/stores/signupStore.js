import { create } from "zustand";
import { persist } from "zustand/middleware";

const useSignupStore = create(
  persist(
    (set) => ({
      currentStep: 0,
      formData: {},
      error: null,
      setCurrentStep: (step) => set({ currentStep: step }),
      setFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),
      setError: (error) => set({ error }),
      reset: () =>
        set({
          currentStep: 0,
          formData: {},
          error: null,
        }),
    }),
    {
      name: "signup-storage",
      partialize: (state) => ({
        currentStep: state.currentStep,
        formData: state.formData,
      }),
    }
  )
);

export default useSignupStore;
