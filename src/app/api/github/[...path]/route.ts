import { NextResponse } from "next/server";

// Server-side proxy for the public GitHub data the portfolio pages show.
// GITHUB_TOKEN stays on the server; the browser only ever calls /api/github/*.

const GITHUB_API = "https://api.github.com";
const NAME = /^[A-Za-z0-9._-]+$/;

const ALLOWED: RegExp[] = [
    /^users\/[^/]+$/,
    /^users\/[^/]+\/(repos|followers|following)$/,
    /^repos\/[^/]+\/[^/]+\/readme$/,
    /^repos\/[^/]+\/[^/]+\/contents(\/.*)?$/,
];

const CONTRIBUTIONS_QUERY = `
  query($username: String!) {
    user(login: $username) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
            }
          }
        }
      }
    }
  }
`;

function githubHeaders(accept?: string | null): HeadersInit {
    const headers: Record<string, string> = {
        Accept: accept && accept.startsWith("application/vnd.github") ? accept : "application/vnd.github.v3+json",
    };
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    return headers;
}

// Never let the token read a private repository through this proxy.
async function isPublicRepo(owner: string, repo: string) {
    const res = await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
        headers: githubHeaders(),
        next: { revalidate: 3600 },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.private === false;
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;

    if (path.some((segment) => segment === "." || segment === ".." || segment === "")) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // GET /api/github/contributions/:username -> contribution calendar (GraphQL needs a token)
    if (path[0] === "contributions" && path.length === 2 && NAME.test(path[1])) {
        const res = await fetch(`${GITHUB_API}/graphql`, {
            method: "POST",
            headers: { ...githubHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ query: CONTRIBUTIONS_QUERY, variables: { username: path[1] } }),
        });
        return NextResponse.json(await res.json(), { status: res.status });
    }

    const joined = path.join("/");
    if (!ALLOWED.some((pattern) => pattern.test(joined)) || !NAME.test(path[1])) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (path[0] === "repos" && !(NAME.test(path[2]) && (await isPublicRepo(path[1], path[2])))) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { search } = new URL(request.url);
    const upstream = await fetch(`${GITHUB_API}/${path.map(encodeURIComponent).join("/")}${search}`, {
        headers: githubHeaders(request.headers.get("accept")),
        cache: "no-store",
    });

    return new Response(upstream.body, {
        status: upstream.status,
        headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
    });
}
