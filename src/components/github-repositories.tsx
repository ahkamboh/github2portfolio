'use client'
import { useState, useEffect, HTMLAttributes } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ChevronDown, 
  Star, 
  GitFork, 
  ExternalLink, 
  Code, 
  FileIcon, 
  FolderIcon, 
  Image as ImageIcon, 
  Loader2, 
  X, 
  ChevronLeft, 
  Copy,
  Building2,
  MapPin,
  Globe,
  Users,
  UserPlus
} from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useToast } from '@/hooks/use-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

type Repo = {
  name: string
  html_url: string
  description: string
  topics: string[]
  language: string
  stargazers_count: number
  forks_count: number
  homepage: string
  created_at: string
  updated_at: string
  owner: {
    avatar_url: string
  }
  default_branch: string
}

type RepoContent = {
  name: string
  type: string
  content?: string
  url?: string
}

type FileContent = {
  name: string
  content: string
  isImage: boolean
  url?: string
}

type GitHubUser = {
  name: string
  avatar_url: string
  bio: string
  company: string
  location: string
  blog: string
  followers: number
  following: number
  public_repos: number
  html_url: string
}

type GitHubFollower = {
  login: string
  avatar_url: string
  html_url: string
}

const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN 

interface GithubRepositoriesProps {
  username: string
}

