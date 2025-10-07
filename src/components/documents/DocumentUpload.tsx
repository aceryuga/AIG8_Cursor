import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  LogOut, 
  Bell, 
  HelpCircle, 
  User, 
  Upload, 
  X, 
  FileText, 
  Image, 
  FileSpreadsheet, 
  File, 
  CheckCircle, 
  AlertTriangle, 
  Calendar, 
  Tag, 
  Home, 
  Eye, 
  Trash2,
  Plus,
  Zap
} from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { Input } from '../webapp-ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { uploadDocument, fetchUserDocuments, DocumentMetadata } from '../../utils/documentUpload';
import { supabase } from '../../lib/supabase';

interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: string;
  type: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  docType: string;
  propertyId: string;
  leaseId: string;
  tenantId: string;
  ocrText?: string;
}

interface Property {
  id: string;
  name: string;
}

// Properties will be fetched from Supabase

const docTypes = [
  { id: 'lease', name: 'Lease Agreements' },
  { id: 'legal', name: 'Legal Documents' },
  { id: 'financial', name: 'Financial Records' },
  { id: 'maintenance', name: 'Maintenance' },
  { id: 'insurance', name: 'Insurance' },
  { id: 'other', name: 'Other' }
];

export const DocumentUpload: React.FC = () => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  // Fetch properties from Supabase
  useEffect(() => {
    const fetchProperties = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('properties')
          .select('id, name')
          .eq('owner_id', user.id)
          .eq('active', 'Y')
          .order('name');

        if (error) {
          console.error('Error fetching properties:', error);
        } else {
          setProperties(data || []);
        }
      } catch (err) {
        console.error('Error fetching properties:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [user?.id]);

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-600" />;
    if (type.includes('image')) return <Image className="w-8 h-8 text-blue-600" />;
    if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
    return <File className="w-8 h-8 text-gray-600" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const newFiles: UploadFile[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      progress: 0,
      status: 'uploading',
      docType: 'other',
      propertyId: '',
      leaseId: '',
      tenantId: '',
      ocrText: file.type.includes('pdf') ? 'Sample OCR text extracted from document...' : undefined
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);

    // Simulate upload progress
    newFiles.forEach((uploadFile) => {
      simulateUpload(uploadFile.id);
    });
  };

  const simulateUpload = (fileId: string) => {
    const interval = setInterval(() => {
      setUploadFiles(prev => prev.map(file => {
        if (file.id === fileId) {
          const newProgress = Math.min(file.progress + Math.random() * 30, 100);
          const newStatus = newProgress === 100 ? 'processing' : 'uploading';
          
          if (newProgress === 100) {
            setTimeout(() => {
              setUploadFiles(prev => prev.map(f => 
                f.id === fileId ? { ...f, status: 'completed' } : f
              ));
            }, 1000);
          }
          
          return { ...file, progress: newProgress, status: newStatus };
        }
        return file;
      }));
      
      if (uploadFiles.find(f => f.id === fileId)?.progress === 100) {
        clearInterval(interval);
      }
    }, 200);
  };

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const updateFileProperty = (fileId: string, property: string, value: string) => {
    setUploadFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, [property]: value } : file
    ));
  };

  const handleBatchUpload = async () => {
    if (uploadFiles.length === 0) return;
    
    setIsUploading(true);
    
    try {
      const uploadPromises = uploadFiles.map(async (uploadFile) => {
        try {
          const uploadedDoc = await uploadDocument(
            uploadFile.file,
            uploadFile.propertyId || undefined,
            uploadFile.leaseId || undefined,
            uploadFile.tenantId || undefined,
            uploadFile.docType
          );
          
          return uploadedDoc;
        } catch (error) {
          console.error(`Error uploading file ${uploadFile.name}:`, error);
          throw error;
        }
      });
      
      await Promise.all(uploadPromises);
      
      setIsUploading(false);
      setUploadComplete(true);
      
      setTimeout(() => {
        navigate('/documents');
      }, 2000);
      
    } catch (error) {
      console.error('Error uploading documents:', error);
      alert('Failed to upload documents. Please try again.');
      setIsUploading(false);
    }
  };

  const applyToAll = (property: string, value: string) => {
    setUploadFiles(prev => prev.map(file => ({ ...file, [property]: value })));
  };

  if (uploadComplete) {
    return (
      <div className="min-h-screen relative overflow-hidden floating-orbs flex items-center justify-center">
        <div className="glass-card rounded-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 glow">
            <CheckCircle className="w-8 h-8 text-green-800" />
          </div>
          <h2 className="text-2xl font-bold text-glass mb-2">Upload Complete!</h2>
          <p className="text-glass-muted mb-4">
            {uploadFiles.length} document{uploadFiles.length > 1 ? 's' : ''} uploaded successfully.
          </p>
          <p className="text-sm text-glass-muted">Redirecting to document vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden floating-orbs">
      {/* Top Navigation */}
      <header className="glass-card border-b border-white border-opacity-20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="flex items-center gap-3">
                <div className="w-8 h-8 glass rounded-lg flex items-center justify-center glow">
                  <Building2 className="w-5 h-5 text-green-800" />
                </div>
                <h1 className="text-xl font-bold text-glass">PropertyPro</h1>
              </Link>
              
              <nav className="hidden md:flex items-center gap-6">
                {[
                  { name: 'Dashboard', path: '/dashboard' },
                  { name: 'Properties', path: '/properties' },
                  { name: 'Payments', path: '/payments' },
                  { name: 'Documents', path: '/documents' },
                  { name: 'Gallery', path: '/gallery' },
                  { name: 'Settings', path: '/settings' }
                ].map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      item.path === '/documents'
                        ? 'glass text-glass'
                        : 'text-glass-muted hover:text-glass hover:bg-white hover:bg-opacity-10'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 glass rounded-lg hover:bg-white hover:bg-opacity-10 transition-all duration-200"
                >
                  <Bell size={18} className="text-glass" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    3
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-glass hidden sm:block whitespace-nowrap">{user?.name}</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="p-2">
                    <User size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2">
                    <HelpCircle size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="p-2"
                  >
                    <LogOut size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link to="/documents" className="text-glass-muted hover:text-glass flex items-center gap-1">
            <ArrowLeft size={16} />
            Documents
          </Link>
          <span className="text-glass-muted">/</span>
          <span className="text-glass">Upload</span>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-glass mb-2">Upload Documents</h1>
          <p className="text-glass-muted">Upload and organize your property documents with AI-powered categorization</p>
        </div>

        {/* Upload Area */}
        <div className="glass-card rounded-xl p-8 mb-8">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
              dragActive 
                ? 'border-green-800 bg-green-800 bg-opacity-10' 
                : 'border-white border-opacity-30 hover:border-green-800 hover:bg-green-800 hover:bg-opacity-5'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 glow">
              <Upload className="w-8 h-8 text-green-800" />
            </div>
            <h3 className="text-xl font-semibold text-glass mb-2">Drop files here or click to browse</h3>
            <p className="text-glass-muted mb-6">
              Support for PDF, Images, Excel, Word documents up to 10MB each
            </p>
            
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx,.doc"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer" type="button">
                <Plus size={16} className="mr-2" />
                Choose Files
              </Button>
            </label>
          </div>

          {/* AI Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="glass rounded-lg p-4 text-center">
              <Zap className="w-6 h-6 text-green-800 mx-auto mb-2" />
              <h4 className="font-medium text-glass mb-1">Smart Categorization</h4>
              <p className="text-sm text-glass-muted">AI automatically suggests document categories</p>
            </div>
            <div className="glass rounded-lg p-4 text-center">
              <Eye className="w-6 h-6 text-green-800 mx-auto mb-2" />
              <h4 className="font-medium text-glass mb-1">OCR Text Extraction</h4>
              <p className="text-sm text-glass-muted">Extract text from PDFs and images</p>
            </div>
            <div className="glass rounded-lg p-4 text-center">
              <Calendar className="w-6 h-6 text-green-800 mx-auto mb-2" />
              <h4 className="font-medium text-glass mb-1">Expiry Detection</h4>
              <p className="text-sm text-glass-muted">Automatically detect document expiry dates</p>
            </div>
          </div>
        </div>

        {/* Uploaded Files */}
        {uploadFiles.length > 0 && (
          <div className="glass-card rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-glass">Uploaded Files ({uploadFiles.length})</h2>
              
              {/* Batch Actions */}
              <div className="flex gap-3">
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => applyToAll('docType', e.target.value)}
                    className="glass-input rounded-lg px-3 py-2 text-glass text-sm"
                  >
                    <option value="">Apply document type to all</option>
                    {docTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => applyToAll('propertyId', e.target.value)}
                    className="glass-input rounded-lg px-3 py-2 text-glass text-sm"
                  >
                    <option value="">Apply property to all</option>
                    {properties.map((prop) => (
                      <option key={prop.id} value={prop.id}>{prop.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {uploadFiles.map((uploadFile) => (
                <div key={uploadFile.id} className="glass rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    {/* File Icon */}
                    <div className="flex-shrink-0">
                      {getFileIcon(uploadFile.type)}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-glass truncate">{uploadFile.name}</h3>
                          <p className="text-sm text-glass-muted">{uploadFile.size}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {uploadFile.status === 'completed' && (
                            <CheckCircle className="w-5 h-5 text-green-700" />
                          )}
                          {uploadFile.status === 'error' && (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          )}
                          <button
                            onClick={() => removeFile(uploadFile.id)}
                            className="p-1 hover:bg-red-100 rounded"
                          >
                            <X size={16} className="text-red-600" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {uploadFile.status === 'uploading' && (
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-glass-muted">Uploading...</span>
                            <span className="text-glass-muted">{Math.round(uploadFile.progress)}%</span>
                          </div>
                          <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                            <div
                              className="bg-green-800 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadFile.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {uploadFile.status === 'processing' && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 text-sm text-glass-muted">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-800"></div>
                            Processing with AI...
                          </div>
                        </div>
                      )}

                      {/* File Details Form */}
                      {uploadFile.status === 'completed' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-glass mb-1">Document Type</label>
                            <select
                              value={uploadFile.docType}
                              onChange={(e) => updateFileProperty(uploadFile.id, 'docType', e.target.value)}
                              className="w-full glass-input rounded-lg px-3 py-2 text-glass text-sm"
                            >
                              {docTypes.map((type) => (
                                <option key={type.id} value={type.id}>{type.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-glass mb-1">Property</label>
                            <select
                              value={uploadFile.propertyId}
                              onChange={(e) => updateFileProperty(uploadFile.id, 'propertyId', e.target.value)}
                              className="w-full glass-input rounded-lg px-3 py-2 text-glass text-sm"
                            >
                              <option value="">Select property</option>
                              {properties.map((prop) => (
                                <option key={prop.id} value={prop.id}>{prop.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-glass mb-1">Expiry Date</label>
                            <input
                              type="date"
                              value={uploadFile.expiryDate}
                              onChange={(e) => updateFileProperty(uploadFile.id, 'expiryDate', e.target.value)}
                              className="w-full glass-input rounded-lg px-3 py-2 text-glass text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-glass mb-1">Description</label>
                            <input
                              type="text"
                              value={uploadFile.description}
                              onChange={(e) => updateFileProperty(uploadFile.id, 'description', e.target.value)}
                              placeholder="Brief description"
                              className="w-full glass-input rounded-lg px-3 py-2 text-glass text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {/* OCR Preview */}
                      {uploadFile.ocrText && uploadFile.status === 'completed' && (
                        <div className="mt-4 p-3 glass rounded-lg">
                          <h4 className="text-sm font-medium text-glass mb-2 flex items-center gap-2">
                            <Eye size={14} />
                            Extracted Text Preview
                          </h4>
                          <p className="text-sm text-glass-muted">{uploadFile.ocrText}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Upload Actions */}
            <div className="flex justify-between pt-6 border-t border-white border-opacity-20 mt-6">
              <Button
                variant="outline"
                onClick={() => navigate('/documents')}
              >
                Cancel
              </Button>
              
              <Button
                onClick={handleBatchUpload}
                loading={isUploading}
                disabled={isUploading || uploadFiles.some(f => f.status !== 'completed')}
                className="flex items-center gap-2"
              >
                <Upload size={16} />
                Save All Documents
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};