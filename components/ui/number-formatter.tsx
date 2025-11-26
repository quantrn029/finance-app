"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

type NumberFormatMode = 'full' | 'compact'

interface NumberFormatterContextType {
    mode: NumberFormatMode
    toggleMode: () => void
    formatCurrency: (value: number) => string
}

const NumberFormatterContext = createContext<NumberFormatterContextType | undefined>(undefined)

export function NumberFormatterProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<NumberFormatMode>('full')

    // Load preference from localStorage
    useEffect(() => {
        const savedMode = localStorage.getItem('numberFormatMode') as NumberFormatMode
        if (savedMode) setMode(savedMode)
    }, [])

    const toggleMode = () => {
        const newMode = mode === 'full' ? 'compact' : 'full'
        setMode(newMode)
        localStorage.setItem('numberFormatMode', newMode)
    }

    const formatCurrency = (value: number) => {
        if (mode === 'compact') {
            if (value >= 1_000_000_000) {
                return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1_000_000_000) + ' Tỷ'
            }
            if (value >= 1_000_000) {
                return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1_000_000) + ' Tr'
            }
            if (value >= 1_000) {
                return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value / 1_000) + ' k'
            }
        }

        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
    }

    return (
        <NumberFormatterContext.Provider value={{ mode, toggleMode, formatCurrency }}>
            {children}
        </NumberFormatterContext.Provider>
    )
}

export function useNumberFormatter() {
    const context = useContext(NumberFormatterContext)
    if (context === undefined) {
        throw new Error('useNumberFormatter must be used within a NumberFormatterProvider')
    }
    return context
}
