import axios from "axios";

export const api = axios.create({
  baseURL: "",
  timeout: 30_000,
});

export function setAdminToken(token: string) {
  if (!token) {
    delete api.defaults.headers.common["X-Admin-Token"];
    return;
  }
  api.defaults.headers.common["X-Admin-Token"] = token;
}
