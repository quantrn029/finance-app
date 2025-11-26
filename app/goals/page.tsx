import { GoalsClient } from "@/components/goals/GoalsClient"

export const dynamic = 'force-dynamic'

async function getGoals() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    try {
        const res = await fetch(`${baseUrl}/api/goals`, {
            cache: 'no-store'
        })

        if (!res.ok) {
            throw new Error('Failed to fetch goals')
        }

        const data = await res.json()
        return data.goals || []
    } catch (error) {
        console.error('Server-side goals fetch error:', error)
        return []
    }
}

export default async function GoalsPage() {
    const initialGoals = await getGoals()

    return (
        <GoalsClient initialGoals={initialGoals} />
    )
}
