'use client'

import { createContext, useContext } from 'react'

interface MobileMenuContextType {
  openMobileMenu: () => void
}

export const MobileMenuContext = createContext<MobileMenuContextType | null>(null)

export function useMobileMenu() {
  return useContext(MobileMenuContext)
}
