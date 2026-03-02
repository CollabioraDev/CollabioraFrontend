import React, { createContext, useContext, useState, useEffect } from 'react';

const ProfileContext = createContext();

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}

// Helper to generate a signature of profile params
function generateProfileSignature(conditions, location) {
  const conditionsStr = Array.isArray(conditions) ? conditions.sort().join(',') : '';
  const locationStr = location 
    ? `${location.city || ''},${location.country || ''}` 
    : '';
  return `${conditionsStr}|${locationStr}`;
}

export function ProfileProvider({ children }) {
  const [profileSignature, setProfileSignature] = useState(() => {
    // Initialize from localStorage
    return localStorage.getItem('profileSignature') || '';
  });

  const [lastFetchedSignature, setLastFetchedSignature] = useState(() => {
    return localStorage.getItem('lastFetchedSignature') || '';
  });

  // Update profile signature when profile changes
  const updateProfileSignature = (conditions, location) => {
    const signature = generateProfileSignature(conditions, location);
    setProfileSignature(signature);
    localStorage.setItem('profileSignature', signature);
  };

  // Mark that we've fetched data for this profile signature
  const markDataFetched = (signature) => {
    setLastFetchedSignature(signature);
    localStorage.setItem('lastFetchedSignature', signature);
  };

  // Check if profile has changed since last fetch
  const hasProfileChanged = () => {
    return profileSignature !== lastFetchedSignature;
  };

  // Clear all profile tracking (useful for logout)
  const clearProfileTracking = () => {
    setProfileSignature('');
    setLastFetchedSignature('');
    localStorage.removeItem('profileSignature');
    localStorage.removeItem('lastFetchedSignature');
  };

  return (
    <ProfileContext.Provider
      value={{
        profileSignature,
        lastFetchedSignature,
        updateProfileSignature,
        markDataFetched,
        hasProfileChanged,
        clearProfileTracking,
        generateProfileSignature,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

