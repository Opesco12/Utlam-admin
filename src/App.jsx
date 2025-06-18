import React, { useState, useEffect } from 'react';
import { Upload, Save, RefreshCw, AlertTriangle, Check } from 'lucide-react';

const App = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingProduct, setUploadingProduct] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  // API endpoints
  const API_BASE = 'https://xfundclientapi.utlam.com:1008/api/v1';
  const CLOUDINARY_CONFIG = {
    cloudName: 'dauvznlvw',
    uploadPreset: 'utlam_product_images'
  };

  function toKebabCase(str) {
    return str
      .trim() // remove leading/trailing whitespace
      .toLowerCase() // convert to lowercase
      .replace(/\s+/g, '-'); // replace spaces with hyphens
  }

  // Fetch products from your API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/getclientinvestibleproducts`);
      const productData = await response.json();

      // Load image URLs for all products
      const productsWithImages = await Promise.all(
        productData.map(async (product) => ({
          ...product,
          imageUrl: await getImageUrl(product.portfolioName),
          hasCustomImage: true
        }))
      );

      setProducts(productsWithImages);
    } catch (error) {
      setMessage({ text: 'Error fetching products', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Check if Cloudinary image exists
  const checkImageExists = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      console.log("response for: ", imageUrl , ": ", response);
      return response.ok;
    } catch {
      return false;
    }
  };

  const getImageUrl = async (productName) => {
    const cloudinaryUrl = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/v1750117184/${toKebabCase(productName)}.webp`;
    const defaultUrl = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/v1750117184/utlam-default.webp`;
    
    const exists = await checkImageExists(cloudinaryUrl);
    return exists === true ? cloudinaryUrl : defaultUrl;
  };

  // Upload image to Cloudinary
  const uploadToCloudinary = async (file, productName) => {
    const publicId = toKebabCase(productName); // Use kebab-case portfolioName as public_id
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append("folder", 'products')
    formData.append('public_id', publicId);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error('Cloudinary upload failed');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload image');
    }
  };

  // Handle file upload
  const handleImageUpload = async (productId, file) => {
    const product = products.find(p => p.portfolioId === productId);
    if (!product) return;

    setUploadingProduct(productId);
    setMessage({ text: '', type: '' });

    try {
      // Upload to Cloudinary with product name as public_id (will overwrite if exists)
      const newImageUrl = await uploadToCloudinary(file, product.portfolioName);
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.portfolioId === productId 
          ? { ...p, imageUrl: newImageUrl, hasCustomImage: true }
          : p
      ));

      setMessage({ text: `Image updated for ${product.portfolioName}`, type: 'success' });
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ text: 'Failed to upload image', type: 'error' });
    } finally {
      setUploadingProduct(null);
    }
  };

  // Handle file input change
  const handleFileChange = (productId, event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        handleImageUpload(productId, file);
      } else {
        setMessage({ text: 'Please select a valid image file', type: 'error' });
      }
    }
  };

  // Refresh products data
  const handleRefresh = () => {
    fetchProducts();
    setMessage({ text: 'Products refreshed', type: 'success' });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Clear message after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="animate-spin h-6 w-6 text-blue-600" />
          <span className="text-gray-600">Loading products...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">UTLAM Product Images</h1>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className={`flex items-center space-x-2 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message.type === 'success' && <Check className="h-5 w-5" />}
            {message.type === 'error' && <AlertTriangle className="h-5 w-5" />}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              {/* Product Image */}
              <div className="relative">
                <img
                  src={product.imageUrl}
                  alt={product?.portfolioName}
                  className="w-full h-48 object-cover rounded-t-lg"
                  onError={(e) => {
                    e.target.src = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/v1750117184/utlam-default.webp`;
                  }}
                />
                {uploadingProduct === product.portfolioId && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-t-lg">
                    <RefreshCw className="animate-spin h-8 w-8 text-white" />
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{product.portfolioName}</h3>

                {/* Upload Button */}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(product.portfolioId, e)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingProduct === product.portfolioId}
                  />
                  <button
                    className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      uploadingProduct === product.portfolioId
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    disabled={uploadingProduct === product.portfolioId}
                  >
                    <Upload className="h-4 w-4" />
                    <span>
                      {uploadingProduct === product.portfolioId ? 'Uploading...' : 'Change Image'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Upload className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;