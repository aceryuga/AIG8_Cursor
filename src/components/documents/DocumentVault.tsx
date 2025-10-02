import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  LogOut, 
  Bell, 
  HelpCircle, 
  User, 
  Plus, 
  Search, 
  Filter, 
  Grid3x3 as Grid3X3, 
  List, 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Calendar, 
  AlertTriangle,
  Clock,
  CheckCircle,
  Folder,
  Image,
  FileSpreadsheet,
  File,
  SlidersHorizontal,
  ArrowUpDown
} from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { Input } from '../webapp-ui/Input';
import { useAuth } from '../../hooks/useAuth';

interface Document {
  id: string;
  name: string;
  category: 'lease' | 'legal' | 'financial' | 'maintenance' | 'insurance' | 'other';
  propertyName: string;
  type: 'pdf' | 'image' | 'excel' | 'word';
  size: string;
  uploadDate: string;
  expiryDate?: string;
  status: 'active' | 'expiring' | 'expired';
  thumbnail: string;
  description?: string;
}

interface DocumentStats {
  totalDocuments: number;
  expiringDocuments: number;
  storageUsed: string;
  categoriesCount: number;
}

const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Lease Agreement - Green Valley',
    category: 'lease',
    propertyName: 'Green Valley Apartment',
    type: 'pdf',
    size: '2.5 MB',
    uploadDate: '2024-01-15',
    expiryDate: '2025-12-31',
    status: 'active',
    thumbnail: 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Main lease agreement with tenant Amit Sharma'
  },
  {
    id: '2',
    name: 'Property Insurance Policy',
    category: 'insurance',
    propertyName: 'Sunrise Villa',
    type: 'pdf',
    size: '1.8 MB',
    uploadDate: '2024-02-10',
    expiryDate: '2025-02-10',
    status: 'expiring',
    thumbnail: 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Comprehensive property insurance coverage'
  },
  {
    id: '3',
    name: 'Maintenance Receipt - Plumbing',
    category: 'maintenance',
    propertyName: 'City Center Office',
    type: 'image',
    size: '850 KB',
    uploadDate: '2024-03-05',
    status: 'active',
    thumbnail: 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Plumbing repair work invoice and receipt'
  },
  {
    id: '4',
    name: 'Tax Assessment Document',
    category: 'legal',
    propertyName: 'Metro Plaza Shop',
    type: 'pdf',
    size: '3.2 MB',
    uploadDate: '2024-01-20',
    expiryDate: '2024-12-31',
    status: 'expired',
    thumbnail: 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Annual property tax assessment'
  },
  {
    id: '5',
    name: 'Rental Income Statement',
    category: 'financial',
    propertyName: 'Garden View Apartment',
    type: 'excel',
    size: '1.2 MB',
    uploadDate: '2024-03-01',
    status: 'active',
    thumbnail: 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Monthly rental income tracking spreadsheet'
  },
  {
    id: '6',
    name: 'Property Photos - Exterior',
    category: 'other',
    propertyName: 'Lakeside Cottage',
    type: 'image',
    size: '5.4 MB',
    uploadDate: '2024-02-28',
    status: 'active',
    thumbnail: 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'High-resolution exterior property photographs'
  }
];

const mockStats: DocumentStats = {
  totalDocuments: 24,
  expiringDocuments: 3,
  storageUsed: '156.8 MB',
  categoriesCount: 6
};

const categories = [
  { id: 'lease', name: 'Lease Agreements', icon: FileText, count: 8, color: 'bg-blue-100 text-blue-700' },
  { id: 'legal', name: 'Legal Documents', icon: FileText, count: 5, color: 'bg-purple-100 text-purple-700' },
  { id: 'financial', name: 'Financial Records', icon: FileSpreadsheet, count: 6, color: 'bg-green-100 text-green-700' },
  { id: 'maintenance', name: 'Maintenance', icon: File, count: 3, color: 'bg-orange-100 text-orange-600' },
  { id: 'insurance', name: 'Insurance', icon: FileText, count: 2, color: 'bg-red-100 text-red-600' },
  { id: 'other', name: 'Other', icon: Folder, count: 4, color: 'bg-gray-100 text-gray-600' }
];

