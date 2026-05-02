import { api } from "./api";
import axios from "axios";

export type RegisterInput = {
  username: string;
  password: string;
  confirmPassword: string;
};

export async function registerUser(data: RegisterInput) {
  try {
    const response = await api.post("/auth/register", data);
    return response.data as { message: string; user_id: number };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as
        | { detail?: string; message?: string }
        | undefined;
      throw new Error(
        data?.detail ??
          data?.message ??
          "Registration failed. Please try again later.",
      );
    }

    throw new Error("Registration failed. Please try again later.");
  }
}
