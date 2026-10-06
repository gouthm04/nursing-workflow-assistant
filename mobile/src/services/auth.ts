import * as SecureStore from "expo-secure-store";
import { API_URL } from "../constants/api";

export async function login(username: string, password: string) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            username,
            password,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Login failed");
    }

    // Store the NEW login session
    await SecureStore.setItemAsync(
        "auth_token",
        data.token
    );

    await SecureStore.setItemAsync(
        "auth_user",
        JSON.stringify(data.user)
    );

    console.log("LOGIN USER:", data.user);

    return data.user;
}

export async function getStoredUser() {
    const user = await SecureStore.getItemAsync("auth_user");

    if (!user) {
        return null;
    }

    return JSON.parse(user);
}

export async function getStoredToken() {
    return await SecureStore.getItemAsync("auth_token");
}

export async function logout() {
    await SecureStore.deleteItemAsync("auth_token");
    await SecureStore.deleteItemAsync("auth_user");
}