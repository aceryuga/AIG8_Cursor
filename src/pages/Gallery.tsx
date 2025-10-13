import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Image as ImageIcon, 
  Eye, 
  Star, 
  Calendar, 
  MapPin,
  ArrowRight,
  Search,
  Filter,
  Grid3X3,
  List,
  Plus,
  Upload,
  Trash2,
  X,
  LogOut,
  HelpCircle,
  User
} from 'lucide-react';
import { Button } from '../components/webapp-ui/Button';
import { Input } from '../components/webapp-ui/Input';
import { NotificationBell } from '../components/ui/NotificationBell';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { formatFileSize, uploadPropertyImage, deletePropertyImage, setPrimaryImage, validateImageFile } from '../utils/propertyImages';
import { formatDateDDMMYYYY } from '../utils/timezoneUtils';

interface PropertyAlbum {
  property_id: string;
  property_name: string;
  property_address: string;
  property_type: string;
  total_images: number;
  primary_image_url: string;
  latest_image_date: string;
  images: PropertyImage[];
}

interface PropertyImage {
  id: string;
  property_id: string;
  image_url: string;
  image_name: string;
  image_size?: number;
  image_type?: string;
  is_primary: boolean;
  created_at: string;
}

export const Gallery: React.FC = () => {
  const [albums, setAlbums] = useState<PropertyAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAlbum, setSelectedAlbum] = useState<PropertyAlbum | null>(null);
  const [showAlbumView, setShowAlbumView] = useState(false);
  const [filteredAlbums, setFilteredAlbums] = useState<PropertyAlbum[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [properties, setProperties] = useState<{id: string, name: string}[]>([]);
  const [selectedImage, setSelectedImage] = useState<PropertyImage | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, logout } = useAuth();

  // Fetch all property albums with images
  const fetchAlbums = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Fetch properties with their images
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id,
          name,
          address,
          property_type,
          property_images (
            id,
            image_url,
            image_name,
            image_size,
            image_type,
            is_primary,
            created_at
          )
        `)
        .eq('owner_id', user.id)
        .eq('active', 'Y')
        .order('name');

      if (propertiesError) {
        throw propertiesError;
      }

      // Transform data into album format
      const albumsData: PropertyAlbum[] = (propertiesData || [])
        .filter(property => property.property_images && property.property_images.length > 0)
        .map(property => {
          const images = property.property_images as PropertyImage[];
          const primaryImage = images.find(img => img.is_primary);
          const latestImage = images.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];

          return {
            property_id: property.id,
            property_name: property.name,
            property_address: property.address,
            property_type: property.property_type,
            total_images: images.length,
            primary_image_url: primaryImage?.image_url || images[0]?.image_url || '',
            latest_image_date: latestImage?.created_at || '',
            images: images
          };
        });

      setAlbums(albumsData);
    } catch (error) {
      console.error('Error fetching albums:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, [user?.id]);

  // Fetch properties for upload modal
  const fetchProperties = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .eq('owner_id', user.id)
        .eq('active', 'Y')
        .order('name');

      if (error) {
        throw error;
      }

      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [user?.id]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return false;
      }
      return true;
    });
    setSelectedFiles(prev => [...prev, ...imageFiles]);
  };

  // Remove file from selection
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload images
  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !selectedPropertyId) return;

    setUploading(true);
    setUploadProgress({});

    try {
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const fileId = `${Date.now()}-${index}`;
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

        try {
          const uploadedImage = await uploadPropertyImage(
            file,
            selectedPropertyId,
            (progress) => {
              setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
            }
          );

          return uploadedImage;
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          throw error;
        }
      });

      await Promise.all(uploadPromises);
      
      // Refresh albums list
      await fetchAlbums();
      
      // Reset form
      setSelectedFiles([]);
      setSelectedPropertyId('');
      setShowUploadModal(false);
      setUploadProgress({});
      
      alert(`${selectedFiles.length} image(s) uploaded successfully!`);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Delete image
  const handleDeleteImage = async (imageId: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }

    try {
      await deletePropertyImage(imageId, imageUrl);
      await fetchAlbums();
      alert('Image deleted successfully!');
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image. Please try again.');
    }
  };

  // Set as primary image
  const handleSetPrimary = async (imageId: string) => {
    try {
      await setPrimaryImage(imageId);
      await fetchAlbums();
      alert('Primary image updated successfully!');
    } catch (error) {
      console.error('Error setting primary image:', error);
      alert('Failed to set primary image. Please try again.');
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return false;
      }
      return true;
    });
    setSelectedFiles(prev => [...prev, ...imageFiles]);
  };

  const handleLogout = async () => {
    await logout();
  };

  // Filter albums based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAlbums(albums);
    } else {
      const filtered = albums.filter(album =>
        album.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        album.property_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        album.property_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAlbums(filtered);
    }
  }, [albums, searchTerm]);

  const handleAlbumClick = (album: PropertyAlbum) => {
    setSelectedAlbum(album);
    setShowAlbumView(true);
  };

  const handleBackToAlbums = () => {
    setShowAlbumView(false);
    setSelectedAlbum(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden floating-orbs">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-lg text-glass-muted">Loading gallery...</p>
          </div>
        </div>
      </div>
    );
  }

  if (showAlbumView && selectedAlbum) {
    return (
      <div className="min-h-screen relative overflow-hidden floating-orbs">
        <div className="container mx-auto px-4 py-8">
          {/* Album Header */}
          <div className="glass-card rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBackToAlbums}
                  className="p-2 glass rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors"
                >
                  <ArrowRight size={20} className="text-glass rotate-180" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-glass">{selectedAlbum.property_name}</h1>
                  <p className="text-glass-muted flex items-center gap-1">
                    <MapPin size={16} />
                    {selectedAlbum.property_address}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-glass-muted">
                  {selectedAlbum.total_images} image{selectedAlbum.total_images !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-glass-muted capitalize">
                  {selectedAlbum.property_type}
                </p>
              </div>
            </div>
          </div>

          {/* Images Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {selectedAlbum.images.map((image) => (
              <div key={image.id} className="glass rounded-lg overflow-hidden group relative">
                <div className="aspect-square relative">
                  <div 
                    className="w-full h-full cursor-pointer"
                    onClick={() => {
                      setSelectedImage(image);
                      setShowImageViewer(true);
                    }}
                  >
                    <ImageWithFallback
                      src={image.image_url}
                      alt={image.image_name}
                      className="w-full h-full object-cover"
                      fallbackText="Image"
                    />
                  </div>
                  
                  {/* Primary badge */}
                  {image.is_primary && (
                    <div className="absolute top-2 left-2">
                      <div className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Star size={12} fill="currentColor" />
                        Primary
                      </div>
                    </div>
                  )}

                  {/* Overlay actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedImage(image);
                          setShowImageViewer(true);
                        }}
                        className="bg-white bg-opacity-20 border-white text-white hover:bg-opacity-30"
                      >
                        <Eye size={14} />
                      </Button>
                      {!image.is_primary && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetPrimary(image.id)}
                          className="bg-white bg-opacity-20 border-white text-white hover:bg-opacity-30"
                        >
                          <Star size={14} />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteImage(image.id, image.image_url)}
                        className="bg-red-600 bg-opacity-20 border-red-600 text-white hover:bg-opacity-30"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Image info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-glass truncate" title={image.image_name}>
                    {image.image_name}
                  </p>
                  <div className="flex items-center justify-between text-xs text-glass-muted">
                    <span>{image.image_size ? formatFileSize(image.image_size) : 'Unknown size'}</span>
                    <span>{formatDateDDMMYYYY(image.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                      item.path === '/gallery'
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

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="glass-card rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <ImageIcon size={24} className="text-green-800" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-glass">Property Gallery</h1>
                <p className="text-glass-muted">
                  {albums.length} propert{albums.length !== 1 ? 'ies' : 'y'} with images
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2"
              >
                <Upload size={16} className="mr-1" />
                Upload Images
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="glass-card rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <Input
                label=""
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search size={18} />}
                placeholder="Search properties..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 size={16} />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List size={16} />
              </Button>
            </div>
          </div>
        </div>

        {/* Albums Grid/List */}
        {filteredAlbums.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4">
              <ImageIcon size={24} className="text-glass-muted" />
            </div>
            <h3 className="text-lg font-semibold text-glass mb-2">
              {searchTerm ? 'No properties found' : 'No images yet'}
            </h3>
            <p className="text-glass-muted mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Upload images to your properties to see them here'
              }
            </p>
            {!searchTerm && (
              <Link to="/properties">
                <Button>
                  <Building2 size={16} className="mr-2" />
                  View Properties
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }>
            {filteredAlbums.map((album) => (
              <div
                key={album.property_id}
                className={`glass rounded-xl overflow-hidden group cursor-pointer transition-all duration-200 hover:scale-105 ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
                onClick={() => handleAlbumClick(album)}
              >
                {viewMode === 'grid' ? (
                  <>
                    <div className="aspect-video relative">
                      <ImageWithFallback
                        src={album.primary_image_url}
                        alt={album.property_name}
                        className="w-full h-full object-cover"
                        fallbackText="No Image"
                      />
                      <div className="absolute top-3 right-3">
                        <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs font-medium">
                          {album.total_images} image{album.total_images !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-glass mb-1">{album.property_name}</h3>
                      <p className="text-sm text-glass-muted mb-2 flex items-center gap-1">
                        <MapPin size={14} />
                        {album.property_address}
                      </p>
                      <div className="flex items-center justify-between text-xs text-glass-muted">
                        <span className="capitalize">{album.property_type}</span>
                        <span>{formatDateDDMMYYYY(album.latest_image_date)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-4 p-4 w-full">
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <ImageWithFallback
                        src={album.primary_image_url}
                        alt={album.property_name}
                        className="w-full h-full object-cover"
                        fallbackText="No Image"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-glass mb-1 truncate">{album.property_name}</h3>
                      <p className="text-sm text-glass-muted mb-1 flex items-center gap-1">
                        <MapPin size={14} />
                        <span className="truncate">{album.property_address}</span>
                      </p>
                      <div className="flex items-center gap-4 text-xs text-glass-muted">
                        <span className="capitalize">{album.property_type}</span>
                        <span>{album.total_images} image{album.total_images !== 1 ? 's' : ''}</span>
                        <span>{formatDateDDMMYYYY(album.latest_image_date)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <ArrowRight size={20} className="text-glass-muted" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 glass rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-green-800" />
                  </div>
                  <h2 className="text-2xl font-bold text-glass">Upload Images</h2>
                </div>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFiles([]);
                    setSelectedPropertyId('');
                    setUploadProgress({});
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
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
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

                {/* Drag and Drop Area */}
                <div 
                  className="border-2 border-dashed border-white border-opacity-30 rounded-lg p-6 text-center hover:border-green-800 transition-colors cursor-pointer"
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={32} className="mx-auto text-glass-muted mb-4" />
                  <p className="text-glass-muted mb-4">
                    Drag and drop images here, or click to browse
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                  />
                  <Button 
                    variant="outline"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    Choose Images
                  </Button>
                </div>

                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-glass">Selected Images ({selectedFiles.length})</h3>
                    {selectedFiles.map((file, index) => {
                      const fileId = `${Date.now()}-${index}`;
                      const progress = uploadProgress[fileId] || 0;
                      const isUploading = uploading && progress < 100;
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
                          <div className="flex items-center gap-3 flex-1">
                            <ImageIcon size={20} className="text-glass-muted" />
                            <div className="flex-1">
                              <p className="font-medium text-glass">{file.name}</p>
                              <p className="text-sm text-glass-muted">
                                {formatFileSize(file.size)}
                              </p>
                              {isUploading && (
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                  <div 
                                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          </div>
                          {!isUploading && (
                            <button
                              onClick={() => removeFile(index)}
                              className="p-1 hover:bg-red-100 hover:bg-opacity-20 rounded transition-colors"
                            >
                              <X size={16} className="text-red-600" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedFiles([]);
                      setSelectedPropertyId('');
                      setUploadProgress({});
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    loading={uploading}
                    disabled={selectedFiles.length === 0 || !selectedPropertyId || uploading}
                    className="flex-1"
                  >
                    {uploading ? 'Uploading...' : 'Upload Images'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl max-h-[90vh] w-full">
            <div className="relative">
              <button
                onClick={() => setShowImageViewer(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
              >
                <X size={24} />
              </button>
              <ImageWithFallback
                src={selectedImage.image_url}
                alt={selectedImage.image_name}
                className="w-full h-full max-h-[80vh] object-contain rounded-lg"
                fallbackText="Image not available"
              />
            </div>
            <div className="mt-4 text-center">
              <p className="text-white font-medium">{selectedImage.image_name}</p>
              <p className="text-gray-300 text-sm">
                {selectedImage.image_size ? formatFileSize(selectedImage.image_size) : 'Unknown size'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
