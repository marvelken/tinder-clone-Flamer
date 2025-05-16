"use client"

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, MapPin, Save, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { createClient } from '../../../utils/supabase/client';

export default function ProfileForm() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false); // Separate loading state for photo upload
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialize Supabase client
  const supabase = createClient();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    looking_for: '',
    about: '',
    location: '',
    max_distance: 25
  });
  
  // Photos state (maximum 5)
  const [photos, setPhotos] = useState([]);
  const fileInputRef = useRef(null);
  
  // Check if storage bucket exists and create if needed
  useEffect(() => {
    async function checkAndCreateBucket() {
      if (!user) return;
      
      try {
        console.log("Checking if storage bucket exists...");
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
          console.error("Error listing buckets:", bucketsError);
          return;
        }
        
        const bucketExists = buckets.some(bucket => bucket.name === 'profile-photos');
        
        if (!bucketExists) {
          console.log("Creating 'profile-photos' bucket...");
          const { error: createError } = await supabase.storage.createBucket('profile-photos', {
            public: false // We'll use policies for access control
          });
          
          if (createError) {
            console.error("Error creating bucket:", createError);
          } else {
            console.log("Bucket created successfully");
          }
        } else {
          console.log("Bucket 'profile-photos' already exists");
        }
      } catch (error) {
        console.error("Error checking/creating bucket:", error);
      }
    }
    
    checkAndCreateBucket();
  }, [user]);
  
  // Check for authenticated user
  useEffect(() => {
    async function getUser() {
      try {
        console.log("Checking authentication session...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting session:", sessionError);
          setError("Authentication error: " + sessionError.message);
          setLoading(false);
          return;
        }
        
        if (!session?.user) {
          console.log("No active session, redirecting to auth...");
          router.push('/auth');
          return;
        }
        
        console.log("User authenticated:", session.user.id);
        setUser(session.user);
        
        // Check if user already has profile
        console.log("Fetching existing profile...");
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "no rows returned" - expected for new users
          console.error("Error fetching profile:", profileError);
          setError("Error loading profile: " + profileError.message);
        } else if (profileData) {
          console.log("Existing profile found, populating form...");
          // Pre-fill form with existing profile data
          setFormData({
            name: profileData.name || '',
            age: profileData.age || '',
            gender: profileData.gender || '',
            looking_for: profileData.looking_for || '',
            about: profileData.about || '',
            location: profileData.location || '',
            max_distance: profileData.max_distance || 25
          });
          
          if (Array.isArray(profileData.photos)) {
            console.log("Loading existing photos:", profileData.photos.length);
            setPhotos(profileData.photos);
          } else {
            console.log("No existing photos or invalid format:", profileData.photos);
            setPhotos([]);
          }
        } else {
          console.log("No existing profile found, starting fresh");
        }
      } catch (error) {
        console.error("Unexpected error during initialization:", error);
        setError("Error initializing: " + (error.message || "Please try again"));
      } finally {
        setLoading(false);
      }
    }
    
    getUser();
  }, [router]);
  
  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  // Handle photo upload
  const handlePhotoUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    
    // Validate file type
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(fileExt)) {
      setError('Please upload an image file (JPG, PNG or WebP)');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }
    
    // Maximum 5 photos
    if (photos.length >= 5) {
      setError('You can upload a maximum of 5 photos');
      return;
    }
    
    setUploadingPhoto(true);
    setError(null);
    
    try {
      if (!user || !user.id) {
        throw new Error("User is not authenticated");
      }
      
      // Create unique file name with user ID to ensure it's linked to this user
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      console.log(`Starting upload: ${fileName} (${(file.size / 1024).toFixed(2)} KB)`);
      
      // Upload to Supabase Storage with detailed options
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
        });
        
      if (uploadError) {
        console.error("Upload error details:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      console.log("Upload successful:", uploadData);
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);
        
      if (!urlData || !urlData.publicUrl) {
        console.error("Failed to get public URL, url data:", urlData);
        throw new Error("Failed to get public URL");
      }
      
      console.log("Generated public URL:", urlData.publicUrl);
      
      // Add to photos array
      setPhotos(prev => [...prev, urlData.publicUrl]);
      console.log("Updated photos array, now contains", photos.length + 1, "photos");
      
    } catch (error) {
      console.error("Photo upload error:", error);
      setError(`Error uploading photo: ${error.message || "Unknown error"}`);
    } finally {
      setUploadingPhoto(false);
    }
  };
  
  // Remove photo
  const removePhoto = (index) => {
    try {
      const photoToRemove = photos[index];
      console.log("Removing photo:", photoToRemove);
      
      // Extract file path from URL to delete from storage
      const urlParts = photoToRemove.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const userId = user.id;
      const storagePath = `${userId}/${fileName}`;
      
      // Optional: Delete from storage (uncomment if needed)
      // supabase.storage
      //   .from('profile-photos')
      //   .remove([storagePath])
      //   .then(({ error }) => {
      //     if (error) console.error("Error deleting from storage:", error);
      //   });
      
      // Update photos array
      const newPhotos = [...photos];
      newPhotos.splice(index, 1);
      setPhotos(newPhotos);
      console.log("Photos array updated, now contains", newPhotos.length, "photos");
    } catch (error) {
      console.error("Error removing photo:", error);
      setError("Error removing photo: " + error.message);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Form validation
      if (!formData.name.trim()) throw new Error('Name is required');
      if (!formData.age || formData.age < 18) throw new Error('You must be at least 18 years old');
      if (!formData.gender) throw new Error('Please select your gender');
      if (!formData.looking_for) throw new Error('Please select who you\'re looking for');
      if (!formData.location.trim()) throw new Error('Location is required');
      if (photos.length === 0) throw new Error('Please upload at least one photo');
      
      // Validate all photo URLs
      const validPhotos = photos.filter(url => url && typeof url === 'string' && url.trim() !== '');
      if (validPhotos.length === 0) {
        throw new Error('Please upload at least one valid photo');
      }
      
      console.log("Saving profile with data:", {
        id: user.id,
        ...formData,
        photoCount: validPhotos.length
      });
      
      // Save profile to database
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...formData,
          photos: validPhotos,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { 
          returning: 'minimal' // Don't need the returned data
        });
        
      if (profileError) {
        console.error("Error saving profile:", profileError);
        throw new Error(`Database error: ${profileError.message}`);
      }
      
      console.log("Profile saved successfully, redirecting to plans page");
      
      // Redirect to plans page after successful save
      router.push('/plans');
    } catch (error) {
      console.error("Error in form submission:", error);
      setError(error.message || "An unknown error occurred");
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="sticky top-0 z-10 bg-white shadow">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <h1 className="text-center text-xl font-bold text-gray-800">Complete Your Profile</h1>
        </div>
      </div>
      
      <div className="mx-auto max-w-2xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-red-700">
            <div className="flex items-start">
              <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0 text-red-500" />
              <p>{error}</p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Photos Section */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Profile Photos</h2>
            <p className="mb-4 text-sm text-gray-500">Upload up to 5 photos. First photo will be your main profile picture.</p>
            
            <div className="grid grid-cols-3 gap-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square overflow-hidden rounded-lg">
                  <img 
                    src={photo} 
                    alt={`Profile photo ${index + 1}`} 
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  disabled={uploadingPhoto}
                  className={`aspect-square flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 ${
                    uploadingPhoto ? 'cursor-not-allowed' : ''
                  }`}
                >
                  {uploadingPhoto ? (
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-300 border-t-rose-500"></div>
                  ) : (
                    <Camera className="h-8 w-8 text-gray-400" />
                  )}
                </button>
              )}
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/jpeg, image/png, image/webp"
              disabled={uploadingPhoto}
              className="hidden"
            />
            
            {/* Show loading state for photo uploads */}
            {uploadingPhoto && (
              <p className="mt-3 text-center text-sm text-gray-500">
                Uploading photo... Please wait.
              </p>
            )}
          </div>
          
          {/* Basic Information */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Display Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-rose-500"
                  placeholder="Your name"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                  Age
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    min="18"
                    max="120"
                    value={formData.age}
                    onChange={handleChange}
                    className="block w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-rose-500"
                    placeholder="Your age"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                    I am a
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-rose-500"
                    required
                  >
                    <option value="">Select...</option>
                    <option value="male">Man</option>
                    <option value="female">Woman</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="looking_for" className="block text-sm font-medium text-gray-700">
                    Looking for
                  </label>
                  <select
                    id="looking_for"
                    name="looking_for"
                    value={formData.looking_for}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-rose-500"
                    required
                  >
                    <option value="">Select...</option>
                    <option value="male">Men</option>
                    <option value="female">Women</option>
                    <option value="everyone">Everyone</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="block w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-rose-500"
                    placeholder="City, Country"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="max_distance" className="block text-sm font-medium text-gray-700">
                  Maximum Distance: {formData.max_distance} km
                </label>
                <input
                  type="range"
                  id="max_distance"
                  name="max_distance"
                  min="1"
                  max="100"
                  value={formData.max_distance}
                  onChange={handleChange}
                  className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-rose-500"
                />
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>1 km</span>
                  <span>50 km</span>
                  <span>100 km</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* About Me */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">About Me</h2>
            
            <div>
              <label htmlFor="about" className="block text-sm font-medium text-gray-700">
                Bio
              </label>
              <textarea
                id="about"
                name="about"
                rows="4"
                value={formData.about}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-rose-500"
                placeholder="Tell us about yourself..."
                maxLength="500"
              ></textarea>
              <p className="mt-1 text-xs text-gray-500">
                {formData.about.length}/500 characters
              </p>
            </div>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving || uploadingPhoto}
            className="flex w-full items-center justify-center rounded-xl bg-rose-500 py-3 px-4 font-medium text-white shadow-sm hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <svg className="mr-3 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Save Profile
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}