export function GithubRepositories({ username }: GithubRepositoriesProps) {
  const [allRepos, setAllRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [fileLoading, setFileLoading] = useState(false)
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [repoContents, setRepoContents] = useState<RepoContent[]>([])
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null)
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'https' | 'ssh' | 'cli'>('https')
  const [userData, setUserData] = useState<GitHubUser | null>(null)
  const [followers, setFollowers] = useState<GitHubFollower[]>([])
  const [following, setFollowing] = useState<GitHubFollower[]>([])
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [readmeContent, setReadmeContent] = useState<string>('')
  const [userExists, setUserExists] = useState<boolean>(false)
  const [checkingUser, setCheckingUser] = useState<boolean>(true)
  const [dataLoading, setDataLoading] = useState<boolean>(true)

  const priorityRepos = [
    'NotebookLlama', 'repo2txt', 'promptly.ai', 'react-text-animatio', 'clerk-themez', '3D-website-megma',
    'text-to-graph', 'doc-ocr', 'change-cloth-ai', 'car-dealer-ai-agent', 'Rate-My-Professor-Chatbot',
    'curate-ai-portfolio-builder', 'webscraper.ai', 'ahk-tools',
    'EasyDoc', 'Code-Editor'
  ]

  const languageColors: { [key: string]: string } = {
    Python: '#3572A5',
    JavaScript: '#f1e05a',
    TypeScript: '#2b7489',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Ruby: '#701516',
    Java: '#b07219',
    PHP: '#4F5D95',
    Go: '#00ADD8',
    Rust: '#dea584',
    C: '#555555',
    'C++': '#f34b7d',
    'C#': '#178600',
    Swift: '#ffac45',
    Kotlin: '#F18E33',
    Dart: '#00B4AB',
    Shell: '#89e051',
    Vue: '#41b883',
    Jupyter: '#DA5B0B',
    Markdown: '#083fa1',
    R: '#198CE7',
    Scala: '#c22d40',
    Lua: '#000080',
    Perl: '#0298c3',
    MATLAB: '#e16737',
    PowerShell: '#012456',
    // Add more languages as needed
  }

  useEffect(() => {
    checkUserExists()
  }, [username])

  useEffect(() => {
    if (userExists) {
      setDataLoading(true)
      Promise.all([
        fetchRepos(),
        fetchUserData(),
        fetchReadme()
      ]).finally(() => {
        setDataLoading(false)
      })
    } else {
      setLoading(false)
      setDataLoading(false)
    }
  }, [username, userExists])

  async function checkUserExists() {
    setCheckingUser(true)
    try {
      const response = await fetch(`/api/portfolios/check?username=${username}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_KEY}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUserExists(data.exists)
      } else {
        setUserExists(false)
      }
    } catch (error) {
      console.error('Error checking if user exists:', error)
      setUserExists(false)
    } finally {
      setCheckingUser(false)
    }
  }

  async function fetchRepos() {
    try {
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
      }
      
      if (GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${GITHUB_TOKEN}`
      }

      const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&page=1`, {
        headers
      })
      const repos = await response.json()
      
      const sortedRepos = repos.sort((a: Repo, b: Repo) => {
        const indexA = priorityRepos.indexOf(a.name)
        const indexB = priorityRepos.indexOf(b.name)
        
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB
        }
        if (indexA !== -1) {
          return -1
        }
        if (indexB !== -1) {
          return 1
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      
      setAllRepos(sortedRepos)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching repositories:', error)
      setLoading(false)
    }
  }

  async function fetchUserData() {
    try {
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
      }
      
      if (GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${GITHUB_TOKEN}`
      }

      const response = await fetch(`https://api.github.com/users/${username}`, {
        headers
      })
      const data = await response.json()
      setUserData(data)
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  async function fetchReadme() {
    try {
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3.raw',
      }
      
      if (GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${GITHUB_TOKEN}`
      }

      const response = await fetch(
        `https://api.github.com/repos/${username}/${username}/readme`,
        { headers }
      )
      
      if (response.ok) {
        const content = await response.text()
        setReadmeContent(content)
      } else {
        setReadmeContent('')
      }
    } catch (error) {
      console.error('Error fetching README:', error)
      setReadmeContent('')
    }
  }

  function sortRepos(order: 'newest' | 'oldest') {
    setSortOrder(order)
    const priorityReposArray = allRepos.filter(repo => priorityRepos.includes(repo.name))
    const otherReposArray = allRepos.filter(repo => !priorityRepos.includes(repo.name))
    
    priorityReposArray.sort((a, b) => priorityRepos.indexOf(a.name) - priorityRepos.indexOf(b.name))
    
    const sortedOtherRepos = otherReposArray.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return order === 'newest' ? dateB - dateA : dateA - dateB
    })

    setAllRepos([...priorityReposArray, ...sortedOtherRepos])
  }

  function formatDate(dateString: string) {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
    return new Date(dateString).toLocaleDateString('en-US', options)
  }

  async function fetchRepoContents(repoName: string, path: string = '') {
    try {
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
      }
      
      if (GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${GITHUB_TOKEN}`
      }

      const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${path}`, {
        headers
      })
      const contents = await response.json()
      setRepoContents(contents)
      setSelectedRepo(repoName)
      setCurrentPath(path ? path.split('/') : [])
    } catch (error) {
      console.error('Error fetching repository contents:', error)
    }
  }

  async function fetchFileContent(url: string, fileName: string) {
    setFileLoading(true)
    try {
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
      }
      
      if (GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${GITHUB_TOKEN}`
      }

      const response = await fetch(url, {
        headers
      })
      const data = await response.json()
      const isImage = fileName.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) !== null
      
      const rawUrl = isImage ? data.download_url : undefined
      
      setSelectedFile({ 
        name: fileName, 
        content: isImage ? '' : atob(data.content),
        isImage,
        url: rawUrl
      })
    } catch (error) {
      console.error('Error fetching file content:', error)
      setSelectedFile({ 
        name: fileName, 
        content: 'Error loading file content',
        isImage: false
      })
    }
    setFileLoading(false)
  }

  function getFileLanguage(fileName: string) {
    const extension = fileName.split('.').pop()?.toLowerCase()
    const languageMap: { [key: string]: string } = {
      js: 'javascript',
      jsx: 'jsx',
      ts: 'typescript',
      tsx: 'tsx',
      py: 'python',
      rb: 'ruby',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      php: 'php',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      md: 'markdown',
      yml: 'yaml',
      yaml: 'yaml',
      xml: 'xml',
      svg: 'svg',
      sql: 'sql',
      sh: 'bash',
      bash: 'bash',
      txt: 'text'
    }
    return languageMap[extension || ''] || 'text'
  }

  function handleFolderClick(folderName: string) {
    const newPath = [...currentPath, folderName]
    fetchRepoContents(selectedRepo!, newPath.join('/'))
  }

  function handleBackClick() {
    const newPath = currentPath.slice(0, -1)
    fetchRepoContents(selectedRepo!, newPath.join('/'))
  }

  const handleCopy = async (type: 'https' | 'ssh' | 'cli') => {
    const urls = {
      https: `https://github.com/${username}/${selectedRepo}.git`,
      ssh: `git@github.com:${username}/${selectedRepo}.git`,
      cli: `gh repo clone ${username}/${selectedRepo}`
    }
    
    await navigator.clipboard.writeText(urls[type])
    toast({
      title: "Copied!",
      description: "Repository URL copied to clipboard",
      duration: 2000,
    })
  }

  async function fetchFollowers(resetData: boolean = false) {
    if (resetData) {
      setFollowers([]);
      setPage(1);
      setHasMore(true);
    }

    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    setFollowLoading(true);
    
    try {
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
      }
      if (GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${GITHUB_TOKEN}`
      }

      const response = await fetch(
        `https://api.github.com/users/${username}/followers?per_page=30&page=${page}`,
        { headers }
      );
      const data = await response.json();
      
      if (data.length < 30) {
        setHasMore(false);
      }

      setFollowers(prev => [...prev, ...data]);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
    
    setIsLoadingMore(false);
    setFollowLoading(false);
  }

  async function fetchFollowing() {
    setFollowLoading(true)
    try {
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
      }
      if (GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${GITHUB_TOKEN}`
      }
      const response = await fetch(`https://api.github.com/users/${username}/following`, {
        headers
      })
      const data = await response.json()
      setFollowing(data)
    } catch (error) {
      console.error('Error fetching following:', error)
    }
    setFollowLoading(false)
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) { // Load more when user is 50% through current content
      fetchFollowers();
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      {checkingUser ? (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-teal-500" />
          <p className="text-gray-400">Checking if portfolio exists...</p>
        </div>
      ) : !userExists ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Portfolio Not Found</h2>
          <p className="text-gray-400 mb-6">This GitHub user does not have a portfolio in our system.</p>
          <Button 
            className="bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400"
            onClick={() => window.location.href = '/'}
          >
            Return to Home
          </Button>
        </div>
      ) : dataLoading ? (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-teal-500" />
          <p className="text-gray-400">Loading portfolio data...</p>
        </div>
      ) : (
        <>
          <div className="mb-4 sm:mb-6">
            {userData && (
              <Card className="w-full bg-[#020817]">
                <CardContent className="flex flex-col md:flex-row gap-4 sm:gap-6 pt-6">
                  <div className="flex flex-col items-center md:items-start">
                    <img 
                      src={userData.avatar_url} 
                      alt={`${userData.name}'s avatar`} 
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full"
                    />
                  </div>
                  <div className="flex-1 space-y-3 sm:space-y-4">
                    <div className="text-center md:text-left space-y-2">
                      <h2 className="text-xl sm:text-2xl font-bold text-white">{userData.name}</h2>
                      <p className="text-[#94a3b8] text-sm sm:text-base">{userData.bio}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      {userData.company && (
                        <div className="flex items-center gap-2 text-[#94a3b8]">
                          <Building2 className="w-4 h-4 shrink-0" />
                          <span className="truncate">{userData.company}</span>
                        </div>
                      )}
                      {userData.location && (
                        <div className="flex items-center gap-2 text-[#94a3b8]">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="truncate">{userData.location}</span>
                        </div>
                      )}
                      {userData.blog && (
                        <div className="flex items-center gap-2 text-[#94a3b8]">
                          <Globe className="w-4 h-4 shrink-0" />
                          <a 
                            href={userData.blog} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:text-blue-600 truncate"
                          >
                            Website
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[#94a3b8]">
                        <Code className="w-4 h-4 shrink-0" />
                        <span className="truncate">{userData.public_repos} public repositories</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                      <Dialog open={showFollowers} onOpenChange={setShowFollowers}>
                        <DialogTrigger asChild>
                          <Button 
                           
                            className="flex  bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400 items-center gap-2 w-full sm:w-auto"
                            onClick={() => fetchFollowers(true)}
                          >
                            <Users className="w-4 h-4" />
                            <span>{userData.followers} followers</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
                          <DialogHeader>
                            <DialogTitle>Followers</DialogTitle>
                          </DialogHeader>
                          <ScrollArea 
                            className="h-[calc(80vh-100px)]"
                            onScrollCapture={handleScroll}
                          >
                            {followLoading && followers.length === 0 ? (
                              <div className="flex justify-center p-4">
                                <Loader2 className="w-6 h-6 animate-spin" />
                              </div>
                            ) : (
                              <div className="space-y-4 p-4">
                                {followers.map((follower) => (
                                  <div key={follower.login} className="flex  items-center gap-3 p-2 hover:bg-teal-900/20 rounded-lg">
                                    <img 
                                      src={follower.avatar_url} 
                                      alt={follower.login} 
                                      className="w-10 h-10 rounded-full"
                                    />
                                    <a 
                                      href={follower.html_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 hover:text-blue-600 truncate"
                                    >
                                      {follower.login}
                                    </a>
                                    <Button  size="sm" className="shrink-0  bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400" asChild>
                                      <a 
                                        href={follower.html_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        View Profile
                                      </a>
                                    </Button>
                                  </div>
                                ))}
                                {isLoadingMore && (
                                  <div className="flex justify-center p-4">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                  </div>
                                )}
                              </div>
                            )}
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={showFollowing} onOpenChange={setShowFollowing}>
                        <DialogTrigger asChild>
                          <Button 
                           
                            className="flex items-center bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400   gap-2 w-full sm:w-auto"
                            onClick={fetchFollowing}
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>{userData.following} following</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
                          <DialogHeader>
                            <DialogTitle>Following</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="h-[calc(80vh-100px)]">
                            {followLoading ? (
                              <div className="flex justify-center p-4">
                                <Loader2 className="w-6 h-6 animate-spin" />
                              </div>
                            ) : (
                              <div className="space-y-4 p-4 ">
                                {following.map((user) => (
                                  <div key={user.login} className="flex hover:bg-teal-900/20 items-center gap-3 p-2 rounded-lg">
                                    <img 
                                      src={user.avatar_url} 
                                      alt={user.login} 
                                      className="w-10 h-10 rounded-full"
                                    />
                                    <a 
                                      href={user.html_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 hover:text-blue-600 truncate"
                                    >
                                      {user.login}
                                    </a>
                                    <Button  size="sm" className="shrink-0  bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400  " asChild>
                                      <a 
                                        href={user.html_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        View Profile
                                      </a>
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          {readmeContent && (
            <Card className="mb-4 sm:mb-6 mt-4 bg-[#020817]">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl text-white">README.md</CardTitle>
              </CardHeader>
              <CardContent className="prose dark:prose-invert max-w-none p-4 sm:p-6">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]} 
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1 className="scroll-m-20 text-white text-4xl font-extrabold tracking-tight lg:text-5xl mb-6" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 className="scroll-m-20 text-white border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 mb-4" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className="scroll-m-20 text-white text-2xl font-semibold tracking-tight mb-3" {...props} />
                    ),
                    h4: ({ node, ...props }) => (
                      <h4 className="scroll-m-20 text-white text-xl font-semibold tracking-tight mb-2" {...props} />
                    ),
                    h5: ({ node, ...props }) => (
                      <h5 className="scroll-m-20 text-white text-lg font-semibold tracking-tight mb-2" {...props} />
                    ),
                    h6: ({ node, ...props }) => (
                      <h6 className="scroll-m-20 text-white text-base font-semibold tracking-tight mb-2" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="my-1 ml-4 text-white" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc my-4 space-y-2 text-white  " {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="list-decimal my-4 space-y-2 text-white  " {...props} />
                    ),
                    img: ({ node, ...props }) => (
                      <img className="my-4 rounded-lg max-w-full h-auto" {...props} />
                    ),
                    a: ({ node, ...props }) => (
                      <a className="text-blue-600 hover:underline" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="my-4" {...props} />
                    ),
                    code: ({ node, inline, className, ...props }: { node?: any, inline?: boolean, className?: string } & HTMLAttributes<HTMLElement>) => (
                      inline ? 
                        <code className="bg-gray-100 dark:bg-gray-800 rounded px-1" {...props} /> :
                        <code className="block bg-gray-100 dark:bg-gray-800 rounded p-4 my-4" {...props} />
                    ),
                  }}
                >
                  {readmeContent}
                </ReactMarkdown>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                onClick={() => sortRepos('newest')} 
                variant={sortOrder === 'newest' ? 'default' : 'outline'}
                className={`flex-1 sm:flex-none ${
                  sortOrder === 'newest' 
                    ? ' bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400'
                    : 'hover:text-black hover:bg-teal-900'
                }`}
              >
                Newest First
              </Button>
              <Button 
                onClick={() => sortRepos('oldest')} 
                variant={sortOrder === 'oldest' ? 'default' : 'outline'}
                className={`flex-1 sm:flex-none ${
                  sortOrder === 'oldest'
                    ? ' bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400'
                    : 'hover:text-black hover:bg-teal-900'
                }`}
              >
                Oldest First
              </Button>
            </div>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-teal-500" />
              <p className="text-gray-400">Loading repositories...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {allRepos.map((repo) => (
                <Card key={repo.name} className="flex flex-col bg-[#020817]">
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex justify-between items-start gap-4">
                      <CardTitle className="text-lg sm:text-xl break-words flex-1">
                        <a href={repo.html_url} className="text-blue-600 hover:underline">
                          {repo.name}
                        </a>
                      </CardTitle>
                      <img src={repo.owner.avatar_url} alt="Owner" className="w-8 h-8 rounded-full flex-shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow p-4 sm:p-6">
                    <p className="text-[#94a3b8] text-sm sm:text-base line-clamp-2">
                      {repo.description || 'No description available'}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
                      {repo.topics.map((topic) => (
                        <span key={topic} className="bg-[#121d2f] text-blue-500 text-xs px-2 py-1 rounded-full">
                          {topic}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm text-[#94a3b8]">
                      {repo.language && (
                        <span>
                          <span 
                            className="inline-block w-2 h-2 rounded-full mr-1" 
                            style={{ 
                              backgroundColor: languageColors[repo.language] || '#ddd'
                            }}
                          ></span>
                          {repo.language}
                        </span>
                      )}
                      <span className="flex items-center">
                        <Star className="w-4 h-4 mr-1" />
                        {repo.stargazers_count}
                      </span>
                      <span className="flex items-center">
                        <GitFork className="w-4 h-4 mr-1" />
                        {repo.forks_count}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col items-stretch gap-3 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <Dialog >
                        <DialogTrigger asChild>
                          <Button  className="flex-1 rounded bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400" onClick={() => fetchRepoContents(repo.name)}>
                            <Code className="w-4 h-4 mr-2" />
                            View Code
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>{selectedRepo} - Repository Contents</DialogTitle>
                            
                            <div className="mt-4 rounded-lg border">
                              <div className="flex items-center gap-4 px-3 py-2 border-b">
                                <div className="flex gap-4 text-sm">
                                  <button 
                                    className={`${activeTab === 'https' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}
                                    onClick={() => setActiveTab('https')}
                                  >
                                    HTTPS
                                  </button>
                                  <button 
                                    className={`${activeTab === 'ssh' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}
                                    onClick={() => setActiveTab('ssh')}
                                  >
                                    SSH
                                  </button>
                                  <button 
                                    className={`${activeTab === 'cli' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}
                                    onClick={() => setActiveTab('cli')}
                                  >
                                    GitHub CLI
                                  </button>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2  px-3 py-2">
                                <input 
                                  type="text"
                                  readOnly
                                  value={
                                    activeTab === 'https' 
                                      ? `https://github.com/${username}/${selectedRepo}.git`
                                      : activeTab === 'ssh'
                                      ? `git@github.com:${username}/${selectedRepo}.git`
                                      : `gh repo clone ${username}/${selectedRepo}`
                                  }
                                  className="flex-1 bg-transparent text-sm outline-none"
                                />
                                <button
                                  className="flex items-center gap-2 rounded px-2 py-1 bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400"
                                  onClick={() => handleCopy(activeTab)}
                                >
                                  <Copy className="h-4 w-4" />
                                  <span className="text-xs">Copy</span>
                                </button>
                              </div>
                            </div>
                          </DialogHeader>
                          <ScrollArea className="h-full ">
                            {currentPath.length > 0 && (
                              <Button 
                               
                                className="mb-2 rounded bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400" 
                                onClick={handleBackClick}
                              >
                                <ChevronLeft className="h-4 w-4 " /> Back
                              </Button>
                            )}
                            {repoContents.map((item) => (
                              <div key={item.name} className="py-2">
                                {item.type === 'file' ? (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                       
                                        className="w-full bg-transparent hover:bg-teal-900/20 justify-start"
                                        onClick={() => item.url && fetchFileContent(item.url, item.name)}
                                      >
                                        {item.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) ? (
                                          <ImageIcon className="w-4 h-4 mr-2" />
                                        ) : (
                                          <FileIcon className="w-4 h-4 mr-2" />
                                        )}
                                        {item.name}
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl h-[80vh] ">
                                      <DialogHeader>
                                        <DialogTitle>{selectedFile?.name}</DialogTitle>
                                      </DialogHeader>
                                      <ScrollArea className="h-full">
                                        {fileLoading ? (
                                          <div className="flex  rounded bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400 items-center justify-center p-8">
                                            <Loader2 className="w-8 h-8 animate-spin" />
                                          </div>
                                        ) : (
                                          <>
                                            {selectedFile?.isImage ? (
                                              <div className="flex items-center justify-center p-4 ">
                                                {selectedFile.url && (
                                                  <img
                                                    src={selectedFile.url}
                                                    alt={selectedFile.name}
                                                    className="max-w-full h-auto object-contain"
                                                    onError={(e) => {
                                                      const target = e.target as HTMLImageElement
                                                      target.src = '/placeholder.svg'
                                                    }}
                                                  />
                                                )}
                                              </div>
                                            ) : (
                                              <SyntaxHighlighter
                                                language={getFileLanguage(selectedFile?.name || '')}
                                                style={oneDark}
                                                className="rounded-md"
                                                showLineNumbers
                                              >
                                                {selectedFile?.content || ''}
                                              </SyntaxHighlighter>
                                            )}
                                          </>
                                        )}
                                      </ScrollArea>
                                    </DialogContent>
                                  </Dialog>
                                ) : (
                                  <Button 
                                   
                                    className="w-full justify-start rounded bg-teal-950/40 transition-colors  hover:bg-teal-900/80   text-teal-400  " 
                                    onClick={() => handleFolderClick(item.name)}
                                  >
                                    <FolderIcon className="w-4 h-4 mr-2" />
                                    {item.name}
                                    <ChevronDown className="w-4 h-4 ml-auto" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                      {repo.homepage ? (
                        <Button  className="flex-1  rounded bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400" asChild>
                          <a href={repo.homepage} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Live Demo
                          </a>
                        </Button>
                      ) : (
                        <Button  className="flex-1  rounded bg-teal-950 transition-colors hover:bg-teal-900 ring-teal-900 ring-1 text-teal-400" asChild>
                          <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View on GitHub
                          </a>
                        </Button>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 w-full">
                      <p>Created: {formatDate(repo.created_at)}</p>
                      <p>Updated: {formatDate(repo.updated_at)}</p>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
          <footer className="mt-12 pb-6 text-center text-[#8fa3b8] border-t pt-6">
            <p>© {new Date().getFullYear()} All Rights Reserved</p>
            <p className="text-sm mt-2">
              Built with ❤️ by <a 
                className="text-blue-600 hover:underline" 
                href={`https://github.com/${username}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >{username}</a>
            </p>
          </footer>
        </>
      )}
    </div>
  )
}
