"use client"

import { useState, useEffect } from "react"
import { X, ChevronRight, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Step {
    target: string // CSS selector
    title: string
    content: string
    position: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

const TOUR_STEPS: Step[] = [
    {
        target: 'body',
        title: "Chào mừng bạn! 👋",
        content: "Hệ thống quản lý tài chính & kinh doanh dành riêng cho Seller. Hãy cùng điểm qua các tính năng chính nhé!",
        position: 'center'
    },
    {
        target: 'a[href="/finance"]',
        title: "Bảng điều khiển (Dashboard)",
        content: "Xem tổng quan Doanh thu, Lợi nhuận, Cashflow và các chỉ số sức khỏe tài chính (CIR, ROI).",
        position: 'right'
    },
    {
        target: 'a[href="/orders"]',
        title: "Quản lý Đơn hàng",
        content: "Theo dõi đơn hàng từ tất cả các kênh (Shopee, TikTok). Tự động tính toán phí sàn và lợi nhuận thực.",
        position: 'right'
    },
    {
        target: 'a[href="/pricing"]',
        title: "Tính giá bán thông minh",
        content: "Công cụ mô phỏng giá bán, tính toán điểm hòa vốn và so sánh giá với thị trường.",
        position: 'right'
    },
    {
        target: 'a[href="/goals"]',
        title: "Mục tiêu (Goals)",
        content: "Đặt mục tiêu doanh thu/lợi nhuận theo tháng và theo dõi tiến độ thực tế hàng ngày.",
        position: 'right'
    }
]

export function OnboardingTour() {
    const [currentStep, setCurrentStep] = useState(0)
    const [isVisible, setIsVisible] = useState(false)
    const [position, setPosition] = useState({ top: 0, left: 0 })

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('hasSeenTour')
        if (!hasSeenTour) {
            setIsVisible(true)
        }
    }, [])

    useEffect(() => {
        if (!isVisible) return

        const step = TOUR_STEPS[currentStep]
        if (step.target === 'body') {
            setPosition({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 200 })
            return
        }

        const element = document.querySelector(step.target)
        if (element) {
            const rect = element.getBoundingClientRect()
            // Simple positioning logic (can be improved with libraries like floating-ui)
            let top = rect.top
            let left = rect.left + rect.width + 20 // Default right

            if (step.position === 'bottom') {
                top = rect.bottom + 20
                left = rect.left
            }

            setPosition({ top, left })

            // Highlight effect
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            element.classList.add('ring-4', 'ring-blue-400', 'ring-opacity-50', 'z-50', 'relative')

            return () => {
                element.classList.remove('ring-4', 'ring-blue-400', 'ring-opacity-50', 'z-50', 'relative')
            }
        }
    }, [currentStep, isVisible])

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            handleClose()
        }
    }

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleClose = () => {
        setIsVisible(false)
        localStorage.setItem('hasSeenTour', 'true')
    }

    if (!isVisible) return null

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" />

            {/* Tour Card */}
            <div
                className="fixed z-50 bg-white p-6 rounded-xl shadow-2xl w-[400px] transition-all duration-300 border border-gray-100"
                style={{ top: position.top, left: position.left }}
            >
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{TOUR_STEPS[currentStep].title}</h3>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <p className="text-gray-600 mb-6 leading-relaxed">
                    {TOUR_STEPS[currentStep].content}
                </p>

                <div className="flex justify-between items-center">
                    <div className="flex gap-1">
                        {TOUR_STEPS.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 w-1.5 rounded-full ${idx === currentStep ? 'bg-blue-600 w-4' : 'bg-gray-200'} transition-all`}
                            />
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {currentStep > 0 && (
                            <Button variant="outline" size="sm" onClick={handlePrev}>
                                <ChevronLeft className="h-4 w-4" /> Trước
                            </Button>
                        )}
                        <Button size="sm" onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
                            {currentStep === TOUR_STEPS.length - 1 ? 'Bắt đầu ngay' : 'Tiếp theo'} <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>
        </>
    )
}
