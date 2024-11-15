"use client"
import { notFound } from 'next/navigation'
import { GithubRepositories } from '@/components/github-repositories'
import { MetadataUpdater } from '@/components/metadata-updater'
import { useParams } from 'next/navigation'

export default function UserPage() {
  const params = useParams()
  const username = params?.username as string
  
  if (!username) {
    return notFound()
  }

  return (
    <>
      <MetadataUpdater username={username} />
      <GithubRepositories username={username} />
    </>
  )
}