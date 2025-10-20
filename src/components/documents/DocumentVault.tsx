import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  LogOut, 
  Bell, 
  HelpCircle, 
  User, 
  Plus, 
  Search, 
  Grid3x3 as Grid3X3, 
  List, 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  AlertTriangle,
  Folder,
  Image,
  FileSpreadsheet,
  File,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Trash2
} from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { Input } from '../webapp-ui/Input';
import { NotificationBell } from '../ui/NotificationBell';
import { useAuth } from '../../hooks/useAuth';
import { fetchUserDocuments, uploadDocument, softDeleteDocument } from '../../utils/documentUpload';
import { supabase } from '../../lib/supabase';
import { getRelativeTime } from '../../utils/timezoneUtils';
import { formatFileSize } from '../../utils/propertyImages';
import { getUserSubscription, type UserSubscription } from '../../utils/settingsUtils';

interface Document {
  id: string;
  name: string;
  doc_type?: string;
  propertyName: string;
  type: string;
  size: string;
  uploadDate: string;
  url: string;
  thumbnail: string;
}


// Mock data removed - using real data from Supabase

// Base category definitions (without counts)
const baseCategories = [
  { id: 'lease', name: 'Lease Agreements', icon: FileText, color: 'bg-blue-100 text-blue-700' },
  { id: 'legal', name: 'Legal Documents', icon: FileText, color: 'bg-purple-100 text-purple-700' },
  { id: 'financial', name: 'Financial Records', icon: FileSpreadsheet, color: 'bg-green-100 text-green-700' },
  { id: 'maintenance', name: 'Maintenance', icon: File, color: 'bg-orange-100 text-orange-600' },
  { id: 'insurance', name: 'Insurance', icon: FileText, color: 'bg-red-100 text-red-600' },
  { id: 'id_proof', name: 'ID Proof', icon: FileText, color: 'bg-indigo-100 text-indigo-700' },
  { id: 'other', name: 'Other', icon: Folder, color: 'bg-gray-100 text-gray-600' }
];

const docTypes = [
  { id: 'lease', name: 'Lease Agreement' },
  { id: 'legal', name: 'Legal Document' },
  { id: 'financial', name: 'Financial Record' },
  { id: 'maintenance', name: 'Maintenance Record' },
  { id: 'insurance', name: 'Insurance Document' },
  { id: 'id_proof', name: 'ID Proof' },
  { id: 'other', name: 'Other' }
];