export const DocumentVault: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-100';
      case 'expiring': return 'text-orange-600 bg-orange-100';
      case 'expired': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-6 h-6 text-red-600" />;
      case 'excel': return <FileSpreadsheet className="w-6 h-6 text-green-600" />;
      case 'image': return <Image className="w-6 h-6 text-blue-600" />;
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
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
            {document.status}
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex gap-2">
            <Link to={`/documents/view/${document.id}`} className="flex-1">
              <Button size="sm" className="w-full text-xs">
                <Eye size={12} className="mr-1" />
                View
              </Button>
            </Link>
            <Button size="sm" variant="outline" className="flex-1 text-xs">
              <Download size={12} className="mr-1" />
              Download
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          {getFileIcon(document.type)}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-glass truncate">{document.name}</h3>
            <p className="text-sm text-glass-muted">{document.propertyName}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-glass-muted">{document.size}</span>
          <span className="text-xs text-glass-muted">
            {new Date(document.uploadDate).toLocaleDateString()}
          </span>
        </div>

        {document.expiryDate && (
          <div className="mb-3 p-2 glass rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-glass-muted" />
              <span className="text-xs text-glass-muted">
                Expires: {new Date(document.expiryDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        <Link to={`/documents/view/${document.id}`}>
          <Button variant="outline" className="w-full">
            View Details
          </Button>
        </Link>
      </div>
    </div>
  );

  const DocumentListItem: React.FC<{ document: Document }> = ({ document }) => (
    <div className="glass-card rounded-xl p-4 hover:scale-[1.02] transition-all duration-300 glow">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 glass rounded-lg flex items-center justify-center">
          {getFileIcon(document.type)}
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-glass">{document.name}</h3>
              <p className="text-sm text-glass-muted">{document.propertyName}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
              {document.status}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-glass-muted">Size: {document.size}</p>
                <p className="text-xs text-glass-muted">
                  Uploaded: {new Date(document.uploadDate).toLocaleDateString()}
                </p>
              </div>
              {document.expiryDate && (
                <div>
                  <p className="text-sm text-glass-muted">
                    Expires: {new Date(document.expiryDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Link to={`/documents/view/${document.id}`}>
                <Button size="sm" variant="outline">
                  <Eye size={14} className="mr-1" />
                  View
                </Button>
              </Link>
              <Button size="sm" variant="outline">
                <Download size={14} />
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-glass mb-2">Document Vault</h1>
            <p className="text-glass-muted">Manage all your property documents in one place</p>
          </div>
          <Link to="/documents/upload">
            <Button className="flex items-center gap-2">
              <Plus size={18} />
              Upload Documents
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-800" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Total Documents</h3>
            <p className="text-3xl font-bold text-glass">{mockStats.totalDocuments}</p>
            <p className="text-sm text-green-700 mt-2">All files</p>
          </div>

          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Expiring Soon</h3>
            <p className="text-3xl font-bold text-orange-600">{mockStats.expiringDocuments}</p>
            <p className="text-sm text-orange-600 mt-2">Need attention</p>
          </div>

          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <Folder className="w-6 h-6 text-green-800" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Storage Used</h3>
            <p className="text-3xl font-bold text-glass">{mockStats.storageUsed}</p>
            <p className="text-sm text-green-700 mt-2">of 1 GB</p>
          </div>

          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <Grid3X3 className="w-6 h-6 text-green-800" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Categories</h3>
            <p className="text-3xl font-bold text-glass">{mockStats.categoriesCount}</p>
            <p className="text-sm text-green-700 mt-2">Organized</p>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="glass-card rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-glass mb-4">Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setFilterCategory(category.id)}
                className="glass rounded-lg p-4 hover:scale-105 transition-all duration-300 text-center group"
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2 ${category.color}`}>
                  <category.icon size={24} />
                </div>
                <h3 className="font-medium text-glass text-sm mb-1">{category.name}</h3>
                <p className="text-xs text-glass-muted">{category.count} files</p>
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
            <Link to="/documents/upload">
              <Button>Upload Documents</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};