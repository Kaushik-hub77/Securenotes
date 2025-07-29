import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StickyNoteIcon, HomeIcon, LockIcon } from "lucide-react";

interface PublicNote {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function PublicNote() {
  const { publicUrl } = useParams<{ publicUrl: string }>();
  const [note, setNote] = useState<PublicNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicNote = async () => {
      try {
        const response = await fetch(`/api/public/${publicUrl}`);
        const data = await response.json();
        
        if (data.success) {
          setNote(data.data);
        } else {
          setError(data.error || "Note not found");
        }
      } catch (err) {
        setError("Failed to load note");
      } finally {
        setLoading(false);
      }
    };

    if (publicUrl) {
      fetchPublicNote();
    }
  }, [publicUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading note...</p>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <LockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Note Not Found</h1>
          <p className="text-gray-600 mb-6">
            This note doesn't exist or is no longer publicly accessible.
          </p>
          <Link to="/">
            <Button>
              <HomeIcon className="h-4 w-4 mr-2" />
              Go to SecureNotes
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <StickyNoteIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">SecureNotes</h1>
          </Link>
          <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
            📖 Public Note
          </div>
        </div>
      </div>

      {/* Note Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl text-gray-900">{note.title}</CardTitle>
            <div className="text-sm text-gray-500">
              Created: {new Date(note.createdAt).toLocaleDateString()} • 
              Last updated: {new Date(note.updatedAt).toLocaleDateString()}
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-gray max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
                {note.content}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 pt-8 border-t border-gray-200">
          <p className="text-gray-600 mb-4">
            This note was shared from SecureNotes - a secure note-taking app
          </p>
          <Link to="/">
            <Button variant="outline">
              <StickyNoteIcon className="h-4 w-4 mr-2" />
              Create your own secure notes
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
