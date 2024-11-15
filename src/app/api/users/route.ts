import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Database connection helper
function getDB() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not defined');
    }
    return neon(process.env.DATABASE_URL);
}

// GET - Fetch users
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const email = searchParams.get('email')
        const sql = getDB()

        // If email is provided, fetch specific user
        if (email) {
            console.log('Searching for user with email:', email) // Debug log
            const user = await sql`
                SELECT * FROM users 
                WHERE email = ${email}
                LIMIT 1
            `
            console.log('Found user:', user) // Debug log
            return NextResponse.json(user)
        }

        // Otherwise fetch all users
        const users = await sql`SELECT * FROM users`
        return NextResponse.json(users)
    } catch (error) {
        console.error('Error fetching users:', error)
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        )
    }
}

// POST - Create new user
export async function POST(request: Request) {
    try {
        const { username, email, name } = await request.json();
        
        if (!username || !email || !name) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const sql = getDB();
        const user = await sql`
            INSERT INTO users (username, email, name)
            VALUES (${username}, ${email}, ${name})
            RETURNING *
        `;
        
        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to create user" },
            { status: 500 }
        );
    }
}

// PUT - Update user
export async function PUT(request: Request) {
    try {
        const { id, username, email, name } = await request.json();
        
        if (!id) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        const sql = getDB();
        const user = await sql`
            UPDATE users 
            SET 
                username = COALESCE(${username}, username),
                email = COALESCE(${email}, email),
                name = COALESCE(${name}, name)
            WHERE id = ${id}
            RETURNING *
        `;

        if (user.length === 0) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(user[0]);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to update user" },
            { status: 500 }
        );
    }
}

// DELETE - Delete user
export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        
        if (!id) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        const sql = getDB();
        const user = await sql`
            DELETE FROM users 
            WHERE id = ${id}
            RETURNING *
        `;

        if (user.length === 0) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(user[0]);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to delete user" },
            { status: 500 }
        );
    }
}