export const DocumentVault: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [showFilters, setShowFilters] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<{id: string, name: string}[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedDocType, setSelectedDocType] = useState<string>('other');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  // Fetch documents and properties from Supabase
  useEffect(() => {
    const fetchData = async () => {
      console.log('DocumentVault: fetchData called, user:', user?.id);
      if (!user?.id) {
        console.log('No user ID, setting loading to false');
        setLoading(false);
        return;
      }

      try {
        console.log('Starting data fetch...');
        setLoading(true);
        
        // Fetch user subscription plan for storage limit display
        try {
          const subscription = await getUserSubscription(user.id);
          setUserSubscription(subscription);
        } catch (e) {
          console.warn('Failed to fetch user subscription for DocumentVault:', e);
        }

        // Fetch documents
        console.log('Fetching user documents...');
        const documentsData = await fetchUserDocuments();
        console.log('Fetched documents:', documentsData);
        
        // Fetch properties for property names
        console.log('Fetching properties...');
        const { data: propertiesData, error: propertiesError } = await supabase
          .from('properties')
          .select('id, name')
          .eq('owner_id', user.id)
          .eq('active', 'Y');

        if (propertiesError) {
          console.error('Error fetching properties:', propertiesError);
        } else {
          console.log('Fetched properties:', propertiesData);
        }

        const propertiesMap = new Map((propertiesData || []).map(p => [p.id, p.name]));
        console.log('Properties map:', propertiesMap);
        
        // Transform documents data
        const transformedDocuments: Document[] = documentsData.map(doc => ({
          id: doc.id,
          name: doc.name,
          doc_type: doc.doc_type,
          propertyName: doc.property_id ? (propertiesMap.get(doc.property_id) || 'Unknown Property') : 'General',
          type: doc.doc_type || 'Unknown',
          size: doc.file_size ? formatFileSize(doc.file_size) : 'Unknown',
          uploadDate: doc.uploaded_at || '',
          url: doc.url,
          thumbnail: 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=400'
        }));

        console.log('Transformed documents:', transformedDocuments);
        setDocuments(transformedDocuments);
        setProperties(propertiesData || []);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        console.log('Data fetch completed, setting loading to false');
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // File upload handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File upload triggered:', e.target.files);
    const files = Array.from(e.target.files || []);
    console.log('Files selected:', files);
    setUploadFiles(prev => [...prev, ...files]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      // Add visual feedback for drag over
    } else if (e.type === 'dragleave') {
      // Remove visual feedback
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    console.log('Files dropped:', files);
    setUploadFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      await softDeleteDocument(documentId);
      
      // Refresh documents list
      const documentsData = await fetchUserDocuments();
      const propertiesData = await supabase
        .from('properties')
        .select('id, name')
        .eq('owner_id', user?.id)
        .eq('active', 'Y');

      if (propertiesData.error) {
        throw propertiesData.error;
      }

      const propertiesMap = new Map(propertiesData.data?.map(p => [p.id, p.name]) || []);
      
      const formattedDocuments: Document[] = documentsData.map(doc => ({
        id: doc.id,
        name: doc.name,
        doc_type: doc.doc_type,
        propertyName: propertiesMap.get(doc.property_id || '') || 'Unknown Property',
        type: doc.doc_type || 'Unknown',
        size: doc.file_size ? formatFileSize(doc.file_size) : 'Unknown',
        uploadDate: doc.uploaded_at || '',
        url: doc.url || '',
        thumbnail: '/api/placeholder/150/150'
      }));

      setDocuments(formattedDocuments);
      alert('Document deleted successfully!');
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const handleUpload = async () => {
    console.log('Upload button clicked, files:', uploadFiles);
    console.log('Selected property:', selectedPropertyId);
    console.log('Selected doc type:', selectedDocType);
    
    if (uploadFiles.length === 0) {
      console.log('No files to upload');
      return;
    }
    
    if (!selectedPropertyId) {
      alert('Please select a property for the documents');
      return;
    }
    
    console.log('Starting upload process...');
    setUploading(true);
    
    try {
      console.log('Creating upload promises for', uploadFiles.length, 'files');
      const uploadPromises = uploadFiles.map(async (file, index) => {
        console.log(`Uploading file ${index + 1}:`, file.name);
        return await uploadDocument(
          file,
          selectedPropertyId, // propertyId
          undefined, // leaseId
          undefined, // tenantId
          selectedDocType // docType
        );
      });
      
      console.log('Waiting for all uploads to complete...');
      await Promise.all(uploadPromises);
      console.log('All uploads completed successfully');
      
      // Refresh documents
      console.log('Refreshing documents list...');
      const documentsData = await fetchUserDocuments();
      console.log('Fetched documents:', documentsData);
      
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('id, name')
        .eq('owner_id', user?.id)
        .eq('active', 'Y');

      const propertiesMap = new Map((propertiesData || []).map(p => [p.id, p.name]));
      
      const transformedDocuments: Document[] = documentsData.map(doc => ({
        id: doc.id,
        name: doc.name,
        doc_type: doc.doc_type,
        propertyName: doc.property_id ? (propertiesMap.get(doc.property_id) || 'Unknown Property') : 'General',
        type: doc.doc_type || 'Unknown',
        size: doc.file_size ? formatFileSize(doc.file_size) : 'Unknown',
        uploadDate: doc.uploaded_at || '',
        url: doc.url,
        thumbnail: 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=400'
      }));

      console.log('Setting documents state:', transformedDocuments);
      setDocuments(transformedDocuments);
      setUploadFiles([]);
      setShowUploadModal(false);
      alert(`${uploadFiles.length} document(s) uploaded successfully!`);
      
    } catch (error) {
      console.error('Error uploading documents:', error);
      alert('Failed to upload documents. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.propertyName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || doc.doc_type === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Calculate real stats from documents and property images
  // We need to get the raw file_size from the database for accurate calculation
  const [totalStorageBytes, setTotalStorageBytes] = useState(0);
  
  useEffect(() => {
    const calculateStorage = async () => {
      if (!user?.id) return;
      
      try {
        // Get documents storage
        const { data: documentsData, error: documentsError } = await supabase
          .from('documents')
          .select('file_size')
          .eq('uploaded_by', user.id)
          .not('name', 'like', '[DELETED]%');
          
        if (documentsError) {
          console.error('Error fetching documents storage:', documentsError);
          throw documentsError;
        }
        
        // Get user's property IDs first
        const { data: userProperties, error: propertiesError } = await supabase
          .from('properties')
          .select('id')
          .eq('owner_id', user.id)
          .eq('active', 'Y');
          
        if (propertiesError) {
          console.error('Error fetching properties:', propertiesError);
          throw propertiesError;
        }
        
        const propertyIds = userProperties?.map(p => p.id) || [];
        
        // Get property images storage using the property IDs
        let imagesData = [];
        if (propertyIds.length > 0) {
          const { data, error: imagesError } = await supabase
            .from('property_images')
            .select('image_size')
            .in('property_id', propertyIds);
            
          if (imagesError) {
            console.error('Error fetching images storage:', imagesError);
            throw imagesError;
          }
          imagesData = data || [];
        }
        
        // Calculate total storage from both sources
        const documentsBytes = documentsData?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0;
        const imagesBytes = imagesData?.reduce((sum, img) => sum + (img.image_size || 0), 0) || 0;
        const totalBytes = documentsBytes + imagesBytes;
        
        console.log('Storage calculation:', {
          documentsCount: documentsData?.length || 0,
          documentsBytes,
          imagesCount: imagesData?.length || 0,
          imagesBytes,
          totalBytes
        });
        
        setTotalStorageBytes(totalBytes);
      } catch (error) {
        console.error('Error calculating storage:', error);
      }
    };
    
    calculateStorage();
  }, [user?.id, documents.length]);

  const stats = {
    totalDocuments: documents.length,
    expiringDocuments: 0, // We don't have expiry dates in the current schema
    storageUsed: formatFileSize(totalStorageBytes),
    categoriesCount: new Set(documents.map(doc => doc.doc_type)).size
  };

  // Calculate actual category counts from documents
  const getCategoryCount = (categoryId: string) => {
    return documents.filter(doc => doc.doc_type === categoryId).length;
  };

  // Create categories with real counts
  const categories = baseCategories.map(category => ({
    ...category,
    count: getCategoryCount(category.id)
  }));

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'size':
        return parseFloat(a.size) - parseFloat(b.size);
      case 'date':
      default:
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
    }
  });


  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-6 h-6 text-red-600" />;
      case 'excel': return <FileSpreadsheet className="w-6 h-6 text-green-600" />;
      case 'image': return <Image className="w-6 h-6 text-blue-600" />;
      case 'lease': return <FileText className="w-6 h-6 text-blue-600" />;
      case 'legal': return <FileText className="w-6 h-6 text-purple-600" />;
      case 'financial': return <FileSpreadsheet className="w-6 h-6 text-green-600" />;
      case 'maintenance': return <File className="w-6 h-6 text-orange-600" />;
      case 'insurance': return <FileText className="w-6 h-6 text-red-600" />;
      case 'id_proof': return <FileText className="w-6 h-6 text-indigo-600" />;
      default: return <File className="w-6 h-6 text-gray-600" />;
    }
  };

  const DocumentCard: React.FC<{ document: Document }> = ({ document }) => (
    <div className="glass-card rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 glow group">
      <div className="relative h-48">
        <img
          src={document.thumbnail}
          alt={document.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3 flex gap-2">
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            {document.doc_type || 'Document'}
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="flex-1 text-xs"
              onClick={() => window.open(document.url, '_blank')}
            >
              <Eye size={12} className="mr-1" />
              View
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 text-xs"
              onClick={() => {
                const link = window.document.createElement('a');
                link.href = document.url;
                link.download = document.name;
                link.click();
              }}
            >
              <Download size={12} className="mr-1" />
              Download
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-100"
              onClick={() => handleDeleteDocument(document.id)}
              title="Delete document"
            >
              <Trash2 size={12} />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          {getFileIcon(document.doc_type || document.type)}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-glass truncate">{document.name}</h3>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                {document.doc_type || 'Document'}
              </span>
              <span className="text-xs text-glass-muted">•</span>
              <span className="text-xs text-glass-muted">{document.propertyName}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-glass-muted">{document.size}</span>
          <span className="text-xs text-glass-muted">
            {getRelativeTime(document.uploadDate)}
          </span>
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => window.open(document.url, '_blank')}
        >
          View Document
        </Button>
      </div>
    </div>
  );

  const DocumentListItem: React.FC<{ document: Document }> = ({ document }) => (
    <div className="glass-card rounded-xl p-4 hover:scale-[1.02] transition-all duration-300 glow">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 glass rounded-lg flex items-center justify-center">
          {getFileIcon(document.doc_type || document.type)}
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-glass">{document.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {document.doc_type || 'Document'}
                </span>
                <span className="text-xs text-glass-muted">•</span>
                <span className="text-sm text-glass-muted">{document.propertyName}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-glass-muted">Size: {document.size}</p>
                <p className="text-xs text-glass-muted">
                  Uploaded: {getRelativeTime(document.uploadDate)}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => window.open(document.url, '_blank')}
              >
                <Eye size={14} className="mr-1" />
                View
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  const link = window.document.createElement('a');
                  link.href = document.url;
                  link.download = document.name;
                  link.click();
                }}
              >
                <Download size={14} />
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-100"
                onClick={() => handleDeleteDocument(document.id)}
                title="Delete document"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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
                  { name: 'Home', path: '/' },
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
              {/* Notification Bell */}
              <NotificationBell />

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-glass mb-2">Document Vault</h1>
            <p className="text-glass-muted">Manage all your property documents in one place</p>
          </div>
          <Button 
            className="flex items-center gap-2"
            onClick={() => {
              console.log('Upload Documents button clicked');
              setShowUploadModal(true);
            }}
          >
            <Plus size={18} />
            Upload Documents
          </Button>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card rounded-xl p-6 glow animate-pulse">
                <div className="w-12 h-12 glass rounded-lg mb-4"></div>
                <div className="h-4 bg-white bg-opacity-20 rounded mb-2"></div>
                <div className="h-8 bg-white bg-opacity-20 rounded mb-2"></div>
                <div className="h-3 bg-white bg-opacity-20 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-800" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Total Documents</h3>
            <p className="text-3xl font-bold text-glass">{stats.totalDocuments}</p>
            <p className="text-sm text-green-700 mt-2">All files</p>
          </div>

          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Expiring Soon</h3>
            <p className="text-3xl font-bold text-orange-600">{stats.expiringDocuments}</p>
            <p className="text-sm text-orange-600 mt-2">Need attention</p>
          </div>

          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <Folder className="w-6 h-6 text-green-800" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Total Storage Used</h3>
            <p className="text-3xl font-bold text-glass">{stats.storageUsed}</p>
          <p className="text-sm text-green-700 mt-2">
            of {userSubscription?.plan?.storage_limit_mb === -1 
              ? 'Unlimited' 
              : userSubscription?.plan?.storage_limit_mb != null 
                ? formatFileSize(userSubscription.plan.storage_limit_mb * 1024 * 1024)
                : '—'}
          </p>
          </div>

          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <Grid3X3 className="w-6 h-6 text-green-800" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Categories</h3>
            <p className="text-3xl font-bold text-glass">{stats.categoriesCount}</p>
            <p className="text-sm text-green-700 mt-2">Organized</p>
          </div>
        </div>
        )}

        {/* Categories Grid */}
        <div className="glass-card rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-glass mb-4">Categories</h2>
          <div className="grid grid-cols-7 gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setFilterCategory(category.id)}
                className="glass rounded-lg p-2 hover:scale-105 transition-all duration-300 text-center group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1 ${category.color}`}>
                  <category.icon size={16} />
                </div>
                <h3 className="font-medium text-glass text-xs mb-1">{category.name}</h3>
                <p className="text-xs text-glass-muted">{category.count}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="glass-card rounded-xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            {/* Search */}
            <div className="flex-1">
              <Input
                label=""
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search size={18} />}
                placeholder="Search documents, properties, or descriptions..."
                className="h-12"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 h-12">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="p-3 h-12"
              >
                <Grid3X3 size={16} />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="p-3 h-12"
              >
                <List size={16} />
              </Button>
            </div>

            {/* Filters Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 h-12"
            >
              <SlidersHorizontal size={16} />
              Filters
            </Button>

            {/* Sort */}
            <div className="flex items-center gap-2 h-12">
              <ArrowUpDown size={16} className="text-glass-muted" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="glass-input rounded-lg px-3 py-2 text-glass h-12"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="size">Sort by Size</option>
              </select>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-white border-opacity-20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-glass mb-2">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full glass-input rounded-lg px-3 py-2 text-glass"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-glass mb-2">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full glass-input rounded-lg px-3 py-2 text-glass"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="expiring">Expiring Soon</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilterCategory('all');
                      setFilterStatus('all');
                      setSearchTerm('');
                    }}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-glass-muted">
            Showing {sortedDocuments.length} of {documents.length} documents
          </p>
        </div>

        {/* Documents Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedDocuments.map((document) => (
              <DocumentCard key={document.id} document={document} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDocuments.map((document) => (
              <DocumentListItem key={document.id} document={document} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {sortedDocuments.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 glow">
              <FileText className="w-8 h-8 text-glass-muted" />
            </div>
            <h3 className="text-lg font-semibold text-glass mb-2">No documents found</h3>
            <p className="text-glass-muted mb-4">
              {searchTerm || filterCategory !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by uploading your first document'
              }
            </p>
            <Button onClick={() => {
              console.log('Empty state Upload Documents button clicked');
              setShowUploadModal(true);
            }}>
              Upload Documents
            </Button>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 glass rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-green-800" />
                  </div>
                  <h2 className="text-2xl font-bold text-glass">Upload Documents</h2>
                </div>
                <button
                  onClick={() => {
                    console.log('Modal close button clicked');
                    setShowUploadModal(false);
                    setUploadFiles([]);
                    setSelectedPropertyId('');
                    setSelectedDocType('other');
                  }}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-glass-muted" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Property Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-glass">Select Property</label>
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => {
                      console.log('Property selected:', e.target.value);
                      setSelectedPropertyId(e.target.value);
                    }}
                    className="w-full p-3 glass rounded-lg border border-white border-opacity-20 focus:border-green-800 focus:outline-none text-glass"
                  >
                    <option value="">Choose a property...</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Document Type Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-glass">Document Type</label>
                  <select
                    value={selectedDocType}
                    onChange={(e) => {
                      console.log('Document type selected:', e.target.value);
                      setSelectedDocType(e.target.value);
                    }}
                    className="w-full p-3 glass rounded-lg border border-white border-opacity-20 focus:border-green-800 focus:outline-none text-glass"
                  >
                    {docTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div 
                  className="border-2 border-dashed border-white border-opacity-30 rounded-lg p-6 text-center hover:border-green-800 transition-colors cursor-pointer"
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={(e) => {
                    // Only trigger if the click is directly on the drag area, not on the button
                    if (e.target === e.currentTarget) {
                      e.preventDefault();
                      e.stopPropagation();
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }
                  }}
                >
                  <Upload size={32} className="mx-auto text-glass-muted mb-4" />
                  <p className="text-glass-muted mb-4">
                    Drag and drop files here, or click to browse
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls"
                    onChange={(e) => {
                      console.log('File input onChange triggered:', e.target.files);
                      handleFileUpload(e);
                    }}
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                  />
                  <Button 
                    variant="outline" 
                    className="cursor-pointer" 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Choose Files button clicked');
                      if (fileInputRef.current) {
                        console.log('Triggering file input click');
                        fileInputRef.current.click();
                      } else {
                        console.error('File input ref not found');
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    Choose Files
                  </Button>
                </div>

                {uploadFiles.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-glass">Selected Files ({uploadFiles.length})</h3>
                    {uploadFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText size={20} className="text-glass-muted" />
                          <div>
                            <p className="font-medium text-glass">{file.name}</p>
                            <p className="text-sm text-glass-muted">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1 hover:bg-red-100 hover:bg-opacity-20 rounded transition-colors"
                        >
                          <X size={16} className="text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={() => {
                      console.log('Cancel button clicked');
                      setShowUploadModal(false);
                      setUploadFiles([]);
                      setSelectedPropertyId('');
                      setSelectedDocType('other');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      console.log('Upload Documents button clicked in modal');
                      handleUpload();
                    }}
                    loading={uploading}
                    disabled={uploadFiles.length === 0 || uploading || !selectedPropertyId}
                    className="flex-1"
                  >
                    {uploading ? 'Uploading...' : 'Upload Documents'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};