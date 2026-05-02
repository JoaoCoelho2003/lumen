import axios from "axios";

export const api = axios.create({
  baseURL: process.env.LUMEN_BACKEND_URL,
  withCredentials: false,
});

