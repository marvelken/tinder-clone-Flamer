"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, X, Check, MessageCircle } from 'lucide-react';
import { createClient } from '../../../utils/supabase/client';

export default function LikesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [likes, setLikes] = useState([]);
  const [user, setUser] = useState(null);
  
  const supabase = createClient();
  
  useEffect(() => {
    async function fetchData() {
      setLoading(true); // Start loading for initial fetch
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        router.push('/auth');
        return;
      }
      
      setUser(session.user);
      
      try {
        const { data: likesData, error: likesError } = await supabase
          .from('likes')
          .select(`
            id,
            liker_id,
            liked_user_id,
            is_match,
            profiles: liker_id ( 
              id,
              name,
              age,
              photos,
              location
            )
          `)
          .eq('liked_user_id', session.user.id)
          .order('created_at', { ascending: false }); // Optional: order by most recent likes
          
        if (likesError) throw likesError;
        
        setLikes(likesData || []);

      } catch (error) {
        console.error('Error fetching likes:', error);
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    }
    
    fetchData();
  }, [router]); // supabase is stable, router might change for navigations

  const handleLikeBack = async (likerId) => {
    if (!user) return;

    setLoading(true); // Indicate loading for this action
    try {
      // 1. Current user (user.id) is liking back 'likerId'
      const { error: swipeError } = await supabase
        .from('swipes')
        .insert({
          user_id: user.id,
          swiped_profile_id: likerId,
          liked: true
        });

      if (swipeError) {
        if (swipeError.code === '23505') { // Unique constraint violation
          console.warn(`User ${user.id} already swiped on profile ${likerId}. Trigger will handle 'is_match'.`);
        } else {
          throw swipeError;
        }
      }

      // 2. The `record_like_from_swipe` trigger handles 'is_match' logic in the DB.

      // 3. Refetch likes to update UI with the new 'is_match' status from the DB.
      const { data: updatedLikesData, error: refetchError } = await supabase
        .from('likes')
        .select(`
          id,
          liker_id,
          liked_user_id,
          is_match,
          profiles: liker_id (id, name, age, photos, location)
        `)
        .eq('liked_user_id', user.id)
        .order('created_at', { ascending: false });

      if (refetchError) throw refetchError;
      
      setLikes(updatedLikesData || []);

    } catch (error) {
      console.error('Error liking back:', error);
      alert('There was an error liking back. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReject = async (likerId) => {
    if (!user) return;
    
    setLoading(true); // Indicate loading for this action
    try {
      const { error: swipeError } = await supabase
        .from('swipes')
        .insert({
          user_id: user.id,
          swiped_profile_id: likerId,
          liked: false
        });
        
      if (swipeError) {
         if (swipeError.code === '23505') {
          console.warn(`User ${user.id} already swiped (rejected) profile ${likerId}.`);
        } else {
          throw swipeError;
        }
      }
      
      // Optimistically remove from UI
      setLikes(currentLikes => currentLikes.filter(like => like.liker_id !== likerId));
      
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('There was an error rejecting. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const getProfilePhotoUrl = (profile) => {
    if (profile?.photos?.[0]) {
      const fullPhotoPath = profile.photos[0]; 
      const { data } = supabase
        .storage
        .from('profile-photos')
        .getPublicUrl(fullPhotoPath);
      return data?.publicUrl || '/placeholder.jpg';
    }
    return '/placeholder.jpg';
  };
  
  if (!initialLoadComplete && loading) { 
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-10 bg-white shadow">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <h1 className="text-center text-xl font-bold text-gray-800">People Who Like You</h1>
        </div>
      </header>
      
      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* Show loading spinner for actions if not initial load */}
        {loading && initialLoadComplete && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
            </div>
        )}

        {!loading && likes.length === 0 && initialLoadComplete ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Heart className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-800">No Likes Yet</h2>
            <p className="text-gray-600">Keep swiping and your likes will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {likes.map((like) => (
              like.profiles && ( 
                <div key={like.liker_id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="relative h-64 w-full sm:h-80 md:h-96">
                    <img 
                      src={getProfilePhotoUrl(like.profiles)} 
                      alt={`${like.profiles?.name}'s profile`}
                      className="h-full w-full object-cover"
                      onError={(e) => { e.currentTarget.src = '/placeholder.jpg'; }}
                    />
                    {like.is_match && (
                      <div className="absolute top-4 right-4 rounded-full bg-green-500 px-3 py-1 text-sm font-medium text-white shadow">
                        Match!
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {like.profiles?.name}, {like.profiles?.age}
                    </h3>
                    <p className="text-sm text-gray-600">{like.profiles?.location}</p>
                    
                    {!like.is_match && (
                      <div className="mt-4 flex space-x-2">
                        <button 
                          onClick={() => handleReject(like.liker_id)}
                          disabled={loading} // Disable button while an action is loading
                          className="flex flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                        >
                          <X className="mr-2 h-5 w-5 text-red-500" />
                          Pass
                        </button>
                        
                        <button 
                          onClick={() => handleLikeBack(like.liker_id)}
                          disabled={loading} // Disable button while an action is loading
                          className="flex flex-1 items-center justify-center rounded-lg bg-rose-500 px-3 py-2 font-medium text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-50"
                        >
                          <Check className="mr-2 h-5 w-5" />
                          Like Back
                        </button>
                      </div>
                    )}
                    
                    {like.is_match && (
                      <button 
                        onClick={() => router.push(`/chat/${like.liker_id}`)} // Example
                        disabled={loading}
                        className="mt-4 flex w-full items-center justify-center rounded-lg bg-green-500 py-2.5 font-medium text-white shadow-sm transition hover:bg-green-600 disabled:opacity-50"
                      >
                        <MessageCircle className="mr-2 h-5 w-5" />
                        Message
                      </button>
                    )}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white shadow-[-2px_0px_10px_rgba(0,0,0,0.1)]">
        <div className="mx-auto flex max-w-4xl justify-around py-3">
          <button 
            className="flex flex-col items-center px-4 text-gray-500 hover:text-rose-500"
            onClick={() => router.push('/')}
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l1.41-1.41L12 16.17l4.09-4.08L17.5 13.5 12 19l-5.5-5.5z"/>
            </svg>
            <span className="mt-1 text-xs">Explore</span>
          </button>
          
          <button 
            className="flex flex-col items-center px-4 text-rose-500"
          >
            <Heart className="h-6 w-6" />
            <span className="mt-1 text-xs">Likes</span>
          </button>
          
          <button 
            className="flex flex-col items-center px-4 text-gray-500 hover:text-rose-500"
            onClick={() => router.push('/matches')}
          >
            <MessageCircle className="h-6 w-6" />
            <span className="mt-1 text-xs">Matches</span>
          </button>
          
          <button 
            className="flex flex-col items-center px-4 text-gray-500 hover:text-rose-500"
            onClick={() => router.push('/profile')}
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