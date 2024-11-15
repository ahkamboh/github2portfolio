'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { setCookie } from 'cookies-next'
import SplineBackground from "@/components/SplineBackground"



export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  
  // Sign In form state
  const [signInEmail, setSignInEmail] = useState("")
  
  // Sign Up form state
  const [signUpData, setSignUpData] = useState({
    username: "",
    email: "",
    name: ""
  })

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      console.log('Attempting to sign in with email:', signInEmail)
      const response = await fetch(`/api/users?email=${encodeURIComponent(signInEmail)}`)
      const users = await response.json()
      console.log('API Response:', users)
      
      if (users && users.length > 0) {
        const userData = users[0]
        console.log('Setting user data:', userData)
        
        if (typeof window !== 'undefined') {
          sessionStorage.clear()
          localStorage.clear()
          sessionStorage.setItem('currentUser', JSON.stringify(userData))
        }
        
        setCookie('auth', 'true', {
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
        })
        setCookie('userData', JSON.stringify(userData), {
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
        })

        toast({
          title: "Success",
          description: "Signed in successfully",
        })

        router.replace('/dashboard')
      } else {
        toast({
          title: "Error",
          description: "User not found. Please sign up.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Sign in error:', error)
      toast({
        title: "Error",
        description: "Failed to sign in",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // First create the user
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signUpData),
      })
      
      const userData = await response.json()
      
      if (response.ok) {
        // Format the user data before storing
        const userDataToStore = {
          id: userData.id,
          email: signUpData.email,  // Ensure email is included
          username: signUpData.username,
          name: signUpData.name,
          created_at: userData.created_at,
          updated_at: userData.updated_at
        }

        if (typeof window !== 'undefined') {
          sessionStorage.setItem('currentUser', JSON.stringify(userDataToStore))
          localStorage.setItem('currentUser', JSON.stringify(userDataToStore))
          
          setCookie('auth', 'true', {
            maxAge: 30 * 24 * 60 * 60,
            path: '/',
          })
          setCookie('userData', JSON.stringify(userDataToStore), {
            maxAge: 30 * 24 * 60 * 60,
            path: '/',
          })
        }
        
        toast({
          title: "Success",
          description: "Account created successfully",
        })

        await new Promise(resolve => setTimeout(resolve, 1000))
        
        window.location.href = '/dashboard'
      } else {
        throw new Error(userData.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Modify the useEffect to check for browser environment
  useEffect(() => {
    if (typeof window !== 'undefined') {  // Check if we're in browser environment
      const currentUser = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser')
      if (currentUser) {
        router.push('/dashboard')
      }
    }
  }, [])

  return (
    <main className="relative min-h-screen">
      <SplineBackground />
      {/* Sign in content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#0d1829]/80 backdrop-blur-sm border-[#1c2e4a] text-white">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
              GitHub2Portfolio
            </CardTitle>
            <CardDescription className="text-gray-400 text-center">
              Sign in to manage your GitHub portfolios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2 bg-[#1c2e4a]">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      className="bg-[#1c2e4a] border-[#2a3f5f] text-white"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-teal-950 hover:bg-teal-900 text-teal-400"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Username"
                      value={signUpData.username}
                      onChange={(e) => setSignUpData({...signUpData, username: e.target.value})}
                      className="bg-[#1c2e4a] border-[#2a3f5f] text-white"
                      required
                    />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({...signUpData, email: e.target.value})}
                      className="bg-[#1c2e4a] border-[#2a3f5f] text-white"
                      required
                    />
                    <Input
                      placeholder="Full Name"
                      value={signUpData.name}
                      onChange={(e) => setSignUpData({...signUpData, name: e.target.value})}
                      className="bg-[#1c2e4a] border-[#2a3f5f] text-white"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-teal-950 hover:bg-teal-900 text-teal-400"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <div className="text-center pb-4 text-gray-400 text-sm">
            Created with ❤️ by <a href="https://github.com/ahkamboh" className="text-teal-400 hover:text-teal-300">ahkamboh</a>
          </div>
        </Card>
      </div>
    </main>
  )
}