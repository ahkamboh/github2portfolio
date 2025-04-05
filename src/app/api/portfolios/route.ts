import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Authorization check middleware
const checkAuth = (request: Request) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
    return false;
  }
  return true;
};

// Reuse the DB connection helper
function getDB() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not defined');
    }
    return neon(process.env.DATABASE_URL);
}

// GET - Fetch all portfolios or filter by email
export async function GET(request: Request) {
    // Add authorization check
    if (!checkAuth(request)) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');
        
        const sql = getDB();
        let portfolios;
        
        if (email) {
            portfolios = await sql`
                SELECT p.*, u.email 
                FROM portfolios p
                JOIN users u ON p.user_id = u.id
                WHERE u.email = ${email}
            `;
        } else {
            portfolios = await sql`
                SELECT p.*, u.email 
                FROM portfolios p
                JOIN users u ON p.user_id = u.id
            `;
        }
        
        return NextResponse.json(portfolios);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch portfolios" },
            { status: 500 }
        );
    }
}

// POST - Create new portfolio
export async function POST(request: Request) {
    // Add authorization check
    if (!checkAuth(request)) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const { email, username, url } = await request.json();
        
        if (!email || !username || !url) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const sql = getDB();
        
        // First, get the user_id from email
        const users = await sql`
            SELECT id FROM users WHERE email = ${email}
        `;
        
        if (users.length === 0) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }
        
        const userId = users[0].id;
        
        // Create the portfolio
        const portfolio = await sql`
            INSERT INTO portfolios (user_id, username, url, created_at)
            VALUES (${userId}, ${username}, ${url}, NOW())
            RETURNING *
        `;
        
        return NextResponse.json(portfolio[0], { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to create portfolio" },
            { status: 500 }
        );
    }
}

// Add DELETE method to your portfolios API
export async function DELETE(request: Request) {
    // Add authorization check
    if (!checkAuth(request)) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const { searchParams } = new URL(request.url)
        const username = searchParams.get('username')
        const email = searchParams.get('email')

        if (!username || !email) {
            return NextResponse.json(
                { error: "Username and email are required" },
                { status: 400 }
            )
        }

        const sql = neon(process.env.DATABASE_URL!)
        
        // Get user_id first
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

        // Delete the portfolio
        const result = await sql`
            DELETE FROM portfolios 
            WHERE user_id = ${user_id} 
            AND username = ${username}
            RETURNING *
        `

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Portfolio not found" },
                { status: 404 }
            )
        }

        return NextResponse.json(result[0], { status: 200 })
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to delete portfolio" },
            { status: 500 }
        )
    }
    
} 