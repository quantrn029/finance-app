import { NextResponse } from 'next/server'

export async function POST() {
    try {
        // In a real production environment with PM2 or Docker, 
        // exiting the process will trigger a restart.
        // For local dev (next dev), it kills the server.

        // We'll use a slight delay to allow the response to be sent back to the client
        setTimeout(() => {
            process.exit(0)
        }, 1000)

        return NextResponse.json({ success: true, message: "Server restarting..." })
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to restart server" },
            { status: 500 }
        )
    }
}
