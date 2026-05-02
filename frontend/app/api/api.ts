import axios from "axios";

export const api = axios.create({
  baseURL: "/lumen-api",
  withCredentials: false,
});
