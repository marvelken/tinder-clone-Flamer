"use client"

import { useState, useEffect, useRef } from 'react';
import { createClient } from '../../../utils/supabase/client';
import { 
  Heart, 
  X, 
  Star, 
  MessageCircle, 
  MapPin,
  Info,
  Clock,
  Lock
} from 'lucide-react';
import { checkDatingAppPermissions } from '../../lib/permit';

export default function SwipePage() {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [permissions, setPermissions] = useState({
    canViewProfiles: false,
    canViewFullProfiles: false,
    canViewLimitedProfiles: false,
    canViewLikes: false,
    canViewFullLikes: false,
    canViewLimitedLikes: false
  });
  const [dailySwipes, setDailySwipes] = useState(0);
  const [swipeLimit, setSwipeLimit] = useState(10); // Default for free users
  
  // Refs for animations
  const cardRef = useRef(null);
  const initialX = useRef(0);
  const currentX = useRef(0);
  
  // Initialize Supabase client
  const supabase = createClient();
  
  // Fetch user data, permissions and profiles on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          // Redirect to login if not authenticated
          window.location.href = '/auth';
          return;
        }
        
        setUser(session.user);
        
        // Fetch user permissions
        const perms = await checkDatingAppPermissions(session.user.id);
        setPermissions(perms);
        
        // If premium user, remove swipe limit
        if (perms.canViewFullProfiles) {
          setSwipeLimit(Infinity);
        }
        
        // Fetch today's swipe count (if applicable)
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const { data: swipeData } = await supabase
          .from('daily_swipe_counts')
          .select('count')
          .eq('user_id', session.user.id)
          .eq('date', today)
          .single();
          
        if (swipeData) {
          setDailySwipes(swipeData.count);
        }
        
        // Fetch user's profile to get preferences
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('looking_for, gender, id, max_distance')
          .eq('id', session.user.id)
          .single();
          
        if (!userProfile) {
          // Redirect to profile creation if no profile
          window.location.href = '/profile';
          return;
        }
        
        // Fetch potential matches based on preferences
        let query = supabase
          .from('profiles')
          .select('*')
          .neq('id', session.user.id); // Don't include current user
        
        // Apply gender preference filter if not "everyone"
        if (userProfile.looking_for && userProfile.looking_for !== 'everyone') {
          query = query.eq('gender', userProfile.looking_for);
        }
        
        // Fetch users who the current user hasn't swiped on yet
        const { data: swipedProfiles } = await supabase
          .from('swipes')
          .select('swiped_profile_id')
          .eq('user_id', session.user.id);
        
        const swipedIds = swipedProfiles?.map(s => s.swiped_profile_id) || [];
        
        if (swipedIds.length > 0) {
          query = query.not('id', 'in', `(${swipedIds.join(',')})`);
        }
        
        // Limit results and fetch
        const { data: matchProfiles, error } = await query.limit(20);
        
        if (error) throw error;
        
        if (matchProfiles && matchProfiles.length > 0) {
          // Process profiles to convert storage URLs to actual URLs
          const processedProfiles = await Promise.all(matchProfiles.map(async (profile) => {
            if (profile.photos && Array.isArray(profile.photos)) {
              // Map the photo paths to actual URLs
              const photoUrls = await Promise.all(profile.photos.map(async (photoPath) => {
                if (photoPath.startsWith('http')) {
                  return photoPath; // Already a URL
                } else {
                  // Get public URL from Supabase storage
                  const { data: { publicUrl } } = supabase
                    .storage
                    .from('profile-photos')
                    .getPublicUrl(photoPath);
                  return publicUrl;
                }
              }));
              return { ...profile, photos: photoUrls };
            }
            return profile;
          }));
          
          setProfiles(processedProfiles);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  // Current profile being shown
  const currentProfile = profiles[currentProfileIndex];
  
  // Check if user has reached daily swipe limit
  const hasReachedSwipeLimit = dailySwipes >= swipeLimit;
  
  // Handle touch/mouse start for swiping
  const handleTouchStart = (e) => {
    if (hasReachedSwipeLimit) return;
    
    initialX.current = e.clientX || e.touches[0].clientX;
    setSwiping(true);
  };
  
  // Handle touch/mouse move for swiping
  const handleTouchMove = (e) => {
    if (!swiping) return;
    
    const clientX = e.clientX || e.touches[0].clientX;
    const deltaX = clientX - initialX.current;
    currentX.current = deltaX;
    
    // Update card position
    if (cardRef.current) {
      const rotate = deltaX * 0.05; // Rotation factor
      cardRef.current.style.transform = `translateX(${deltaX}px) rotate(${rotate}deg)`;
      
      // Show like/dislike indicators based on swipe direction
      if (deltaX > 80) {
        setSwipeDirection('right');
      } else if (deltaX < -80) {
        setSwipeDirection('left');
      } else {
        setSwipeDirection(null);
      }
    }
  };
  
  // Handle touch/mouse end for swiping
  const handleTouchEnd = () => {
    if (!swiping) return;
    setSwiping(false);
    
    // Determine if swipe was strong enough
    if (currentX.current > 150) {
      handleSwipe(true); // Right swipe - like
    } else if (currentX.current < -150) {
      handleSwipe(false); // Left swipe - dislike
    } else {
      // Reset card position
      if (cardRef.current) {
        cardRef.current.style.transform = 'translateX(0) rotate(0deg)';
      }
    }
    
    // Reset
    currentX.current = 0;
  };
  
  // Handle button swipe (alternative to drag)
  const handleButtonSwipe = (liked) => {
    if (hasReachedSwipeLimit) return;
    handleSwipe(liked);
  };
  
  // Process the swipe action
  const handleSwipe = async (liked) => {
    if (!currentProfile || hasReachedSwipeLimit) return;
    
    // Set swipe direction for animation
    setSwipeDirection(liked ? 'right' : 'left');
    
    // Animate card off screen
    if (cardRef.current) {
      const direction = liked ? 1 : -1;
      cardRef.current.style.transform = `translateX(${direction * window.innerWidth}px) rotate(${direction * 30}deg)`;
    }
    
    try {
      // Record the swipe in the database
      await supabase
        .from('swipes')
        .insert({
          user_id: user.id,
          swiped_profile_id: currentProfile.id,
          liked
        });
      
      // If liked, create a like record
      if (liked) {
        await supabase
          .from('likes')
          .insert({
            liker_id: user.id,
            liked_user_id: currentProfile.id,
            is_match: false // Will be updated if mutual
          });
        
        // Check if it's a match (other user already liked current user)
        const { data: matchCheck } = await supabase
          .from('likes')
          .select('*')
          .eq('liker_id', currentProfile.id)
          .eq('liked_user_id', user.id)
          .single();
          
        if (matchCheck) {
          // It's a match! Update both like records
          await supabase
            .from('likes')
            .update({ is_match: true })
            .eq('liker_id', user.id)
            .eq('liked_user_id', currentProfile.id);
            
          await supabase
            .from('likes')
            .update({ is_match: true })
            .eq('liker_id', currentProfile.id)
            .eq('liked_user_id', user.id);
            
          // Show match notification
          alert(`You matched with ${currentProfile.name}!`);
        }
      }
      
      // Update swipe counter
      setDailySwipes(prev => prev + 1);
      
      // Record the swipe count for today
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      await supabase
        .from('daily_swipe_counts')
        .upsert({ 
          user_id: user.id, 
          date: today, 
          count: dailySwipes + 1 
        }, { 
          onConflict: 'user_id,date' 
        });
      
      // Move to next profile after animation completes
      setTimeout(() => {
        setCurrentProfileIndex(prev => {
          // If we're at the last profile, stay there
          if (prev >= profiles.length - 1) {
            return prev;
          }
          return prev + 1;
        });
        
        // Reset animation
        setSwipeDirection(null);
        if (cardRef.current) {
          cardRef.current.style.transform = 'translateX(0) rotate(0deg)';
        }
      }, 300);
    } catch (error) {
      console.error('Error recording swipe:', error);
    }
  };

  // Determine how many photos to show based on permissions
  const getVisiblePhotos = () => {
    if (!currentProfile) return [];
    if (!permissions) return [currentProfile.photos?.[0]].filter(Boolean);
    
    // If user can view full profiles, show all photos
    if (permissions.canViewFullProfiles) {
      return currentProfile.photos || [];
    }
    // Otherwise just show the first photo
    return [currentProfile.photos?.[0]].filter(Boolean);
  };
  
  const visiblePhotos = getVisiblePhotos();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  
  // Photo carousel navigation
  const nextPhoto = () => {
    if (activePhotoIndex < visiblePhotos.length - 1) {
      setActivePhotoIndex(prev => prev + 1);
    }
  };
  
  const prevPhoto = () => {
    if (activePhotoIndex > 0) {
      setActivePhotoIndex(prev => prev - 1);
    }
  };
  
  // No more profiles state
  const noMoreProfiles = !loading && (!profiles.length || currentProfileIndex >= profiles.length);
  
  // Check if user has premium privileges
  const isPremium = permissions.canViewFullProfiles;
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white shadow">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <h1 className="text-xl font-bold text-rose-500">Flamer</h1>
          
          {/* Swipe Counter for Free Users */}
          {!isPremium && (
            <div className="rounded-full bg-gray-100 px-3 py-1 text-sm">
              <span className="font-medium text-gray-800">{dailySwipes}</span>
              <span className="text-gray-500">/{swipeLimit} swipes</span>
            </div>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        {noMoreProfiles ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-md">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-rose-100">
              <Heart className="h-10 w-10 text-rose-500" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-800">No More Profiles</h2>
            <p className="mb-6 text-gray-600">
              You've seen everyone in your area. Check back later for new matches!
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-rose-500 px-6 py-2 font-medium text-white hover:bg-rose-600"
            >
              Refresh
            </button>
          </div>
        ) : hasReachedSwipeLimit ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-md">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <Clock className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-800">Daily Limit Reached</h2>
            <p className="mb-6 text-gray-600">
              You've used all your free swipes for today. Upgrade to Premium for unlimited swipes!
            </p>
            <button
              onClick={() => window.location.href = '/plans'}
              className="rounded-full bg-rose-500 px-6 py-2 font-medium text-white hover:bg-rose-600"
            >
              Upgrade to Premium
            </button>
          </div>
        ) : (
          <div className="w-full max-w-md">
            {/* Swipe Card */}
            <div 
              ref={cardRef}
              className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl transition-transform"
              onMouseDown={handleTouchStart}
              onMouseMove={handleTouchMove}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Like/Dislike Indicators */}
              {swipeDirection === 'right' && (
                <div className="absolute left-4 top-4 z-20 rotate-[-30deg] rounded-lg border-4 border-green-500 bg-white/40 px-4 py-2 text-2xl font-bold text-green-500 backdrop-blur-sm">
                  LIKE
                </div>
              )}
              
              {swipeDirection === 'left' && (
                <div className="absolute right-4 top-4 z-20 rotate-[30deg] rounded-lg border-4 border-red-500 bg-white/40 px-4 py-2 text-2xl font-bold text-red-500 backdrop-blur-sm">
                  NOPE
                </div>
              )}
              
              {/* Photo Carousel */}
              <div className="relative h-full w-full">
                {/* Current Photo */}
                {visiblePhotos.length > 0 ? (
                  <img 
                    src={visiblePhotos[activePhotoIndex] || '/placeholder.jpg'} 
                    alt={`${currentProfile?.name}'s photo`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      console.error("Image failed to load:", e);
                      e.target.src = '/placeholder.jpg';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-200">
                    <p className="text-gray-500">No photo available</p>
                  </div>
                )}
                
                {/* Photo Indicators */}
                {visiblePhotos.length > 1 && (
                  <div className="absolute top-2 left-0 right-0 z-10 flex justify-center space-x-1">
                    {visiblePhotos.map((_, idx) => (
                      <div 
                        key={idx}
                        className={`h-1 w-6 rounded-full ${
                          idx === activePhotoIndex 
                            ? 'bg-white' 
                            : 'bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                )}
                
                {/* Photo Navigation (only if multiple photos) */}
                {visiblePhotos.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                      className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/20 p-1 text-white backdrop-blur-sm"
                      disabled={activePhotoIndex === 0}
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                      className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/20 p-1 text-white backdrop-blur-sm"
                      disabled={activePhotoIndex === visiblePhotos.length - 1}
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
                
                {/* Premium Photos Indicator */}
                {!isPremium && currentProfile?.photos && currentProfile.photos.length > 1 && (
                  <div className="absolute bottom-4 right-4 z-10 flex items-center rounded-full bg-black/50 px-3 py-1 text-white backdrop-blur-sm">
                    <Lock className="mr-1 h-4 w-4" />
                    <span className="text-xs">{currentProfile.photos.length - 1} more photos</span>
                  </div>
                )}
                
                {/* Profile Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-4 text-white">
                  <h2 className="text-2xl font-bold">{currentProfile?.name}, {currentProfile?.age}</h2>
                  
                  <div className="mt-1 flex items-center text-white/90">
                    <MapPin className="mr-1 h-4 w-4" />
                    <span>{currentProfile?.location}</span>
                  </div>
                  
                  <p className="mt-2 text-white/80">{currentProfile?.about}</p>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-8 flex items-center justify-center space-x-4">
              {/* Dislike Button */}
              <button
                onClick={() => handleButtonSwipe(false)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg transition hover:bg-gray-50 hover:shadow-xl"
                disabled={hasReachedSwipeLimit}
              >
                <X className="h-7 w-7 text-red-500" />
              </button>
              
              {/* Super Like Button - Premium Only */}
              <button
                className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition ${
                  isPremium 
                    ? 'bg-blue-500 hover:bg-blue-600 hover:shadow-xl' 
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
                disabled={!isPremium || hasReachedSwipeLimit}
                title={!isPremium ? "Premium feature" : "Super Like"}
              >
                <Star className="h-6 w-6 text-white" />
              </button>
              
              {/* Like Button */}
              <button
                onClick={() => handleButtonSwipe(true)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg transition hover:bg-gray-50 hover:shadow-xl"
                disabled={hasReachedSwipeLimit}
              >
                <Heart className="h-7 w-7 text-green-500" />
              </button>
            </div>
          </div>
        )}
      </main>
      
      {/* Premium Upgrade Banner - Only for free users with profiles available */}
      {!isPremium && !noMoreProfiles && !hasReachedSwipeLimit && (
        <div className="mx-auto mb-6 max-w-md rounded-xl bg-rose-50 p-4">
          <div className="flex items-start">
            <Info className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-rose-500" />
            <div>
              <p className="text-sm text-rose-700">
                Upgrade to Premium to see all photos and get unlimited swipes!
              </p>
              <button 
                onClick={() => window.location.href = '/plans'}
                className="mt-2 rounded-md bg-rose-500 px-3 py-1 text-xs font-medium text-white hover:bg-rose-600"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Navigation */}
      <nav className="sticky bottom-0 bg-white shadow-lg">
        <div className="mx-auto flex max-w-4xl justify-around py-3">
          <button className="flex flex-col items-center px-4 text-rose-500">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10.9 2.1l9.9 1.4c.5.1.9.5.9 1v17c0 .5-.4.9-.9 1l-9.9 1.4c-.8.1-1.5-.4-1.5-1.2V3.3c0-.8.7-1.3 1.5-1.2zM5.6 8.5c-1.3.1-2.3 1.4-2.1 2.7.2 1.2 1.1 2.1 2.3 2.2 1.3.1 2.3-1.4 2.1-2.7-.2-1.2-1.2-2.1-2.3-2.2zM3 19h4v1c0 .6-.4 1-1 1H4c-.6 0-1-.4-1-1v-1z"/>
            </svg>
            <span className="mt-1 text-xs">Explore</span>
          </button>
          
          <button 
            className="flex flex-col items-center px-4 text-gray-500"
            onClick={() => window.location.href = '/likesPage'}
          >
            <Heart className="h-6 w-6" />
            <span className="mt-1 text-xs">Likes</span>
          </button>
          
          <button 
            className="flex flex-col items-center px-4 text-gray-500"
            onClick={() => window.location.href = '/matches'}
          >
            <MessageCircle className="h-6 w-6" />
            <span className="mt-1 text-xs">Matches</span>
          </button>
          
          <button 
            className="flex flex-col items-center px-4 text-gray-500"
            onClick={() => window.location.href = '/profile'}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="mt-1 text-xs">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}