// Debug cascade response

async function debugCascade() {
    console.log('🔍 Debug: Creating Year 2025...\n')

    const res = await fetch('http://localhost:3000/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            period: '2026',  // Use 2026 to avoid conflicts
            type: 'yearly',
            revenueTarget: 10000000000,
            profitTarget: 3000000000,
            ordersTarget: 50000
        })
    })

    const data = await res.json()
    console.log('Full response:')
    console.log(JSON.stringify(data, null, 2))
}

debugCascade().catch(console.error)
