import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAuth = async (newToken, newUser) => {
    await AsyncStorage.setItem('token', newToken);
    await AsyncStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    if (response.data.token) {
      await saveAuth(response.data.token, response.data.user);
    }
    return response.data;
  };

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    await saveAuth(response.data.token, response.data.user);
    return response.data;
  };

  const googleLogin = async (idToken, role) => {
    const response = await authAPI.googleAuth({ idToken, role });
    await saveAuth(response.data.token, response.data.user);
    return response.data;
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } catch (_) {}
    setToken(null);
    setUser(null);
  };

  const updateUser = async (data) => {
    try {
      // If caller passed a FormData (e.g., from EditProfile screen), send it to the API
      if (data instanceof FormData) {
        const response = await authAPI.updateProfile(data);
        const updatedUser = response.data.user;
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        return updatedUser;
      }

      // If caller passed a full user object (already-updated user), update local state only
      if (data && (data.id || data._id || data.email)) {
        const updatedUser = { ...user, ...data };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        return updatedUser;
      }

      // Otherwise treat `data` as a partial update payload and send to API
      const response = await authAPI.updateProfile(data);
      const updatedUser = { ...user, ...response.data.user };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      // Fallback: merge locally so UI stays responsive
      const updatedUser = { ...user, ...(data instanceof FormData ? {} : data) };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    }
  };

  const setAuth = async (newToken, newUser) => {
    await saveAuth(newToken, newUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        register,
        login,
        googleLogin,
        logout,
        updateUser,
        setAuth,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
