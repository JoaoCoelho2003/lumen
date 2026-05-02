"use client";

import { useMutation } from "@tanstack/react-query";
import { registerUser, type RegisterInput } from "../auth";

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (input: RegisterInput) => registerUser(input),
  });
}
