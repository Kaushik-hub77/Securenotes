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
  ExternalLinkIcon
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
  
  // Auth form states
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Create/Edit note form states
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);

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
      const data = await response.json();
      if (data.success) {
        setNotes(data.data.notes);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
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
        // Store token and user data
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('user_data', JSON.stringify(data.data.user));

        setUser(data.data.user);
        setIsAuthDialogOpen(false);
        setEmail("");
        setPassword("");

        // Fetch user's notes
        fetchNotes(data.data.token);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <StickyNoteIcon className="h-12 w-12 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">SecureNotes</h1>
            <p className="text-gray-600">Your secure, encrypted note-taking companion</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Welcome Back</CardTitle>
              <CardDescription>Sign in to access your secure notes</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as "login" | "register")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="register">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleAuth} className="w-full">
                    Sign In
                  </Button>
                </TabsContent>
                
                <TabsContent value="register" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-register">Email</Label>
                    <Input
                      id="email-register"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-register">Password</Label>
                    <Input
                      id="password-register"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleAuth} className="w-full">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <StickyNoteIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">SecureNotes</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <UserIcon className="h-4 w-4" />
              <span>{user.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOutIcon className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-notes">My Notes ({filteredNotes.length})</TabsTrigger>
            <TabsTrigger value="public-notes">Public Notes ({filteredPublicNotes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="my-notes">
            {/* Search and Create */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search your notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                New Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Note</DialogTitle>
                <DialogDescription>
                  Create a new note with optional encryption and public sharing
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Note title..."
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Write your note content here..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={6}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="public"
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                    />
                    <Label htmlFor="public">Public sharing</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="encrypted"
                      checked={isEncrypted}
                      onCheckedChange={setIsEncrypted}
                    />
                    <Label htmlFor="encrypted">Encrypt content</Label>
                  </div>
                </div>
                <Button onClick={handleCreateNote} className="w-full">
                  Create Note
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

            {/* My Notes Grid */}
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12">
                <StickyNoteIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notes found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? "Try adjusting your search terms" : "Create your first note to get started"}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create your first note
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNotes.map((note) => (
              <Card key={note.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg leading-tight">{note.title}</CardTitle>
                    <div className="flex space-x-1">
                      {note.isEncrypted && <LockIcon className="h-4 w-4 text-amber-600" />}
                      {note.isPublic && <GlobeIcon className="h-4 w-4 text-green-600" />}
                    </div>
                  </div>
                  <CardDescription>
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 line-clamp-4 whitespace-pre-wrap">
                    {note.content}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {note.isPublic && <Badge variant="secondary">Public</Badge>}
                    {note.isEncrypted && <Badge variant="outline">Encrypted</Badge>}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditNote(note)}
                  >
                    <EditIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="public-notes">
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search public notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Public Notes Grid */}
            {filteredPublicNotes.length === 0 ? (
              <div className="text-center py-12">
                <GlobeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No public notes found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? "Try adjusting your search terms" : "No public notes are currently available"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPublicNotes.map((note) => (
                  <Card key={note.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg leading-tight">{note.title}</CardTitle>
                        <GlobeIcon className="h-4 w-4 text-green-600" />
                      </div>
                      <CardDescription>
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 line-clamp-4 whitespace-pre-wrap">
                        {note.content}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="secondary">Public</Badge>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/public/${note.publicUrl}`, '_blank')}
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/public/${note.publicUrl}`)}
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

        {/* Edit Dialog */}
        <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Note</DialogTitle>
              <DialogDescription>
                Update your note content and settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  placeholder="Note title..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">Content</Label>
                <Textarea
                  id="edit-content"
                  placeholder="Write your note content here..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={6}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-public"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                  <Label htmlFor="edit-public">Public sharing</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-encrypted"
                    checked={isEncrypted}
                    onCheckedChange={setIsEncrypted}
                  />
                  <Label htmlFor="edit-encrypted">Encrypt content</Label>
                </div>
              </div>
              <Button onClick={handleUpdateNote} className="w-full">
                Update Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
