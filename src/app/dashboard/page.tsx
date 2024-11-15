'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardComponent } from '@/components/dashboard'

export default function DashboardPage() {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Check authentication
    const currentUser = window?.sessionStorage?.getItem('currentUser') || 
                       window?.localStorage?.getItem('currentUser')
    
    if (!currentUser) {
      router.push('/signin')
    }
  }, [router])

  // Don't render anything until we're on the client
  if (!isClient) {
    return null
  }

  return <DashboardComponent />
}