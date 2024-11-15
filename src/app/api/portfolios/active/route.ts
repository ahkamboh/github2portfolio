import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function PUT(request: Request) {
  try {
    const { email, username } = await request.json()
    console.log('Updating active portfolio for:', { email, username })
    
    if (!email || !username) {
      return NextResponse.json(
        { error: "Email and username are required" },
        { status: 400 }
      )
    }

    const sql = neon(process.env.DATABASE_URL!)
    
    // First get the user_id from the users table
    const user = await sql`
      SELECT id FROM users WHERE email = ${email} LIMIT 1
    `

    if (!user || user.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const user_id = user[0].id

    // Set all portfolios inactive for this user
    await sql`
      UPDATE portfolios 
      SET is_active = false 
      WHERE user_id = ${user_id}
    `

    // Set the selected portfolio active
    const result = await sql`
      UPDATE portfolios 
      SET is_active = true
      WHERE user_id = ${user_id} 
      AND username = ${username}
      RETURNING id, user_id, username
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error updating active portfolio:', error)
    return NextResponse.json(
      { error: "Failed to update active portfolio", details: error },
      { status: 500 }
    )
  }
} 