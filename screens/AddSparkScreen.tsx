import React, { useState, useEffect, useRef } from 'react';
import type { Tag, Attachment } from '../types';
import type { Screen } from '../App';
import { getTags, autoTagContent, addSpark, getContentFromUrl } from '../services/geminiService';
import { AutoTagIcon, ClipboardIcon, MicrophoneIcon, UploadIcon, DriveIcon, CloseIcon, FileIcon, ImageIcon, PdfIcon, DocIcon } from '../components/icons';

declare const gapi: any;
declare const google: any;

interface AddSparkScreenProps {
  setActiveScreen: (screen: Screen) => void;
}

const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-purple-400" />;
    if (mimeType === 'application/pdf') return <PdfIcon className="h-5 w-5 text-red-400" />;
    if (mimeType.includes('document') || mimeType.includes('msword')) return <DocIcon className="h-5 w-5 text-blue-400" />;
    return <FileIcon className="h-5 w-5 text-gray-400" />;
};


const AddSparkScreen: React.FC<AddSparkScreenProps> = ({ setActiveScreen }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      const tags = await getTags();
      setAvailableTags(tags);
    };
    fetchTags();

    const loadGapi = () => {
        if ((window as any).gapi) {
            gapi.load('picker', { 'callback': () => setPickerApiLoaded(true) });
        }
    };
    loadGapi();
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'he-IL';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setContent(prev => prev + finalTranscript);
      };
    }

  }, []);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  };

  const handleAutoTag = async () => {
    if (!content || isAutoTagging) return;
    setIsAutoTagging(true);
    try {
      const tagIds = await autoTagContent(content, availableTags);
      setSelectedTagIds(new Set(tagIds));
    } catch (error) {
      console.error("Auto-tagging failed:", error);
      alert("שגיאה בתיוג האוטומטי.");
    } finally {
      setIsAutoTagging(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const selectedTags = availableTags.filter(t => selectedTagIds.has(t.id));
      await addSpark({ title, content, tags: selectedTags, attachments });
      setTitle('');
      setContent('');
      setUrl('');
      setAttachments([]);
      setSelectedTagIds(new Set());
      alert('ספארק נוסף בהצלחה!');
      setActiveScreen('feed');
    } catch (error) {
      console.error("Failed to add spark:", error);
      alert("שגיאה בהוספת הספארק.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleFetchUrl = async () => {
    if (!url || isFetchingUrl) return;
    setIsFetchingUrl(true);
    try {
      const { title: fetchedTitle, content: fetchedContent } = await getContentFromUrl(url);
      setTitle(fetchedTitle);
      setContent(fetchedContent);
    } catch(error) {
      console.error("URL Fetch failed:", error);
      alert("שגיאה בייבוא מהכתובת.");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setContent(prev => prev ? `${prev}\n${text}`: text);
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
      alert("לא ניתן היה להדביק מהלוח.");
    }
  };

  const handleToggleRecording = () => {
    if (!recognitionRef.current) {
        alert("זיהוי קולי אינו נתמך בדפדפן זה.");
        return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleFileUploadClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const reader = new FileReader();
          reader.onload = (e) => {
              const newAttachment: Attachment = {
                  name: file.name,
                  type: 'local',
                  url: e.target?.result as string,
                  mimeType: file.type,
              };
              setAttachments(prev => [...prev, newAttachment]);
          };
          reader.readAsDataURL(file);
      }
      // Reset file input
      event.target.value = '';
  };
  
  const handleDrivePickerClick = () => {
      if (!pickerApiLoaded) {
          alert('Google Picker API is not ready yet.');
          return;
      }
  
      // This function will be called when the user picks a file.
      const pickerCallback = (data: any) => {
          if (data.action === google.picker.Action.PICKED) {
              const doc = data.docs[0];
              const newAttachment: Attachment = {
                  name: doc.name,
                  type: 'drive',
                  url: doc.url, // This is the viewer URL, not direct download
                  mimeType: doc.mimeType,
              };
              setAttachments(prev => [...prev, newAttachment]);
          }
      };
      
      const view = new google.picker.View(google.picker.ViewId.DOCS);
      const picker = new google.picker.PickerBuilder()
          .addView(view)
          .setDeveloperKey(process.env.API_KEY!) // Use the environment API key
          .setCallback(pickerCallback)
          .build();
      picker.setVisible(true);
  };


  const removeAttachment = (index: number) => {
      setAttachments(prev => prev.filter((_, i) => i !== index));
  };


  const inputStyles = "w-full bg-gray-800/80 border border-[var(--border-color)] text-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow";

  return (
    <div className="pt-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-100">הוסף ספארק</h1>
      
      <div className="space-y-4 mb-8 bg-gray-900/50 p-4 rounded-xl border border-[var(--border-color)]">
        <label htmlFor="url" className="block text-sm font-medium text-gray-400 mb-1">ייבא מכתובת (URL)</label>
        <div className="flex gap-2">
           <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="הדבק כתובת מאמר..."
            className={inputStyles}
          />
          <button
            type="button"
            onClick={handleFetchUrl}
            disabled={!url || isFetchingUrl}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-5 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition-transform transform active:scale-95"
          >
            {isFetchingUrl ? 'מייבא...' : 'ייבא'}
          </button>
        </div>
        <p className="text-xs text-center text-gray-600">הייבוא משתמש ב-AI כדי לסכם את תוכן הכתבה</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">כותרת</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputStyles}
            required
          />
        </div>
        <div className="relative">
          <label htmlFor="content" className="block text-sm font-medium text-gray-400 mb-1">תוכן</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className={inputStyles}
            required
          />
          <div className="absolute top-8 left-3 flex flex-col gap-2">
            <button type="button" onClick={handlePaste} className="text-gray-400 hover:text-white" aria-label="הדבק מהלוח">
              <ClipboardIcon className="h-5 w-5"/>
            </button>
             <button
                type="button"
                onClick={handleToggleRecording}
                className={`p-1 rounded-full ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-white'}`}
                aria-label={isRecording ? 'הפסק הקלטה' : 'התחל הקלטה'}
            >
                <MicrophoneIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
         <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">קבצים מצורפים</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <button type="button" onClick={handleFileUploadClick} className="flex items-center justify-center gap-2 bg-gray-700/80 hover:bg-gray-600/80 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                    <UploadIcon className="h-5 w-5" />
                    העלאת קובץ
                </button>
                <button type="button" onClick={handleDrivePickerClick} disabled={!pickerApiLoaded} className="flex items-center justify-center gap-2 bg-gray-700/80 hover:bg-gray-600/80 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <DriveIcon className="h-5 w-5" />
                    הוספה מ-Drive
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
            </div>
            {attachments.length > 0 && (
                <div className="space-y-2 p-3 bg-gray-800/80 border border-[var(--border-color)] rounded-lg">
                    {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md">
                            <div className="flex items-center gap-2 overflow-hidden">
                                {getFileIcon(file.mimeType)}
                                <span className="text-sm text-gray-300 truncate">{file.name}</span>
                            </div>
                            <button type="button" onClick={() => removeAttachment(index)} className="text-gray-500 hover:text-red-400">
                                <CloseIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-400">תגיות</h3>
            <button
              type="button"
              onClick={handleAutoTag}
              disabled={!content || isAutoTagging}
              className="flex items-center text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              <AutoTagIcon className="h-4 w-4 ml-1" />
              {isAutoTagging ? 'מתייג...' : 'תייג אוטומטית'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 p-3 bg-gray-800 border border-[var(--border-color)] rounded-lg min-h-[4rem]">
            {availableTags.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedTagIds.has(tag.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={!title || !content || isSubmitting}
          className="w-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-lg disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-100 shadow-lg shadow-blue-900/30"
        >
          {isSubmitting ? 'מוסיף...' : 'הוסף ספארק'}
        </button>
      </form>
    </div>
  );
};

export default AddSparkScreen;