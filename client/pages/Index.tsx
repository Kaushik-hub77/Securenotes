import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  LockIcon,
  GlobeIcon,
  StickyNoteIcon,
  SearchIcon,
  LogOutIcon,
  UserIcon,
  EyeIcon,
  ExternalLinkIcon,
  SparklesIcon,
  ShieldIcon,
  ZapIcon,
  SunIcon,
  MoonIcon
} from "lucide-react";
import { Note, CreateNoteRequest, User } from "@shared/api";

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [publicNotes, setPublicNotes] = useState<Note[]>([]);
  const [activeTab, setActiveTab] = useState("my-notes");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Auth form states
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Create/Edit note form states
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);
  
  // DeepSeek AI summarization states
  const [noteSummary, setNoteSummary] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);

  // DeepSeek AI summarization
  const handleSummarize = async () => {
    const content = editingNote ? editingNote.content : noteContent;
    if (!content.trim()) {
      alert("Please enter some content to summarize");
      return;
    }

    try {
      setIsSummarizing(true);
      setNoteSummary("");
      
      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      if (!apiKey) {
        alert("OpenRouter API key not configured. Please add VITE_OPENROUTER_API_KEY to your .env file.");
        setIsSummarizing(false);
        return;
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "SecureNotes App",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat-v3-0324:free",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that summarizes text concisely."
            },
            {
              role: "user",
              content: `Please summarize the following text in 2-3 sentences:\n\n${content}`
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const summary = data.choices[0]?.message?.content?.trim() || "Unable to generate summary";
      setNoteSummary(summary);
    } catch (error) {
      console.error("Summarization error:", error);
      alert(`Failed to summarize content: ${error.message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Fetch public notes
  const fetchPublicNotes = async () => {
    try {
      const response = await fetch("/api/public-notes");
      const data = await response.json();
      if (data.success) {
        setPublicNotes(data.data.notes);
      }
    } catch (error) {
      console.error("Error fetching public notes:", error);
      setPublicNotes([]);
    }
  };

  // Check for existing auth token on load
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');

    if (token && userData) {
      setUser(JSON.parse(userData));
      fetchNotes(token);
    }
    fetchPublicNotes();
  }, []);

  const fetchNotes = async (token: string) => {
    try {
      const response = await fetch('/api/notes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.error('Failed to fetch notes:', response.status);
        setNotes([]);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setNotes(data.data.notes || []);
      } else {
        console.error('Error in notes response:', data.error);
        setNotes([]);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      setNotes([]);
    }
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPublicNotes = publicNotes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          isPublic,
          isEncrypted
        })
      });

      const data = await response.json();
      if (data.success) {
        setNotes([data.data, ...notes]);
        setNoteTitle("");
        setNoteContent("");
        setIsPublic(false);
        setIsEncrypted(false);
        setIsCreateDialogOpen(false);

        // Refresh public notes if note was made public
        if (isPublic) {
          fetchPublicNotes();
        }
      } else {
        alert(data.error || "Failed to create note");
      }
    } catch (error) {
      console.error("Error creating note:", error);
      alert("Failed to create note");
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setIsPublic(note.isPublic);
    setIsEncrypted(note.isEncrypted);
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !noteTitle.trim() || !noteContent.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/notes/${editingNote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          isPublic,
          isEncrypted
        })
      });

      const data = await response.json();
      if (data.success) {
        const updatedNotes = notes.map(note =>
          note.id === editingNote.id ? data.data : note
        );
        setNotes(updatedNotes);
        setEditingNote(null);
        setNoteTitle("");
        setNoteContent("");
        setIsPublic(false);
        setIsEncrypted(false);

        // Refresh public notes if visibility changed
        fetchPublicNotes();
      } else {
        alert(data.error || "Failed to update note");
      }
    } catch (error) {
      console.error("Error updating note:", error);
      alert("Failed to update note");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setNotes(notes.filter(note => note.id !== noteId));
        // Refresh public notes in case a public note was deleted
        fetchPublicNotes();
      } else {
        alert(data.error || "Failed to delete note");
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Failed to delete note");
    }
  };

  const handleAuth = async () => {
    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        if (authMode === "login") {
          // For login: Store token and user data, then log in
          localStorage.setItem('auth_token', data.data.token);
          localStorage.setItem('user_data', JSON.stringify(data.data.user));

          setUser(data.data.user);
          setIsAuthDialogOpen(false);
          setEmail("");
          setPassword("");

          // Fetch user's notes
          fetchNotes(data.data.token);
        } else {
          // For register: Just show success message and switch to login tab
          alert("Account created successfully! You can now sign in with your email and password.");
          setAuthMode("login");
          setEmail("");
          setPassword("");
        }
      } else {
        alert(data.error || "Authentication failed");
      }
    } catch (error) {
      console.error("Auth error:", error);
      alert("Network error. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setUser(null);
    setNotes([]);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background elements - reduced glow in dark mode */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 dark:from-blue-400/10 dark:to-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 dark:from-purple-400/10 dark:to-pink-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-blue-400/10 dark:from-indigo-400/5 dark:to-blue-400/5 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 rounded-2xl blur-lg opacity-75 dark:opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 p-4 rounded-2xl">
                  <StickyNoteIcon className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-3">
              SecureNotes
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
              Your secure, encrypted note-taking companion with enterprise-grade protection
            </p>
            <div className="flex items-center justify-center space-x-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <ShieldIcon className="h-4 w-4 text-green-500" />
                <span>End-to-end encryption</span>
              </div>
              <div className="flex items-center space-x-1">
                <ZapIcon className="h-4 w-4 text-blue-500" />
                <span>Lightning fast</span>
              </div>
            </div>
          </div>
          
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-0 shadow-2xl dark:shadow-gray-900/50">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">Welcome Back</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Sign in to access your secure notes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as "login" | "register")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                  <TabsTrigger 
                    value="login" 
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm data-[state=active]:text-gray-900 dark:data-[state=active]:text-white rounded-lg transition-all duration-200"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register" 
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm data-[state=active]:text-gray-900 dark:data-[state=active]:text-white rounded-lg transition-all duration-200"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-200">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-200">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                    />
                  </div>
                  <Button 
                    onClick={handleAuth} 
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </TabsContent>
                
                <TabsContent value="register" className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="email-register" className="text-sm font-medium text-gray-700 dark:text-gray-200">Email</Label>
                    <Input
                      id="email-register"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-register" className="text-sm font-medium text-gray-700 dark:text-gray-200">Password</Label>
                    <Input
                      id="password-register"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                    />
                  </div>
                  <Button 
                    onClick={handleAuth} 
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    Create Account
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Enhanced Header */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 rounded-xl blur-sm opacity-75 dark:opacity-50"></div>
              <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 p-2 rounded-xl">
                <StickyNoteIcon className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                SecureNotes
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enterprise-grade security</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-200/50 dark:border-gray-600/50">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <UserIcon className="h-4 w-4" />
                <span className="font-medium">{user.email}</span>
              </div>
            </div>
            
            {/* Theme Toggle */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleTheme}
              className="border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {isDarkMode ? (
                <SunIcon className="h-4 w-4" />
              ) : (
                <MoonIcon className="h-4 w-4" />
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <LogOutIcon className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl h-14">
            <TabsTrigger 
              value="my-notes" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm data-[state=active]:text-gray-900 dark:data-[state=active]:text-white rounded-lg transition-all duration-200 font-medium"
            >
              My Notes ({filteredNotes.length})
            </TabsTrigger>
            <TabsTrigger 
              value="public-notes" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm data-[state=active]:text-gray-900 dark:data-[state=active]:text-white rounded-lg transition-all duration-200 font-medium"
            >
              Public Notes ({filteredPublicNotes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-notes" className="space-y-6">
            {/* Enhanced Search and Create */}
            <div className="flex flex-col lg:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search your notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors rounded-xl"
                />
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-12 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    New Note
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl dark:bg-gray-800 dark:border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-semibold dark:text-white">Create New Note</DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-300">
                      Create a new note with optional encryption and public sharing
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-200">Title</Label>
                      <Input
                        id="title"
                        placeholder="Note title..."
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        className="h-12 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content" className="text-sm font-medium text-gray-700 dark:text-gray-200">Content</Label>
                      <Textarea
                        id="content"
                        placeholder="Write your note content here..."
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        rows={8}
                        className="border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors resize-none"
                      />
                    </div>

                    <div className="space-y-4">
                      <Button
                        onClick={handleSummarize}
                        disabled={isSummarizing}
                        className="w-full h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-200"
                      >
                        {isSummarizing ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Summarizing...
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="h-5 w-5 mr-2" />
                            Summarize with DeepSeek
                          </>
                        )}
                      </Button>

                      {noteSummary && (
                        <div className="space-y-2">
                          <Label htmlFor="summary" className="text-sm font-medium text-gray-700 dark:text-gray-200">AI Summary</Label>
                          <Textarea
                            id="summary"
                            value={noteSummary}
                            onChange={(e) => setNoteSummary(e.target.value)}
                            rows={4}
                            className="border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors resize-none"
                            placeholder="AI-generated summary will appear here..."
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <Switch
                          id="public"
                          checked={isPublic}
                          onCheckedChange={setIsPublic}
                        />
                        <div>
                          <Label htmlFor="public" className="text-sm font-medium text-gray-700 dark:text-gray-200">Public sharing</Label>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Make this note visible to everyone</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Switch
                          id="encrypted"
                          checked={isEncrypted}
                          onCheckedChange={setIsEncrypted}
                        />
                        <div>
                          <Label htmlFor="encrypted" className="text-sm font-medium text-gray-700 dark:text-gray-200">Encrypt content</Label>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Add extra security layer</p>
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={handleCreateNote} 
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200"
                    >
                      <SparklesIcon className="h-5 w-5 mr-2" />
                      Create Note
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Enhanced My Notes Grid */}
            {filteredNotes.length === 0 ? (
              <div className="text-center py-16">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 dark:from-blue-400/10 dark:to-purple-400/10 rounded-full blur-2xl"></div>
                  <StickyNoteIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto relative z-10" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">No notes found</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                  {searchTerm ? "Try adjusting your search terms" : "Create your first note to get started with secure note-taking"}
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create your first note
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredNotes.map((note) => (
                  <Card key={note.id} className="group hover:shadow-xl dark:hover:shadow-gray-900/50 transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg leading-tight font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {note.title}
                        </CardTitle>
                        <div className="flex space-x-1">
                          {note.isEncrypted && (
                            <div className="p-1 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                              <LockIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                          )}
                          {note.isPublic && (
                            <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-lg">
                              <GlobeIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                          )}
                        </div>
                      </div>
                      <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(note.updatedAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="text-gray-700 dark:text-gray-300 line-clamp-4 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {note.isPublic && (
                          <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                            <GlobeIcon className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        )}
                        {note.isEncrypted && (
                          <Badge variant="outline" className="border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400">
                            <LockIcon className="h-3 w-3 mr-1" />
                            Encrypted
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2 pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditNote(note)}
                        className="border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-200 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <EditIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                        className="border-gray-200 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-200 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="public-notes" className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search public notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors rounded-xl"
                />
              </div>
            </div>

            {/* Enhanced Public Notes Grid */}
            {filteredPublicNotes.length === 0 ? (
              <div className="text-center py-16">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-blue-400/20 dark:from-green-400/10 dark:to-blue-400/10 rounded-full blur-2xl"></div>
                  <GlobeIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto relative z-10" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">No public notes found</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                  {searchTerm ? "Try adjusting your search terms" : "No public notes are currently available"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPublicNotes.map((note) => (
                  <Card key={note.id} className="group hover:shadow-xl dark:hover:shadow-gray-900/50 transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg leading-tight font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                          {note.title}
                        </CardTitle>
                        <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <GlobeIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                      <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(note.updatedAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="text-gray-700 dark:text-gray-300 line-clamp-4 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                          <GlobeIcon className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2 pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/public/${note.publicUrl}`, '_blank')}
                        className="border-gray-200 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/30 hover:border-green-200 dark:hover:border-green-700 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/public/${note.publicUrl}`)}
                        className="border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-200 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <ExternalLinkIcon className="h-4 w-4 mr-1" />
                        Share
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Enhanced Edit Dialog */}
        <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
          <DialogContent className="max-w-2xl dark:bg-gray-800 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold dark:text-white">Edit Note</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                Update your note content and settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-sm font-medium text-gray-700 dark:text-gray-200">Title</Label>
                <Input
                  id="edit-title"
                  placeholder="Note title..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="h-12 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content" className="text-sm font-medium text-gray-700 dark:text-gray-200">Content</Label>
                <Textarea
                  id="edit-content"
                  placeholder="Write your note content here..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={8}
                  className="border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors resize-none"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Switch
                    id="edit-public"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                  <div>
                    <Label htmlFor="edit-public" className="text-sm font-medium text-gray-700 dark:text-gray-200">Public sharing</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Make this note visible to everyone</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Switch
                    id="edit-encrypted"
                    checked={isEncrypted}
                    onCheckedChange={setIsEncrypted}
                  />
                  <div>
                    <Label htmlFor="edit-encrypted" className="text-sm font-medium text-gray-700 dark:text-gray-200">Encrypt content</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Add extra security layer</p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleUpdateNote} 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200"
              >
                <SparklesIcon className="h-5 w-5 mr-2" />
                Update Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
