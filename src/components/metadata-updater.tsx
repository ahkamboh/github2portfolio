'use client'

import { useEffect } from 'react'

interface MetadataUpdaterProps {
  username: string
}

export function MetadataUpdater({ username }: MetadataUpdaterProps) {
  const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN

  useEffect(() => {
    async function fetchUserData() {
      try {
        const headers: HeadersInit = {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${GITHUB_TOKEN}`
        }

        const response = await fetch(`https://api.github.com/users/${username}`, {
          headers
        })
        const data = await response.json()
        
        // Update metadata dynamically
        document.title = data.name
        const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement
        if (favicon) {
          favicon.href = data.avatar_url
        } else {
          const newFavicon = document.createElement('link')
          newFavicon.rel = 'icon'
          newFavicon.href = data.avatar_url
          document.head.appendChild(newFavicon)
        }

        // Update meta tags
        updateMetaTags(data)
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    fetchUserData()
  }, [username])

  return null
}

function updateMetaTags(data: any) {
  const metaTags = {
    'description': data.bio,
    'og:title': data.name,
    'og:description': data.bio,
    'og:image': data.avatar_url,
    'twitter:card': 'summary',
    'twitter:title': data.name,
    'twitter:description': data.bio,
    'twitter:image': data.avatar_url
  }

  Object.entries(metaTags).forEach(([name, content]) => {
    let meta = document.querySelector(`meta[name='${name}']`) ||
               document.querySelector(`meta[property='${name}']`)
    
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute(name.startsWith('og:') ? 'property' : 'name', name)
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', content)
  })
} 