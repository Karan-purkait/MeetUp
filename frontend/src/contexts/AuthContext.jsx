// frontend/src/contexts/AuthContext.jsx
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

  // ✅ FIXED: username → email
  const handleRegister = async (name, email, password) => {
    try {
      console.log("Backend URL:", `${server}/api/v1/users`);
      console.log("Register payload:", { name, email, password });

      const request = await client.post("/register", {
        name,
        email,        // ✅ CHANGED: username → email
        password,
      });

      console.log("Register response:", request.data);

      if (request.status === httpStatus.CREATED) {
        return request.data.message;
      }
    } catch (err) {
      console.error("Register error:", err.response?.data || err.message);
      throw err;
    }
  };

  // ✅ FIXED: username → email
  const handleLogin = async (email, password) => {
    try {
      console.log("Backend URL:", `${server}/api/v1/users`);
      console.log("Login payload:", { email, password });

      const request = await client.post("/login", {
        email,        // ✅ CHANGED: username → email
        password,
      });

      console.log("Login response:", request.data);

      if (request.status === httpStatus.OK) {
        localStorage.setItem("token", request.data.token);
        router("/home");
      }
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      throw err;
    }
  };

  const getHistoryOfUser = async () => {
    try {
      const request = await client.get("/get_all_activity", {
        params: {
          token: localStorage.getItem("token"),
        },
      });
      return request.data;
    } catch (err) {
      console.error("Get history error:", err);
      throw err;
    }
  };

  const addToUserHistory = async (meetingCode) => {
    try {
      const request = await client.post("/add_to_activity", {
        token: localStorage.getItem("token"),
        meeting_code: meetingCode,
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
