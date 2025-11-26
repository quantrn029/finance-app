import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// Seasonality weights for Vietnam market
const SEASONALITY_WEIGHTS: Record<number, number> = {
    1: 1.3, 2: 0.6, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0,
    7: 1.0, 8: 1.0, 9: 1.1, 10: 1.2, 11: 1.4, 12: 1.5
}

// Calculate quarter weight
function getQuarterWeight(quarter: number): number {
    const startMonth = (quarter - 1) * 3 + 1
    let total = 0
    for (let i = 0; i < 3; i++) {
        total += SEASONALITY_WEIGHTS[startMonth + i] || 1.0
    }
    return total
}

// Check if goal should skip cascade (manually edited)
async function shouldSkipCascade(period: string, type: string): Promise<boolean> {
    const existing = await prisma.goal.findFirst({
        where: { period, type }
    })
    return existing?.manuallyEdited || false
}

// Cascade Year → Quarters → Months
async function cascadeYearGoal(yearGoal: any) {
    const year = yearGoal.period
    const cascadedGoals: any[] = []

    const yearWeight = Object.values(SEASONALITY_WEIGHTS).reduce((a, b) => a + b, 0)

    for (let q = 1; q <= 4; q++) {
        const quarterWeight = getQuarterWeight(q)
        const ratio = quarterWeight / yearWeight
        const quarterPeriod = `${year}-Q${q}`

        // Skip if manually edited
        if (await shouldSkipCascade(quarterPeriod, 'quarterly')) {
            console.log(`Skipping ${quarterPeriod} (manually edited)`)
            continue
        }

        const quarterGoal = await prisma.goal.upsert({
            where: {
                period_type: { period: quarterPeriod, type: 'quarterly' }
            },
            update: {
                revenueTarget: yearGoal.revenueTarget * ratio,
                profitTarget: yearGoal.profitTarget * ratio,
                ordersTarget: Math.round(yearGoal.ordersTarget * ratio),
                parentGoalId: yearGoal.id
            },
            create: {
                period: quarterPeriod,
                type: 'quarterly',
                revenueTarget: yearGoal.revenueTarget * ratio,
                profitTarget: yearGoal.profitTarget * ratio,
                ordersTarget: Math.round(yearGoal.ordersTarget * ratio),
                parentGoalId: yearGoal.id,
                manuallyEdited: false
            }
        })

        cascadedGoals.push(quarterGoal)

        // Cascade quarter to months
        const monthGoals = await cascadeQuarterGoal(quarterGoal)
        cascadedGoals.push(...monthGoals)
    }

    return cascadedGoals
}

// Cascade Quarter → Months
async function cascadeQuarterGoal(quarterGoal: any) {
    const [year, quarterStr] = quarterGoal.period.split('-Q')
    const quarter = parseInt(quarterStr)
    const startMonth = (quarter - 1) * 3 + 1
    const cascadedGoals: any[] = []

    const quarterWeight = getQuarterWeight(quarter)

    for (let i = 0; i < 3; i++) {
        const month = startMonth + i
        const monthWeight = SEASONALITY_WEIGHTS[month] || 1.0
        const ratio = monthWeight / quarterWeight
        const monthKey = `${year}-${String(month).padStart(2, '0')}`

        // Skip if manually edited
        if (await shouldSkipCascade(monthKey, 'monthly')) {
            console.log(`Skipping ${monthKey} (manually edited)`)
            continue
        }

        const monthGoal = await prisma.goal.upsert({
            where: {
                period_type: { period: monthKey, type: 'monthly' }
            },
            update: {
                revenueTarget: quarterGoal.revenueTarget * ratio,
                profitTarget: quarterGoal.profitTarget * ratio,
                ordersTarget: Math.round(quarterGoal.ordersTarget * ratio),
                parentGoalId: quarterGoal.id
            },
            create: {
                period: monthKey,
                type: 'monthly',
                revenueTarget: quarterGoal.revenueTarget * ratio,
                profitTarget: quarterGoal.profitTarget * ratio,
                ordersTarget: Math.round(quarterGoal.ordersTarget * ratio),
                parentGoalId: quarterGoal.id,
                manuallyEdited: false
            }
        })

        cascadedGoals.push(monthGoal)
    }

    return cascadedGoals
}

// GET: Fetch goals
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type')

        const goals = await prisma.goal.findMany({
            where: type ? { type } : {},
            orderBy: { createdAt: 'desc' },
            include: { details: true } // Include details
        })

        return NextResponse.json({ goals })
    } catch (error: any) {
        console.error('GET /api/goals error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST: Create/Update goal with auto-cascade
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { period, type, revenueTarget, profitTarget, ordersTarget, manuallyEdited, details } = body

        if (!period || !type) {
            return NextResponse.json(
                { error: 'Missing required fields: period, type' },
                { status: 400 }
            )
        }

        // Upsert the goal
        const goal = await prisma.goal.upsert({
            where: {
                period_type: { period, type }
            },
            update: {
                revenueTarget,
                profitTarget,
                ordersTarget,
                manuallyEdited: manuallyEdited !== undefined ? manuallyEdited : true
            },
            create: {
                period,
                type,
                revenueTarget,
                profitTarget,
                ordersTarget,
                manuallyEdited: manuallyEdited !== undefined ? manuallyEdited : false
            }
        })

        // Handle Goal Details (Channel Targets)
        if (details && Array.isArray(details)) {
            for (const detail of details) {
                await prisma.goalDetail.upsert({
                    where: {
                        goalId_platform: {
                            goalId: goal.id,
                            platform: detail.platform
                        }
                    },
                    update: {
                        revenueTarget: detail.revenueTarget,
                        profitTarget: detail.profitTarget,
                        ordersTarget: detail.ordersTarget
                    },
                    create: {
                        goalId: goal.id,
                        platform: detail.platform,
                        revenueTarget: detail.revenueTarget,
                        profitTarget: detail.profitTarget,
                        ordersTarget: detail.ordersTarget
                    }
                })
            }
        }

        // Auto-cascade based on type (only if not manually edited)
        let cascadedGoals: any[] = []

        if (!manuallyEdited) {
            if (type === 'yearly') {
                cascadedGoals = await cascadeYearGoal(goal)
            } else if (type === 'quarterly') {
                cascadedGoals = await cascadeQuarterGoal(goal)
            }
        }

        // Check for affected manually edited goals
        const affectedGoals = await prisma.goal.findMany({
            where: {
                parentGoalId: goal.id,
                manuallyEdited: true
            }
        })

        return NextResponse.json({
            goal,
            cascaded: cascadedGoals.length,
            cascadedGoals: cascadedGoals.map(g => ({ period: g.period, type: g.type })),
            affectedManualGoals: affectedGoals.length > 0 ? affectedGoals : undefined
        })
    } catch (error: any) {
        console.error('POST /api/goals error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE: Remove a goal
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Missing goal ID' }, { status: 400 })
        }

        await prisma.goal.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('DELETE /api/goals error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
