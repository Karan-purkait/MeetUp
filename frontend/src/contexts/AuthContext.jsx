import axios from "axios";
import httpStatus from "http-status";
import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
  baseURL: `${server}/api/v1/users`,
  withCredentials: true,
});

export const AuthProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const router = useNavigate();

  const handleRegister = async (name, email, password) => {
    try {
      console.log("Register payload:", { name, email, password });

      const request = await client.post("/auth/register", {
        name,
        email,
        password,
      });

      if (request.status === httpStatus.CREATED) {
        return "Registration successful! Please login.";
      }
    } catch (err) {
      console.error("Register error:", err.response?.data || err.message);
      throw err;
    }
  };

  const handleLogin = async (email, password) => {
    try {
      console.log("Login payload:", { email, password });

      const request = await client.post("/auth/login", {
        email,
        password,
      });

      if (request.status === httpStatus.OK) {
        localStorage.setItem("token", request.data.token);
        localStorage.setItem("userName", request.data.user.name);  // ✅ NEW
        localStorage.setItem("userId", request.data.user.id);      // ✅ NEW
        setUserData(request.data.user);
        router("/home");
      }
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      throw err;
    }
  };

  // ✅ FIXED: Proper token-based history retrieval
  const getHistoryOfUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("No token found");
        return [];
      }

      const request = await client.get("/history", {
        params: { token },
      });

      return request.data.data || [];
    } catch (err) {
      console.error("Get history error:", err);
      return [];
    }
  };

  // ✅ FIXED: Proper history addition with token
  const addToUserHistory = async (roomId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("No token found");
        return null;
      }

      const request = await client.post("/history", {
        token,
        roomId,
      });

      return request.data;
    } catch (err) {
      console.error("Add to history error:", err);
      throw err;
    }
  };

  const data = {
    userData,
    setUserData,
    addToUserHistory,
    getHistoryOfUser,
    handleRegister,
    handleLogin,
  };

  return (
    <AuthContext.Provider value={data}>
      {children}
    </AuthContext.Provider>
  );
};