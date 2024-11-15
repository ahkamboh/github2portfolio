'use client'

import { useEffect, useState } from 'react'

interface ContributionDay {
  contributionCount: number
  date: string
}

interface ContributionData {
  totalContributions: number
  weeks: {
    contributionDays: ContributionDay[]
  }[]
}

export default function GitHubContributions({ username }: { username: string }) {
  const [contributionData, setContributionData] = useState<ContributionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchContributions = async () => {
      try {
        const query = `
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
        `

        const response = await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            variables: { username },
          }),
        })

        const data = await response.json()
        
        if (data.errors) {
          throw new Error(data.errors[0].message)
        }

        setContributionData(data.data.user.contributionsCollection.contributionCalendar)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch contributions')
        setLoading(false)
      }
    }

    fetchContributions()
  }, [username])

  const getContributionColor = (count: number) => {
    if (count === 0) return 'bg-[#1c2e4a]'
    if (count === 1) return 'bg-[#0e4429]'
    if (count === 2) return 'bg-[#006d32]'
    if (count === 3) return 'bg-[#26a641]'
    return 'bg-[#39d353]'
  }

  if (loading) return <div>Loading contributions...</div>
  if (error) return <div>Error: {error}</div>
  if (!contributionData) return <div>No contribution data found</div>

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        {contributionData.totalContributions} contributions in the last year
      </h2>
      <div className="grid grid-cols-51 gap-1">
        {contributionData.weeks.flatMap(week =>
          week.contributionDays.map((day, index) => (
            <div
              key={day.date}
              className={`w-3 h-3 rounded-sm ${getContributionColor(day.contributionCount)}`}
              title={`${day.contributionCount} contributions on ${new Date(day.date).toDateString()}`}
            />
          ))
        )}
      </div>
      <div className="flex items-center justify-end text-sm text-gray-400 space-x-2">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-[#1c2e4a]" />
          <div className="w-3 h-3 rounded-sm bg-[#0e4429]" />
          <div className="w-3 h-3 rounded-sm bg-[#006d32]" />
          <div className="w-3 h-3 rounded-sm bg-[#26a641]" />
          <div className="w-3 h-3 rounded-sm bg-[#39d353]" />
        </div>
        <span>More</span>
      </div>
    </div>
  )
}