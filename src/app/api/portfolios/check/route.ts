import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Authorization check middleware
// Calls from this app's own pages are same-origin (the browser sets Sec-Fetch-Site,
// and middleware.ts already requires the session cookie). They send no key: anything
// shipped to the browser is public. Other callers still need the server-only API_SECRET_KEY.
const checkAuth = (request: Request) => {
  if (request.headers.get('sec-fetch-site') === 'same-origin') {
    return true;
  }
  const authHeader = request.headers.get('Authorization');
  if (!process.env.API_SECRET_KEY || !authHeader || authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
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

// GET - Check if a username exists in the portfolios table
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
        const username = searchParams.get('username');
        
        if (!username) {
            return NextResponse.json(
                { error: "Username parameter is required" },
                { status: 400 }
            );
        }
        
        const sql = getDB();
        
        // Check if the username exists in the portfolios table
        const result = await sql`
            SELECT COUNT(*) as count
            FROM portfolios
            WHERE username = ${username}
        `;
        
        const exists = result[0].count > 0;
        
        return NextResponse.json({ exists });
    } catch (error) {
        console.error("Error checking username:", error);
        return NextResponse.json(
            { error: "Failed to check username" },
            { status: 500 }
        );
    }
} 