import { ProductsClient } from "@/components/products/ProductsClient"

export const dynamic = 'force-dynamic'

async function getProductsData() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    try {
        const res = await fetch(`${baseUrl}/api/products/analytics?period=all`, {
            cache: 'no-store'
        })

        if (!res.ok) {
            throw new Error('Failed to fetch products data')
        }

        return await res.json()
    } catch (error) {
        console.error('Server-side products fetch error:', error)
        return { products: [], globalMetrics: null }
    }
}

export default async function ProductsPage() {
    const data = await getProductsData()

    return (
        <ProductsClient
            initialProducts={data.products || []}
            initialGlobalMetrics={data.globalMetrics || null}
        />
    )
}
