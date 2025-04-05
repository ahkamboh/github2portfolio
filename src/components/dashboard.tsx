'use client'

import { useState, useEffect } from "react"
import { ChevronDown, Github, Home, LogOut, Settings, User, Loader2, Copy, ExternalLink, Building2, MapPin, Globe, Users, UserPlus, X, Menu } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import confetti from 'canvas-confetti'
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface GitHubData {
  public_repos: number;
  followers: number;
  stargazers_count?: number;
}

interface PortfolioData {
  username: string;
  url: string;
  createdAt: string;
  email: string;
}

interface GitHubUserProfile {
  name: string;
  avatar_url: string;
  bio: string;
  company: string;
  location: string;
  blog: string;
  followers: number;
  following: number;
  public_repos: number;
  html_url: string;
}

interface PortfolioSettings {
  activeUsername: string;
  portfolios: PortfolioData[];
}

// Helper function to format date (add this near the top of your component)
const formatDate = (dateString: string) => {
  console.log('Incoming date string:', dateString); // Debug log

  // If dateString is undefined or null, return a default date
  if (!dateString) {
    return 'Just now';
  }

  const date = new Date(dateString);
  console.log('Parsed date:', date); // Debug log
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export function DashboardComponent() {
  const [activeTab, setActiveTab] = useState("Overview")
  const [isLoading, setIsLoading] = useState(false)
  const [showPortfolioDialog, setShowPortfolioDialog] = useState(false)
  const [githubUsername, setGithubUsername] = useState("")
  const [portfolioUrl, setPortfolioUrl] = useState("")
  const { toast } = useToast()
  const [githubData, setGithubData] = useState<GitHubData | null>(null)
  const [portfolios, setPortfolios] = useState<PortfolioData[]>([])
  const [totalStars, setTotalStars] = useState(0)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [userProfile, setUserProfile] = useState<GitHubUserProfile | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [activeUsername, setActiveUsername] = useState<string>('')
  const [isCreateButtonDisabled, setIsCreateButtonDisabled] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter()
  const [switchingPortfolio, setSwitchingPortfolio] = useState<string>('')
  const [deletingPortfolio, setDeletingPortfolio] = useState<string>('')
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [portfolioToDelete, setPortfolioToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchGitHubData = async (username: string) => {
    console.log('Fetching GitHub data for:', username)
    try {
      const response = await fetch(`https://api.github.com/users/${username}`)
      if (!response.ok) {
        throw new Error('GitHub API request failed')
      }
      const userData = await response.json()
      console.log('GitHub user data:', userData)
      
      // Fetch repositories to calculate total stars
      const reposResponse = await fetch(`https://api.github.com/users/${username}/repos`)
      if (!reposResponse.ok) {
        throw new Error('GitHub repos request failed')
      }
      const repos = await reposResponse.json()
      const stars = repos.reduce((acc: number, repo: any) => acc + repo.stargazers_count, 0)
      
      console.log('Total stars:', stars)
      
      setGithubData({
        public_repos: userData.public_repos,
        followers: userData.followers,
        stargazers_count: stars
      })
      setTotalStars(stars)
    } catch (error) {
      console.error('Error fetching GitHub data:', error)
    }
  }

  useEffect(() => {
    const loadInitialData = async () => {
      if (typeof window === 'undefined') return;
      
      const currentUser = sessionStorage.getItem('currentUser')
      console.log('Current user from session:', currentUser)
      
      if (!currentUser) {
        router.push('/signin')
        return
      }

      const { email } = JSON.parse(currentUser)
      console.log('Loading data for email:', email)
      
      try {
        const response = await fetch(`/api/portfolios?email=${email}`, {
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_KEY}`
          }
        })
        const portfoliosData = await response.json()
        console.log('Loaded portfolios:', portfoliosData)
        
        if (portfoliosData.length > 0) {
          setPortfolios(portfoliosData)
          const firstUsername = portfoliosData[0].username
          console.log('Setting active username to:', firstUsername)
          setActiveUsername(firstUsername)
          
          // Fetch data immediately
          await fetchGitHubData(firstUsername)
          await fetchUserProfile(firstUsername)
        }
      } catch (error) {
        console.error('Error loading portfolios:', error)
      }
    }

    loadInitialData()
  }, [])

  const extractGithubUsername = (input: string): string => {
    // Handle full GitHub URL
    if (input.includes('github.com/')) {
      return input.split('github.com/').pop()?.split('/')[0] || ''
    }
    // Handle direct username input
    return input.trim()
  }

  const handleCreatePortfolio = async () => {
    if (!githubUsername) {
      toast({
        title: "Error",
        description: "Please enter a GitHub username or URL",
        variant: "destructive",
      })
      return
    }

    const username = extractGithubUsername(githubUsername)
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}')
    
    if (!username) {
      toast({
        title: "Error",
        description: "Invalid GitHub username or URL",
        variant: "destructive",
      })
      return
    }

    // Check if portfolio already exists
    const existingPortfolio = portfolios.find(p => 
      p.username.toLowerCase() === username.toLowerCase()
    )
    
    if (existingPortfolio) {
      const isOwnPortfolio = existingPortfolio.email === currentUser.email;
      toast({
        title: isOwnPortfolio ? "Duplicate Portfolio" : "Portfolio Not Available",
        description: isOwnPortfolio 
          ? `You already have a portfolio for ${username}`
          : `The username ${username} is already being used by another user`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true)
    
    try {
      const portfolioLink = `https://github2portfolio.vercel.app/${username}`
      
      const response = await fetch('/api/portfolios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_KEY}`
        },
        body: JSON.stringify({
          email: currentUser.email,
          username,
          url: portfolioLink
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.code === 'DUPLICATE_USERNAME') {
          throw new Error('This GitHub username is already being used by another user.')
        }
        
        throw new Error(errorData.error || 'Failed to create portfolio')
      }

      const newPortfolio = await response.json()
      setPortfolios([...portfolios, newPortfolio])
      setPortfolioUrl(portfolioLink)
      
      // Set this as the active portfolio
      await handleSwitchAccount(username)
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })

      setShowPortfolioDialog(true)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create portfolio",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setGithubUsername('') // Clear the input after attempt
    }
  }

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(portfolioUrl)
    toast({
      title: "Success",
      description: "Portfolio URL copied to clipboard",
    })
  }

  const fetchUserProfile = async (username: string) => {
    setIsProfileLoading(true)
    try {
      const response = await fetch(`https://api.github.com/users/${username}`)
      const data = await response.json()
      setUserProfile(data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      })
    } finally {
      setIsProfileLoading(false)
    }
  }

  const handleSwitchAccount = async (username: string) => {
    setSwitchingPortfolio(username)
    try {
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}')
      console.log('Switching to username:', username)
      
      const response = await fetch('/api/portfolios/active', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_KEY}`
        },
        body: JSON.stringify({
          email: currentUser.email,
          username
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to switch portfolio')
      }

      setGithubData(null)
      setUserProfile(null)
      setTotalStars(0)
      setActiveUsername(username)
      
      await Promise.all([
        fetchGitHubData(username),
        fetchUserProfile(username)
      ])
      
      toast({
        title: "Success",
        description: `Switched to ${username}'s portfolio`,
      })
    } catch (error) {
      console.error('Error switching account:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to switch account",
        variant: "destructive",
      })
    } finally {
      setSwitchingPortfolio('')
    }
  }

  const handleDeletePortfolio = async (username: string) => {
    setDeletingPortfolio(username)
    try {
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}')
      
      const response = await fetch(
        `/api/portfolios?username=${username}&email=${currentUser.email}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_KEY}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete portfolio')
      }

      // Remove from state
      setPortfolios(portfolios.filter(p => p.username !== username))
      
      // If active portfolio was deleted, switch to first available
      if (activeUsername === username) {
        const remainingPortfolios = portfolios.filter(p => p.username !== username)
        if (remainingPortfolios.length > 0) {
          await handleSwitchAccount(remainingPortfolios[0].username)
        } else {
          setActiveUsername('')
          setGithubData(null)
          setUserProfile(null)
        }
      }
      
      toast({
        title: "Success",
        description: "Portfolio deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting portfolio:', error)
      toast({
        title: "Error",
        description: "Failed to delete portfolio",
        variant: "destructive",
      })
    } finally {
      setDeletingPortfolio('')
    }
  }

  const handleDeleteClick = (username: string) => {
    setPortfolioToDelete(username)
    setShowDeleteAlert(true)
  }

  const handleDeleteConfirm = async () => {
    if (!portfolioToDelete) return
    
    setIsDeleting(true)
    setShowDeleteAlert(false)
    await handleDeletePortfolio(portfolioToDelete)
    setPortfolioToDelete(null)
    setIsDeleting(false)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'Overview':
        // If no portfolios exist, show welcome message
        if (portfolios.length === 0) {
          const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
          return (
            <div className="p-6 flex flex-col items-center justify-center space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">Welcome, {currentUser.name || 'User'}!</h2>
                <p className="text-gray-400">Get started by creating your first portfolio</p>
              </div>
              <Button
                onClick={() => setShowPortfolioDialog(true)}
                className="bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400"
              >
                Create Portfolio
              </Button>
            </div>
          );
        }

        return (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-[#0d1829] border-[#1c2e4a]">
              <CardHeader>
                <CardTitle className="text-white">Total Repositories</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-white">{githubData?.public_repos || 0}</p>
              </CardContent>
            </Card>
            <Card className="bg-[#0d1829] border-[#1c2e4a]">
              <CardHeader>
                <CardTitle className="text-white">Total Stars</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-white">{totalStars}</p>
              </CardContent>
            </Card>
            <Card className="bg-[#0d1829] border-[#1c2e4a]">
              <CardHeader>
                <CardTitle className="text-white">Followers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-white">{githubData?.followers || 0}</p>
              </CardContent>
            </Card>
            <Card className="col-span-full bg-[#0d1829] border-[#1c2e4a]">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-white">
                  {["Created new repository: awesome-project", "Pushed 5 commits to main", "Merged pull request #42", "Forked user/cool-repo"].map((activity, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{activity}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )
      
      case 'Portfolio':
        return (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolios.map((portfolio, index) => (
              <Card key={index} className="bg-[#0d1829] border-[#1c2e4a]">
                <CardHeader>
                  <CardTitle className="text-white">Portfolio: {portfolio.username}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input 
                      value={portfolio.url}
                      readOnly
                      className="bg-[#2a3f5f] border-[#3a4f6f] text-white"
                    />
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(portfolio.url)
                        toast({
                          title: "Success",
                          description: "Portfolio URL copied to clipboard",
                        })
                      }}
                      className="shrink-0 bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => window.open(portfolio.url, '_blank')}
                      className="shrink-0 bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-400">
                    Created: {formatDate(portfolio.createdAt)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      
      case 'Settings':
        return (
          <div className="p-6 max-w-4xl mx-auto">
            <Card className="bg-[#0d1829] border-[#1c2e4a]">
              <CardHeader>
                <CardTitle className="text-white">Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Your Portfolios</h3>
                  <div className="space-y-3">
                    {portfolios.map((portfolio) => (
                      <Card 
                        key={portfolio.username}
                        className={`bg-[#1c2e4a] border-[#2a3f5f] ${
                          activeUsername === portfolio.username ? 'ring-2 ring-teal-400' : ''
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <Avatar className="h-10 w-10">
                                <AvatarImage 
                                  src={`https://github.com/${portfolio.username}.png`} 
                                  alt={portfolio.username} 
                                />
                                <AvatarFallback>{portfolio.username[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-medium text-white">{portfolio.username}</h4>
                                <p className="text-sm text-gray-400">
                                  Created: {formatDate(portfolio.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                className={`hover:bg-teal-900/20 ${
                                  activeUsername === portfolio.username 
                                    ? 'text-teal-400' 
                                    : 'text-gray-400'
                                }`}
                                onClick={() => handleSwitchAccount(portfolio.username)}
                                disabled={activeUsername === portfolio.username || switchingPortfolio === portfolio.username}
                              >
                                {switchingPortfolio === portfolio.username ? (
                                  <div className="flex items-center">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Switching...
                                  </div>
                                ) : activeUsername === portfolio.username ? (
                                  'Active'
                                ) : (
                                  'Switch'
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                className="hover:bg-red-900/20 hover:text-red-400"
                                onClick={() => handleDeleteClick(portfolio.username)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      default:
        return null;
    }
  };

  const handleUsernameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setGithubUsername(input);
    
    // Extract username from GitHub URL or use direct input
    let username = input;
    if (input.includes('github.com/')) {
      username = input.split('github.com/').pop()?.split('/')[0] || '';
    }

    // Clean the username
    username = username.trim();
    
    // Enable button if username is valid
    const isValid = username.length > 0 && !username.includes('http') && !username.includes('/');
    setIsCreateButtonDisabled(!isValid);
  };

  const handleLogout = () => {
    // Clear session storage
    sessionStorage.removeItem('currentUser')
    // Clear local storage
    localStorage.removeItem('currentUser')
    // Clear cookies
    document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'userData=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    
    router.replace('/signin')
  }

  // Add authentication check effect
  useEffect(() => {
    const checkAuth = () => {
      const currentUser = sessionStorage.getItem('currentUser')
      if (!currentUser) {
        router.replace('/signin')
      }
    }

    checkAuth()
  }, [])

  return (
    <div className="flex min-h-screen bg-[#0a1120] text-gray-100">
      {/* Mobile Menu Button */}
      {/* Overlay - only on mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          lg:w-52 bg-[#0d1829] p-6 space-y-6
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:relative
          fixed top-0 left-0 h-screen w-52 z-50
          transform transition-transform duration-200 ease-in-out
          lg:transform-none lg:transition-none
        `}
      >
        {/* Logo and Navigation */}
        <div className="flex items-center space-x-2 mb-6">
          <Github className="h-8 w-8" />
          <span className="text-xl font-bold text-white whitespace-nowrap">GitPortfolio</span>
        </div>

        <nav className="space-y-2">
          {/* Navigation buttons */}
          <Button
            variant="ghost"
            className={`w-full justify-start whitespace-nowrap ${
              activeTab === 'Overview' 
                ? 'bg-[#1c2e4a] text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#1c2e4a]'
            }`}
            onClick={() => {
              setActiveTab('Overview');
              setIsMobileMenuOpen(false);
            }}
          >
            <Home className="mr-2 h-4 w-4" />
            Overview
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start ${
              activeTab === 'Portfolio' 
                ? 'bg-[#1c2e4a] text-white' 
                : 'text-gray-400 hover:text-white hover:bg-[#1c2e4a]'
            }`}
            onClick={() => setActiveTab('Portfolio')}
          >
            <Github className="mr-2 h-4 w-4" />
            Portfolio
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start ${
              activeTab === 'Settings' 
                ? 'bg-[#1c2e4a] text-white' 
                : 'text-gray-400 hover:text-white hover:bg-[#1c2e4a]'
            }`}
            onClick={() => setActiveTab('Settings')}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-0 overflow-y-auto">
        {/* Header - Made sticky */}
        <header className="bg-[#0d1829] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-40 border-b border-[#1c2e4a]">
          <div className="flex items-center gap-4">
            {/* Menu Button - Updated styling */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-[#1c2e4a] rounded-md transition-colors"
            >
              <Menu className="h-6 w-6 text-gray-400" />
            </button>
            <h1 className="text-2xl font-bold text-white">{activeTab}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => setShowPortfolioDialog(true)}
              className="bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400"
            >
              Create Portfolio
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      src={userProfile?.avatar_url || "/placeholder-avatar.jpg"} 
                      alt={activeUsername || userProfile?.name || "User"} 
                    />
                    <AvatarFallback>
                      {activeUsername?.[0]?.toUpperCase() || JSON.parse(sessionStorage.getItem('currentUser') || '{}').name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">
                    {activeUsername || JSON.parse(sessionStorage.getItem('currentUser') || '{}').name || "User"}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#0d1829] border-[#1c2e4a]">
                <DropdownMenuItem 
                  className="text-white hover:bg-[#1c2e4a] cursor-pointer"
                  onClick={() => {
                    if (activeUsername) {
                      fetchUserProfile(activeUsername)
                      setShowProfileDialog(true)
                    }
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowSettingsDialog(true)}
                  className="text-white hover:bg-[#1c2e4a] cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-white hover:bg-[#1c2e4a] cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {renderContent()}

        {/* Create Portfolio Dialog */}
        <Dialog open={showPortfolioDialog} onOpenChange={setShowPortfolioDialog}>
          <DialogContent className="bg-[#0d1829] border-[#1c2e4a] text-white">
            <DialogHeader>
              <DialogTitle>Create Your Portfolio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="github-username" className="text-sm font-medium text-gray-200">
                  GitHub Username
                </label>
                <Input
                  id="github-username"
                  placeholder="Enter username (e.g., MuneebxNick) or GitHub URL"
                  value={githubUsername}
                  onChange={handleUsernameInput}
                  className="bg-[#1c2e4a] border-[#2a3f5f] text-white"
                />
              </div>
              
              <Button 
                onClick={handleCreatePortfolio}
                disabled={isLoading || isCreateButtonDisabled}
                className={`w-full bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400 
                  ${(isLoading || isCreateButtonDisabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Portfolio'
                )}
              </Button>

              {portfolioUrl && (
                <div className="mt-4 p-4 bg-[#1c2e4a] rounded-lg space-y-4">
                  <p className="text-sm text-gray-300">Your portfolio is ready!</p>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={portfolioUrl}
                      readOnly
                      className="bg-[#2a3f5f] border-[#3a4f6f] text-white"
                    />
                    <Button
                      onClick={handleCopyUrl}
                      className="shrink-0 bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => window.open(portfolioUrl, '_blank')}
                      className="shrink-0 bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Profile Dialog */}
        <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
          <DialogContent className="bg-[#0d1829] border-[#1c2e4a] text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>GitHub Profile</DialogTitle>
            </DialogHeader>
            
            {isProfileLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : userProfile ? (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={userProfile.avatar_url} alt={userProfile.name} />
                    <AvatarFallback>{userProfile.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">{userProfile.name}</h2>
                    <p className="text-gray-400">{userProfile.bio}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4" />
                    <span>{userProfile.company}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>{userProfile.location}</span>
                  </div>
                  {userProfile.blog && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <Globe className="h-4 w-4" />
                      <Button
                        variant="ghost"
                        className="p-0 h-auto hover:text-teal-400 flex items-center space-x-2"
                        onClick={() => window.open(
                          userProfile.blog.startsWith('http') ? userProfile.blog : `https://${userProfile.blog}`,
                          '_blank'
                        )}
                      >
                        <span className="truncate">{userProfile.blog}</span>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>{userProfile.followers} followers</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <UserPlus className="h-4 w-4" />
                    <span>{userProfile.following} following</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Github className="h-4 w-4" />
                    <span>{userProfile.public_repos} repositories</span>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-[#1c2e4a] rounded-lg space-y-4">
                  <p className="text-sm text-gray-300">GitHub URL:</p>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={userProfile.html_url}
                      readOnly
                      className="bg-[#2a3f5f] border-[#3a4f6f] text-white"
                    />
                    <Button
                      onClick={() => window.open(userProfile.html_url, '_blank')}
                      className="shrink-0 bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8">
                <p className="text-gray-400">No user profile loaded</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent className="bg-[#0d1829] border-[#1c2e4a] text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Portfolio Settings</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Your Portfolios</h3>
                <div className="space-y-3">
                  {portfolios.map((portfolio) => (
                    <Card 
                      key={portfolio.username}
                      className={`bg-[#1c2e4a] border-[#2a3f5f] ${
                        activeUsername === portfolio.username ? 'ring-2 ring-teal-400' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-10 w-10">
                              <AvatarImage 
                                src={`https://github.com/${portfolio.username}.png`} 
                                alt={portfolio.username} 
                              />
                              <AvatarFallback>{portfolio.username[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium text-white">{portfolio.username}</h4>
                              <p className="text-sm text-gray-400">
                                Created: {formatDate(portfolio.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              className={`hover:bg-teal-900/20 ${
                                activeUsername === portfolio.username 
                                  ? 'text-teal-400' 
                                  : 'text-gray-400'
                              }`}
                              onClick={() => handleSwitchAccount(portfolio.username)}
                              disabled={activeUsername === portfolio.username || switchingPortfolio === portfolio.username}
                            >
                              {switchingPortfolio === portfolio.username ? (
                                <div className="flex items-center">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Switching...
                                </div>
                              ) : activeUsername === portfolio.username ? (
                                'Active'
                              ) : (
                                'Switch'
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              className="hover:bg-red-900/20 hover:text-red-400"
                              onClick={() => handleDeleteClick(portfolio.username)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#2a3f5f] pt-4">
                <p className="text-sm text-gray-400">
                  Switch between different GitHub accounts to view their respective portfolios.
                  The active portfolio's data will be displayed in the dashboard.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Alert Dialog */}
        <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
          <AlertDialogContent className="bg-[#0d1829] border-[#1c2e4a] text-white max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            </AlertDialogHeader>
            
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Are you sure?</h3>
                <p className="text-gray-400">This action cannot be undone.</p>
              </div>

              <div className="flex items-center justify-end space-x-4">
                <AlertDialogCancel 
                  className="bg-red-900/20 hover:bg-red-900/30 text-red-400"
                  disabled={isDeleting}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-red-900/20 hover:bg-red-900/30 text-red-400"
                  disabled={isDeleting}
                  onClick={handleDeleteConfirm}
                >
                  {isDeleting ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Deleting...
                    </div>
                  ) : (
                    'Delete'
                  )}
                </AlertDialogAction>
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}